import { getFirebaseInstance } from './firebase-config.js';
import { 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    doc, getDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { handleError } from '../utils/common.js';

// Sign in user
export async function signIn(email, password) {
    try {
        const { auth } = getFirebaseInstance();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        handleError(error, 'signing in');
    }
}

// Sign out user
export async function signOutUser() {
    try {
        const { auth } = getFirebaseInstance();
        await signOut(auth);
    } catch (error) {
        handleError(error, 'signing out');
    }
}

// Get current user
export function getCurrentUser() {
    const { auth } = getFirebaseInstance();
    return auth.currentUser;
}

// Check if user is admin
export async function isAdmin(userId) {
    try {
        const { db } = getFirebaseInstance();
        const userDoc = await getDoc(doc(db, 'users', userId));
        return userDoc.exists() && userDoc.data().role === 'admin';
    } catch (error) {
        handleError(error, 'checking admin status');
        return false;
    }
}

// Check if user is student
export async function isStudent(userId) {
    try {
        const { db } = getFirebaseInstance();
        const userDoc = await getDoc(doc(db, 'users', userId));
        return userDoc.exists() && userDoc.data().role === 'student';
    } catch (error) {
        handleError(error, 'checking student status');
        return false;
    }
}

// Get user role
export async function getUserRole(userId) {
    try {
        const { db } = getFirebaseInstance();
        const userDoc = await getDoc(doc(db, 'users', userId));
        return userDoc.exists() ? userDoc.data().role : null;
    } catch (error) {
        handleError(error, 'getting user role');
        return null;
    }
}

// Subscribe to auth state changes
export function subscribeToAuthState(callback) {
    const { auth } = getFirebaseInstance();
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            callback({ user, role });
        } else {
            callback({ user: null, role: null });
        }
    });
}

// Check authentication and role
export async function checkAuthAndRole(requiredRole) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    const role = await getUserRole(user.uid);
    if (role !== requiredRole) {
        throw new Error(`User does not have required role: ${requiredRole}`);
    }

    return { user, role };
}

// Handle authentication errors
export function handleAuthError(error) {
    let message = 'An error occurred during authentication';
    
    switch (error.code) {
        case 'auth/user-not-found':
            message = 'No account found with this email';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address';
            break;
        case 'auth/user-disabled':
            message = 'This account has been disabled';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please try again later';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Please check your connection';
            break;
        default:
            message = error.message;
    }
    
    return message;
} 