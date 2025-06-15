// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

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

// DOM Elements
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';

    try {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // Validate password length
        if (password.length !== 10) {
            showError('Password must be exactly 10 digits');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Please enter a valid email address');
            return;
        }

        // Attempt login
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'student-dashboard.html';
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