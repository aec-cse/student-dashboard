// Firebase initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD3yUUmQ7ZWZF1ODnmTd3sWlv1qjSq00zE",
    authDomain: "admin-af1fc.firebaseapp.com",
    projectId: "admin-af1fc",
    storageBucket: "admin-af1fc.appspot.com",
    messagingSenderId: "1042593739824",
    appId: "1:1042593739824:web:a3c401e02fb3578fc769f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collections to clean up
const collections = [
    'students',
    'courses',
    'enrollments',
    'grades',
    'attendance',
    'notifications',
    'student-registrations'
];

// Function to delete all documents in a collection
async function deleteCollection(collectionName) {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log(`Deleted all documents from ${collectionName}`);
    } catch (error) {
        console.error(`Error deleting documents from ${collectionName}:`, error);
        throw error;
    }
}

// Function to delete all sample data
async function deleteAllSampleData() {
    try {
        console.log('Starting to delete sample data...');
        
        // Delete documents from each collection
        for (const collectionName of collections) {
            await deleteCollection(collectionName);
        }
        
        console.log('All sample data deleted successfully!');
    } catch (error) {
        console.error('Error deleting sample data:', error);
        throw error;
    }
}

// Export the function
export { deleteAllSampleData }; 