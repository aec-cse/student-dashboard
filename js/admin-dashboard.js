import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

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
const db = getFirestore(app);
const auth = getAuth(app);

// Function to check admin status
async function checkAdminStatus() {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.error('No authenticated user found in checkAdminStatus');
      return false;
    }

    console.log('Checking admin status for user:', {
      uid: user.uid,
      email: user.email,
      isAnonymous: user.isAnonymous,
      emailVerified: user.emailVerified
    });

    try {
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      const isAdmin = adminDoc.exists();

      console.log('Admin status check result:', {
        isAdmin: isAdmin,
        adminDoc: isAdmin ? adminDoc.data() : null,
        error: null
      });

      return isAdmin;
    } catch (error) {
      console.error('Error fetching admin document:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  } catch (error) {
    console.error('Error in checkAdminStatus:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
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

    // Add a query to order by internshipId
    const q = query(studentCollection, orderBy("internshipId", "asc"));
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
        students.push({ id: doc.id, ...studentData });
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
      pending: [],
      waitlisted: []
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
      pending: groupedStudents.pending.length,
      waitlisted: groupedStudents.waitlisted.length
    });

    return groupedStudents;
  } catch (error) {
    console.error("Error fetching students by status:", error);
    return {
      approved: [],
      rejected: [],
      pending: [],
      waitlisted: []
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
            <div class="student-card dashboard-card" data-id="${student.id}">
                <div class="student-info">
                    <h3>${student.fullName || 'N/A'}</h3>
                </div>
            </div>
        `).join('');
  }

  // Full card for student management view
  return students.map(student => `
        <div class="student-card" data-id="${student.id}">
            <div class="student-info">
                <div class="student-header">
                    <h3>${student.internshipId || 'ID not provided'}</h3>
                    <span class="status-badge ${student.status || 'pending'}">${student.status || 'Pending'}</span>
                </div>
                <p><strong>Name:</strong> ${student.fullName || 'N/A'}</p>
                <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
                <p><strong>College:</strong> ${student.college || 'N/A'}</p>
                <p><strong>Submitted:</strong> ${new Date(student.submittedAt).toLocaleDateString()}</p>
            </div>
            <button class="view-details-btn">View Details</button>
        </div>
    `).join('');
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
      pending: studentsByStatus.pending.length,
      waitlisted: studentsByStatus.waitlisted.length
    };

    return `
            <div class="dashboard-container">
                <h1>Welcome, Admin!</h1>
                
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
                    <div class="stat-card waitlisted">
                        <i class="fas fa-hourglass-half"></i>
                        <div class="stat-info">
                            <h3>Waitlisted</h3>
                            <p>${stats.waitlisted}</p>
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
                        <h2><i class="fas fa-hourglass-half"></i> Waitlisted Students (${stats.waitlisted})</h2>
                        <div class="student-list">
                            ${renderStatusStudentList(studentsByStatus.waitlisted, true)}
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
    console.error("Error rendering dashboard:", error);
    return `<div class="error-message">Error loading dashboard. Please try again.</div>`;
  }
}

// Function to render the student list
function renderStudentList(students) {
  if (!students || students.length === 0) {
    return `
      <div class="no-students">
        <h2>No Students Found</h2>
        <p>There are no registered students in the system.</p>
      </div>
    `;
  }

  // Add search bar
  const searchHtml = `
    <div class="search-container">
      <input type="text" id="studentSearch" placeholder="Search by Internship ID..." class="search-input">
    </div>
  `;

  const studentCards = students.map(student => `
    <div class="student-card" data-id="${student.id}">
      <div class="student-info">
        <div class="student-header">
          <h3>${student.internshipId || 'ID not provided'}</h3>
          <span class="status-badge ${student.status || 'pending'}">${student.status || 'Pending'}</span>
        </div>
        <p><strong>Name:</strong> ${student.fullName || 'N/A'}</p>
        <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
        <p><strong>College:</strong> ${student.college || 'N/A'}</p>
        <p><strong>Branch:</strong> ${student.branch || 'N/A'}</p>
        <p><strong>Semester:</strong> ${student.semester || 'N/A'}</p>
        <p><strong>Submitted:</strong> ${new Date(student.submittedAt).toLocaleDateString()}</p>
      </div>
      <button class="view-details-btn">View Details</button>
    </div>
  `).join('');

  return `
    ${searchHtml}
    <div class="student-list">
      ${studentCards}
    </div>
  `;
}

// Function to update student status
async function updateStudentStatus(studentId, newStatus) {
  try {
    console.log(`Updating status for student ${studentId} to ${newStatus}`);
    const studentRef = doc(db, "student-registrations", studentId);
    await updateDoc(studentRef, {
      status: newStatus,
      statusUpdatedAt: new Date().toISOString()
    });
    console.log('Status updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating student status:', error);
    throw error;
  }
}

// Function to render student detail with status update controls
function renderStudentDetail(student) {
  if (!student) {
    return '<div class="error-message">Student not found</div>';
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: 'clock', color: '#f1c40f' },
    { value: 'approved', label: 'Approved', icon: 'check-circle', color: '#2ecc71' },
    { value: 'waitlisted', label: 'Waitlisted', icon: 'hourglass-half', color: '#e67e22' },
    { value: 'rejected', label: 'Rejected', icon: 'times-circle', color: '#e74c3c' }
  ];

  const currentStatus = student.status?.toLowerCase() || 'pending';
  const statusUpdateSection = `
        <div class="status-update-section">
            <h3>Update Status</h3>
            <div class="status-options">
                ${statusOptions.map(option => `
                    <button 
                        class="status-option ${currentStatus === option.value ? 'active' : ''}"
                        data-status="${option.value}"
                        style="--status-color: ${option.color}"
                    >
                        <i class="fas fa-${option.icon}"></i>
                        ${option.label}
                    </button>
                `).join('')}
            </div>
            <div id="statusUpdateMessage" class="status-message"></div>
        </div>
    `;

  // Helper to render details safely, handling missing data
  const renderDetail = (label, value) => `
        <p><strong>${label}:</strong> ${value || 'N/A'}</p>
    `;

  // Helper to render section details
  const renderSection = (title, details) => `
        <div class="form-section">
            <h3>${title}</h3>
            ${details}
        </div>
    `;

  const personalInfo = `
        ${renderDetail('Full Name', student.fullName)}
        ${renderDetail('Date of Birth', student.dob)}
        ${renderDetail('Gender', student.gender)}
        ${renderDetail('Email', student.email)}
        ${renderDetail('Contact Number', student.contact)}
        ${renderDetail('Current Address', student.address)}
        ${renderDetail('ZIP Code', student.zipCode)}
    `;

  const academicDetails = `
        ${renderDetail('College', student.college)}
        ${renderDetail('Degree Program', student.degreeProgram)}
        ${renderDetail('Branch/Specialization', student.branch)}
        ${renderDetail('Current Semester', student.semester)}
        ${renderDetail('Aggregate GPA', student.gpa)}
        ${renderDetail('Year of Graduation', student.graduationYear)}
        ${renderDetail('Active Backlogs', student.hasBacklogs)}
        ${student.hasBacklogs === 'Yes' ? renderDetail('Number of Active Backlogs', student.backlogCount) : ''}
    `;

  const technicalDetails = `
        ${renderDetail('Programming Languages Known', student.programmingLanguages)}
        ${renderDetail('Tools/Software', student.toolsSoftware)}
        ${renderDetail('Area of Interest', student.areaOfInterest)}
    `;

  const internshipPreference = `
        ${renderDetail('Preferred Start Date', student.startDate)}
        ${renderDetail('Duration Available', student.duration)}
        ${renderDetail('Preferred Domain', student.preferredDomain)}
    `;

  const additionalInfo = `
        <div class="form-group full-width">
            <label>Why do you want to join this internship?</label>
            <p>${student.whyJoin || 'N/A'}</p>
        </div>
        ${renderDetail('Prior Internship Experience', student.priorExperience)}
        ${student.priorExperience === 'Yes' ? `
            <div id="experienceDetails">
                ${renderDetail('Company', student.expCompany)}
                ${renderDetail('Duration', student.expDuration)}
                ${renderDetail('Role', student.expRole)}
            </div>
        ` : ''}
        ${renderDetail('How did you hear about us?', student.hearAbout)}
    `;

  // Documents (Displaying keys for now, actual retrieval would be needed)
  const documentChecklist = `
        <p><strong>Documents Provided:</strong> ${student.documents && student.documents.length > 0 ? student.documents.join(', ') : 'None'}</p>
    `;

  // Office Use (Admin Section)
  const officeUse = `
        ${renderDetail('Application Received On', student.applicationDate)}
        ${renderDetail('Application Status', student.applicationStatus)}
        ${renderDetail('Internship ID', student.internshipId)}
        ${renderDetail('Assigned Mentor', student.assignedMentor)}
    `;

  return `
        <div class="student-detail-container">
            <button id="back-to-list" class="back-button">
                <i class="fas fa-arrow-left"></i> Back to Student List
            </button>
            
            <div class="student-detail-header">
                <h1>Student Details: ${student.fullName || 'N/A'}</h1>
                ${statusUpdateSection}
            </div>

            <div class="student-details">
                ${renderSection('Personal Information', personalInfo)}
                ${renderSection('Academic Details', academicDetails)}
                ${renderSection('Technical Details', technicalDetails)}
                ${renderSection('Internship Preference', internshipPreference)}
                ${renderSection('Additional Information', additionalInfo)}
                ${renderSection('Document Checklist', documentChecklist)}
                ${renderSection('Office Use (Admin)', officeUse)}
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
  console.log("Loading content for section:", section, "studentId:", studentId);
  const contentArea = document.getElementById('content-area');
  if (!contentArea) {
    console.error("Content area element not found!");
    return;
  }

  contentArea.innerHTML = '<p>Loading...</p>';

  // Remove active class from all sidebar links
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.classList.remove('active');
  });

  // Add active class to the clicked link if not viewing a specific student
  if (!studentId) {
    const activeLink = document.querySelector(`.sidebar a[data-section="${section}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  let html = '';
  try {
    switch (section) {
      case 'dashboard':
        html = await renderDashboard();
        // Add click handlers for student cards in dashboard
        setTimeout(() => {
          attachStudentCardHandlers();
        }, 0);
        break;
      case 'student-management':
        if (studentId) {
          const student = await getStudentById(studentId);
          html = renderStudentDetail(student);

          // Add event listeners for status update buttons
          setTimeout(() => {
            const statusButtons = document.querySelectorAll('.status-option');
            const statusMessage = document.getElementById('statusUpdateMessage');

            statusButtons.forEach(button => {
              button.addEventListener('click', async () => {
                const newStatus = button.dataset.status;
                const currentStatus = student.status?.toLowerCase() || 'pending';

                if (newStatus === currentStatus) {
                  return;
                }

                try {
                  button.disabled = true;
                  statusMessage.innerHTML = '<p class="updating">Updating status...</p>';

                  await updateStudentStatus(studentId, newStatus);

                  // Update UI
                  statusButtons.forEach(btn => btn.classList.remove('active'));
                  button.classList.add('active');

                  // Update status badge if it exists
                  const statusBadge = document.querySelector('.status-badge');
                  if (statusBadge) {
                    statusBadge.className = `status-badge ${newStatus}`;
                    statusBadge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                  }

                  statusMessage.innerHTML = '<p class="success">Status updated successfully!</p>';

                  // Refresh the dashboard if we're on it
                  if (document.querySelector('.dashboard-container')) {
                    loadContent('dashboard');
                  }
                } catch (error) {
                  console.error('Error updating status:', error);
                  statusMessage.innerHTML = '<p class="error">Error updating status. Please try again.</p>';
                } finally {
                  button.disabled = false;
                  // Clear message after 3 seconds
                  setTimeout(() => {
                    statusMessage.innerHTML = '';
                  }, 3000);
                }
              });
            });
          }, 0);
        } else {
          html = await renderStudentManagement();
          // Add click handlers for student cards in student management
          setTimeout(() => {
            attachStudentCardHandlers();
          }, 0);
        }
        break;
      case 'logout':
        handleLogout();
        return;
      default:
        html = `<h1>Page Not Found</h1>`;
        break;
    }

    contentArea.innerHTML = html;

    // Add back button handler
    const backButton = document.getElementById('back-to-list');
    if (backButton) {
      backButton.addEventListener('click', () => {
        loadContent('student-management');
      });
    }
  } catch (error) {
    console.error("Error loading content:", error);
    contentArea.innerHTML = '<div class="error-message">Error loading content. Please try again.</div>';
  }
}

// Function to attach click handlers to student cards
function attachStudentCardHandlers() {
  console.log("Attaching click handlers to student cards...");
  const studentCards = document.querySelectorAll('.student-card');
  console.log("Found student cards:", studentCards.length);

  studentCards.forEach(card => {
    // Remove any existing click handlers
    card.replaceWith(card.cloneNode(true));
  });

  // Re-query for the cards after cloning
  document.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking the view details button
      if (e.target.classList.contains('view-details-btn')) {
        return;
      }

      const clickedStudentId = card.getAttribute('data-id');
      console.log("Student card clicked:", clickedStudentId);
      loadContent('student-management', clickedStudentId);
    });

    // Add separate click handler for the view details button
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        const clickedStudentId = card.getAttribute('data-id');
        console.log("View details button clicked:", clickedStudentId);
        loadContent('student-management', clickedStudentId);
      });
    }
  });
}

// Event listener for sidebar navigation
document.addEventListener('DOMContentLoaded', () => {
  const sidebarLinks = document.querySelectorAll('.sidebar a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      if (section) {
        loadContent(section);
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

  // Cleanup function to unsubscribe from auth state changes when the page is unloaded
  window.addEventListener('unload', () => {
    console.log('Unsubscribing from auth state changes...');
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