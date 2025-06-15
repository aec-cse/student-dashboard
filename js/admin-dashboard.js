import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, updateDoc, deleteDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

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
        contentArea.insertBefore(messageDiv, contentArea.firstChild);

        setTimeout(() => messageDiv.remove(), 5000);
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
function renderStudentList(students) {
  if (!students || students.length === 0) {
    return `
      <div class="no-students">
        <h2>No Students Found</h2>
        <p>There are no registered students in the system.</p>
      </div>
    `;
  }

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

  return `
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
        const studentDoc = await getDoc(studentRef);
        
        if (!studentDoc.exists()) {
            throw new Error('Student not found');
        }

        const studentData = studentDoc.data();

        // Update status in student-registrations
        await updateDoc(studentRef, {
            status: newStatus,
            statusUpdatedAt: new Date().toISOString()
        });

        // If student is approved, add to students collection
        if (newStatus === 'approved') {
            const approvedStudentRef = doc(db, 'students', studentId);
            await setDoc(approvedStudentRef, {
                ...studentData,
                status: 'approved',
                approvedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
        }

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

  // Add photo and signature section
  const photoAndSignatureSection = `
    <div class="form-section">
      <h3><i class="fas fa-id-card"></i> Student Photo & Signature</h3>
      <div class="photo-signature-grid">
        <div class="photo-container">
          <h4>Photograph</h4>
          ${student.photographURL ? 
            `<img src="${student.photographURL}" alt="Student Photo" class="student-photo">` : 
            '<p class="no-image">No photo available</p>'}
        </div>
        <div class="signature-container">
          <h4>Signature</h4>
          ${student.signatureURL ? 
            `<img src="${student.signatureURL}" alt="Student Signature" class="student-signature">` : 
            '<p class="no-image">No signature available</p>'}
        </div>
      </div>
    </div>
  `;

  // Helper to render details safely, handling missing data
  const renderDetail = (label, value) => `
        <p>
            <strong>${label}</strong>
            ${value || 'N/A'}
        </p>
    `;

  // Helper to render section details
  const renderSection = (title, icon, details) => `
        <div class="form-section">
            <h3>
                <i class="fas fa-${icon}"></i>
                ${title}
            </h3>
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
            <p>
                <strong>Why do you want to join this internship?</strong>
                ${student.whyJoin || 'N/A'}
            </p>
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

  const documentChecklist = `
        <p>
            <strong>Documents Provided</strong>
            ${student.documents && student.documents.length > 0 ? student.documents.join(', ') : 'None'}
        </p>
    `;

  const officeUse = `
        ${renderDetail('Application Received On', student.applicationDate)}
        ${renderDetail('Application Status', student.applicationStatus)}
        ${renderDetail('Internship ID', student.internshipId)}
        ${renderDetail('Assigned Mentor', student.assignedMentor)}
    `;

  return `
        <div class="student-detail-container">
            <button id="back-to-list" class="back-button">
                <i class="fas fa-arrow-left"></i>
                Back to List
            </button>
            <div class="student-detail-content">
                ${photoAndSignatureSection}
                ${renderSection('Personal Information', 'user', personalInfo)}
                ${renderSection('Academic Information', 'graduation-cap', academicDetails)}
                ${renderSection('Technical Details', 'code', technicalDetails)}
                ${renderSection('Internship Preference', 'briefcase', internshipPreference)}
                ${renderSection('Additional Information', 'info-circle', additionalInfo)}
                ${renderSection('Document Checklist', 'file-alt', documentChecklist)}
                ${renderSection('Office Use', 'building', officeUse)}
                ${statusUpdateSection}
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
        break;

      case 'student-management':
        const students = await getAllStudents();
        html = `
          <div class="search-container">
            <input type="text" id="searchInput" class="search-input" placeholder="Search by Internship ID...">
          </div>
          ${renderStudentList(students)}
        `;
        break;

      case 'register-student':
        html = `
          <div class="registration-container">
            <h1><i class="fas fa-user-plus"></i> Register New Student</h1>
            <form id="studentRegistrationForm" class="registration-form">
              <!-- Personal Information -->
              <section class="form-section">
                <h2><i class="fas fa-user"></i> Personal Information</h2>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="fullName">Full Name *</label>
                    <input type="text" id="fullName" name="fullName" required>
                  </div>
                  <div class="form-group">
                    <label for="dob">Date of Birth *</label>
                    <input type="date" id="dob" name="dob" required>
                  </div>
                  <div class="form-group">
                    <label for="gender">Gender *</label>
                    <select id="gender" name="gender" required>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" required>
                  </div>
                  <div class="form-group">
                    <label for="contactNumber">Contact Number *</label>
                    <input type="tel" id="contactNumber" name="contactNumber" pattern="[0-9]{10}" maxlength="10" required>
                  </div>
                  <div class="form-group full-width">
                    <label for="address">Current Address *</label>
                    <textarea id="address" name="address" rows="3" required></textarea>
                  </div>
                  <div class="form-group">
                    <label for="zipCode">ZIP Code *</label>
                    <input type="text" id="zipCode" name="zipCode" required>
                  </div>
                </div>
              </section>

              <!-- Academic Information -->
              <section class="form-section">
                <h2><i class="fas fa-graduation-cap"></i> Academic Information</h2>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="college">College *</label>
                    <input type="text" id="college" name="college" required>
                  </div>
                  <div class="form-group">
                    <label for="degreeProgram">Degree Program *</label>
                    <select id="degreeProgram" name="degreeProgram" required>
                      <option value="">Select Degree</option>
                      <option value="BE">BE</option>
                      <option value="B.Tech">B.Tech</option>
                      <option value="MCA">MCA</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="branch">Branch/Specialization *</label>
                    <input type="text" id="branch" name="branch" required>
                  </div>
                  <div class="form-group">
                    <label for="semester">Current Semester *</label>
                    <select id="semester" name="semester" required>
                      <option value="">Select Semester</option>
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                      <option value="3">3rd Semester</option>
                      <option value="4">4th Semester</option>
                      <option value="5">5th Semester</option>
                      <option value="6">6th Semester</option>
                      <option value="7">7th Semester</option>
                      <option value="8">8th Semester</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="gpa">Aggregate GPA *</label>
                    <input type="number" id="gpa" name="gpa" step="0.01" min="0" max="10" required>
                  </div>
                  <div class="form-group">
                    <label for="graduationYear">Year of Graduation *</label>
                    <input type="number" id="graduationYear" name="graduationYear" min="2024" max="2030" required>
                  </div>
                  <div class="form-group">
                    <label for="hasBacklogs">Do you have any active backlogs? *</label>
                    <select id="hasBacklogs" name="hasBacklogs" required>
                      <option value="">Select Option</option>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div class="form-group" id="backlogCountGroup" style="display: none;">
                    <label for="backlogCount">Number of Active Backlogs</label>
                    <input type="number" id="backlogCount" name="backlogCount" min="1">
                  </div>
                </div>
              </section>

              <!-- Technical Information -->
              <section class="form-section">
                <h2><i class="fas fa-code"></i> Technical Information</h2>
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label for="programmingLanguages">Programming Languages Known *</label>
                    <textarea id="programmingLanguages" name="programmingLanguages" rows="2" placeholder="e.g., Java, Python, JavaScript, C++" required></textarea>
                  </div>
                  <div class="form-group full-width">
                    <label for="toolsSoftware">Tools/Software *</label>
                    <textarea id="toolsSoftware" name="toolsSoftware" rows="2" placeholder="e.g., VS Code, Git, Docker, MySQL" required></textarea>
                  </div>
                  <div class="form-group full-width">
                    <label for="areaOfInterest">Area of Interest *</label>
                    <textarea id="areaOfInterest" name="areaOfInterest" rows="2" placeholder="e.g., Web Development, Machine Learning, Data Science" required></textarea>
                  </div>
                </div>
              </section>

              <!-- Internship Details -->
              <section class="form-section">
                <h2><i class="fas fa-briefcase"></i> Internship Details</h2>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="preferredStartDate">Preferred Start Date *</label>
                    <input type="date" id="preferredStartDate" name="preferredStartDate" required>
                  </div>
                  <div class="form-group">
                    <label for="preferredDuration">Duration Available for Internship *</label>
                    <select id="preferredDuration" name="preferredDuration" required>
                      <option value="">Select Duration</option>
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="preferredDomain">Preferred Domain *</label>
                    <select id="preferredDomain" name="preferredDomain" required>
                      <option value="">Select Domain</option>
                      <option value="Web Development">Web Development</option>
                      <option value="App Development">App Development</option>
                      <option value="Data Analyst">Data Analyst</option>
                      <option value="Networking">Networking</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </section>

              <!-- Additional Information -->
              <section class="form-section">
                <h2><i class="fas fa-info-circle"></i> Additional Information</h2>
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label for="whyJoin">Why do you want to join this internship? *</label>
                    <textarea id="whyJoin" name="whyJoin" rows="4" required></textarea>
                  </div>
                  <div class="form-group">
                    <label for="priorExperience">Do you have any prior internship experience? *</label>
                    <select id="priorExperience" name="priorExperience" required>
                      <option value="">Select Option</option>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div id="experienceDetails" style="display: none;">
                    <div class="form-group">
                      <label for="expCompany">Company</label>
                      <input type="text" id="expCompany" name="expCompany">
                    </div>
                    <div class="form-group">
                      <label for="expDuration">Duration</label>
                      <input type="text" id="expDuration" name="expDuration" placeholder="e.g., 3 months">
                    </div>
                    <div class="form-group">
                      <label for="expRole">Role</label>
                      <input type="text" id="expRole" name="expRole">
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="hearAbout">How did you hear about us? *</label>
                    <select id="hearAbout" name="hearAbout" required>
                      <option value="">Select Option</option>
                      <option value="College">College</option>
                      <option value="Friend/Family">Friend/Family</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </section>

              <!-- Photograph and Signature -->
              <section class="form-section">
                <h2><i class="fas fa-camera"></i> Photograph and Signature</h2>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="photograph">Photograph *</label>
                    <input type="file" id="photograph" name="photograph" accept="image/*" required>
                    <div id="photographPreview" class="file-preview"></div>
                  </div>
                  <div class="form-group">
                    <label for="signature">Signature *</label>
                    <input type="file" id="signature" name="signature" accept="image/*" required>
                    <div id="signaturePreview" class="file-preview"></div>
                  </div>
                </div>
              </section>

              <div class="form-actions">
                <button type="submit" class="submit-btn">
                  <i class="fas fa-save"></i>
                  Register Student
                </button>
              </div>
            </form>
          </div>
        `;
        break;

      case 'student-detail':
        if (studentId) {
          const student = await getStudentById(studentId);
          if (student) {
            html = renderStudentDetail(student);
        } else {
            html = '<div class="error-message">Student not found</div>';
          }
        }
        break;

      default:
        html = '<div class="error-message">Section not found</div>';
    }

    contentArea.innerHTML = html;

    // Initialize form handlers if needed
    if (section === 'register-student') {
      initializeRegistrationForm();
    }

    // Initialize search functionality if needed
    if (section === 'student-management') {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
          const searchTerm = e.target.value.trim();
          const students = await getAllStudents(searchTerm);
          contentArea.innerHTML = `
            <div class="search-container">
              <input type="text" id="searchInput" class="search-input" placeholder="Search by Internship ID..." value="${searchTerm}">
            </div>
            ${renderStudentList(students)}
          `;
        });
      }
    }

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

    // Add delete button handler
    const deleteStudentBtn = card.querySelector('.delete-student-btn');
    if (deleteStudentBtn) {
      deleteStudentBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent triggering view details
        const studentId = deleteStudentBtn.dataset.id;
        const success = await deleteStudent(studentId);
        if (success) {
          // Remove the card from the UI
          card.remove();
          // Refresh the student counts
          await renderDashboard();
        }
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

// Function to delete a student
async function deleteStudent(studentId) {
    try {
        if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            return false;
        }

        const studentDocRef = doc(db, "student-registrations", studentId);
        await deleteDoc(studentDocRef);
        console.log("Student deleted successfully:", studentId);
        return true;
    } catch (error) {
        console.error("Error deleting student:", error);
        alert("Failed to delete student. Please try again.");
        return false;
    }
}

// Add function to create student account without affecting admin session
async function createStudentAccount(email, password) {
    try {
        // Store current admin user
        const currentAdmin = auth.currentUser;
        if (!currentAdmin) {
            throw new Error('Admin session not found');
        }

        // Create a new auth instance for student creation
        const studentAuth = getAuth();
        const studentApp = initializeApp(firebaseConfig, 'student-auth');
        const studentAuthInstance = getAuth(studentApp);

        // Create student account
        const userCredential = await createUserWithEmailAndPassword(studentAuthInstance, email, password);
        
        // Send password reset email
        await sendPasswordResetEmail(studentAuthInstance, email);

        // Clean up the temporary auth instance
        await studentAuthInstance.signOut();
        await studentApp.delete();

        // Verify admin is still logged in
        if (auth.currentUser?.uid !== currentAdmin.uid) {
            throw new Error('Admin session was interrupted');
        }

        return userCredential;
    } catch (error) {
        console.error('Error creating student account:', error);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('This email is already registered. Please use a different email.');
        }
        throw new Error('Failed to create student account. Please try again.');
    }
}

// Cloudinary upload function
async function uploadToCloudinary(file, previewId) {
    const url = `https://api.cloudinary.com/v1_1/deksu6n47/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "student_upload");

    const response = await fetch(url, {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    // Show preview
    if (previewId && document.getElementById(previewId)) {
        document.getElementById(previewId).innerHTML = `<img src="${data.secure_url}" alt="Uploaded Image" style="max-width: 200px; max-height: 200px;">`;
    }

    return data.secure_url;
}

// Update initializeRegistrationForm function
function initializeRegistrationForm() {
    const registrationForm = document.getElementById('studentRegistrationForm');
    if (!registrationForm) return;

    // Add file preview handlers
    const photographInput = document.getElementById('photograph');
    const signatureInput = document.getElementById('signature');

    if (photographInput) {
        photographInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('photographPreview').innerHTML = 
                        `<img src="${e.target.result}" alt="Photograph Preview" style="max-width: 200px; max-height: 200px;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (signatureInput) {
        signatureInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('signaturePreview').innerHTML = 
                        `<img src="${e.target.result}" alt="Signature Preview" style="max-width: 200px; max-height: 200px;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Add event listeners for conditional fields
    const hasBacklogsSelect = document.getElementById('hasBacklogs');
    const backlogCountGroup = document.getElementById('backlogCountGroup');
    const priorExperienceSelect = document.getElementById('priorExperience');
    const experienceDetails = document.getElementById('experienceDetails');

    if (hasBacklogsSelect && backlogCountGroup) {
        hasBacklogsSelect.addEventListener('change', (e) => {
            backlogCountGroup.style.display = e.target.value === 'Yes' ? 'block' : 'none';
            if (e.target.value === 'Yes') {
                document.getElementById('backlogCount').required = true;
            } else {
                document.getElementById('backlogCount').required = false;
            }
        });
    }

    if (priorExperienceSelect && experienceDetails) {
        priorExperienceSelect.addEventListener('change', (e) => {
            experienceDetails.style.display = e.target.value === 'Yes' ? 'block' : 'none';
            const expFields = ['expCompany', 'expDuration', 'expRole'];
            expFields.forEach(field => {
                const input = document.getElementById(field);
                if (input) {
                    input.required = e.target.value === 'Yes';
                }
            });
        });
    }

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        const submitBtn = registrationForm.querySelector('.submit-btn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        submitBtn.disabled = true;

        try {
            // Verify admin is still logged in
            const currentAdmin = auth.currentUser;
            if (!currentAdmin) {
                throw new Error('Admin session expired. Please log in again.');
            }

            // Get form data
            const formData = new FormData(registrationForm);
            
            // Upload images to Cloudinary
            const photographFile = formData.get('photograph');
            const signatureFile = formData.get('signature');

            if (!photographFile || !signatureFile) {
                throw new Error('Please upload both photograph and signature');
            }

            // Upload images
            const photographURL = await uploadToCloudinary(photographFile, 'photographPreview');
            const signatureURL = await uploadToCloudinary(signatureFile, 'signaturePreview');

            const studentData = {
                // Personal Information
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                contactNumber: formData.get('contactNumber'),
                dob: formData.get('dob'),
                gender: formData.get('gender'),
                address: formData.get('address'),
                zipCode: formData.get('zipCode'),

                // Academic Information
                college: formData.get('college'),
                degreeProgram: formData.get('degreeProgram'),
                branch: formData.get('branch'),
                semester: formData.get('semester'),
                graduationYear: parseInt(formData.get('graduationYear')),
                gpa: parseFloat(formData.get('gpa')),
                hasBacklogs: formData.get('hasBacklogs'),
                backlogCount: formData.get('hasBacklogs') === 'Yes' ? parseInt(formData.get('backlogCount')) : 0,

                // Technical Information
                programmingLanguages: formData.get('programmingLanguages').split(',').map(lang => lang.trim()),
                toolsSoftware: formData.get('toolsSoftware').split(',').map(tool => tool.trim()),
                areaOfInterest: formData.get('areaOfInterest').split(',').map(area => area.trim()),

                // Internship Details
                preferredStartDate: formData.get('preferredStartDate'),
                preferredDuration: formData.get('preferredDuration'),
                preferredDomain: formData.get('preferredDomain'),

                // Additional Information
                whyJoin: formData.get('whyJoin'),
                priorExperience: formData.get('priorExperience'),
                expCompany: formData.get('expCompany'),
                expDuration: formData.get('expDuration'),
                expRole: formData.get('expRole'),
                hearAbout: formData.get('hearAbout'),

                // Metadata
                registeredBy: currentAdmin.uid,
                registeredAt: new Date().toISOString(),
                status: 'pending',

                // Add image URLs
                photographURL: photographURL,
                signatureURL: signatureURL,
            };

            // Generate internship ID
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);
            studentData.internshipId = `INT${timestamp}${random}`;

            // Validate required fields
            const requiredFields = [
                'fullName', 'email', 'contactNumber', 'dob', 'gender', 'address', 'zipCode',
                'college', 'degreeProgram', 'branch', 'semester', 'graduationYear', 'gpa',
                'hasBacklogs', 'programmingLanguages', 'toolsSoftware', 'areaOfInterest',
                'preferredStartDate', 'preferredDuration', 'preferredDomain',
                'whyJoin', 'priorExperience', 'hearAbout'
            ];
            
            const missingFields = requiredFields.filter(field => !studentData[field]);
            if (missingFields.length > 0) {
                throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(studentData.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Validate GPA range
            if (studentData.gpa < 0 || studentData.gpa > 10) {
                throw new Error('GPA must be between 0 and 10');
            }

            // Validate graduation year
            const currentYear = new Date().getFullYear();
            if (studentData.graduationYear < currentYear || studentData.graduationYear > currentYear + 5) {
                throw new Error('Graduation year must be between current year and 5 years from now');
            }

            // Create student account
            const userCredential = await createStudentAccount(studentData.email, studentData.contactNumber);
            const userId = userCredential.user.uid;

            // Add student data to Firestore
            await addStudentRegistration(userId, studentData);

            // Verify admin is still logged in
            if (auth.currentUser?.uid !== currentAdmin.uid) {
                throw new Error('Admin session was interrupted');
            }

            // Show success message with login details
            utils.showMessage(
                `Student registered successfully!\nInternship ID: ${studentData.internshipId}\nLogin Email: ${studentData.email}\nPassword: ${studentData.contactNumber}`,
                'success'
            );
            
            // Reset form and previews
            registrationForm.reset();
            document.getElementById('photographPreview').innerHTML = '';
            document.getElementById('signaturePreview').innerHTML = '';
            if (backlogCountGroup) backlogCountGroup.style.display = 'none';
            if (experienceDetails) experienceDetails.style.display = 'none';

            // Refresh student list if it exists
            if (typeof loadStudentRegistrations === 'function') {
                await loadStudentRegistrations();
            }

        } catch (error) {
            console.error('Registration error:', error);
            utils.showMessage(error.message || 'Failed to register student. Please try again.', 'error');
            
            // If admin session was lost, redirect to login
            if (error.message.includes('session')) {
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
            }
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

async function addStudentRegistration(userId, studentData) {
    try {
        const studentRef = doc(db, 'student-registrations', userId);
        await setDoc(studentRef, {
            ...studentData,
            userId: userId,
            status: 'pending',
            registrationDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error adding student registration:', error);
        throw new Error('Failed to save student registration. Please try again.');
    }
}

// Add CSS for file previews
const style = document.createElement('style');
style.textContent = `
    .file-preview {
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #e1e8ed;
        border-radius: 8px;
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .file-preview img {
        max-width: 200px;
        max-height: 200px;
        object-fit: contain;
    }

    input[type="file"] {
        padding: 10px;
        border: 2px solid #e1e8ed;
        border-radius: 8px;
        width: 100%;
        background: #fff;
    }

    input[type="file"]:focus {
        border-color: #4CAF50;
        outline: none;
    }
`;
document.head.appendChild(style); 