import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, updateDoc, deleteDoc, setDoc, addDoc, where, limit, serverTimestamp, writeBatch, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail, deleteUser } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3yUUmQ7ZWZF1ODnmTd3sWlv1qjSq00zE",
  authDomain: "admin-af1fc.firebaseapp.com",
  projectId: "admin-af1fc",
  storageBucket: "admin-af1fc.firebasestorage.app",
  messagingSenderId: "1042593739824",
  appId: "1:1042593739824:web:a3c401e02fb3578fc769f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Add registration state tracking
let isRegistrationInProgress = false;

// Add utils object
const utils = {
    showMessage: function(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Remove any existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Add the new message
        document.body.appendChild(messageDiv);
        
        // Remove the message after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    },
    generateApplicationId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `APP${timestamp}${random}`;
    }
};

// Function to update student status
async function updateStudentStatus(studentId, newStatus) {
    try {
        const studentRef = doc(db, "student-registrations", studentId);
        await updateDoc(studentRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        
        // Show success message
        utils.showMessage(`Student status updated to ${newStatus}`, 'success');
        
        // Refresh the student list
        await renderStudentManagement();
    } catch (error) {
        console.error("Error updating student status:", error);
        utils.showMessage("Failed to update student status", 'error');
    }
}

// Make updateStudentStatus available globally
window.updateStudentStatus = updateStudentStatus;

// Function to check admin status
async function checkAdminStatus() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user found in checkAdminStatus');
      return false;
    }

      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
    } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Function to fetch the total number of registered students
async function getTotalStudents() {
  try {
    const querySnapshot = await getDocs(collection(db, "student-registrations"));
    return querySnapshot.size;
  } catch (error) {
    console.error("Error fetching student count:", error);
    return 0; // Return 0 in case of error
  }
}

// Function to fetch all registered students
async function getAllStudents(searchId = '') {
  try {
    console.log("Attempting to fetch students from Firestore...");
    const studentCollection = collection(db, "student-registrations");
    console.log("Collection reference created:", studentCollection);

    // Instead, fetch all students regardless of submittedAt
    const querySnapshot = await getDocs(studentCollection);
    console.log("Query snapshot received:", querySnapshot);
    console.log("Number of documents:", querySnapshot.size);

    if (querySnapshot.empty) {
      console.log("No students found in the collection");
      return [];
    }

    const students = [];
    querySnapshot.forEach((doc) => {
      const studentData = doc.data();
      // Fallback for fullName
      let fullName = studentData.fullName;
      if (!fullName) {
        if (studentData.firstName || studentData.lastName) {
          fullName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim();
        }
      }
      // If searchId is provided, filter by internshipId
      if (!searchId ||
        (studentData.internshipId &&
          studentData.internshipId.toLowerCase().includes(searchId.toLowerCase()))) {
        console.log("Processing student document:", {
          id: doc.id,
          internshipId: studentData.internshipId,
          fullName: fullName,
          email: studentData.email,
          submittedAt: studentData.submittedAt
        });
        // Include the document ID in the student data
        students.push({ 
          id: doc.id,  // This is the userId
          ...studentData,
          fullName: fullName,
          // Ensure these fields exist for display
          status: studentData.status || 'pending',
          submittedAt: studentData.submittedAt || studentData.registeredAt || new Date().toISOString()
        });
      }
    });

    console.log("Final students array length:", students.length);
    return students;
  } catch (error) {
    console.error("Error fetching students:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return []; // Return empty array in case of error
  }
}

// Function to fetch a single student by ID
async function getStudentById(studentId) {
  try {
    const studentDocRef = doc(db, "student-registrations", studentId);
    const studentDoc = await getDoc(studentDocRef);
    if (studentDoc.exists()) {
      console.log("Fetched student data:", studentDoc.data());
      return { id: studentDoc.id, ...studentDoc.data() };
    } else {
      console.log("No such student document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching student document:", error);
    return null;
  }
}

// Function to fetch students by status
async function getStudentsByStatus() {
  try {
    console.log("Fetching students by status...");
    const students = await getAllStudents();

    const groupedStudents = {
      approved: [],
      rejected: [],
      pending: []
    };

    students.forEach(student => {
      const status = student.status?.toLowerCase() || 'pending';
      if (groupedStudents.hasOwnProperty(status)) {
        groupedStudents[status].push(student);
      } else {
        groupedStudents.pending.push(student);
      }
    });

    console.log("Students grouped by status:", {
      approved: groupedStudents.approved.length,
      rejected: groupedStudents.rejected.length,
      pending: groupedStudents.pending.length
    });

    return groupedStudents;
  } catch (error) {
    console.error("Error fetching students by status:", error);
    return {
      approved: [],
      rejected: [],
      pending: []
    };
  }
}

// Function to render student list for status sections
function renderStatusStudentList(students, isDashboard = true) {
  if (!students || students.length === 0) {
    return `
            <div class="no-students">
                <p>No students in this category</p>
            </div>
        `;
  }

  if (isDashboard) {
    // Simplified card for dashboard view
    return students.map(student => `
            <div class="student-card dashboard-card" data-id="${student.id}" style="--status-color: ${getStatusColor(student.status)}">
                <div class="student-info">
                    <h3>${student.fullName || 'N/A'}</h3>
                    <span class="status-badge ${student.status || 'pending'}">${student.status || 'Pending'}</span>
                </div>
            </div>
        `).join('');
  }

  // Full card for student management view
  return students.map(student => `
        <div class="student-card" data-id="${student.id}" style="--status-color: ${getStatusColor(student.status)}">
            <div class="student-header">
                <h3>${student.internshipId || 'ID not provided'}</h3>
                <span class="status-badge ${student.status || 'pending'}">${student.status || 'Pending'}</span>
            </div>
            <div class="student-info">
                <p>
                    <strong>Name</strong>
                    ${student.fullName || 'N/A'}
                </p>
                <p>
                    <strong>Email</strong>
                    ${student.email || 'N/A'}
                </p>
                <p>
                    <strong>College</strong>
                    ${student.college || 'N/A'}
                </p>
                <p>
                    <strong>Submitted</strong>
                    ${new Date(student.submittedAt).toLocaleDateString()}
                </p>
            </div>
            <div class="student-actions">
            <button class="view-details-btn">
                View Details
                <i class="fas fa-arrow-right"></i>
            </button>
                <button class="delete-student-btn" data-id="${student.id}">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Helper function to get status color
function getStatusColor(status) {
  const colors = {
    pending: '#f1c40f',
    approved: '#2ecc71',
    rejected: '#e74c3c'
  };
  return colors[status?.toLowerCase()] || colors.pending;
}

// Function to render the dashboard content
async function renderDashboard() {
  try {
    const totalStudents = await getTotalStudents();
    const studentsByStatus = await getStudentsByStatus();

    const stats = {
      total: totalStudents,
      approved: studentsByStatus.approved.length,
      rejected: studentsByStatus.rejected.length,
      pending: studentsByStatus.pending.length
    };

    return `
            <div class="dashboard-container">
                <div class="stats-cards">
                    <div class="stat-card total">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <h3>Total Students</h3>
                            <p>${stats.total}</p>
                        </div>
                    </div>
                    <div class="stat-card approved">
                        <i class="fas fa-check-circle"></i>
                        <div class="stat-info">
                            <h3>Approved</h3>
                            <p>${stats.approved}</p>
                        </div>
                    </div>
                    <div class="stat-card pending">
                        <i class="fas fa-clock"></i>
                        <div class="stat-info">
                            <h3>Pending</h3>
                            <p>${stats.pending}</p>
                        </div>
                    </div>
                    <div class="stat-card rejected">
                        <i class="fas fa-times-circle"></i>
                        <div class="stat-info">
                            <h3>Rejected</h3>
                            <p>${stats.rejected}</p>
                        </div>
                    </div>
                </div>

                <div class="status-sections">
                    <div class="status-section">
                        <h2><i class="fas fa-check-circle"></i> Approved Students (${stats.approved})</h2>
                        <div class="student-list">
                            ${renderStatusStudentList(studentsByStatus.approved, true)}
                        </div>
                    </div>

                    <div class="status-section">
                        <h2><i class="fas fa-clock"></i> Pending Students (${stats.pending})</h2>
                        <div class="student-list">
                            ${renderStatusStudentList(studentsByStatus.pending, true)}
                        </div>
                    </div>

                    <div class="status-section">
                        <h2><i class="fas fa-times-circle"></i> Rejected Students (${stats.rejected})</h2>
                        <div class="student-list">
                            ${renderStatusStudentList(studentsByStatus.rejected, true)}
                        </div>
                    </div>
                </div>
            </div>
        `;
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    return '<div class="error-message">Error loading dashboard</div>';
  }
}

// Function to render the student list
async function renderStudentList(students) {
    const studentListContainer = document.createElement('div');
    studentListContainer.className = 'student-list';

  if (!students || students.length === 0) {
        studentListContainer.innerHTML = `
      <div class="no-students">
                <p>No students found</p>
      </div>
    `;
        return studentListContainer;
    }

    const studentCards = students.map(student => {
        const photoUrl = student.photoURL || student.photograph;
        const avatarUrl = student.avatarURL || photoUrl;
        const status = student.status || 'pending';
        const submissionDate = student.submittedAt ? 
            new Date(student.submittedAt.toDate()).toLocaleDateString() : 
            'Not available';

        return `
            <div class="student-card" data-student-id="${student.id}">
                <div class="student-photo-container">
                    ${photoUrl ? 
                        `<img src="${photoUrl}" alt="${student.fullName}" onerror="this.parentElement.innerHTML = '<div class=\'student-photo-placeholder\'><i class=\'fas fa-user\'></i></div>'">` :
                        `<div class="student-photo-placeholder"><i class="fas fa-user"></i></div>`
                    }
                </div>
                <div class="student-content">
        <div class="student-header">
                        <div class="student-avatar">
                            ${avatarUrl ? 
                                `<img src="${avatarUrl}" alt="${student.fullName}" onerror="this.parentElement.innerHTML = '<div class=\'student-avatar-placeholder\'><i class=\'fas fa-user\'></i></div>'">` :
                                `<div class="student-avatar-placeholder"><i class="fas fa-user"></i></div>`
                            }
        </div>
                        <div class="student-header-info">
                            <h3>
                                ${student.fullName}
                                ${student.status === 'approved' ? '<span class="verified-badge"><i class="fas fa-check-circle"></i></span>' : ''}
                            </h3>
                            <p class="status-badge ${status}">
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </p>
                        </div>
                    </div>
                    <div class="student-info">
                        <div class="student-info-item">
                            <strong>ID</strong>
                            <p>${student.internshipId || 'N/A'}</p>
                        </div>
                        <div class="student-info-item">
                            <strong>Email</strong>
                            <p>${student.email || 'N/A'}</p>
                        </div>
                        <div class="student-info-item">
                            <strong>College</strong>
                            <p>${student.college || 'N/A'}</p>
                        </div>
                        <div class="student-info-item">
                            <strong>Branch</strong>
                            <p>${student.branch || 'N/A'}</p>
                        </div>
                        <div class="student-info-item">
                            <strong>Submitted</strong>
                            <p>${submissionDate}</p>
                        </div>
      </div>
      <div class="student-actions">
                        <button class="view-details-btn" data-student-id="${student.id}">
                            <i class="fas fa-eye"></i>
          View Details
        </button>
                        <button class="delete-student-btn" data-student-id="${student.id}">
          <i class="fas fa-trash"></i>
          Delete
        </button>
      </div>
    </div>
    </div>
  `;
    }).join('');

    studentListContainer.innerHTML = studentCards;

    // Add event listeners after rendering
    studentListContainer.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const studentId = e.currentTarget.getAttribute('data-student-id');
            viewStudentDetails(studentId);
        });
    });

    studentListContainer.querySelectorAll('.delete-student-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const studentId = e.currentTarget.getAttribute('data-student-id');
            deleteStudent(studentId);
        });
    });

    return studentListContainer;
}

// Function to delete a student
async function deleteStudent(studentId) {
    try {
        // Verify admin status before proceeding
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            throw new Error('You do not have permission to delete students');
        }

        if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            return;
        }

        console.log('Deleting student:', studentId);

        // Delete student document
        await deleteDoc(doc(db, 'students', studentId));
        await deleteDoc(doc(db, 'student-registrations', studentId));

        // Delete related documents
        const batch = writeBatch(db);

        // Delete enrollments
        const enrollmentsQuery = query(
            collection(db, 'enrollments'),
            where('studentId', '==', studentId)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        enrollmentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete attendance records
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('studentId', '==', studentId)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        attendanceSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete grades
        const gradesQuery = query(
            collection(db, 'grades'),
            where('studentId', '==', studentId)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        gradesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Commit the batch
        await batch.commit();

        console.log('Student and related data deleted successfully');
        utils.showMessage('Student deleted successfully', 'success');

        // Reload the student list
        await loadContent('student-management');
    } catch (error) {
        console.error('Error deleting student:', error);
        utils.showMessage(error.message || 'Error deleting student', 'error');
    }
}

// Make deleteStudent available globally
window.deleteStudent = deleteStudent;

// Helper function to format array or string data
function formatListData(data) {
  if (!data) return 'N/A';
  if (Array.isArray(data)) return data.join(', ');
  if (typeof data === 'string') {
    // Try to parse if it's a JSON string
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch (e) {
      // If not JSON, return as is
      return data;
    }
    return data;
  }
  return 'N/A';
}

// Function to render student detail view
function renderStudentDetail(student) {
  console.log('Rendering student detail:', student);
  
  const statusClass = {
    'pending': 'status-pending',
    'approved': 'status-approved',
    'rejected': 'status-rejected'
  }[student.status] || 'status-pending';

  const statusText = {
    'pending': 'Pending Review',
    'approved': 'Approved',
    'rejected': 'Rejected'
  }[student.status] || 'Pending Review';

  return `
    <div class="student-detail-container" data-id="${student.id}">
      <div class="detail-header">
        <button class="back-button">
          <i class="fas fa-arrow-left"></i> Back to Students
        </button>
        <div class="status-badge ${statusClass}">${statusText}</div>
      </div>

      <div class="detail-content">
        <div class="detail-section">
          <h2>Personal Information</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Full Name</label>
              <p>${student.fullName || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Email</label>
              <p>${student.email || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Contact Number</label>
              <p>${student.contact || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Date of Birth</label>
              <p>${student.dob || 'N/A'}</p>
            </div>
            <div class="detail-item full-width">
              <label>Current Address</label>
              <p>${student.address || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>ZIP Code</label>
              <p>${student.zipCode || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h2>Academic Information</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <label>College Name</label>
              <p>${student.collegeName || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Branch</label>
              <p>${student.branch || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Semester</label>
              <p>${student.semester || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>GPA</label>
              <p>${student.gpa || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Graduation Year</label>
              <p>${student.graduationYear || 'N/A'}</p>
            </div>
            <div class="detail-item">
              <label>Active Backlogs</label>
              <p>${student.hasBacklogs === 'Yes' ? (student.backlogCount || 'Yes') : 'No'}</p>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h2>Technical Information</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Programming Languages</label>
              <p>${formatListData(student.programmingLanguages)}</p>
            </div>
            <div class="detail-item">
              <label>Web Technologies</label>
              <p>${formatListData(student.webTechnologies)}</p>
            </div>
            <div class="detail-item">
              <label>Databases</label>
              <p>${formatListData(student.databases)}</p>
            </div>
            <div class="detail-item">
              <label>Tools & Frameworks</label>
              <p>${formatListData(student.toolsFrameworks)}</p>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h2>Documents</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Photograph</label>
              ${student.photograph ? 
                `<img src="${student.photograph}" alt="Student Photograph" class="document-preview">` : 
                '<p>Not provided</p>'}
            </div>
            <div class="detail-item">
              <label>Signature</label>
              ${student.signature ? 
                `<img src="${student.signature}" alt="Student Signature" class="document-preview">` : 
                '<p>Not provided</p>'}
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h2>Update Status</h2>
          <div class="status-options">
            <button class="status-option" data-status="approved">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="status-option" data-status="rejected">
              <i class="fas fa-times"></i> Reject
            </button>
            <button class="status-option" data-status="pending">
              <i class="fas fa-clock"></i> Mark Pending
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Function to render the student management content
async function renderStudentManagement() {
  console.log("Starting to render student management...");
  const students = await getAllStudents();
  console.log("Students fetched for rendering:", students);

  const html = renderStudentList(students);
  console.log("Generated HTML for student list:", html);

  return html;
}

// DOM Elements
const logoutBtn = document.getElementById('logout-btn');
const logoutModal = document.getElementById('logout-modal');

// Event Listeners for Modal
logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleLogout();
});

// Handle logout confirmation
async function handleLogout() {
    if (isRegistrationInProgress) {
        utils.showMessage('Cannot logout during student registration. Please wait.', 'error');
        hideModal();
        return;
    }
    try {
        await signOut(auth);
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        utils.showMessage('Error signing out. Please try again.', 'error');
    }
}

// Function to handle student registration
async function handleStudentRegistration(event) {
    event.preventDefault();
    
    if (isRegistrationInProgress) {
        utils.showMessage('A registration is already in progress. Please wait.', 'error');
        return;
    }

    try {
        isRegistrationInProgress = true;
        const form = event.target;
        const formData = new FormData(form);
        
        // Get form data
        const email = formData.get('email');
        const password = formData.get('password');
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const dateOfBirth = formData.get('dateOfBirth');
        const gender = formData.get('gender');
        const address = formData.get('address');
        const phone = formData.get('phone');
        const course = formData.get('course');
        const enrollmentDate = formData.get('enrollmentDate');

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create student document in Firestore
        const studentData = {
            uid: user.uid,
            email,
            firstName,
            lastName,
            dateOfBirth,
            gender,
            address,
            phone,
            course,
            enrollmentDate,
            createdAt: serverTimestamp(),
            status: 'active'
        };

        await setDoc(doc(db, 'students', user.uid), studentData);

        // Create initial attendance record
        const attendanceData = {
            studentId: user.uid,
            totalClasses: 0,
            presentClasses: 0,
            lastUpdated: serverTimestamp()
        };
        await setDoc(doc(db, 'attendance', user.uid), attendanceData);

        // Create initial grades record
        const gradesData = {
            studentId: user.uid,
            courses: {},
            lastUpdated: serverTimestamp()
        };
        await setDoc(doc(db, 'grades', user.uid), gradesData);

        // Show success message
        utils.showMessage('Student registered successfully!', 'success');
        form.reset();
        
        // Refresh student list
        loadContent('student-management');
    } catch (error) {
        console.error('Error registering student:', error);
        
        // If Firebase Auth succeeded but Firestore failed, clean up the auth user
        if (error.code === 'firestore/error') {
            try {
                const user = auth.currentUser;
                if (user) {
                    await deleteUser(user);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up incomplete registration:', cleanupError);
            }
        }
        
        utils.showMessage(error.message, 'error');
    } finally {
        isRegistrationInProgress = false;
    }
}


// Load and display user enquiries from Firestore
async function loadUserEnquiries() {
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = document.getElementById('user-enquiry-template').innerHTML;

  const enquiryList = document.getElementById('enquiry-list');
  const enquiryToggle = document.getElementById('enquiry-toggle');
  const searchInput = document.getElementById('enquiry-search');
  const statusFilter = document.getElementById('status-filter');
  const dateFilter = document.getElementById('date-filter');

  enquiryList.innerHTML = '<p>Loading...</p>';

  try {
    const querySnapshot = await getDocs(collection(db, 'enquiries'));
    const enquiries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Update statistics
    updateEnquiryStats(enquiries);

    // Add event listeners
    enquiryToggle.addEventListener('change', () => {
      renderEnquiries(enquiries, enquiryToggle.checked);
    });

    searchInput.addEventListener('input', () => {
      renderEnquiries(enquiries, enquiryToggle.checked);
    });

    statusFilter.addEventListener('change', () => {
      renderEnquiries(enquiries, enquiryToggle.checked);
    });

    dateFilter.addEventListener('change', () => {
      renderEnquiries(enquiries, enquiryToggle.checked);
    });

    // Set up modal event listeners
    setupEnquiryModal();

    // Initial render
    renderEnquiries(enquiries, false);
  } catch (err) {
    enquiryList.innerHTML = '<p>Error loading enquiries.</p>';
    console.error(err);
  }
}

// Update enquiry statistics
function updateEnquiryStats(enquiries) {
  const stats = {
    pending: 0,
    resolved: 0,
    total: enquiries.length
  };

  enquiries.forEach(enquiry => {
    if (enquiry.status === 'resolved') {
      stats.resolved++;
    } else {
      stats.pending++;
    }
  });

  document.getElementById('pending-count').textContent = stats.pending;
  document.getElementById('resolved-count').textContent = stats.resolved;
  document.getElementById('total-count').textContent = stats.total;
}

// Render enquiries with filtering
function renderEnquiries(enquiries, showAll) {
  const enquiryList = document.getElementById('enquiry-list');
  const searchTerm = document.getElementById('enquiry-search').value.toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;
  const dateFilter = document.getElementById('date-filter').value;
  const toggleText = document.querySelector('.toggle-text');

  // Update toggle text with count
  const recentEnquiries = enquiries.filter(enquiry => 
    enquiry.timestamp && 
    (new Date().getTime() - enquiry.timestamp.toDate().getTime()) <= 7 * 24 * 60 * 60 * 1000
  );
  toggleText.textContent = showAll ? `Show All (${enquiries.length})` : `Show Recent (${recentEnquiries.length})`;

  const filteredEnquiries = enquiries.filter(enquiry => {
    // Search filter
    const matchesSearch = 
      enquiry.name?.toLowerCase().includes(searchTerm) ||
      enquiry.email?.toLowerCase().includes(searchTerm) ||
      enquiry.message?.toLowerCase().includes(searchTerm);

    // Status filter
    const matchesStatus = statusFilter === 'all' || enquiry.status === statusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all' && enquiry.timestamp) {
      const enquiryDate = enquiry.timestamp.toDate();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

      switch (dateFilter) {
        case 'today':
          matchesDate = enquiryDate >= today;
          break;
        case 'week':
          matchesDate = enquiryDate >= weekAgo;
          break;
        case 'month':
          matchesDate = enquiryDate >= monthAgo;
          break;
      }
    }

    // Show all filter
    const isRecent = showAll || (enquiry.timestamp && 
      (new Date().getTime() - enquiry.timestamp.toDate().getTime()) <= 7 * 24 * 60 * 60 * 1000);

    return matchesSearch && matchesStatus && matchesDate && isRecent;
  });

  if (filteredEnquiries.length === 0) {
    enquiryList.innerHTML = '<div class="no-enquiries">No enquiries found</div>';
    return;
  }

  // Add fade-out effect
  enquiryList.style.opacity = '0';
  setTimeout(() => {
  enquiryList.innerHTML = filteredEnquiries.map(enquiry => `
    <div class="enquiry-item" data-id="${enquiry.id}">
      <div>${enquiry.name || 'N/A'}</div>
      <div>${enquiry.email || 'N/A'}</div>
      <div>${enquiry.subject || 'N/A'}</div>
      <div>${enquiry.timestamp ? new Date(enquiry.timestamp.toDate()).toLocaleString() : 'N/A'}</div>
      <div>
        <span class="status-badge status-${enquiry.status || 'pending'}">
          ${enquiry.status || 'Pending'}
        </span>
      </div>
      <div class="action-buttons">
        <button class="btn-icon btn-view" data-id="${enquiry.id}">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-icon btn-delete" data-id="${enquiry.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

    // Add fade-in effect
    enquiryList.style.opacity = '1';

  // Attach event listeners to the newly created buttons
  enquiryList.querySelectorAll('.btn-view').forEach(button => {
    button.addEventListener('click', () => viewEnquiry(button.dataset.id));
  });

  enquiryList.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', () => deleteEnquiry(button.dataset.id));
  });
  }, 150);
}

// Set up enquiry modal
function setupEnquiryModal() {
  const modal = document.getElementById('enquiry-modal');
  const closeBtn = modal.querySelector('.close-modal');
  const cancelBtn = modal.querySelector('#cancel-response');
  const responseForm = document.getElementById('response-form');

  // Add keyboard event listener for Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
      hideEnquiryModal();
    }
  });

  closeBtn.addEventListener('click', hideEnquiryModal);
  cancelBtn.addEventListener('click', hideEnquiryModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideEnquiryModal();
    }
  });

  responseForm.addEventListener('submit', handleEnquiryResponse);
}

// Show enquiry modal
async function viewEnquiry(enquiryId) {
  try {
    const enquiryDoc = await getDoc(doc(db, 'enquiries', enquiryId));
    if (!enquiryDoc.exists()) {
      throw new Error('Enquiry not found');
    }

    const enquiry = enquiryDoc.data();
    const modal = document.getElementById('enquiry-modal');

    // Populate modal with enquiry details
    document.getElementById('modal-name').textContent = enquiry.name || 'N/A';
    document.getElementById('modal-email').textContent = enquiry.email || 'N/A';
    document.getElementById('modal-message').textContent = enquiry.message || 'N/A';
    document.getElementById('modal-date').textContent = enquiry.timestamp ? 
      new Date(enquiry.timestamp.toDate()).toLocaleString() : 'N/A';
    document.getElementById('modal-status').textContent = enquiry.status || 'Pending';
    document.getElementById('response-status').value = enquiry.status || 'pending';
    document.getElementById('response-message').value = '';

    // Store enquiry ID in form
    document.getElementById('response-form').dataset.enquiryId = enquiryId;

    // Show modal with animation
    modal.style.display = 'block';
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.opacity = '1';
    }, 10);

    // Focus on response input
    document.getElementById('response-message').focus();
  } catch (error) {
    console.error('Error loading enquiry:', error);
    utils.showMessage('Error loading enquiry details', 'error');
  }
}

// Hide enquiry modal
function hideEnquiryModal() {
  const modal = document.getElementById('enquiry-modal');
  
  // Add fade-out animation
  modal.style.opacity = '0';
  setTimeout(() => {
  modal.style.display = 'none';
  document.getElementById('response-form').reset();
  document.getElementById('response-form').dataset.enquiryId = '';
  }, 200);
}

// Handle enquiry response
async function handleEnquiryResponse(event) {
  event.preventDefault();

  try {
    const form = event.target;
    const enquiryId = form.dataset.enquiryId;
    const status = document.getElementById('response-status').value;
    const response = document.getElementById('response-message').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!enquiryId || !status || !response) {
      throw new Error('Please fill in all fields');
    }

    // Disable submit button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    // Get the original enquiry to get user email
    const enquiryDoc = await getDoc(doc(db, 'enquiries', enquiryId));
    if (!enquiryDoc.exists()) {
      throw new Error('Enquiry not found');
    }

    const enquiry = enquiryDoc.data();
    const userEmail = enquiry.email;
    const userName = enquiry.name;

    // Update enquiry in Firestore
    await updateDoc(doc(db, 'enquiries', enquiryId), {
      status,
      response,
      respondedAt: serverTimestamp(),
      respondedBy: auth.currentUser.email
    });

    // Send email to user using EmailJS
    await sendEmailToUser({
      to: userEmail,
      userName: userName,
      enquirySubject: enquiry.subject || 'Your Enquiry',
      response: response,
      status: status,
      adminEmail: auth.currentUser.email
    });

    utils.showMessage('Response sent successfully and email delivered', 'success');
    hideEnquiryModal();
    loadUserEnquiries(); // Refresh the list
  } catch (error) {
    console.error('Error sending response:', error);
    utils.showMessage(error.message || 'Error sending response', 'error');
    
    // Reset submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Response';
  }
}

// Function to send email to user using EmailJS
async function sendEmailToUser(emailData) {
  try {
    console.log('🔍 Starting email send process...');
    console.log('📧 Email data:', emailData);
    
    // Check if EmailJS is available
    if (typeof emailjs === 'undefined') {
      console.error('❌ EmailJS is not loaded! Check if the EmailJS script is included.');
      console.warn('📝 Using fallback method instead.');
      await sendEmailFallback(emailData);
      return;
    }

    console.log('✅ EmailJS is loaded successfully');

    // Check if configuration is available
    if (!window.EMAIL_CONFIG || !window.EMAIL_CONFIG.emailjs) {
      console.error('❌ Email configuration not found! Check email-config.js');
      console.warn('📝 Using fallback method instead.');
      await sendEmailFallback(emailData);
      return;
    }

    const config = window.EMAIL_CONFIG.emailjs;
    console.log('⚙️ EmailJS Config:', config);
    
    // Validate configuration
    if (!config.serviceId || !config.templateId || !config.userId) {
      console.error('❌ Missing EmailJS configuration values!');
      console.error('Service ID:', config.serviceId);
      console.error('Template ID:', config.templateId);
      console.error('User ID:', config.userId);
      throw new Error('EmailJS configuration is incomplete');
    }

    const templateParams = {
      to_email: emailData.to,
      email: emailData.to,
      user_email: emailData.to,
      recipient_email: emailData.to,
      to_name: emailData.userName,
      subject: `Response to your enquiry: ${emailData.enquirySubject}`,
      message: emailData.response,
      status: emailData.status,
      admin_email: emailData.adminEmail,
      enquiry_subject: emailData.enquirySubject
    };

    console.log('📤 Sending email with params:', templateParams);

    // Send email using EmailJS
    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.userId
    );

    console.log('✅ Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending email with EmailJS:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Log more details for 422 errors
    if (error.status === 422) {
      console.error('🔍 422 Error Details:');
      console.error('This usually means template variables don\'t match');
      console.error('Template ID:', config.templateId);
      console.error('Service ID:', config.serviceId);
      console.error('Parameters sent:', templateParams);
      console.error('Make sure your EmailJS template uses these exact variable names:');
      console.error('- {{to_name}}');
      console.error('- {{message}}');
      console.error('- {{status}}');
      console.error('- {{subject}}');
      console.error('- {{enquiry_subject}}');
    }
    
    // Try fallback method
    try {
      console.log('🔄 Trying fallback email method...');
      await sendEmailFallback(emailData);
    } catch (fallbackError) {
      console.error('❌ Fallback email method also failed:', fallbackError);
      throw new Error('Failed to send email to user');
    }
  }
}

// Fallback email sending method using a simple API
async function sendEmailFallback(emailData) {
  try {
    // Simple email sending using a webhook or form service
    const emailContent = {
      to: emailData.to,
      subject: `Response to your enquiry: ${emailData.enquirySubject}`,
      message: `
Dear ${emailData.userName},

Thank you for contacting us. We have reviewed your enquiry and here is our response:

Status: ${emailData.status}
Response: ${emailData.response}

If you have any further questions, please don't hesitate to contact us.

Best regards,
The Admin Team
      `,
      from: emailData.adminEmail
    };

    // You can use services like Formspree, Netlify Forms, or your own backend
    // For now, we'll just log the email content
    console.log('Email content (fallback):', emailContent);
    
    // If you want to actually send emails, you can use one of these services:
    
    // Option 1: Formspree
    // const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(emailContent)
    // });

    // Option 2: Your own backend API
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(emailContent)
    // });

    console.log('Email sent via fallback method (logged to console)');
  } catch (error) {
    console.error('Fallback email method failed:', error);
    throw error;
  }
}

// Delete enquiry
async function deleteEnquiry(enquiryId) {
  try {
    if (!confirm('Are you sure you want to delete this enquiry?')) {
      return;
    }

    await deleteDoc(doc(db, 'enquiries', enquiryId));
    utils.showMessage('Enquiry deleted successfully', 'success');
    loadUserEnquiries(); // Refresh the list
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    utils.showMessage('Error deleting enquiry', 'error');
  }
}

// Update the loadContent function to handle logout section
async function loadContent(section, studentId = null) {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    try {
        // Update main content section attribute
        const mainContent = document.querySelector('.main');
        mainContent.setAttribute('data-section', section);

        let content;
        switch (section) {
            case 'dashboard':
                content = await renderDashboard();
                break;
            case 'student-management':
                content = await renderStudentManagement();
                break;
            case 'student-detail':
                if (!studentId) {
                    console.error('No student ID provided for detail view');
                    return;
                }
                const student = await getStudentById(studentId);
                if (student) {
                    content = await renderStudentDetail(student);
                } else {
                    utils.showMessage('Student not found', 'error');
                    return;
                }
                break;
            case 'register-student':
                const template = document.getElementById('register-student-template');
                if (template) {
                    content = template.content.cloneNode(true);
                    const iframe = content.querySelector('#registration-frame');
                    if (iframe) {
                        // Set up message listener for iframe communication
                        const messageHandler = async (event) => {
                            // Only handle messages from our iframe
                            if (event.source === iframe.contentWindow) {
                                if (event.data && event.data.type === 'registration-complete') {
                                    // Remove the message listener to prevent duplicates
                                    window.removeEventListener('message', messageHandler);
                                    // Refresh the student list after successful registration
                                    await loadContent('student-management');
                                }
                            }
                        };
                        window.addEventListener('message', messageHandler);

                        iframe.onload = () => {
                            // Send auth state and Firebase config to iframe
                            const authState = {
                                type: 'auth-state',
                                user: auth.currentUser ? {
                                    uid: auth.currentUser.uid,
                                    email: auth.currentUser.email,
                                    emailVerified: auth.currentUser.emailVerified,
                                    isAnonymous: auth.currentUser.isAnonymous,
                                    metadata: {
                                        creationTime: auth.currentUser.metadata.creationTime,
                                        lastSignInTime: auth.currentUser.metadata.lastSignInTime
                                    }
                                } : null,
                                firebaseConfig: firebaseConfig // Share the Firebase config
                            };
                            iframe.contentWindow.postMessage(authState, '*');
                        };
                    }
                }
                break;
            case 'notifications':
                const notificationsTemplate = document.getElementById('notifications-template');
                if (notificationsTemplate) {
                    content = notificationsTemplate.content.cloneNode(true);
                    // Set up event listeners after content is added to DOM
                    setTimeout(() => {
                        document.getElementById('add-notification-btn')?.addEventListener('click', () => showNotificationModal());
                        document.querySelector('.close-modal')?.addEventListener('click', hideNotificationModal);
                        document.getElementById('notification-form')?.addEventListener('submit', handleNotificationSubmit);
                        loadNotifications();
                    }, 0);
                }
                break;
            case 'user-enquiry':
                const userEnquiryTemplate = document.getElementById('user-enquiry-template');
                if (userEnquiryTemplate) {
                    content = userEnquiryTemplate.content.cloneNode(true);
                    // Set up event listeners after content is added to DOM
                    setTimeout(() => {
                        loadUserEnquiries();
                    }, 0);
                }
                break;
            case 'grades':
                const gradesTemplate = document.getElementById('grades-template');
                if (gradesTemplate) {
                    content = gradesTemplate.content.cloneNode(true);
                    setTimeout(() => {
                        document.getElementById('create-test-form')?.addEventListener('submit', handleCreateTest);
                        loadTestsAndGrades();
                    }, 0);
                }
                break;
            case 'attendance':
                await loadAttendanceSection();
                content = null;
                break;
            case 'courses':
                const coursesTemplate = document.getElementById('courses-template');
                if (coursesTemplate) {
                    content = coursesTemplate.content.cloneNode(true);
                    setTimeout(() => {
                        setupCoursesSection();
                    }, 0);
                }
                break;
            default:
                console.log('Unknown section:', section);
                return;
        }

        // Update the content area with the rendered content
        if (typeof content === 'string') {
            contentArea.innerHTML = content;
        } else if (content instanceof Node) {
            contentArea.innerHTML = '';
            contentArea.appendChild(content);
        }

        // Attach handlers based on the section
        if (section === 'student-management') {
            attachStudentCardHandlers();
        } else if (section === 'student-detail') {
            attachStudentDetailHandlers();
        }

        // Update active state in sidebar
        document.querySelectorAll('.sidebar a').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-section') === section);
        });

    } catch (error) {
        console.error('Error loading content:', error);
        utils.showMessage('Error loading content. Please try again.', 'error');
    }
}

// Function to attach click handlers to student cards
function attachStudentCardHandlers() {
  console.log("Attaching click handlers to student cards...");
  
  // Remove all existing event listeners by cloning and replacing
  document.querySelectorAll('.student-card').forEach(card => {
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);
  });

  // Re-query for the cards after cloning
  document.querySelectorAll('.student-card').forEach(card => {
    // View details button handler
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
                const studentId = card.getAttribute('data-student-id');
        console.log("View details button clicked:", studentId);
                if (studentId) {
                    viewStudentDetails(studentId);
                } else {
                    console.error('No student ID found for this card');
                }
      });
    }

    // Delete button handler
    const deleteStudentBtn = card.querySelector('.delete-student-btn');
    if (deleteStudentBtn) {
      deleteStudentBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent card click
        e.preventDefault(); // Prevent form submission
                const studentId = card.getAttribute('data-student-id');
                if (studentId) {
        await deleteStudent(studentId);
                } else {
                    console.error('No student ID found for this card');
                }
      });
    }

    // Card click handler (for viewing details)
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking buttons
      if (e.target.closest('.view-details-btn') || e.target.closest('.delete-student-btn')) {
        return;
      }
            const studentId = card.getAttribute('data-student-id');
            if (studentId) {
                viewStudentDetails(studentId);
            } else {
                console.error('No student ID found for this card');
            }
    });
  });
}

// Function to attach handlers to student detail view
function attachStudentDetailHandlers() {
  // Back button handler
  const backButton = document.querySelector('.back-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      loadContent('student-management');
    });
  }

  // Status update handlers
  document.querySelectorAll('.status-option').forEach(button => {
    button.addEventListener('click', async (e) => {
      const studentId = e.target.closest('.student-detail-container').getAttribute('data-id');
      const newStatus = button.getAttribute('data-status');
      
      try {
        await updateStudentStatus(studentId, newStatus);
        utils.showMessage('Status updated successfully', 'success');
        // Refresh the student detail view
        loadContent('student-detail', studentId);
      } catch (error) {
        console.error('Error updating status:', error);
        utils.showMessage('Error updating status', 'error');
      }
    });
  });
}

// Event listener for sidebar navigation
document.addEventListener('DOMContentLoaded', () => {
  const sidebarLinks = document.querySelectorAll('.sidebar a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      if (section === 'logout') {
        await handleLogout();
      } else {
        await loadContent(section);
      }
    });
  });
  loadContent('dashboard');
});

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting dashboard initialization...');

  // Single auth state observer that will handle initialization
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? {
      uid: user.uid,
      email: user.email,
      isAnonymous: user.isAnonymous,
      emailVerified: user.emailVerified
    } : 'No user');

    if (!user) {
      console.log('No authenticated user, redirecting to login...');
      window.location.href = 'admin-login.html';
      return;
    }

    try {
      // Check admin status
      const isAdmin = await checkAdminAccess();
      console.log('Admin status:', isAdmin);

      if (!isAdmin) {
        console.error('User is not an admin, signing out and redirecting to login...');
        utils.showMessage('Access denied. Admin privileges required.', 'error');
        await signOut(auth);
        window.location.href = 'admin-login.html';
        return;
      }

      console.log('Admin access verified, loading dashboard content...');

      // Load the dashboard content
      await loadContent('dashboard');

      // Set up event listeners for navigation
      document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const section = e.target.getAttribute('data-section');
          if (section === 'logout') {
            handleLogout();
          } else {
            loadContent(section);
          }
        });
      });

    } catch (error) {
      console.error('Error in dashboard initialization:', error);
      utils.showMessage('Error loading dashboard. Please try again.', 'error');
      // Sign out on error
      await signOut(auth);
      window.location.href = 'admin-login.html';
    }
  });

  // Cleanup on page unload
  window.addEventListener('pagehide', () => {
    unsubscribe();
  });
});

// Function to view student details
async function viewStudentDetails(studentId) {
    if (!studentId) {
        console.error('No student ID provided for detail view');
        return;
    }

    try {
        const studentDoc = await getDoc(doc(db, 'student-registrations', studentId));
        if (!studentDoc.exists()) {
            console.error('Student not found');
            return;
        }
        const student = studentDoc.data();

        // Fetch all grades for the student
        const gradesSnapshot = await getDocs(query(collection(db, 'grades'), where('studentId', '==', studentId)));
        const grades = [];
        for (const docSnap of gradesSnapshot.docs) {
            const gradeData = docSnap.data();
            // Fetch test info for each grade
            let testName = 'Unknown', testDate = '';
            if (gradeData.testId) {
                const testDoc = await getDoc(doc(db, 'tests', gradeData.testId));
                if (testDoc.exists()) {
                    testName = testDoc.data().name || 'Unknown';
                    testDate = testDoc.data().date || '';
                }
            }
            grades.push({
                testName,
                testDate,
                grade: gradeData.grade
            });
        }
        grades.sort((a, b) => new Date(a.testDate) - new Date(b.testDate));

        // Helper function to format array or string data
        const formatData = (data) => {
            if (!data) return 'Not provided';
            if (Array.isArray(data)) return data.join(', ');
            if (typeof data === 'string') return data;
            return 'Not provided';
        };

        const modal = document.createElement('div');
        modal.className = 'student-details-modal';
        // Add chart section if grades exist
        const chartSection = grades.length ? `
            <div class="details-section">
                <h3><i class="fas fa-chart-line"></i> Progress Chart</h3>
                <canvas id="student-progress-chart" height="120"></canvas>
            </div>
        ` : '';
        modal.innerHTML = `
            <div class="student-details-content">
                <div class="student-details-header">
                    <div class="student-profile">
                        <div class="student-photo">
                            ${student.photograph ? 
                                `<img src="${student.photograph}" alt="${student.fullName}" onerror="this.parentElement.innerHTML='<div class='photo-placeholder'><i class='fas fa-user'></i></div>'">` :
                                `<div class="photo-placeholder"><i class="fas fa-user"></i></div>`
                            }
                        </div>
                        <div class="student-info">
                            <h2>${student.fullName}</h2>
                            <p class="student-id">${student.internshipId || 'No ID'}</p>
                        </div>
                    </div>
                    <button class="close-modal-btn" onclick="this.closest('.student-details-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="student-details-body">
                    <div class="details-section">
                        <h3><i class="fas fa-user"></i> Personal Information</h3>
                        <div class="details-grid">
                            <div class="detail-item">
                                <strong>Full Name</strong>
                                <p>${student.fullName}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Date of Birth</strong>
                                <p>${student.dob || 'Not provided'}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Gender</strong>
                                <p>${student.gender || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="details-section">
                        <h3><i class="fas fa-envelope"></i> Contact Information</h3>
                        <div class="details-grid">
                            <div class="detail-item">
                                <strong>Email</strong>
                                <p>${student.email}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Phone</strong>
                                <p>${student.contact || 'Not provided'}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Address</strong>
                                <p>${student.address || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="details-section">
                        <h3><i class="fas fa-graduation-cap"></i> Academic Information</h3>
                        <div class="details-grid">
                            <div class="detail-item">
                                <strong>College</strong>
                                <p>${student.college}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Branch</strong>
                                <p>${student.branch}</p>
                            </div>
                            <div class="detail-item">
                                <strong>CGPA</strong>
                                <p>${student.gpa || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="details-section">
                        <h3><i class="fas fa-code"></i> Technical Skills</h3>
                        <div class="details-grid">
                            <div class="detail-item">
                                <strong>Programming Languages</strong>
                                <p>${formatData(student.programmingLanguages)}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Tools & Software</strong>
                                <p>${formatData(student.toolsSoftware)}</p>
                            </div>
                        </div>
                    </div>

                    <div class="details-section">
                        <h3><i class="fas fa-briefcase"></i> Internship Details</h3>
                        <div class="details-grid">
                            <div class="detail-item">
                                <strong>Preferred Start Date</strong>
                                <p>${student.startDate || 'Not provided'}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Duration</strong>
                                <p>${student.duration || 'Not provided'}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Area of Interest</strong>
                                <p>${student.areaOfInterest || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="details-section">
                        <h3><i class="fas fa-file-alt"></i> Documents</h3>
                        <div class="details-grid">
                            ${student.photograph ? `
                                <a href="${student.photograph}" class="document-link" target="_blank">
                                    <i class="fas fa-id-card"></i> Photograph
                                </a>
                            ` : ''}
                            ${student.signature ? `
                                <a href="${student.signature}" class="document-link" target="_blank">
                                    <i class="fas fa-signature"></i> Signature
                                </a>
                            ` : ''}
                        </div>
                    </div>

                    <div class="details-section">
                        <h3><i class="fas fa-info-circle"></i> Additional Information</h3>
                        <div class="details-grid">
                            <div class="detail-item">
                                <strong>Registration Date</strong>
                                <p>${student.submittedAt ? new Date(student.submittedAt.toDate()).toLocaleDateString() : 'Not available'}</p>
                            </div>
                            <div class="detail-item">
                                <strong>Status</strong>
                                <p>${student.status || 'Pending'}</p>
                            </div>
                        </div>
                    </div>
                    ${chartSection}
                </div>
                <div class="student-details-footer">
                    <div class="status-buttons">
                        ${student.status !== 'pending' ? `
                            <button class="pending-btn" onclick="updateStudentStatus('${studentId}', 'pending')">
                                <i class="fas fa-clock"></i> Set Pending
                            </button>
                        ` : ''}
                        ${student.status !== 'approved' ? `
                            <button class="approve-btn" onclick="updateStudentStatus('${studentId}', 'approved')">
                                <i class="fas fa-check"></i> Approve
                            </button>
                        ` : ''}
                        ${student.status !== 'rejected' ? `
                            <button class="reject-btn" onclick="updateStudentStatus('${studentId}', 'rejected')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : ''}
                    </div>
                    <button class="delete-btn" onclick="deleteStudent('${studentId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.remove();
            }
        });

        // Render the chart if grades exist
        if (grades.length) {
            // Wait for DOM to update
            setTimeout(() => {
                const ctx = document.getElementById('student-progress-chart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: grades.map(g => g.testDate || g.testName),
                        datasets: [{
                            label: 'Grade',
                            data: grades.map(g => g.grade),
                            borderColor: '#4f46e5',
                            backgroundColor: 'rgba(79,70,229,0.1)',
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            }, 0);
        }
    } catch (error) {
        console.error('Error viewing student details:', error);
    }
}

// Check if user is admin
async function checkAdminAccess() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in');
            return false;
        }

        console.log('Checking admin access for user:', user.uid);
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        const isAdmin = adminDoc.exists();
        console.log('Admin status:', isAdmin);
        
        if (isAdmin) {
            console.log('Admin data:', adminDoc.data());
        }
        
        return isAdmin;
    } catch (error) {
        console.error('Error checking admin access:', error);
        return false;
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) {
      console.log('Notifications list element not found');
            return;
        }

    const querySnapshot = await getDocs(collection(db, 'notifications'));
    const notifications = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    renderNotifications(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
        utils.showMessage('Error loading notifications', 'error');
    }
}

// Render notifications
function renderNotifications(notifications) {
    const notificationsList = document.getElementById('notifications-list');
  if (!notificationsList) {
    console.log('Notifications list element not found');
    return;
  }

  if (notifications.length === 0) {
    notificationsList.innerHTML = '<div class="no-notifications">No notifications found</div>';
        return;
    }

  notificationsList.innerHTML = notifications
    .sort((a, b) => {
      const aTime = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate().getTime() : 0;
      const bTime = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate().getTime() : 0;
      return bTime - aTime;
    })
    .map(notification => `
      <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
        <div class="notification-content">
          <div class="notification-header">
            <h4>${notification.title || 'Notification'}</h4>
            <span class="notification-date">${notification.timestamp && typeof notification.timestamp.toDate === 'function' ? notification.timestamp.toDate().toLocaleString() : 'N/A'}</span>
          </div>
          <p>${notification.message}</p>
        </div>
        <div class="notification-actions">
          ${!notification.read ? `
            <button class="btn-icon btn-mark-read" data-id="${notification.id}">
              <i class="fas fa-check"></i>
            </button>
          ` : ''}
          <button class="btn-icon btn-delete" data-id="${notification.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

        // Add event listeners
  notificationsList.querySelectorAll('.btn-mark-read').forEach(button => {
    button.addEventListener('click', () => markNotificationAsRead(button.dataset.id));
  });

  notificationsList.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', () => deleteNotification(button.dataset.id));
  });

  notificationsList.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.notification-actions')) {
        viewNotification(item.dataset.id);
      }
    });
  });
}

// Handle notification form submission
async function handleNotificationSubmit(event) {
    event.preventDefault();
    
    try {
        // Verify admin status before proceeding
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            throw new Error('You do not have permission to create notifications');
        }

        const title = document.getElementById('notification-title').value.trim();
        const message = document.getElementById('notification-message').value.trim();
        const priority = document.getElementById('notification-priority').value;
        const notificationId = document.getElementById('notification-form').dataset.notificationId;

        if (!title || !message || !priority) {
            utils.showMessage('Please fill in all fields', 'error');
            return;
        }

        const notificationData = {
            title,
            message,
            priority,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.email
        };

        if (notificationId) {
            // Update existing notification
            const notificationRef = doc(db, 'notifications', notificationId);
            await updateDoc(notificationRef, notificationData);
            utils.showMessage('Notification updated successfully', 'success');
        } else {
            // Create new notification
            notificationData.createdAt = serverTimestamp();
            notificationData.createdBy = auth.currentUser.email;
            await addDoc(collection(db, 'notifications'), notificationData);
            utils.showMessage('Notification created successfully', 'success');
        }

        hideNotificationModal();
        loadNotifications();

    } catch (error) {
        console.error('Error saving notification:', error);
        utils.showMessage(error.message || 'Error saving notification', 'error');
    }
}

// Edit notification
function editNotification(notification) {
    const form = document.getElementById('notification-form');
    const modalTitle = document.getElementById('notification-modal-title');
    
    form.dataset.notificationId = notification.id;
    document.getElementById('notification-title').value = notification.title;
    document.getElementById('notification-message').value = notification.message;
    document.getElementById('notification-priority').value = notification.priority;
    
    modalTitle.textContent = 'Edit Notification';
    showNotificationModal();
}

// Delete notification
async function deleteNotification(notificationId) {
    try {
        // Verify admin status before proceeding
        const isAdmin = await checkAdminAccess();
        if (!isAdmin) {
            throw new Error('You do not have permission to delete notifications');
        }

        if (!confirm('Are you sure you want to delete this notification?')) {
            return;
        }

        const notificationRef = doc(db, 'notifications', notificationId);
        await deleteDoc(notificationRef);
        utils.showMessage('Notification deleted successfully', 'success');
        loadNotifications();
    } catch (error) {
        console.error('Error deleting notification:', error);
        utils.showMessage(error.message || 'Error deleting notification', 'error');
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
        utils.showMessage(error.message || 'Error marking notification as read', 'error');
    }
}

// Show notification modal
function showNotificationModal() {
    const modal = document.getElementById('notification-modal');
    modal.style.display = 'block';
}

// Hide notification modal
function hideNotificationModal() {
    const modal = document.getElementById('notification-modal');
    const form = document.getElementById('notification-form');
    
    modal.style.display = 'none';
    form.reset();
    form.dataset.notificationId = '';
    document.getElementById('notification-modal-title').textContent = 'Add New Notification';
}

// Add event listeners for notification modal
document.addEventListener('DOMContentLoaded', () => {
    const addNotificationBtn = document.getElementById('add-notification-btn');
    const notificationForm = document.getElementById('notification-form');
    const closeModalBtn = document.querySelector('.close-modal');
    const modal = document.getElementById('notification-modal');

    if (addNotificationBtn) {
        addNotificationBtn.addEventListener('click', () => {
            document.getElementById('notification-modal-title').textContent = 'Add New Notification';
            showNotificationModal();
        });
    }

    if (notificationForm) {
        notificationForm.addEventListener('submit', handleNotificationSubmit);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideNotificationModal);
    }

    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                hideNotificationModal();
            }
        });
    }
});

// Grades management: handle test creation
async function handleCreateTest(event) {
    event.preventDefault();
    const testName = document.getElementById('test-name').value.trim();
    const testDate = document.getElementById('test-date').value;
    const maxMarks = parseInt(document.getElementById('test-max-marks').value, 10);
    if (!testName || !testDate || isNaN(maxMarks) || maxMarks < 1) {
        utils.showMessage('Please fill all test fields correctly.', 'error');
        return;
    }
    try {
        await addDoc(collection(db, 'tests'), {
            name: testName,
            date: testDate,
            maxMarks: maxMarks,
            createdAt: serverTimestamp()
        });
        utils.showMessage('Test created successfully!', 'success');
        document.getElementById('create-test-form').reset();
        loadTestsAndGrades();
    } catch (error) {
        console.error('Error creating test:', error);
        utils.showMessage('Failed to create test.', 'error');
    }
}

// Grades management: load all tests and grades
async function loadTestsAndGrades() {
    const testsList = document.getElementById('tests-list');
    if (!testsList) return;
    testsList.style.display = '';
    document.getElementById('assign-grades-section').style.display = 'none';
    testsList.innerHTML = '<p>Loading tests...</p>';
    try {
        const testsSnapshot = await getDocs(query(collection(db, 'tests'), orderBy('date', 'desc')));
        if (testsSnapshot.empty) {
            testsList.innerHTML = '<p>No tests found. Create a new test above.</p>';
            return;
        }
        // Remove table headers, only render rows
        let html = '';
        testsSnapshot.forEach(doc => {
            const test = doc.data();
            html += `<div class="table-row">
                <div>${test.name}</div>
                <div>${test.date}</div>
                <div>${test.maxMarks}</div>
                <div style="display:flex;gap:0.5rem;align-items:center;">
                  <button class='btn btn-secondary assign-grades-btn' data-test-id='${doc.id}' data-test-name='${test.name}' data-max-marks='${test.maxMarks}' data-test-date='${test.date}'>Assign Marks</button>
                  <button class='btn btn-danger btn-icon delete-test-btn' data-test-id='${doc.id}'><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        });
        testsList.innerHTML = html;
        // Add event listeners for 'Assign Grades' buttons
        document.querySelectorAll('.assign-grades-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const testId = btn.getAttribute('data-test-id');
                const testName = btn.getAttribute('data-test-name');
                const maxMarks = btn.getAttribute('data-max-marks');
                const testDate = btn.getAttribute('data-test-date');
                showAssignGradesSection(testId, testName, maxMarks, testDate);
            });
        });
        // Add event listeners for delete test buttons
        document.querySelectorAll('.delete-test-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const testId = btn.getAttribute('data-test-id');
                if (!confirm('Are you sure you want to delete this test? This will also delete all related grades.')) return;
                try {
                    // Delete all grades for this test
                    const gradesQuery = query(collection(db, 'grades'), where('testId', '==', testId));
                    const gradesSnapshot = await getDocs(gradesQuery);
                    const batch = writeBatch(db);
                    gradesSnapshot.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    // Delete the test itself
                    await deleteDoc(doc(db, 'tests', testId));
                    utils.showMessage('Test and related grades deleted.', 'success');
                    loadTestsAndGrades();
                } catch (error) {
                    console.error('Error deleting test:', error);
                    utils.showMessage('Failed to delete test.', 'error');
                }
            });
        });
    } catch (error) {
        console.error('Error loading tests:', error);
        testsList.innerHTML = '<p>Error loading tests.</p>';
    }
}

// Replace showAssignGradesSection to open modal and render inside it
async function showAssignGradesSection(testId, testName, maxMarks, testDate) {
    // Show the modal
    const modal = document.getElementById('assign-grades-modal');
    const modalBody = document.getElementById('assign-grades-modal-body');
    modal.style.display = 'block';
    modal.style.opacity = '1';

    // Load all students
    const students = await getAllStudents();
    // Fetch existing grades for this test
    const gradesSnapshot = await getDocs(query(collection(db, 'grades'), where('testId', '==', testId)));
    const gradesMap = {};
    gradesSnapshot.forEach(doc => {
        const data = doc.data();
        gradesMap[data.studentId] = { id: doc.id, ...data };
    });

    // Render the assign grades UI as HTML (use class instead of id for injected fields)
    let html = '';
    html += `<div class="assign-grades-header">
        <button class="btn btn-secondary back-to-tests-modal">&larr; Back to Tests</button>
        <h2>Assign Grades: <span class="assign-test-name">${testName}</span></h2>
        <div class="assign-test-details"><strong>Date:</strong> ${testDate} &nbsp; <strong>Max Marks:</strong> ${maxMarks}</div>
    </div>`;
    html += `<div class="assign-grades-controls" style="display:flex;gap:1rem;align-items:center;">
        <input type="text" class="student-search" placeholder="Search students by name or email..." />
        <button type="button" class="btn btn-primary export-all-grades-btn"><i class="fas fa-file-pdf"></i> Export All Grades as PDF</button>
    </div>`;
    html += `<form class="assign-grades-form-section">
        <div class="grades-students-list-section"></div>
        <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Grades</button>
        </div>
    </form>`;
    modalBody.innerHTML = html;

    // Render students table
    renderGradesStudentsListSection(students, gradesMap, maxMarks);

    // Export all grades as PDF logic
    modalBody.querySelector('.export-all-grades-btn').onclick = async function() {
        // Dynamically load jsPDF and html2canvas if not present
        if (typeof window.jspdf === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        if (typeof window.html2canvas === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        // Try to load jsPDF autotable plugin for better tables
        let autoTableAvailable = false;
        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
            if (!window.jspdf.jsPDF.API.autoTable) {
                try {
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
                } catch (e) {}
            }
            autoTableAvailable = !!window.jspdf.jsPDF.API.autoTable;
        }
        // Prepare data for the table
        const tableHeaders = ['Student Name', 'Email', 'Marks'];
        const tableRows = students.map(student => {
            const marksVal = gradesMap[student.id]?.grade ?? '';
            return [student.fullName, student.email, marksVal !== '' ? marksVal : '-'];
        });
        const now = new Date();
        const formattedDate = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
        // Use jsPDF autoTable if available
        if (autoTableAvailable) {
            const pdf = new window.jspdf.jsPDF();
            // Add background color
            pdf.setFillColor(245, 248, 255); // light blueish
            pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
            // Add header bar
            pdf.setFillColor(44, 62, 80); // dark blue
            pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 32, 'F');
            // Add logo and ATITS header
            const logoImg = new Image();
            logoImg.src = 'Logo.png';
            logoImg.onload = function() {
                pdf.addImage(logoImg, 'PNG', 14, 6, 20, 20);
                pdf.setFontSize(22);
                pdf.setTextColor(255);
                pdf.setFont('helvetica', 'bold');
                pdf.text('ATITS', 40, 20);
                pdf.setFontSize(14);
                pdf.setTextColor(44, 62, 80);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Marks Report`, 14, 44);
                pdf.setFontSize(12);
                pdf.text(`Test: ${testName}`, 14, 54);
                pdf.text(`Date: ${testDate}`, 14, 62);
                // Move Max Marks to the right
                pdf.text(`Max Marks: ${maxMarks || '-'}`, pdf.internal.pageSize.getWidth() - 60, 62, { align: 'left' });
                pdf.setFontSize(10);
                // Add watermark
                pdf.setTextColor(230, 236, 245);
                pdf.setFontSize(60);
                pdf.text('ATITS', pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() / 2, { align: 'center', angle: 30 });
                pdf.setTextColor(44, 62, 80);
                pdf.autoTable({
                    head: [tableHeaders],
                    body: tableRows,
                    startY: 84,
                    styles: { fontSize: 11, cellPadding: 3, halign: 'center', valign: 'middle', fillColor: [255,255,255] },
                    headStyles: { fillColor: [44, 62, 80], textColor: 255, halign: 'center' },
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                    margin: { left: 14, right: 14 },
                    tableLineColor: [200, 200, 200],
                    tableLineWidth: 0.2,
                    didDrawPage: function (data) {
                        // Footer bar
                        pdf.setFillColor(44, 62, 80);
                        pdf.rect(0, pdf.internal.pageSize.getHeight() - 18, pdf.internal.pageSize.getWidth(), 18, 'F');
                        // Exported at (above footer)
                        pdf.setFontSize(10);
                        pdf.setTextColor(44, 62, 80);
                        pdf.text(`Exported: ${formattedDate}`, 14, pdf.internal.pageSize.getHeight() - 24);
                        // Footer text
                        pdf.setTextColor(255);
                        pdf.text(`Admin: ${(auth.currentUser && auth.currentUser.email) || ''}`, 14, pdf.internal.pageSize.getHeight() - 6);
                        const pageCount = pdf.internal.getNumberOfPages();
                        pdf.text(`Page ${data.pageNumber} of ${pageCount}`, pdf.internal.pageSize.getWidth() - 40, pdf.internal.pageSize.getHeight() - 6);
                    }
                });
                pdf.save(`${testName.replace(/\s+/g, '_')}_marks.pdf`);
            };
            // If logo fails to load, fallback to just header
            logoImg.onerror = function() {
                pdf.setFillColor(44, 62, 80);
                pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 32, 'F');
                pdf.setFontSize(22);
                pdf.setTextColor(255);
                pdf.setFont('helvetica', 'bold');
                pdf.text('ATITS', 14, 20);
                pdf.setFontSize(14);
                pdf.setTextColor(44, 62, 80);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Marks Report`, 14, 44);
                pdf.setFontSize(12);
                pdf.text(`Test: ${testName}`, 14, 54);
                pdf.text(`Date: ${testDate}`, 14, 62);
                // Move Max Marks to the right
                pdf.text(`Max Marks: ${maxMarks || '-'}`, pdf.internal.pageSize.getWidth() - 60, 62, { align: 'left' });
                pdf.setFontSize(10);
                pdf.text(`Exported: ${formattedDate}`, 14, 78);
                // Add watermark
                pdf.setTextColor(230, 236, 245);
                pdf.setFontSize(60);
                pdf.text('ATITS', pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() / 2, { align: 'center', angle: 30 });
                pdf.setTextColor(44, 62, 80);
                pdf.autoTable({
                    head: [tableHeaders],
                    body: tableRows,
                    startY: 84,
                    styles: { fontSize: 11, cellPadding: 3, halign: 'center', valign: 'middle', fillColor: [255,255,255] },
                    headStyles: { fillColor: [44, 62, 80], textColor: 255, halign: 'center' },
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                    margin: { left: 14, right: 14 },
                    tableLineColor: [200, 200, 200],
                    tableLineWidth: 0.2,
                    didDrawPage: function (data) {
                        // Footer bar
                        pdf.setFillColor(44, 62, 80);
                        pdf.rect(0, pdf.internal.pageSize.getHeight() - 18, pdf.internal.pageSize.getWidth(), 18, 'F');
                        // Exported at (above footer)
                        pdf.setFontSize(10);
                        pdf.setTextColor(44, 62, 80);
                        pdf.text(`Exported: ${formattedDate}`, 14, pdf.internal.pageSize.getHeight() - 24);
                        // Footer text
                        pdf.setTextColor(255);
                        pdf.text(`Admin: ${(auth.currentUser && auth.currentUser.email) || ''}`, 14, pdf.internal.pageSize.getHeight() - 6);
                        const pageCount = pdf.internal.getNumberOfPages();
                        pdf.text(`Page ${data.pageNumber} of ${pageCount}`, pdf.internal.pageSize.getWidth() - 40, pdf.internal.pageSize.getHeight() - 6);
                    }
                });
                pdf.save(`${testName.replace(/\s+/g, '_')}_marks.pdf`);
            };
        } else {
            // Fallback: styled html2canvas
            const table = document.createElement('table');
            table.className = 'grades-table';
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';
            table.innerHTML = `<thead><tr><th style='background:#2c3e50;color:#fff;padding:8px;border:1px solid #ccc;text-align:center;'>Student Name</th><th style='background:#2c3e50;color:#fff;padding:8px;border:1px solid #ccc;text-align:center;'>Email</th><th style='background:#2c3e50;color:#fff;padding:8px;border:1px solid #ccc;text-align:center;'>Marks</th></tr></thead><tbody>` +
                students.map((student, i) => {
                    const marksVal = gradesMap[student.id]?.grade ?? '';
                    const bg = i % 2 === 0 ? '#f5f5f5' : '#fff';
                    return `<tr style='background:${bg};'><td style='padding:8px;border:1px solid #ccc;text-align:center;'>${student.fullName}</td><td style='padding:8px;border:1px solid #ccc;text-align:center;'>${student.email}</td><td style='padding:8px;border:1px solid #ccc;text-align:center;'>${marksVal !== '' ? marksVal : '-'}</td></tr>`;
                }).join('') + '</tbody>';
            const wrapper = document.createElement('div');
            wrapper.style.padding = '20px';
            wrapper.innerHTML = `<div style='display:flex;align-items:center;margin-bottom:8px;'><img src='Logo.png' style='height:40px;margin-right:12px;'><span style='font-size:2rem;font-weight:bold;'>ATITS</span></div><h2 style='margin-bottom:0;'>Marks Report</h2><div style='margin-bottom:8px;'>Test: <b>${testName}</b></div><div style='margin-bottom:8px;'>Date: <b>${testDate}</b></div><div style='margin-bottom:8px;'>Max Marks: <b>${maxMarks || '-'}</b></div><div style='margin-bottom:8px;'>Exported: ${formattedDate}</div>`;
            wrapper.appendChild(table);
            document.body.appendChild(wrapper);
            window.html2canvas(wrapper, { scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new window.jspdf.jsPDF();
                const pageWidth = pdf.internal.pageSize.getWidth();
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pageWidth - 20;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
                pdf.save(`${testName.replace(/\s+/g, '_')}_marks.pdf`);
                document.body.removeChild(wrapper);
            });
        }
    };

    // Search/filter logic
    modalBody.querySelector('.student-search').oninput = function() {
        const search = this.value.toLowerCase();
        const filtered = students.filter(s =>
            (s.fullName && s.fullName.toLowerCase().includes(search)) ||
            (s.email && s.email.toLowerCase().includes(search))
        );
        renderGradesStudentsListSection(filtered, gradesMap, maxMarks);
    };

    // Form submit handler
    modalBody.querySelector('.assign-grades-form-section').onsubmit = async function(e) {
        e.preventDefault();
        const inputs = modalBody.querySelectorAll('.grade-input');
        let updates = 0;
        for (const input of inputs) {
            const studentId = input.getAttribute('data-student-id');
            const grade = input.value !== '' ? Number(input.value) : null;
            if (grade === null || isNaN(grade)) continue;
            if (gradesMap[studentId]) {
                await updateDoc(doc(db, 'grades', gradesMap[studentId].id), {
                    grade,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'grades'), {
                    testId,
                    studentId,
                    grade,
                    updatedAt: serverTimestamp()
                });
            }
            updates++;
        }
        utils.showMessage(updates + ' grades saved!', 'success');
        // Optionally, reload the list or stay on the page
        closeAssignGradesModal();
        loadTestsAndGrades();
    };

    // Back button
    modalBody.querySelector('.back-to-tests-modal').onclick = closeAssignGradesModal;

    // Close modal on X button
    document.getElementById('close-assign-grades-modal').onclick = closeAssignGradesModal;

    // Close modal on outside click
    modal.onclick = function(e) {
        if (e.target === modal) closeAssignGradesModal();
    };
    // Close modal on Escape key
    document.addEventListener('keydown', escModalHandler);

    function escModalHandler(e) {
        if (e.key === 'Escape') {
            closeAssignGradesModal();
            document.removeEventListener('keydown', escModalHandler);
        }
    }
}

function closeAssignGradesModal() {
    const modal = document.getElementById('assign-grades-modal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('assign-grades-modal-body').innerHTML = '';
    }, 200);
}

function renderGradesStudentsListSection(students, gradesMap, maxMarks) {
    // Use class selector for the injected container
    const gradesList = document.querySelector('.grades-students-list-section');
    // Calculate summary
    const gradeVals = students.map(student => {
        const grade = gradesMap[student.id]?.grade;
        return typeof grade === 'number' ? grade : null;
    }).filter(g => g !== null);
    const avg = gradeVals.length ? (gradeVals.reduce((a, b) => a + b, 0) / gradeVals.length).toFixed(1) : '-';
    const max = gradeVals.length ? Math.max(...gradeVals) : '-';
    const min = gradeVals.length ? Math.min(...gradeVals) : '-';
    // Render table
    let html = '<table class="grades-table" id="admin-grades-table"><thead><tr><th>Student Name</th><th>Email</th><th>Marks</th></tr></thead><tbody>';
    students.forEach(student => {
        const marksVal = gradesMap[student.id]?.grade ?? '';
        // Render input for marks, no badge
        html += `<tr><td>${student.fullName}</td><td>${student.email}</td><td><input type="number" class="grade-input" data-student-id="${student.id}" min="0" max="${maxMarks}" value="${marksVal !== '' ? marksVal : ''}" style="width:80px;" name="grade-${student.id}"></td></tr>`;
    });
    html += '</tbody>';
    html += `<tfoot><tr><td colspan="2">Summary</td><td>Avg: ${avg}<br>Max: ${max}<br>Min: ${min}</td></tr></tfoot>`;
    html += '</table>';
    gradesList.innerHTML = html;
}

// Helper to load external scripts (if not already present)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function showTestsListSection() {
    document.getElementById('assign-grades-section').style.display = 'none';
    document.getElementById('tests-list').style.display = '';
    loadTestsAndGrades();
}

// ... existing code ...

// Add after loadContent function or similar navigation logic
async function loadAttendanceSection() {
    const contentArea = document.getElementById('content-area');
    const template = document.getElementById('attendance-template');
    contentArea.innerHTML = template.innerHTML;
    const dateInput = document.getElementById('attendance-date-picker');
    const attendanceList = document.getElementById('attendance-list');
    const markAllPresentBtn = document.getElementById('mark-all-present');
    const markAllAbsentBtn = document.getElementById('mark-all-absent');
    const saveAttendanceBtn = document.getElementById('save-attendance');

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    let students = await getAllStudents();
    let attendanceMap = {};

    async function loadAttendanceForDate(date) {
        attendanceMap = {};
        const attendanceSnapshot = await getDocs(query(collection(db, 'attendance'), where('date', '==', date)));
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            attendanceMap[data.studentId] = data.status;
        });
    }

    function renderAttendanceList() {
        let html = `<table class="grades-table"><thead><tr><th>Student Name</th><th>Email</th><th>Status</th></tr></thead><tbody>`;
        students.forEach(student => {
            const status = attendanceMap[student.id] || 'absent';
            html += `<tr><td>${student.fullName}</td><td>${student.email}</td><td>
                <select class="attendance-status" data-student-id="${student.id}">
                    <option value="present" ${status === 'present' ? 'selected' : ''}>Present</option>
                    <option value="absent" ${status === 'absent' ? 'selected' : ''}>Absent</option>
                </select>
            </td></tr>`;
        });
        html += '</tbody></table>';
        attendanceList.innerHTML = html;
        // No more View Records event handlers
    }

    async function refresh() {
        await loadAttendanceForDate(dateInput.value);
        renderAttendanceList();
    }

    dateInput.onchange = refresh;
    await refresh();

    markAllPresentBtn.onclick = () => {
        students.forEach(s => attendanceMap[s.id] = 'present');
        renderAttendanceList();
    };
    markAllAbsentBtn.onclick = () => {
        students.forEach(s => attendanceMap[s.id] = 'absent');
        renderAttendanceList();
    };

    attendanceList.addEventListener('change', (e) => {
        if (e.target.classList.contains('attendance-status')) {
            const studentId = e.target.getAttribute('data-student-id');
            attendanceMap[studentId] = e.target.value;
        }
    });

    saveAttendanceBtn.onclick = async () => {
        const date = dateInput.value;
        for (const student of students) {
            const status = attendanceMap[student.id] || 'absent';
            // Find if record exists for this student/date
            const q = query(collection(db, 'attendance'), where('studentId', '==', student.id), where('date', '==', date));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                // Update existing
                await updateDoc(snapshot.docs[0].ref, { status });
            } else {
                // Add new
                await addDoc(collection(db, 'attendance'), {
                    studentId: student.id,
                    date,
                    status
                });
            }
        }
        utils.showMessage('Attendance saved!', 'success');
        await refresh();
    };
}

// Add navigation for attendance section
const attendanceSidebarLink = document.querySelector('[data-section="attendance"]');
if (attendanceSidebarLink) {
    attendanceSidebarLink.addEventListener('click', (e) => {
        e.preventDefault();
        loadAttendanceSection();
    });
}
// ... existing code ...

// In renderStudentDetail or similar function, after rendering student info, add attendance summary
async function renderStudentAttendanceSummary(studentId) {
    const attendanceSnapshot = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', studentId)));
    const records = attendanceSnapshot.docs.map(doc => doc.data());
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const percent = total ? ((present / total) * 100).toFixed(1) : '0.0';
    const html = `<div class="attendance-summary-block" style="margin:1.5rem 0 0 0;padding:1.2rem 1.5rem;background:#f8fafc;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.04);max-width:400px;">
        <h3 style="margin:0 0 0.7rem 0;font-size:1.1rem;color:#2563eb;">Attendance Summary</h3>
        <div style="display:flex;flex-wrap:wrap;gap:1.2rem;align-items:center;">
            <div><b>Total Days:</b> ${total}</div>
            <div><b>Present:</b> ${present}</div>
            <div><b>Absent:</b> ${absent}</div>
            <div><b>Attendance %:</b> ${percent}%</div>
            <div><b>Average Attendance:</b> ${percent}%</div>
        </div>
    </div>`;
    const modal = document.querySelector('.student-details-modal .student-details-body');
    if (modal) {
        // Insert after personal info or at end
        modal.insertAdjacentHTML('beforeend', html);
    }
}
// Call this in renderStudentDetail after rendering student info
const origRenderStudentDetail = renderStudentDetail;
renderStudentDetail = async function(student) {
    await origRenderStudentDetail(student);
    await renderStudentAttendanceSummary(student.id);
    // (Button logic removed)
};
// Add modal for attendance records
if (!document.getElementById('attendance-records-modal')) {
    const modalDiv = document.createElement('div');
    modalDiv.id = 'attendance-records-modal';
    modalDiv.className = 'modal';
    modalDiv.innerHTML = `
      <div class="modal-content" style="max-width:600px;">
        <div class="modal-header">
          <h3 id="attendance-modal-title">Attendance Records</h3>
          <button class="close-modal" id="close-attendance-modal">&times;</button>
        </div>
        <div class="modal-body" id="attendance-modal-body">
          <!-- Attendance table will be rendered here -->
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    document.getElementById('close-attendance-modal').onclick = () => {
        modalDiv.classList.remove('show');
        modalDiv.style.display = 'none';
    };
    modalDiv.onclick = (e) => { if (e.target === modalDiv) { modalDiv.classList.remove('show'); modalDiv.style.display = 'none'; } };
}
// Function to show attendance modal
async function showStudentAttendanceModal(studentId, fullName) {
    const modal = document.getElementById('attendance-records-modal');
    const body = document.getElementById('attendance-modal-body');
    const title = document.getElementById('attendance-modal-title');
    title.textContent = `Attendance Records for ${fullName}`;
    body.innerHTML = '<p>Loading attendance records...</p>';
    modal.style.display = 'flex';
    modal.classList.add('show');
    // Fetch attendance records
    const attendanceSnapshot = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', studentId)));
    const records = attendanceSnapshot.docs.map(doc => doc.data());
    // --- Summary Calculation ---
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const percent = total ? ((present / total) * 100).toFixed(1) : '0.0';
    let summaryHtml = `<div class="attendance-summary-block" style="margin:1.5rem 0 1.5rem 0;padding:1.2rem 1.5rem;background:#f8fafc;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.04);max-width:400px;">
        <h3 style="margin:0 0 0.7rem 0;font-size:1.1rem;color:#2563eb;">Attendance Summary</h3>
        <div style="display:flex;flex-wrap:wrap;gap:1.2rem;align-items:center;">
            <div><b>Total Days:</b> ${total}</div>
            <div><b>Present:</b> ${present}</div>
            <div><b>Absent:</b> ${absent}</div>
            <div><b>Attendance %:</b> ${percent}%</div>
            <div><b>Average Attendance:</b> ${percent}%</div>
        </div>
    </div>`;
    if (records.length === 0) {
        body.innerHTML = summaryHtml + '<p>No attendance records found.</p>';
        return;
    }
    // Sort by date descending
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    let html = '<table class="grades-table"><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>';
    records.forEach(r => {
        let statusColor = r.status === 'present' ? '#22c55e' : r.status === 'absent' ? '#facc15' : '#ef4444';
        html += `<tr><td>${r.date}</td><td><span style="padding:0.4em 1em;border-radius:20px;font-weight:600;background:${statusColor};color:#fff;">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td></tr>`;
    });
    html += '</tbody></table>';
    body.innerHTML = summaryHtml + html;
}

// --- Attendance Records Modal Creation (only once) ---
function ensureAttendanceRecordsModal() {
    let modal = document.getElementById('attendance-records-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'attendance-records-modal';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
              <h3 id="attendance-modal-title">Attendance Records</h3>
              <button class="close-modal" id="close-attendance-modal">&times;</button>
            </div>
            <div class="modal-body" id="attendance-modal-body">
              <!-- Attendance table will be rendered here -->
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        // Close logic
        document.getElementById('close-attendance-modal').onclick = () => {
            modal.classList.remove('show');
            modal.style.display = 'none';
        };
        modal.onclick = (e) => { if (e.target === modal) { modal.classList.remove('show'); modal.style.display = 'none'; } };
    }
    return modal;
}

// --- Update Attendance Table Rendering ---
// In loadAttendanceSection, update renderAttendanceList:
// ... existing code ...
function renderAttendanceList() {
    let html = `<table class="grades-table"><thead><tr><th>Student Name</th><th>Email</th><th>Status</th></tr></thead><tbody>`;
    students.forEach(student => {
        const status = attendanceMap[student.id] || 'absent';
        html += `<tr><td>${student.fullName}</td><td>${student.email}</td><td>
            <select class="attendance-status" data-student-id="${student.id}">
                <option value="present" ${status === 'present' ? 'selected' : ''}>Present</option>
                <option value="absent" ${status === 'absent' ? 'selected' : ''}>Absent</option>
            </select>
        </td></tr>`;
    });
    html += '</tbody></table>';
    attendanceList.innerHTML = html;
    // No more View Records event handlers
}
// ... existing code ...

// ... existing code ...
// --- Admin Chat Functionality ---
(function() {
  const adminChatLink = document.getElementById('chat-link');
  const adminChatPanel = document.getElementById('admin-chat-panel');
  const closeAdminChatBtn = document.getElementById('close-admin-chat');
  const adminChatStudentList = document.getElementById('admin-chat-student-list');
  const adminChatMessages = document.getElementById('admin-chat-messages');
  const adminChatInput = document.getElementById('admin-chat-input');
  const adminChatSendBtn = document.getElementById('admin-chat-send');

  let adminChatStudents = [];
  let adminActiveStudentId = null;
  let adminChatId = null;
  let adminUnsubscribeChat = null;

  // Remove: const adminChatLink = document.getElementById('chat-link');
  const chatBubble = document.getElementById('floating-chat-bubble');

  // Replace adminChatLink event listener with chatBubble event listener
  if (chatBubble && adminChatPanel) {
    chatBubble.addEventListener('click', async (e) => {
      e.preventDefault();
      adminChatPanel.style.display = 'flex';
      await loadAdminChatStudentList();
    });
  }

  if (closeAdminChatBtn) {
    closeAdminChatBtn.addEventListener('click', () => {
      adminChatPanel.style.display = 'none';
      if (adminUnsubscribeChat) adminUnsubscribeChat();
    });
  }

  async function loadAdminChatStudentList() {
    adminChatStudentList.innerHTML = '<div style="padding:1em;color:#888;">Loading students...</div>';
    adminChatStudents = await getAllStudents();
    if (!adminChatStudents.length) {
      adminChatStudentList.innerHTML = '<div style="padding:1em;color:#ef4444;">No students found.</div>';
      return;
    }
    adminChatStudentList.innerHTML = '';
    adminChatStudents.forEach(student => {
      const item = document.createElement('button');
      item.className = 'chat-student-item' + (student.id === adminActiveStudentId ? ' active' : '');
      item.textContent = student.fullName || student.email || student.id;
      item.onclick = () => selectAdminChatStudent(student.id);
      adminChatStudentList.appendChild(item);
    });
    // Auto-select first student if none selected
    if (!adminActiveStudentId && adminChatStudents.length) {
      selectAdminChatStudent(adminChatStudents[0].id);
    }
  }

  function selectAdminChatStudent(studentId) {
    if (adminActiveStudentId === studentId) return;
    adminActiveStudentId = studentId;
    // Highlight active
    adminChatStudentList.querySelectorAll('.chat-student-item').forEach(btn => {
      btn.classList.toggle('active', btn.textContent === getStudentNameById(studentId));
    });
    // Load chat
    loadAdminChatMessages();
  }
  function getStudentNameById(id) {
    const s = adminChatStudents.find(stu => stu.id === id);
    return s ? (s.fullName || s.email || s.id) : id;
  }

  if (adminChatSendBtn) {
    adminChatSendBtn.addEventListener('click', sendAdminChatMessage);
  }
  if (adminChatInput) {
    adminChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendAdminChatMessage();
    });
  }

  function getAdminId() {
    return auth.currentUser ? auth.currentUser.uid : null;
  }

  async function sendAdminChatMessage() {
    const text = adminChatInput.value.trim();
    if (!text || !adminActiveStudentId) return;
    const db = getFirestore();
    const adminId = getAdminId();
    adminChatId = `${adminId}_${adminActiveStudentId}`;
    // Ensure chat document exists with both admin and student as participants
    await ensureChatDocument(adminChatId, [adminId, adminActiveStudentId]);
    await addDoc(collection(db, 'chats', adminChatId, 'messages'), {
      senderId: adminId,
      senderRole: 'admin',
      text,
      timestamp: serverTimestamp()
    });
    adminChatInput.value = '';
  }

  function loadAdminChatMessages() {
    const db = getFirestore();
    const adminId = getAdminId();
    adminChatId = `${adminId}_${adminActiveStudentId}`;
    adminChatMessages.innerHTML = '<p style="color:#888">Loading chat...</p>';
    if (adminUnsubscribeChat) adminUnsubscribeChat();
    adminUnsubscribeChat = onSnapshot(
      query(collection(db, 'chats', adminChatId, 'messages'), orderBy('timestamp', 'asc')),
      (snapshot) => {
        adminChatMessages.innerHTML = '';
        snapshot.forEach(doc => {
          const msg = doc.data();
          const isMe = msg.senderId === adminId;
          const msgDiv = document.createElement('div');
          msgDiv.className = 'chat-message' + (isMe ? ' admin' : '');
          msgDiv.textContent = msg.text;
          adminChatMessages.appendChild(msgDiv);
        });
        adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
      }
    );
  }

  async function ensureChatDocument(chatId, participants) {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await setDoc(chatRef, { participants });
    } else {
      const data = chatSnap.data();
      if (!data.participants || !participants.every(uid => data.participants.includes(uid))) {
        await setDoc(chatRef, { participants: Array.from(new Set([...(data.participants || []), ...participants])) }, { merge: true });
      }
    }
  }
})();
// ... existing code ...

// ... existing code ...
// --- Courses CRUD Logic ---

async function loadCoursesList() {
    const coursesList = document.getElementById('courses-list');
    if (!coursesList) return;
    coursesList.innerHTML = '<p>Loading courses...</p>';
    try {
        const coursesSnapshot = await getDocs(query(collection(db, 'courses')));
        if (coursesSnapshot.empty) {
            coursesList.innerHTML = '<p>No courses found. Click "New Course" to add one.</p>';
            return;
        }
        let html = '';
        coursesSnapshot.forEach(docSnap => {
            const course = docSnap.data();
            html += `<div class="course-item" data-course-id="${docSnap.id}">
                <div class="course-header">
                    <h3>${course.title}</h3>
                    <div class="course-actions">
                        <button class="btn btn-secondary edit-course-btn" data-course-id="${docSnap.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-danger delete-course-btn" data-course-id="${docSnap.id}"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                <div class="course-body">
                    <p><strong>Description:</strong> ${course.description}</p>
                    ${course.notes ? `<p><strong>Notes:</strong> ${course.notes}</p>` : ''}
                    ${course.youtubeLinks && course.youtubeLinks.length ? `<p><strong>YouTube Links:</strong><ul>${course.youtubeLinks.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('')}</ul></p>` : ''}
                </div>
            </div>`;
        });
        coursesList.innerHTML = html;
        // Add event listeners for edit/delete
        document.querySelectorAll('.edit-course-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const courseId = btn.getAttribute('data-course-id');
                await showEditCourseModal(courseId);
            });
        });
        document.querySelectorAll('.delete-course-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const courseId = btn.getAttribute('data-course-id');
                if (confirm('Are you sure you want to delete this course?')) {
                    await deleteDoc(doc(db, 'courses', courseId));
                    utils.showMessage('Course deleted!', 'success');
                    loadCoursesList();
                }
            });
        });
    } catch (error) {
        console.error('Error loading courses:', error);
        coursesList.innerHTML = '<p>Error loading courses.</p>';
    }
}

// Show add/edit course modal
function showAddCourseModal() {
    document.getElementById('course-modal-title').textContent = 'Add New Course';
    document.getElementById('course-form').reset();
    document.getElementById('course-modal').dataset.editing = '';
    document.getElementById('course-modal').style.display = 'block';
}

async function showEditCourseModal(courseId) {
    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    if (!courseDoc.exists()) return;
    const course = courseDoc.data();
    document.getElementById('course-modal-title').textContent = 'Edit Course';
    document.getElementById('course-title').value = course.title || '';
    document.getElementById('course-description').value = course.description || '';
    document.getElementById('course-notes').value = course.notes || '';
    document.getElementById('course-youtube-links').value = (course.youtubeLinks || []).join('\n');
    document.getElementById('course-modal').dataset.editing = courseId;
    document.getElementById('course-modal').style.display = 'block';
}

// Handle add/edit course form submit
async function handleCourseFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('course-title').value.trim();
    const description = document.getElementById('course-description').value.trim();
    const notes = document.getElementById('course-notes').value.trim();
    const youtubeLinks = document.getElementById('course-youtube-links').value
        .split('\n').map(link => link.trim()).filter(link => link);
    const editingId = document.getElementById('course-modal').dataset.editing;
    try {
        if (editingId) {
            await updateDoc(doc(db, 'courses', editingId), {
                title, description, notes, youtubeLinks
            });
            utils.showMessage('Course updated!', 'success');
        } else {
            await addDoc(collection(db, 'courses'), {
                title, description, notes, youtubeLinks, createdAt: serverTimestamp()
            });
            utils.showMessage('Course added!', 'success');
        }
        document.getElementById('course-modal').style.display = 'none';
        loadCoursesList();
    } catch (error) {
        console.error('Error saving course:', error);
        utils.showMessage('Error saving course', 'error');
    }
}

// Hook up courses logic when section loads
function setupCoursesSection() {
    loadCoursesList();
    document.getElementById('add-course-btn')?.addEventListener('click', showAddCourseModal);
    document.getElementById('course-form')?.addEventListener('submit', handleCourseFormSubmit);
    document.querySelectorAll('#course-modal .close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('course-modal').style.display = 'none';
        });
    });
}
// ... existing code ...
// In loadContent, after rendering courses section:
// setTimeout(() => { setupCoursesSection(); }, 0);