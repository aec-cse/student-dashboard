// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

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

// Show error message
function showError(message) {
    console.error('Login error:', message);
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Check if admin exists in Firestore
async function checkAdminExists(uid) {
    try {
        console.log('Checking if admin exists in Firestore:', uid);
        const adminDoc = await getDoc(doc(db, 'admins', uid));
        const exists = adminDoc.exists();
        console.log('Admin exists in Firestore:', exists);
        if (exists) {
            console.log('Admin data:', adminDoc.data());
        }
        return exists;
    } catch (error) {
        console.error('Error checking admin in Firestore:', error);
        return false;
    }
}

// Handle successful login
async function handleSuccessfulLogin(user) {
    try {
        console.log('Handling successful login for user:', user.uid);

        // Check if admin already exists
        const adminExists = await checkAdminExists(user.uid);

        if (!adminExists) {
            console.log('Admin not found in Firestore, adding...');
            // Add admin to Firestore admins collection
            try {
                await setDoc(doc(db, 'admins', user.uid), {
                    email: user.email,
                    role: 'admin',
                    addedAt: new Date().toISOString()
                });
                console.log('Admin added to Firestore successfully');
            } catch (error) {
                console.error('Error adding admin to Firestore:', error);
                throw new Error('Error setting up admin access. Please contact support.');
            }
        } else {
            console.log('Admin already exists in Firestore');
        }

        // Verify admin status one more time
        const finalCheck = await checkAdminExists(user.uid);
        if (!finalCheck) {
            throw new Error('Error verifying admin access. Please contact support.');
        }

        console.log('Login and admin setup successful, redirecting to dashboard...');

        // Ensure we're still authenticated before redirecting
        const currentUser = auth.currentUser;
        if (!currentUser || currentUser.uid !== user.uid) {
            throw new Error('Authentication state changed. Please try again.');
        }

        // Redirect to dashboard
        window.location.href = 'admin-dashboard.html';
    } catch (error) {
        console.error('Error in handleSuccessfulLogin:', error);
        showError(error.message);
        // Sign out on error
        await auth.signOut();
    }
}

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';
    console.log('Login form submitted');

    try {
        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        console.log('Attempting login with email:', email);

        // Attempt login with Firebase
        console.log('Calling Firebase signInWithEmailAndPassword...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('Firebase authentication successful:', {
            uid: user.uid,
            email: user.email
        });

        // Handle successful login
        await handleSuccessfulLogin(user);
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. ';

        if (error.code === 'auth/user-not-found') {
            errorMessage += 'Admin account not found.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage += 'Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'Invalid email format.';
        } else if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please check your credentials.';
        } else {
            errorMessage += 'Please try again. Error: ' + error.message;
        }

        showError(errorMessage);
    }
});

// Check initial auth state only once when page loads
document.addEventListener('DOMContentLoaded', () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('Checking initial auth state for user:', user.uid);
            try {
                const adminExists = await checkAdminExists(user.uid);
                if (adminExists) {
                    console.log('Admin already logged in, redirecting to dashboard...');
                    window.location.href = 'admin-dashboard.html';
                } else {
                    console.log('User is not an admin, signing out...');
                    await auth.signOut();
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                await auth.signOut();
            }
        }
        // Unsubscribe after the initial check
        unsubscribe();
    });
}); 