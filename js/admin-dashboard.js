import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, updateDoc, deleteDoc, setDoc, addDoc, where, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail, deleteUser } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3yUUmQ7ZWZF1ODnmTd3sWlv1qjSq00zE",
  authDomain: "admin-af1fc.firebaseapp.com",
  projectId: "admin-af1fc",
  storageBucket: "admin-af1fc.appspot.com",
  messagingSenderId: "1042593739824",
  appId: "1:1042593739824:web:a3c401e02fb3578fc769f5"
};

// Initialize Firebase
let app;
let db;
let auth;

// Initialize Firebase
function initializeFirebase() {
    try {
        // Check if Firebase is already initialized
        if (getApps().length > 0) {
            console.log('Using existing Firebase instance');
            app = getApp();
            db = getFirestore(app);
            auth = getAuth(app);
            return;
        }

        // Initialize new instance
        console.log('Initializing new Firebase instance');
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        utils.showMessage('Failed to initialize application. Please refresh the page.', 'error');
        throw error;
    }
}

// Initialize Firebase immediately
initializeFirebase();

// Add utils object
const utils = {
    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;

        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.insertBefore(messageDiv, contentArea.firstChild);
            setTimeout(() => messageDiv.remove(), 5000);
        } else {
            console.error('Content area not found for message display');
        }
    },
    generateApplicationId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `APP${timestamp}${random}`;
    }
};

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

// Make functions globally available
window.updateStudentStatus = async function(studentId, newStatus) {
    try {
        const studentRef = doc(db, 'student-registrations', studentId);
    await updateDoc(studentRef, {
      status: newStatus,
            updatedAt: serverTimestamp()
        });

        // Show success message
        alert(`Student status updated to ${newStatus}`);
        
        // Close the modal
        const modal = document.querySelector('.student-details-modal');
        if (modal) {
            modal.remove();
        }

        // Refresh the student list
        await loadContent('student-management');
  } catch (error) {
    console.error('Error updating student status:', error);
        alert('Failed to update student status. Please try again.');
    }
};

window.deleteStudent = async function(studentId) {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        return;
    }

    try {
        const studentRef = doc(db, 'student-registrations', studentId);
        await deleteDoc(studentRef);

        // Show success message
        alert('Student deleted successfully');
        
        // Close the modal
        const modal = document.querySelector('.student-details-modal');
        if (modal) {
            modal.remove();
        }

        // Refresh the student list
        await loadContent('student-management');
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student. Please try again.');
    }
};

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

// Function to load content with status update handling
async function loadContent(section, studentId = null) {
  const contentArea = document.getElementById('content-area');
  const mainContent = document.querySelector('.main');
  if (!contentArea) return;

  try {
    // Update main content section attribute
    mainContent.setAttribute('data-section', section);

    let content = '';
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
      case 'logout':
        await handleLogout();
        return;
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
      const isAdmin = await checkAdminStatus();
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

// Function to handle logout
async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = 'admin-login.html';
  } catch (error) {
    console.error("Error logging out:", error);
    utils.showMessage("Logout failed. Please try again.", "error");
  }
} 

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