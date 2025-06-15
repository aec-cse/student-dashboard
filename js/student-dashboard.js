// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

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
const contentArea = document.getElementById('content-area');
const welcomeMessage = document.getElementById('welcome-message');
const studentName = document.getElementById('student-name');
const studentId = document.getElementById('student-id');

// Utility Functions
function showMessage(message, type = 'error') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    contentArea.insertBefore(messageDiv, contentArea.firstChild);
    setTimeout(() => messageDiv.remove(), 5000);
}

// Load student data
async function loadStudentData(userId) {
    try {
        // First check student-registrations collection
        const registrationDoc = await getDoc(doc(db, 'student-registrations', userId));
        if (registrationDoc.exists()) {
            const data = registrationDoc.data();
            // If student is approved, check students collection
            if (data.status === 'approved') {
                const studentDoc = await getDoc(doc(db, 'students', userId));
                if (studentDoc.exists()) {
                    return studentDoc.data();
                }
            }
            // If not approved or not in students collection, return registration data
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
        const enrollments = enrollmentsSnapshot.docs.map(doc => doc.data());

        const courses = [];
        for (const enrollment of enrollments) {
            const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
            if (courseDoc.exists()) {
                courses.push({
                    id: courseDoc.id,
                    ...courseDoc.data()
                });
            }
        }
        return courses;
    } catch (error) {
        console.error('Error loading courses:', error);
        throw error;
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
        return gradesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading grades:', error);
        throw error;
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
        return attendanceSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading attendance:', error);
        throw error;
    }
}

// Load notifications
async function loadNotifications(studentId) {
    try {
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('studentId', '==', studentId)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        return notificationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error loading notifications:', error);
        throw error;
    }
}

// Load content based on section
async function loadContent(section, studentData) {
    try {
        const template = document.getElementById(`${section}-template`);
        if (!template) {
            throw new Error('Template not found');
        }

        contentArea.innerHTML = '';
        const content = template.content.cloneNode(true);
        contentArea.appendChild(content);

        switch (section) {
            case 'overview':
                await loadOverviewContent(studentData);
                break;
            case 'courses':
                await loadCoursesContent(studentData);
                break;
            case 'grades':
                await loadGradesContent(studentData);
                break;
            case 'attendance':
                await loadAttendanceContent(studentData);
                break;
            case 'profile':
                await loadProfileContent(studentData);
                break;
        }
    } catch (error) {
        console.error(`Error loading ${section} content:`, error);
        showMessage(`Error loading ${section}. Please try again.`);
    }
}

// Load overview content
async function loadOverviewContent(studentData) {
    try {
        const courses = await loadCourses(studentData.userId);
        const grades = await loadGrades(studentData.userId);
        const attendance = await loadAttendance(studentData.userId);
        const notifications = await loadNotifications(studentData.userId);

        // Update stats
        document.getElementById('enrolled-courses-count').textContent = courses.length;
        
        // Calculate average grade
        if (grades.length > 0) {
            const average = grades.reduce((sum, grade) => sum + grade.total, 0) / grades.length;
            document.getElementById('average-grade').textContent = average.toFixed(2);
        }

        // Calculate attendance rate
        if (attendance.length > 0) {
            const presentDays = attendance.filter(record => record.status === 'present').length;
            const attendanceRate = (presentDays / attendance.length) * 100;
            document.getElementById('attendance-rate').textContent = `${attendanceRate.toFixed(1)}%`;
        }

        // Update notification count
        document.getElementById('notification-count').textContent = notifications.length;

        // Load recent activity
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '';

        // Combine and sort activities
        const activities = [
            ...grades.map(grade => ({
                type: 'grade',
                date: grade.updatedAt,
                message: `Grade updated for ${grade.courseName}: ${grade.total}`
            })),
            ...attendance.map(record => ({
                type: 'attendance',
                date: record.date,
                message: `Attendance marked: ${record.status} for ${record.courseName}`
            })),
            ...notifications.map(notification => ({
                type: 'notification',
                date: notification.createdAt,
                message: notification.message
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date))
         .slice(0, 5);

        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <i class="fas fa-${activity.type === 'grade' ? 'chart-bar' : 
                                  activity.type === 'attendance' ? 'calendar-check' : 
                                  'bell'}"></i>
                <div class="activity-content">
                    <p>${activity.message}</p>
                    <small>${new Date(activity.date).toLocaleDateString()}</small>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Error loading overview content:', error);
        showMessage('Error loading overview data. Please try again.');
    }
}

// Load courses content
async function loadCoursesContent(studentData) {
    try {
        const courses = await loadCourses(studentData.userId);
        const coursesList = document.getElementById('courses-list');
        coursesList.innerHTML = '';

        courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.innerHTML = `
                <h3>${course.courseName}</h3>
                <p class="course-code">${course.courseCode}</p>
                <div class="course-details">
                    <p><i class="fas fa-user"></i> ${course.instructor}</p>
                    <p><i class="fas fa-clock"></i> ${course.schedule}</p>
                    <p><i class="fas fa-graduation-cap"></i> ${course.credits} Credits</p>
                </div>
                <p class="course-description">${course.description}</p>
            `;
            coursesList.appendChild(courseCard);
        });
    } catch (error) {
        console.error('Error loading courses content:', error);
        showMessage('Error loading courses. Please try again.');
    }
}

// Load grades content
async function loadGradesContent(studentData) {
    try {
        const grades = await loadGrades(studentData.userId);
        const gradesTableBody = document.getElementById('grades-table-body');
        gradesTableBody.innerHTML = '';

        grades.forEach(grade => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${grade.courseName}</td>
                <td>${grade.midterm || 'N/A'}</td>
                <td>${grade.final || 'N/A'}</td>
                <td>${grade.assignment || 'N/A'}</td>
                <td>${grade.total || 'N/A'}</td>
                <td class="${grade.letterGrade ? 'text-' + getGradeClass(grade.letterGrade) : ''}">
                    ${grade.letterGrade || 'N/A'}
                </td>
            `;
            gradesTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading grades content:', error);
        showMessage('Error loading grades. Please try again.');
    }
}

// Load attendance content
async function loadAttendanceContent(studentData) {
    try {
        const attendance = await loadAttendance(studentData.userId);
        
        // Calculate attendance statistics
        const totalDays = attendance.length;
        const presentDays = attendance.filter(record => record.status === 'present').length;
        const absentDays = attendance.filter(record => record.status === 'absent').length;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        // Update summary cards
        document.getElementById('overall-attendance').textContent = `${attendanceRate.toFixed(1)}%`;
        document.getElementById('present-days').textContent = presentDays;
        document.getElementById('absent-days').textContent = absentDays;

        // Update attendance table
        const attendanceTableBody = document.getElementById('attendance-table-body');
        attendanceTableBody.innerHTML = '';

        attendance.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(record.date).toLocaleDateString()}</td>
                <td>${record.courseName}</td>
                <td class="text-${getStatusClass(record.status)}">${record.status}</td>
                <td>${record.remarks || '-'}</td>
            `;
            attendanceTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading attendance content:', error);
        showMessage('Error loading attendance data. Please try again.');
    }
}

// Load profile content
async function loadProfileContent(studentData) {
    try {
        // Update profile header
        document.getElementById('profile-name').textContent = studentData.fullName;
        document.getElementById('profile-id').textContent = `Student ID: ${studentData.internshipId}`;
        document.getElementById('profile-email').textContent = `Email: ${studentData.email}`;

        // Update profile image if available
        if (studentData.photographURL) {
            document.getElementById('student-photo').src = studentData.photographURL;
        }

        // Update personal information
        document.getElementById('profile-full-name').textContent = studentData.fullName;
        document.getElementById('profile-dob').textContent = new Date(studentData.dob).toLocaleDateString();
        document.getElementById('profile-gender').textContent = studentData.gender;
        document.getElementById('profile-contact').textContent = studentData.contactNumber;

        // Update academic information
        document.getElementById('profile-college').textContent = studentData.college;
        document.getElementById('profile-degree').textContent = studentData.degreeProgram;
        document.getElementById('profile-branch').textContent = studentData.branch;
        document.getElementById('profile-semester').textContent = studentData.semester;
    } catch (error) {
        console.error('Error loading profile content:', error);
        showMessage('Error loading profile data. Please try again.');
    }
}

// Helper functions
function getGradeClass(grade) {
    if (grade >= 'A') return 'success';
    if (grade >= 'B') return 'info';
    if (grade >= 'C') return 'warning';
    return 'danger';
}

function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'present': return 'success';
        case 'late': return 'warning';
        case 'absent': return 'danger';
        default: return 'info';
    }
}

// Handle navigation
document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', async (e) => {
        e.preventDefault();
        const section = e.target.closest('a').getAttribute('data-section');
        
        if (section === 'logout') {
            try {
                await signOut(auth);
                window.location.href = 'student-login.html';
            } catch (error) {
                console.error('Error signing out:', error);
                showMessage('Error signing out. Please try again.');
            }
            return;
        }

        // Update active state
        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        e.target.closest('a').classList.add('active');

        // Load content
        const user = auth.currentUser;
        if (user) {
            const studentData = await loadStudentData(user.uid);
            await loadContent(section, studentData);
        }
    });
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'student-login.html';
            return;
        }

        try {
            // Load student data
            const studentData = await loadStudentData(user.uid);
            
            // Update header
            welcomeMessage.textContent = `Welcome, ${studentData.fullName}`;
            studentName.textContent = studentData.fullName;
            studentId.textContent = `ID: ${studentData.internshipId}`;

            // Load initial content (overview)
            await loadContent('overview', studentData);
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            showMessage('Error loading dashboard. Please try again.');
            await signOut(auth);
            window.location.href = 'student-login.html';
        }
    });

    // Cleanup
    return () => unsubscribe();
}); 