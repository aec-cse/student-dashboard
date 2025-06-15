// Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyD3yUUmQ7ZWZF1ODnmTd3sWlv1qjSq00zE",
    authDomain: "admin-af1fc.firebaseapp.com",
    projectId: "admin-af1fc",
    storageBucket: "admin-af1fc.appspot.com",
    messagingSenderId: "1042593739824",
    appId: "1:1042593739824:web:a3c401e02fb3578fc769f5"
};

// Firebase initialization
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

let app;
let db;
let auth;

export function initializeFirebase() {
    try {
        // Check if Firebase is already initialized
        if (getApps().length > 0) {
            console.log('Using existing Firebase instance');
            app = getApp();
        } else {
            console.log('Initializing new Firebase instance');
            app = initializeApp(firebaseConfig);
        }
        
        db = getFirestore(app);
        auth = getAuth(app);
        console.log('Firebase initialized successfully');
        
        return { app, db, auth };
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        throw error;
    }
}

export function getFirebaseInstance() {
    if (!app || !db || !auth) {
        return initializeFirebase();
    }
    return { app, db, auth };
}

// Export Firebase services
export { getFirestore, getAuth }; 