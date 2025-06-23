// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

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
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const forgotPasswordBtn = document.querySelector('.forgot-password-btn');

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.color = '#dc3545';
    errorMessage.style.backgroundColor = '#f8d7da';
    errorMessage.style.border = '1px solid #f5c6cb';
}

// Show success message
function showSuccess(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.color = '#28a745';
    errorMessage.style.backgroundColor = '#d4edda';
    errorMessage.style.border = '1px solid #c3e6cb';
}

// Check if user is already logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Check registration status
            const registrationDoc = await getDoc(doc(db, 'student-registrations', user.uid));
            if (registrationDoc.exists()) {
                const data = registrationDoc.data();
                if (data.status === 'approved') {
                    window.location.href = 'student-dashboard.html';
                } else {
                    showError(`Your registration is ${data.status}. Please wait for admin approval.`);
                    await auth.signOut();
                }
            }
        } catch (error) {
            console.error('Error checking registration status:', error);
            showError('Error checking registration status. Please try again.');
            await auth.signOut();
        }
    }
});

// Handle forgot password
forgotPasswordBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';

    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showError('Please enter your email address first');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('Password reset email sent! Please check your inbox and spam folder.');
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Password reset failed. ';

        if (error.code === 'auth/user-not-found') {
            errorMessage += 'Email not found.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'Invalid email format.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage += 'Too many requests. Please try again later.';
        } else {
            errorMessage += 'Please try again.';
        }

        showError(errorMessage);
    }
});

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';

    try {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Please enter a valid email address');
            return;
        }

        // Attempt login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check registration status
        const registrationDoc = await getDoc(doc(db, 'student-registrations', userCredential.user.uid));
        if (registrationDoc.exists()) {
            const data = registrationDoc.data();
            if (data.status === 'approved') {
                window.location.href = 'student-dashboard.html';
            } else {
                showError(`Your registration is ${data.status}. Please wait for admin approval.`);
                await auth.signOut();
            }
        } else {
            showError('Registration not found. Please register first.');
            await auth.signOut();
        }
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. ';

        if (error.code === 'auth/user-not-found') {
            errorMessage += 'Email not found.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage += 'Incorrect contact number.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'Invalid email format.';
        } else {
            errorMessage += 'Please try again.';
        }

        showError(errorMessage);
    }
}); 