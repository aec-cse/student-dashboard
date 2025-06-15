// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
async function loadNotifications(studentId) {
    try {
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('studentId', '==', studentId)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        return notificationsSnapshot.docs.length;
    } catch (error) {
        console.error('Error loading notifications:', error);
        return 0;
    }
}

// Update dashboard data
async function updateDashboard(studentData) {
    try {
        // Update student info
        studentName.textContent = studentData.fullName || 'Student';
        studentId.textContent = `ID: ${studentData.internshipId || 'N/A'}`;

        // Load and update stats
        const courses = await loadCourses(studentData.userId);
        const grades = await loadGrades(studentData.userId);
        const attendance = await loadAttendance(studentData.userId);
        const notifications = await loadNotifications(studentData.userId);

        enrolledCoursesCount.textContent = courses;
        averageGrade.textContent = grades;
        attendanceRate.textContent = `${attendance}%`;
        notificationCount.textContent = notifications;
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