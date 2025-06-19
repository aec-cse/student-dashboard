// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// DOM Elements
const studentName = document.getElementById('student-name');

const studentId = document.getElementById('student-id');
const enrolledCoursesCount = document.getElementById('enrolled-courses-count');
const averageGrade = document.getElementById('average-grade');
const attendanceRate = document.getElementById('attendance-rate');
const notificationCount = document.getElementById('notification-count');
const logoutBtn = document.getElementById('logout-btn');

// Modal Elements
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
    try {
        await signOut(auth);
        window.location.href = 'student-login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
});

// Load student data
async function loadStudentData(userId) {
    try {
        // First check student-registrations collection
        const registrationDoc = await getDoc(doc(db, 'student-registrations', userId));
        if (registrationDoc.exists()) {
            const data = registrationDoc.data();
            // If student is not approved, redirect to login
            if (data.status !== 'approved') {
                throw new Error(`Your registration is ${data.status}. Please wait for admin approval.`);
            }
            return data;
        }

        // If not in student-registrations, check students collection
        const studentDoc = await getDoc(doc(db, 'students', userId));
        if (studentDoc.exists()) {
            return studentDoc.data();
        }

        throw new Error('Student data not found');
    } catch (error) {
        console.error('Error loading student data:', error);
        throw error;
    }
}

// Load courses
async function loadCourses(studentId) {
    try {
        const enrollmentsQuery = query(
            collection(db, 'enrollments'),
            where('studentId', '==', studentId)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        return enrollmentsSnapshot.docs.length;
    } catch (error) {
        console.error('Error loading courses:', error);
        return 0;
    }
}

// Load grades
async function loadGrades(studentId) {
    try {
        const gradesQuery = query(
            collection(db, 'grades'),
            where('studentId', '==', studentId)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const grades = gradesSnapshot.docs.map(doc => doc.data().total);
        
        if (grades.length === 0) return 0;
        return (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1);
    } catch (error) {
        console.error('Error loading grades:', error);
        return 0;
    }
}

// Load attendance
async function loadAttendance(studentId) {
    try {
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('studentId', '==', studentId)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendance = attendanceSnapshot.docs.map(doc => doc.data());
        
        if (attendance.length === 0) return 0;
        const presentDays = attendance.filter(record => record.status === 'present').length;
        return ((presentDays / attendance.length) * 100).toFixed(1);
    } catch (error) {
        console.error('Error loading attendance:', error);
        return 0;
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const notificationsList = document.getElementById('notifications-list');
        const template = document.getElementById('notification-item-template');
        const searchInput = document.getElementById('notification-search');
        const priorityFilter = document.getElementById('priority-filter');
        const notificationsCount = document.getElementById('notifications-count');

        if (!notificationsList || !template) {
            console.error('Required elements not found');
            return;
        }

        // Clear existing notifications
        notificationsList.innerHTML = '';

        // Get notifications from Firestore
        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        // Update notifications count
        if (notificationsCount) {
            notificationsCount.textContent = querySnapshot.size;
        }

        if (querySnapshot.empty) {
            notificationsList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications found</p>
                </div>
            `;
            return;
        }

        // Add search and filter event listeners
        searchInput.addEventListener('input', filterNotifications);
        priorityFilter.addEventListener('change', filterNotifications);

        // Store notifications for filtering
        window.notifications = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Initial render
        renderNotifications(window.notifications);

    } catch (error) {
        console.error('Error loading notifications:', error);
        utils.showMessage('Error loading notifications', 'error');
    }
}

// Render notifications with search and filter
function renderNotifications(notifications) {
    const notificationsList = document.getElementById('notifications-list');
    const template = document.getElementById('notification-item-template');
    const searchTerm = document.getElementById('notification-search').value.toLowerCase();
    const priorityFilter = document.getElementById('priority-filter').value;

    // Clear existing notifications
    notificationsList.innerHTML = '';

    // Filter notifications
    const filteredNotifications = notifications.filter(notification => {
        const matchesSearch = notification.title.toLowerCase().includes(searchTerm) ||
                            notification.message.toLowerCase().includes(searchTerm);
        const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
        return matchesSearch && matchesPriority;
    });

    if (filteredNotifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="no-notifications">
                <i class="fas fa-search"></i>
                <p>No notifications match your search</p>
            </div>
        `;
        return;
    }

    // Render filtered notifications
    filteredNotifications.forEach(notification => {
        const clone = template.content.cloneNode(true);
        
        // Set notification content
        clone.querySelector('.notification-title').textContent = notification.title;
        clone.querySelector('.notification-message').textContent = notification.message;
        clone.querySelector('.notification-priority').textContent = notification.priority;
        clone.querySelector('.notification-priority').classList.add(notification.priority);
        clone.querySelector('.notification-date').textContent = formatDate(notification.createdAt);
        clone.querySelector('.notification-author').textContent = `By ${notification.createdBy || 'Admin'}`;

        notificationsList.appendChild(clone);
    });
}

// Filter notifications based on search and priority
function filterNotifications() {
    if (window.notifications) {
        renderNotifications(window.notifications);
    }
}

// Format date for display
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Sidebar navigation logic
function showSection(section) {
    // Toggle dashboard overview
    const dashboardOverview = document.querySelector('.dashboard-overview');
    if (dashboardOverview) dashboardOverview.style.display = section === 'dashboard' ? '' : 'none';

    // Toggle notifications section
    const notificationsSection = document.getElementById('notifications-section');
    if (notificationsSection) notificationsSection.style.display = section === 'dashboard' ? '' : 'none';

    // Toggle course progress section
    const courseProgressSection = document.getElementById('course-progress-section');
    if (courseProgressSection) courseProgressSection.style.display = section === 'dashboard' ? '' : 'none';

    // Toggle grades section
    const gradesSection = document.getElementById('grades-section');
    if (gradesSection) gradesSection.style.display = section === 'grades' ? '' : 'none';

    // Toggle nav active state
    document.querySelectorAll('.nav-item').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-section') === section);
    });

    if (section === 'grades') {
        loadStudentGrades();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('[data-section="dashboard"]').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('dashboard');
    });
    document.getElementById('grades-link').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('grades');
    });
});

// Load and display all grades for the student
async function loadStudentGrades() {
    const user = auth.currentUser;
    if (!user) return;
    const gradesList = document.getElementById('grades-list');
    gradesList.innerHTML = '<p>Loading grades...</p>';
    try {
        const gradesSnapshot = await getDocs(query(collection(db, 'grades'), where('studentId', '==', user.uid)));
        if (gradesSnapshot.empty) {
            gradesList.innerHTML = '<p>No grades found.</p>';
            return;
        }
        // Fetch test info for each grade
        const grades = [];
        for (const docSnap of gradesSnapshot.docs) {
            const gradeData = docSnap.data();
            const testDoc = await getDoc(doc(db, 'tests', gradeData.testId));
            grades.push({
                testName: testDoc.exists() ? testDoc.data().name : 'Unknown',
                testDate: testDoc.exists() ? testDoc.data().date : '',
                maxMarks: testDoc.exists() ? testDoc.data().maxMarks : '',
                grade: gradeData.grade
            });
        }
        // Calculate summary
        const gradeVals = grades.map(g => g.grade);
        const avg = gradeVals.length ? (gradeVals.reduce((a, b) => a + b, 0) / gradeVals.length).toFixed(1) : '-';
        const max = gradeVals.length ? Math.max(...gradeVals) : '-';
        const min = gradeVals.length ? Math.min(...gradeVals) : '-';
        // Render table
        let html = '<table class="grades-table" id="grades-table"><thead><tr><th>Test Name</th><th>Date</th><th>Max Marks</th><th>Your Grade</th></tr></thead><tbody>';
        grades.forEach(g => {
            let badgeClass = 'grade-badge ';
            if (g.maxMarks && typeof g.grade === 'number') {
                const percent = (g.grade / g.maxMarks) * 100;
                if (percent >= 75) badgeClass += 'high';
                else if (percent >= 50) badgeClass += 'medium';
                else badgeClass += 'low';
            } else {
                badgeClass += 'low';
            }
            html += `<tr><td>${g.testName}</td><td>${g.testDate}</td><td>${g.maxMarks}</td><td><span class="${badgeClass}">${g.grade}</span></td></tr>`;
        });
        html += '</tbody>';
        html += `<tfoot><tr><td colspan="2">Summary</td><td>Avg: ${avg}<br>Max: ${max}<br>Min: ${min}</td><td></td></tr></tfoot>`;
        html += '</table>';
        gradesList.innerHTML = html;
        // Export as PDF logic
        const exportBtn = document.getElementById('export-pdf-btn');
        if (exportBtn) {
            exportBtn.onclick = async function() {
                // Dynamically load jsPDF and html2canvas if not present
                if (typeof window.jspdf === 'undefined') {
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                }
                if (typeof window.html2canvas === 'undefined') {
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
                }
                const gradesTable = document.getElementById('grades-table');
                if (!gradesTable) return;
                // Clone the table for PDF (remove export button)
                const clone = gradesTable.cloneNode(true);
                const wrapper = document.createElement('div');
                wrapper.appendChild(clone);
                document.body.appendChild(wrapper);
                window.html2canvas(wrapper, { scale: 2 }).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new window.jspdf.jsPDF();
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const imgProps = pdf.getImageProperties(imgData);
                    const pdfWidth = pageWidth - 20;
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
                    pdf.save('marksheet.pdf');
                    document.body.removeChild(wrapper);
                });
            };
        }
    } catch (error) {
        console.error('Error loading grades:', error);
        gradesList.innerHTML = '<p>Error loading grades.</p>';
    }
}

// Helper to load external scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Update dashboard data (average grade)
async function updateDashboard(studentData) {
    try {
        // Update student info
        if (studentName) studentName.textContent = studentData.fullName || 'Student';
        const studentMsg = document.getElementById('student_msg');
        if (studentMsg) studentMsg.innerText = "Welcome " + studentData.fullName + "!";
        if (studentId) studentId.textContent = `ID: ${studentData.internshipId || 'N/A'}`;

        // Load and update stats
        const courses = await loadCourses(studentData.userId);
        const gradesSnapshot = await getDocs(query(collection(db, 'grades'), where('studentId', '==', studentData.userId)));
        let avgGrade = 0;
        let count = 0;
        gradesSnapshot.forEach(doc => {
            const g = doc.data().grade;
            if (typeof g === 'number') {
                avgGrade += g;
                count++;
            }
        });
        if (averageGrade) averageGrade.textContent = count > 0 ? (avgGrade / count).toFixed(1) : '0';
        const attendance = await loadAttendance(studentData.userId);
        const notifications = await loadNotifications();

        if (enrolledCoursesCount) enrolledCoursesCount.textContent = courses;
        if (attendanceRate) attendanceRate.textContent = `${attendance}%`;
        if (notificationCount) notificationCount.textContent = notifications;
    } catch (error) {
        console.error('Error updating dashboard:', error);
        // Don't redirect on dashboard update errors
    }
}

// Check authentication state
let isInitializing = true;

onAuthStateChanged(auth, async (user) => {
    if (isInitializing) {
        isInitializing = false;
    }

    if (!user) {
        window.location.href = 'student-login.html';
        return;
    }

    try {
        const studentData = await loadStudentData(user.uid);
        if (!studentData) {
            throw new Error('Student data not found');
        }
        await updateDashboard(studentData);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Only redirect if it's not the initial load
        if (!isInitializing) {
            await signOut(auth);
            window.location.href = 'student-login.html';
        }
    }
});

// Utility functions
const utils = {
    showMessage: (message, type = 'info') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }
};

// Initialize the dashboard
async function initDashboard() {
    try {
        await loadNotifications();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        utils.showMessage('Error loading dashboard', 'error');
    }
}

// Start the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard); 