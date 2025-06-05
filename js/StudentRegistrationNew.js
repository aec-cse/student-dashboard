// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Firebase configuration
// TODO: Replace this with your actual Firebase config from Firebase Console
// Go to: https://console.firebase.google.com/
// 1. Select your project
// 2. Click on the gear icon (⚙️) next to "Project Overview"
// 3. Go to Project Settings
// 4. Scroll down to "Your apps"
// 5. Click the web icon (</>) to add a web app if you haven't
// 6. Copy the config object and replace the one below
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

// Firebase related functions
async function saveToFirestore(data) {
    if (!db) {
        throw new Error('Firebase not initialized properly. Please check your configuration.');
    }

    try {
        // Create a unique email using internship ID
        const email = `${data.internshipId}@intern.anusaya.com`;
        const password = data.contact; // Using contact number as password

        // Create user account
        const user = await createUserAccount(email, password);
        console.log('User account created:', user.uid);

        // Add user ID to the data
        data.userId = user.uid;
        data.email = email;

        // Save to Firestore
        const docRef = await addDoc(collection(db, 'student-registrations'), data);
        console.log('Document written with ID: ', docRef.id);
        data.firestoreId = docRef.id;

        // Show success message with login credentials
        utils.showMessage(
            `Registration successful! You can login using:\nInternship ID: ${data.internshipId}\nPassword: Your contact number`,
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
        } else {
            errorMessage += 'Please try again.';
        }

        utils.showMessage(errorMessage, 'error');
        throw error;
    }
}

// Utility functions
const utils = {
    generateApplicationId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `APP${timestamp}${random}`;
    },

    async saveImagesToLocalStorage() {
        const photographFile = document.getElementById('photograph').files[0];
        const signatureFile = document.getElementById('signature').files[0];
        const imageKeys = {};

        try {
            if (photographFile) {
                imageKeys.photograph = await this.saveImageToLocalStorage(photographFile, 'photograph');
            }
            if (signatureFile) {
                imageKeys.signature = await this.saveImageToLocalStorage(signatureFile, 'signature');
            }
            return imageKeys;
        } catch (error) {
            console.error('Error saving images to localStorage:', error);
            throw new Error('Failed to save images');
        }
    },

    async saveImageToLocalStorage(file, type) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const applicationId = utils.generateApplicationId();
                    const imageKey = `${type}_${applicationId}_${Date.now()}`;
                    const imageData = {
                        data: e.target.result,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        uploadedAt: new Date().toISOString()
                    };
                    localStorage.setItem(imageKey, JSON.stringify(imageData));
                    console.log(`${type} saved to localStorage with key: ${imageKey}`);
                    resolve(imageKey);
                } catch (error) {
                    console.error('Error saving to localStorage:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    getImageFromLocalStorage(imageKey) {
        try {
            const imageData = localStorage.getItem(imageKey);
            return imageData ? JSON.parse(imageData) : null;
        } catch (error) {
            console.error('Error retrieving image from localStorage:', error);
            return null;
        }
    },

    displaySavedImage(imageKey, containerId) {
        const imageData = this.getImageFromLocalStorage(imageKey);
        const container = document.getElementById(containerId);
        if (imageData && container) {
            container.innerHTML = `
                <img src="${imageData.data}" alt="Saved ${imageData.fileName}" style="max-width: 200px; max-height: 200px;">
                <p><strong>File:</strong> ${imageData.fileName}</p>
                <p><strong>Size:</strong> ${(imageData.fileSize / 1024).toFixed(2)} KB</p>
                <p><strong>Uploaded:</strong> ${new Date(imageData.uploadedAt).toLocaleString()}</p>
            `;
        }
    },

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

    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length >= 6) {
            value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        } else if (value.length >= 3) {
            value = value.replace(/(\d{3})(\d{3})/, '($1) $2');
        }
        input.value = value;
    },

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value) && email.value !== '') {
            email.setCustomValidity('Please enter a valid email address');
        } else {
            email.setCustomValidity('');
        }
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
    }
};

// Form management functions
const formManager = {
    autoSaveForm() {
        const form = document.getElementById('studentForm');
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (key !== 'photograph' && key !== 'signature' && key !== 'documents') {
                data[key] = value;
            }
        }

        const documentCheckboxes = document.querySelectorAll('input[name="documents"]:checked');
        data.documents = Array.from(documentCheckboxes).map(cb => cb.value);

        try {
            localStorage.setItem('studentRegistrationDraft', JSON.stringify(data));
            console.log('Form auto-saved to localStorage (excluding images)');
        } catch (error) {
            console.log('Auto-save failed:', error.message);
            if (error.name === 'QuotaExceededError') {
                this.clearOldImageData();
                try {
                    localStorage.setItem('studentRegistrationDraft', JSON.stringify(data));
                    console.log('Form auto-saved after clearing old data');
                } catch (e) {
                    console.log('Auto-save still failed after cleanup');
                }
            }
        }
    },

    loadSavedFormData() {
        try {
            const savedData = localStorage.getItem('studentRegistrationDraft');
            if (savedData) {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                    if (field) {
                        if (field.type === 'checkbox') {
                            field.checked = data[key];
                        } else {
                            field.value = data[key];
                        }
                    }
                });
                console.log('Saved form data loaded');
            }
        } catch (error) {
            console.log('No saved form data available');
        }
    },

    clearOldImageData() {
        const keys = Object.keys(localStorage);
        const imageKeys = keys.filter(key => key.startsWith('photograph_') || key.startsWith('signature_'));
        const sortedKeys = imageKeys.sort((a, b) => {
            const timestampA = parseInt(a.split('_').pop());
            const timestampB = parseInt(b.split('_').pop());
            return timestampA - timestampB;
        });
        const keysToRemove = sortedKeys.slice(0, -10);
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Removed old image data: ${key}`);
        });
    },

    clearSavedFormData() {
        try {
            localStorage.removeItem('studentRegistrationDraft');
            console.log('Saved form data cleared');
        } catch (error) {
            console.log('No saved data to clear');
        }
    },

    manageLocalStorageSpace() {
        try {
            const info = this.getLocalStorageInfo();
            console.log('LocalStorage Info:', info);
            if (info.imageCount > 20) {
                this.clearOldImageData();
            }
        } catch (error) {
            console.log('Error managing localStorage space:', error);
        }
    },

    getLocalStorageInfo() {
        let totalSize = 0;
        let imageSize = 0;
        let imageCount = 0;

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const itemSize = localStorage[key].length;
                totalSize += itemSize;
                if (key.startsWith('photograph_') || key.startsWith('signature_')) {
                    imageSize += itemSize;
                    imageCount++;
                }
            }
        }

        return {
            totalSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
            imageSize: (imageSize / 1024 / 1024).toFixed(2) + ' MB',
            imageCount: imageCount,
            approximateLimit: '5-10 MB (varies by browser)'
        };
    }
};

// Form initialization and event handlers
function initializeForm() {
    const form = document.getElementById('studentForm');
    form.addEventListener('submit', handleFormSubmit);

    const startDateInput = document.getElementById('startDate');
    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;

    const applicationDateInput = document.getElementById('applicationDate');
    applicationDateInput.value = today;
}

function setupFilePreview() {
    const photographInput = document.getElementById('photograph');
    const signatureInput = document.getElementById('signature');

    photographInput.addEventListener('change', e => previewFile(e.target, 'photographPreview'));
    signatureInput.addEventListener('change', e => previewFile(e.target, 'signaturePreview'));
}

function previewFile(input, previewId) {
    const preview = document.getElementById(previewId);
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = 'No file selected';
    }
}

function setupConditionalFields() {
    const hasBacklogsSelect = document.getElementById('hasBacklogs');
    const backlogCountGroup = document.getElementById('backlogCountGroup');
    const backlogCountInput = document.getElementById('backlogCount');

    hasBacklogsSelect.addEventListener('change', function () {
        if (this.value === 'Yes') {
            backlogCountGroup.style.display = 'block';
            backlogCountInput.required = true;
        } else {
            backlogCountGroup.style.display = 'none';
            backlogCountInput.required = false;
            backlogCountInput.value = '';
        }
    });

    const priorExperienceSelect = document.getElementById('priorExperience');
    const experienceDetails = document.getElementById('experienceDetails');
    const expFields = ['expCompany', 'expDuration', 'expRole'].map(id => document.getElementById(id));

    priorExperienceSelect.addEventListener('change', function () {
        if (this.value === 'Yes') {
            experienceDetails.style.display = 'block';
            expFields.forEach(field => field.required = true);
        } else {
            experienceDetails.style.display = 'none';
            expFields.forEach(field => {
                field.required = false;
                field.value = '';
            });
        }
    });
}

function setupFormValidation() {
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', () => utils.validateEmail(emailInput));

    const contactInput = document.getElementById('contact');
    contactInput.addEventListener('input', () => utils.formatPhoneNumber(contactInput));

    const gpaInput = document.getElementById('gpa');
    gpaInput.addEventListener('input', function () {
        if (this.value > 10) this.value = 10;
        if (this.value < 0) this.value = 0;
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        const formData = await collectFormData();
        const imageKeys = await utils.saveImagesToLocalStorage();
        formData.photographKey = imageKeys.photograph;
        formData.signatureKey = imageKeys.signature;

        await saveToFirestore(formData);
        utils.showMessage('Application submitted successfully!', 'success');
        document.getElementById('studentForm').reset();
        utils.clearPreviews();
        formManager.clearSavedFormData();
    } catch (error) {
        console.error('Error submitting form:', error);
        utils.showMessage('Error submitting application. Please try again.', 'error');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

async function collectFormData() {
    const form = document.getElementById('studentForm');
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        if (key !== 'photograph' && key !== 'signature' && key !== 'documents') {
            data[key] = value;
        }
    }

    const documentCheckboxes = document.querySelectorAll('input[name="documents"]:checked');
    data.documents = Array.from(documentCheckboxes).map(cb => cb.value);
    data.submittedAt = new Date().toISOString();
    data.applicationId = utils.generateApplicationId();

    return data;
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    setupFilePreview();
    setupConditionalFields();
    setupFormValidation();
    formManager.loadSavedFormData();
    formManager.manageLocalStorageSpace();

    // Set up auto-save and localStorage management
    setInterval(() => formManager.autoSaveForm(), 30000);
    setInterval(() => formManager.manageLocalStorageSpace(), 300000);
});
