// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Replace with your Firebase project's configuration object
    // This should be the SAME configuration you used for the registration page
    const firebaseConfig = {
        apiKey: "AIzaSyA1RR9d31qkKdBsbH02NBMEydIuqmLgOwA",
        authDomain: "student-login-system-47e0a.firebaseapp.com",
        projectId: "student-login-system-47e0a",
        storageBucket: "student-login-system-47e0a.firebasestorage.app",
        messagingSenderId: "497762887092",
        appId: "1:497762887092:web:1484a822eff9e2b121fee1"
    };

    let auth; // Firebase auth instance
    const loginForm = document.getElementById('loginForm');
    const firebaseStatusDiv = document.getElementById('firebaseStatus'); // The div to show messages

    /**
     * Displays a status message to the user.
     * @param {string} message - The message to display.
     * @param {boolean} success - True if the message indicates success, false for an error.
     */
    function showFirebaseStatus(message, success) {
        if (!firebaseStatusDiv) {
            console.warn("Firebase status div (id='firebaseStatus') not found in the HTML.");
            // Fallback to alert if the div is missing, though it shouldn't be based on the HTML
            alert(message);
            return;
        }
        // Make the status div visible
        firebaseStatusDiv.classList.remove('hidden');

        // Set appropriate styling based on success or error
        if (success) {
            firebaseStatusDiv.classList.remove('bg-red-100', 'text-red-700'); // Remove error styles
            firebaseStatusDiv.classList.add('bg-green-100', 'text-green-700'); // Add success styles
        } else {
            firebaseStatusDiv.classList.remove('bg-green-100', 'text-green-700'); // Remove success styles
            firebaseStatusDiv.classList.add('bg-red-100', 'text-red-700'); // Add error styles
        }
        // Set the message text
        firebaseStatusDiv.textContent = message;
    }

    // Initialize Firebase
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        console.log("Firebase initialized successfully for login!");

    } catch (error) {
        console.error("Error initializing Firebase for login:", error);
        // Show error message in the designated div if initialization fails
        showFirebaseStatus(`Error initializing Firebase: ${error.message}. Please check your configuration.`, false);
        // Prevent form submission if Firebase fails to initialize
        if (loginForm) {
            loginForm.addEventListener('submit', function (event) {
                event.preventDefault(); // Stop the form from submitting
                // Remind user that Firebase isn't working
                showFirebaseStatus("Firebase is not configured correctly. Cannot submit login form.", false);
            });
        }
        return; // Stop further script execution if Firebase initialization failed
    }

    // Add event listener to the login form if it exists and Firebase auth is initialized
    if (loginForm && auth) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission behavior

            // Get email and password from the form
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Basic client-side validation
            if (!email || !password) {
                showFirebaseStatus("Please enter both email and password.", false);
                return;
            }

            try {
                // Attempt to sign in the user with Firebase Authentication
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // ---- SUCCESS MESSAGE ----
                showFirebaseStatus(`Login successful! Welcome, ${user.email}`, true);
                console.log("User logged in:", user);

                // Redirect to student dashboard after successful login
                window.location.href = 'student-dashboard.html';

                loginForm.reset(); // Clear the form fields after successful login

            } catch (error) {
                console.error("Error during login:", error);
                let errorMessage = "An error occurred during login. Please try again."; // Default error message

                // Provide more specific error messages based on Firebase error codes
                if (error.code) {
                    switch (error.code) {
                        case 'auth/user-not-found':
                        case 'auth/invalid-email': // Often grouped with user-not-found for security
                            errorMessage = "No user found with this email. Please check your email or register.";
                            break;
                        case 'auth/wrong-password':
                            errorMessage = "Incorrect password. Please try again.";
                            break;
                        case 'auth/invalid-credential': // Generic credential error (Firebase v9+ often uses this)
                            errorMessage = "Invalid credentials. Please check your email and password.";
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.";
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = "Network error. Please check your internet connection and try again.";
                            break;
                        default:
                            // For other errors, you might want to log the specific code for debugging
                            // but show a generic message to the user.
                            errorMessage = "Login failed. An unexpected error occurred.";
                            console.log("Firebase login error code for debugging:", error.code);
                    }
                }
                // ---- ERROR MESSAGE ----
                showFirebaseStatus(errorMessage, false);
            }
        });
    } else {
        if (!loginForm) {
            console.error("Login form (id='loginForm') not found in the DOM.");
            // Attempt to show an error if the status div itself exists
            if (firebaseStatusDiv) showFirebaseStatus("Critical Error: Login form element not found on the page.", false);
        }
        if (!auth) {
            if (firebaseStatusDiv) showFirebaseStatus("Critical Error: Firebase Authentication service could not be initialized.", false);
        }
    }
});
