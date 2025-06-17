import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, updateDoc, deleteDoc, setDoc, addDoc, where, limit, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
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

    // Add a query to order by submittedAt in descending order (newest first)
    const q = query(studentCollection, orderBy("submittedAt", "desc"));
    console.log("Query created:", q);

    const querySnapshot = await getDocs(q);
    console.log("Query snapshot received:", querySnapshot);
    console.log("Number of documents:", querySnapshot.size);

    if (querySnapshot.empty) {
      console.log("No students found in the collection");
      return [];
    }

    const students = [];
    querySnapshot.forEach((doc) => {
      const studentData = doc.data();
      // If searchId is provided, filter by internshipId
      if (!searchId ||
        (studentData.internshipId &&
          studentData.internshipId.toLowerCase().includes(searchId.toLowerCase()))) {
        console.log("Processing student document:", {
          id: doc.id,
          internshipId: studentData.internshipId,
          fullName: studentData.fullName,
          email: studentData.email,
          submittedAt: studentData.submittedAt
        });
        // Include the document ID in the student data
        students.push({ 
          id: doc.id,  // This is the userId
          ...studentData,
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
        await loadStudents();
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
const closeModalBtn = document.querySelector('.close-modal');
const cancelLogoutBtn = document.getElementById('cancel-logout');
const confirmLogoutBtn = document.getElementById('confirm-logout');

// Modal Functions
function showModal() {
    logoutModal.classList.add('show');
}

function hideModal() {
    logoutModal.classList.remove('show');
}

// Event Listeners for Modal
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showModal();
});

closeModalBtn.addEventListener('click', hideModal);
cancelLogoutBtn.addEventListener('click', hideModal);

// Close modal when clicking outside
logoutModal.addEventListener('click', (e) => {
    if (e.target === logoutModal) {
        hideModal();
    }
});

// Handle logout confirmation
confirmLogoutBtn.addEventListener('click', async () => {
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
});

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

    // Update enquiry in Firestore
    await updateDoc(doc(db, 'enquiries', enquiryId), {
      status,
      response,
      respondedAt: serverTimestamp(),
      respondedBy: auth.currentUser.email
    });

    utils.showMessage('Response sent successfully', 'success');
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
                    content = renderStudentDetail(student);
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
            default:
                console.log('Unknown section:', section);
                return;
        }

        // Update the content area with the rendered content
        if (typeof content === 'string') {
            contentArea.innerHTML = content;
        } else {
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

  // Load the dashboard content by default
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
      console.log('Admin status check result:', isAdmin);

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
  window.addEventListener('unload', () => {
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

        // Helper function to format array or string data
        const formatData = (data) => {
            if (!data) return 'Not provided';
            if (Array.isArray(data)) return data.join(', ');
            if (typeof data === 'string') return data;
            return 'Not provided';
        };

        const modal = document.createElement('div');
        modal.className = 'student-details-modal';
        
        modal.innerHTML = `
            <div class="student-details-content">
                <div class="student-details-header">
                    <div class="student-profile">
                        <div class="student-photo">
                            ${student.photograph ? 
                                `<img src="${student.photograph}" alt="${student.fullName}" onerror="this.parentElement.innerHTML='<div class=\'photo-placeholder\'><i class=\'fas fa-user\'></i></div>'">` :
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
    .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
    .map(notification => `
      <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
        <div class="notification-content">
          <div class="notification-header">
            <h4>${notification.title || 'Notification'}</h4>
            <span class="notification-date">${notification.timestamp.toDate().toLocaleString()}</span>
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