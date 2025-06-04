// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    const firebaseConfig = {
        apiKey: "AIzaSyA1RR9d31qkKdBsbH02NBMEydIuqmLgOwA",
        authDomain: "student-login-system-47e0a.firebaseapp.com",
        projectId: "student-login-system-47e0a",
        storageBucket: "student-login-system-47e0a.firebasestorage.app",
        messagingSenderId: "497762887092",
        appId: "1:497762887092:web:1484a822eff9e2b121fee1"
    };

    let auth, db;
    const registrationForm = document.getElementById('registrationForm');
    const firebaseStatusDiv = document.getElementById('firebaseStatus');
    const togglePasswordCheckbox = document.getElementById('togglePassword');
    const passwordField = document.getElementById('password');

    // Toggle password visibility
    if (togglePasswordCheckbox && passwordField) {
        togglePasswordCheckbox.addEventListener('change', () => {
            passwordField.type = togglePasswordCheckbox.checked ? 'text' : 'password';
        });
    }

    // Function to display status messages
    function showFirebaseStatus(message, success, append = false) {
        if (!firebaseStatusDiv) return;

        firebaseStatusDiv.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
        firebaseStatusDiv.classList.add(success ? 'bg-green-100' : 'bg-red-100');
        firebaseStatusDiv.classList.add(success ? 'text-green-700' : 'text-red-700');
        firebaseStatusDiv.innerHTML = append ? `${firebaseStatusDiv.innerHTML}<br>${message}` : message;
    }

    // Initialize Firebase
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase initialized successfully!");
    } catch (error) {
        console.error("Firebase init error:", error);
        showFirebaseStatus(`Firebase initialization failed: ${error.message}`, false);
        return;
    }

    // Form submission handling
    if (registrationForm && auth && db) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Get form values
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const contactNumber = document.getElementById('contactNumber').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = passwordField.value;
            const dob = document.getElementById('dob').value;
            const address = document.getElementById('address').value.trim();

            // Validation
            if (!firstName || !lastName || !contactNumber || !email || !password || !dob || !address) {
                showFirebaseStatus("Please fill in all fields.", false);
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showFirebaseStatus("Invalid email format.", false);
                return;
            }

            if (!/^\d{10}$/.test(contactNumber)) {
                showFirebaseStatus("Contact number must be exactly 10 digits.", false);
                return;
            }

            if (password.length < 6) {
                showFirebaseStatus("Password must be at least 6 characters long.", false);
                return;
            }

            showFirebaseStatus("Registering user, please wait...", true);

            try {
                // Create Firebase auth user
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Save additional student info
                await setDoc(doc(db, 'students', user.uid), {
                    firstName,
                    lastName,
                    contactNumber,
                    email,
                    dob,
                    address,
                    createdAt: serverTimestamp()
                });

                showFirebaseStatus("User registered and data saved successfully!", true);

                // Reset form and redirect
                registrationForm.reset();
                setTimeout(() => {
                    window.location.href = 'Studentlogin.html';
                }, 1000);

            } catch (error) {
                console.error("Registration error:", error);
                let msg = "An error occurred.";
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        msg = "Email is already in use.";
                        break;
                    case 'auth/invalid-email':
                        msg = "Invalid email address.";
                        break;
                    case 'auth/weak-password':
                        msg = "Password is too weak.";
                        break;
                    default:
                        msg = error.message;
                }
                showFirebaseStatus(msg, false);
            }
        });
    } else {
        showFirebaseStatus("Registration form not found.", false);
    }
});
