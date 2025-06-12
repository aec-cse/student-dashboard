// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

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
let app;
let db;
let auth;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

// Cloudinary upload function
async function uploadToCloudinary(file, previewId) {
    const url = `https://api.cloudinary.com/v1_1/deksu6n47/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "student_upload");

    const response = await fetch(url, {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    // Show preview
    if (previewId && document.getElementById(previewId)) {
        document.getElementById(previewId).innerHTML = `<img src="${data.secure_url}" alt="Uploaded Image" style="max-width: 200px; max-height: 200px;">`;
    }

    return data.secure_url;
}

// Authentication functions
async function createUserAccount(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error creating user account:', error);
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
}

// Save to Firestore with Cloudinary image URLs
async function saveToFirestore(data, photographFile, signatureFile) {
    if (!db) {
        console.error('Firebase not initialized properly');
        throw new Error('Firebase not initialized properly. Please check your configuration.');
    }

    try {
        console.log('Uploading images to Cloudinary...');
        const photographURL = await uploadToCloudinary(photographFile, 'photographPreview');
        const signatureURL = await uploadToCloudinary(signatureFile, 'signaturePreview');

        data.photographURL = photographURL;
        data.signatureURL = signatureURL;

        const email = `${data.internshipId}@anusaya.intern`;
        const password = data.contact;

        const user = await createUserAccount(email, password);

        data.userId = user.uid;
        data.email = email;
        data.status = 'pending';
        data.registeredAt = new Date().toISOString();

        const studentCollection = collection(db, 'student-registrations');
        const docRef = await addDoc(studentCollection, data);

        data.firestoreId = docRef.id;

        const savedDoc = await getDoc(docRef);
        if (savedDoc.exists()) {
            console.log('Document data:', savedDoc.data());
        }

        utils.showMessage(
            `Registration successful! Your Internship ID is: ${data.internshipId}\nYou can login using:\nEmail: ${data.email}\nPassword: Your contact number`,
            'success'
        );

        return docRef.id;
    } catch (error) {
        console.error('Error in registration process:', error);
        let errorMessage = 'Error submitting application. ';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage += 'This Internship ID is already registered.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage += 'Please provide a valid contact number.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'Invalid Internship ID format.';
        } else if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please contact support.';
        } else {
            errorMessage += 'Please try again.';
        }

        utils.showMessage(errorMessage, 'error');
        throw error;
    }
}

// Collect form data
async function collectFormData() {
    const form = document.getElementById('studentForm');
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        if (key !== 'photograph' && key !== 'signature' && key !== 'documents') {
            data[key] = value;
        }
    }

    // Generate internship ID automatically
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    data.internshipId = `INT${timestamp}${random}`;

    const documentCheckboxes = document.querySelectorAll('input[name="documents"]:checked');
    data.documents = Array.from(documentCheckboxes).map(cb => cb.value);
    data.submittedAt = new Date().toISOString();
    data.applicationId = utils.generateApplicationId();

    return { data, photographFile: formData.get('photograph'), signatureFile: formData.get('signature') };
}

// Modify handleFormSubmit to include file upload
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submission started');
    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        console.log('Starting form validation...');
        if (!utils.validateForm()) {
            console.log('Form validation failed - please check required fields');
            utils.showMessage('Please fill in all required fields correctly.', 'error');
            return;
        }
        console.log('Form validation passed');

        console.log('Collecting form data...');
        const { data, photographFile, signatureFile } = await collectFormData();
        console.log('Form data collected:', { 
            ...data, 
            photographFile: photographFile ? 'File present' : 'No file', 
            signatureFile: signatureFile ? 'File present' : 'No file' 
        });

        console.log('Attempting to save to Firestore...');
        await saveToFirestore(data, photographFile, signatureFile);
        console.log('Successfully saved to Firestore');

        utils.showMessage('Application submitted successfully!', 'success');
        document.getElementById('studentForm').reset();
        utils.clearPreviews();
        formManager.clearSavedFormData();
    } catch (error) {
        console.error('Detailed error in form submission:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        utils.showMessage('Error submitting application. Please try again.', 'error');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// Minimal utils
const utils = {
    showMessage(message, type) {
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.textContent = message;

        const form = document.getElementById('studentForm');
        form.insertBefore(messageDiv, form.firstChild);

        setTimeout(() => messageDiv.remove(), 5000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    clearPreviews() {
        document.getElementById('photographPreview').innerHTML = 'No file selected';
        document.getElementById('signaturePreview').innerHTML = 'No file selected';
    },
    validateForm() {
        const requiredFields = document.querySelectorAll('[required]');
        let isValid = true;
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        return isValid;
    },
    generateApplicationId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `APP${timestamp}${random}`;
    }
};

function initializeForm() {
    const form = document.getElementById('studentForm');
    form.addEventListener('submit', handleFormSubmit);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
});
