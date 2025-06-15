// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const contentArea = document.getElementById('content-area');
const profileSection = document.getElementById('profile-section');
const coursesSection = document.getElementById('courses-section');
const attendanceSection = document.getElementById('attendance-section');
const gradesSection = document.getElementById('grades-section');
const notificationsSection = document.getElementById('notifications-section');
const logoutBtn = document.getElementById('logout-btn');
const logoutWarning = document.querySelector('.logout-warning');

// Current user data
let currentUser = null;
let userData = null;

// Authentication state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        setupNavigationListeners();
        loadDashboardContent('profile'); // Load profile by default
    } else {
        // Redirect to login if not authenticated
        window.location.href = 'student-login.html';
    }
});

// Load user data from Firestore
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'students', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            updateProfileDisplay();
        } else {
            console.error('No user data found!');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load user data. Please try again later.');
    }
}

// Update profile display
function updateProfileDisplay() {
    if (!userData) return;
    
    const profileHTML = `
        <div class="profile-card">
            <h2>Welcome, ${userData.name}</h2>
            <div class="profile-details">
                <p><strong>Student ID:</strong> ${userData.studentId}</p>
                <p><strong>Email:</strong> ${userData.email}</p>
                <p><strong>Department:</strong> ${userData.department}</p>
                <p><strong>Semester:</strong> ${userData.semester}</p>
            </div>
        </div>
    `;
    
    if (profileSection) {
        profileSection.innerHTML = profileHTML;
    }
}

// Load courses
async function loadCourses() {
    try {
        const coursesQuery = query(
            collection(db, 'enrollments'),
            where('studentId', '==', currentUser.uid)
        );

        onSnapshot(coursesQuery, (snapshot) => {
            const courses = [];
            snapshot.forEach((doc) => {
                courses.push({ id: doc.id, ...doc.data() });
            });
            updateCoursesDisplay(courses);
        });
    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Failed to load courses. Please try again later.');
    }
}

// Update courses display
function updateCoursesDisplay(courses) {
    if (!coursesSection) return;

    const coursesHTML = `
        <div class="courses-grid">
            ${courses.map(course => `
                <div class="course-card">
                    <h3>${course.courseName}</h3>
                    <p><strong>Code:</strong> ${course.courseCode}</p>
                    <p><strong>Instructor:</strong> ${course.instructor}</p>
                    <p><strong>Schedule:</strong> ${course.schedule}</p>
                    <div class="course-progress">
                        <div class="progress-bar" style="width: ${course.attendancePercentage || 0}%"></div>
                        <span>Attendance: ${course.attendancePercentage || 0}%</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    coursesSection.innerHTML = coursesHTML;
}

// Load attendance
async function loadAttendance() {
    try {
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('studentId', '==', currentUser.uid)
        );

        onSnapshot(attendanceQuery, (snapshot) => {
            const attendanceRecords = [];
            snapshot.forEach((doc) => {
                attendanceRecords.push({ id: doc.id, ...doc.data() });
            });
            updateAttendanceDisplay(attendanceRecords);
        });
    } catch (error) {
        console.error('Error loading attendance:', error);
        showError('Failed to load attendance records. Please try again later.');
    }
}

// Update attendance display
function updateAttendanceDisplay(records) {
    if (!attendanceSection) return;

    const attendanceHTML = `
        <div class="attendance-table">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Course</th>
                        <th>Status</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(record => `
                        <tr>
                            <td>${new Date(record.date).toLocaleDateString()}</td>
                            <td>${record.courseName}</td>
                            <td>${record.status}</td>
                            <td>${record.remarks || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    attendanceSection.innerHTML = attendanceHTML;
}

// Load grades
async function loadGrades() {
    try {
        const gradesQuery = query(
            collection(db, 'grades'),
            where('studentId', '==', currentUser.uid)
        );

        onSnapshot(gradesQuery, (snapshot) => {
            const grades = [];
            snapshot.forEach((doc) => {
                grades.push({ id: doc.id, ...doc.data() });
            });
            updateGradesDisplay(grades);
        });
    } catch (error) {
        console.error('Error loading grades:', error);
        showError('Failed to load grades. Please try again later.');
    }
}

// Update grades display
function updateGradesDisplay(grades) {
    if (!gradesSection) return;

    const gradesHTML = `
        <div class="grades-table">
            <table>
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Midterm</th>
                        <th>Final</th>
                        <th>Assignment</th>
                        <th>Total</th>
                        <th>Grade</th>
                    </tr>
                </thead>
                <tbody>
                    ${grades.map(grade => `
                        <tr>
                            <td>${grade.courseName}</td>
                            <td>${grade.midterm || '-'}</td>
                            <td>${grade.final || '-'}</td>
                            <td>${grade.assignment || '-'}</td>
                            <td>${grade.total || '-'}</td>
                            <td>${grade.letterGrade || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    gradesSection.innerHTML = gradesHTML;
}

// Load notifications
async function loadNotifications() {
    try {
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('studentId', '==', currentUser.uid),
            where('read', '==', false)
        );

        onSnapshot(notificationsQuery, (snapshot) => {
            const notifications = [];
            snapshot.forEach((doc) => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
            updateNotificationsDisplay(notifications);
        });
    } catch (error) {
        console.error('Error loading notifications:', error);
        showError('Failed to load notifications. Please try again later.');
    }
}

// Update notifications display
function updateNotificationsDisplay(notifications) {
    if (!notificationsSection) return;

    const notificationsHTML = `
        <div class="notifications-list">
            ${notifications.length === 0 ? 
                '<p class="no-notifications">No new notifications</p>' :
                notifications.map(notification => `
                    <div class="notification-item ${notification.type}">
                        <div class="notification-header">
                            <span class="notification-title">${notification.title}</span>
                            <span class="notification-date">${new Date(notification.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p class="notification-message">${notification.message}</p>
                    </div>
                `).join('')
            }
        </div>
    `;

    notificationsSection.innerHTML = notificationsHTML;
}

// Navigation handling
function setupNavigationListeners() {
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            loadDashboardContent(section);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

// Load dashboard content based on section
function loadDashboardContent(section) {
    // Hide all sections
    [profileSection, coursesSection, attendanceSection, gradesSection, notificationsSection].forEach(section => {
        if (section) section.style.display = 'none';
    });

    // Show selected section and load its data
    switch(section) {
        case 'profile':
            if (profileSection) profileSection.style.display = 'block';
            break;
        case 'courses':
            if (coursesSection) {
                coursesSection.style.display = 'block';
                loadCourses();
            }
            break;
        case 'attendance':
            if (attendanceSection) {
                attendanceSection.style.display = 'block';
                loadAttendance();
            }
            break;
        case 'grades':
            if (gradesSection) {
                gradesSection.style.display = 'block';
                loadGrades();
            }
            break;
        case 'notifications':
            if (notificationsSection) {
                notificationsSection.style.display = 'block';
                loadNotifications();
            }
            break;
    }
}

// Logout handling
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (logoutWarning) {
            logoutWarning.style.display = 'block';
        }
    });
}

// Logout confirmation
document.querySelector('.logout-warning .confirm')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'student-login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showError('Failed to sign out. Please try again.');
    }
});

// Cancel logout
document.querySelector('.logout-warning .cancel')?.addEventListener('click', () => {
    if (logoutWarning) {
        logoutWarning.style.display = 'none';
    }
});

// Error handling
function showError(message) {
    // You can implement a proper error notification system here
    alert(message);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    if (!currentUser) {
        window.location.href = 'student-login.html';
    }
}); 