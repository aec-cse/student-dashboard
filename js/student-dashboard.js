import { initializeFirebase } from './services/firebase-config.js';
import { 
    subscribeToAuthState, 
    signOutUser, 
    checkAuthAndRole 
} from './services/auth-service.js';
import { getRegistrationById } from './services/student-service.js';
import { handleError, showMessage } from './utils/common.js';

// Initialize Firebase when the script loads
initializeFirebase().catch(error => {
    console.error('Failed to initialize Firebase:', error);
    showMessage('Failed to initialize the application. Please refresh the page.', 'error');
});

// Dashboard state
let currentUser = null;
let userData = null;

// Initialize dashboard
async function initializeDashboard() {
    try {
        // Check authentication and role
        const { user, role } = await checkAuthAndRole('student');
        currentUser = user;

        // Load user data
        await loadUserData();

        // Set up event listeners
        setupEventListeners();

        // Update UI
        updateDashboardUI();

    } catch (error) {
        handleError(error, 'initializing dashboard');
        // Redirect to login if not authenticated or not a student
        if (error.message.includes('not authenticated') || error.message.includes('required role')) {
            window.location.href = 'student-login.html';
        }
    }
}

// Load user data from Firestore
async function loadUserData() {
    try {
        const registration = await getRegistrationById(currentUser.uid);
        userData = registration;
    } catch (error) {
        handleError(error, 'loading user data');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Navigation menu
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            showSection(section);
        });
    });
}

// Handle logout
async function handleLogout() {
    try {
        await signOutUser();
        window.location.href = 'student-login.html';
    } catch (error) {
        handleError(error, 'logging out');
    }
}

// Show selected section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });
}

// Update dashboard UI with user data
function updateDashboardUI() {
    if (!userData) return;

    // Update profile section
    const profileSection = document.getElementById('profile');
    if (profileSection) {
        profileSection.innerHTML = `
            <div class="profile-header">
                <img src="${userData.photographURL}" alt="Profile Photo" class="profile-photo">
                <div class="profile-info">
                    <h2>${userData.fullName}</h2>
                    <p class="internship-id">Internship ID: ${userData.internshipId}</p>
                    <p class="status ${userData.status.toLowerCase()}">Status: ${userData.status}</p>
                </div>
            </div>
            <div class="profile-details">
                <div class="detail-group">
                    <label>Email:</label>
                    <p>${userData.email}</p>
                </div>
                <div class="detail-group">
                    <label>Contact:</label>
                    <p>${userData.contact}</p>
                </div>
                <div class="detail-group">
                    <label>College:</label>
                    <p>${userData.college}</p>
                </div>
                <div class="detail-group">
                    <label>Course:</label>
                    <p>${userData.course}</p>
                </div>
                <div class="detail-group">
                    <label>Semester:</label>
                    <p>${userData.semester}</p>
                </div>
                <div class="detail-group">
                    <label>Internship Period:</label>
                    <p>${userData.startDate} to ${userData.endDate}</p>
                </div>
            </div>
        `;
    }

    // Update status section
    const statusSection = document.getElementById('status');
    if (statusSection) {
        statusSection.innerHTML = `
            <div class="status-card ${userData.status.toLowerCase()}">
                <h3>Application Status</h3>
                <p class="status-value">${userData.status}</p>
                <p class="status-date">Last updated: ${new Date(userData.submittedAt).toLocaleDateString()}</p>
            </div>
            <div class="status-timeline">
                <div class="timeline-item ${userData.status === 'pending' ? 'active' : 'completed'}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h4>Application Submitted</h4>
                        <p>${new Date(userData.submittedAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="timeline-item ${userData.status === 'approved' ? 'active' : userData.status === 'rejected' ? 'rejected' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h4>Application Review</h4>
                        <p>${userData.status === 'pending' ? 'Pending' : new Date(userData.updatedAt || userData.submittedAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="timeline-item ${userData.status === 'completed' ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h4>Internship Completion</h4>
                        <p>${userData.status === 'completed' ? new Date(userData.completedAt).toLocaleDateString() : 'Pending'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Update documents section
    const documentsSection = document.getElementById('documents');
    if (documentsSection && userData.documents) {
        documentsSection.innerHTML = `
            <div class="documents-list">
                ${userData.documents.map(doc => `
                    <div class="document-item">
                        <i class="fas fa-file-alt"></i>
                        <span>${doc}</span>
                        <a href="${doc.url}" target="_blank" class="view-doc">View</a>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Subscribe to auth state changes
subscribeToAuthState(({ user, role }) => {
    if (!user || role !== 'student') {
        window.location.href = 'student-login.html';
    }
});

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard); 