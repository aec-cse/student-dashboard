// import { initializeFirebase } from './services/firebase-config.js';
// import { saveRegistration } from './services/student-service.js';
// import { collectFormData, handleError, showMessage } from './utils/common.js';

// Add your Firebase imports here, for example:
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
// ... (add any other Firebase imports you need)

// Add your registration logic here, using direct Firebase calls.
// If you need help rewriting the registration logic, let me know!

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyD3yUUmQ7ZWZF1ODnmTd3sWlv1qjSq00zE",
    authDomain: "admin-af1fc.firebaseapp.com",
    projectId: "admin-af1fc",
    storageBucket: "admin-af1fc.appspot.com",
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
    alert('Error initializing the application. Please try again later.');
}

const form = document.getElementById('studentForm');
const loadingOverlay = document.getElementById('loadingOverlay');

// Show/hide backlog count
const hasBacklogs = document.getElementById('hasBacklogs');
const backlogCountGroup = document.getElementById('backlogCountGroup');
hasBacklogs.addEventListener('change', () => {
    backlogCountGroup.style.display = hasBacklogs.value === 'Yes' ? 'block' : 'none';
});

// Show/hide prior experience details
const priorExperience = document.getElementById('priorExperience');
const experienceDetails = document.getElementById('experienceDetails');
priorExperience.addEventListener('change', () => {
    experienceDetails.style.display = priorExperience.value === 'Yes' ? 'block' : 'none';
});

// Preview image before upload
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '120px';
            img.style.maxHeight = '120px';
            preview.appendChild(img);
        };
        reader.readAsDataURL(input.files[0]);
    }
}
document.getElementById('photograph').addEventListener('change', function() {
    previewImage(this, 'photographPreview');
});
document.getElementById('signature').addEventListener('change', function() {
    previewImage(this, 'signaturePreview');
});

// Helper: upload file to Cloudinary and return download URL
async function uploadToCloudinary(file) {
    const url = 'https://api.cloudinary.com/v1_1/deksu6n47/upload';
    const preset = 'student_upload';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error('Cloudinary upload failed');
    const data = await response.json();
    return data.secure_url;
}

// Helper: collect checked documents
function getCheckedDocuments() {
    return Array.from(document.querySelectorAll('input[name="documents"]:checked')).map(cb => cb.value);
}

// Helper: generate internship ID
async function generateInternshipId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('default', { month: 'short' }).toUpperCase();
    
    // Get the count of students registered this month
    const studentCollection = collection(db, "student-registrations");
    const q = query(
        studentCollection,
        where("submittedAt", ">=", new Date(now.getFullYear(), now.getMonth(), 1)),
        where("submittedAt", "<", new Date(now.getFullYear(), now.getMonth() + 1, 1))
    );
    
    const querySnapshot = await getDocs(q);
    const count = querySnapshot.size + 1;
    
    // Format the count with leading zeros
    const paddedCount = count.toString().padStart(3, '0');
    
    return `ATIT-${year}-${month}-${paddedCount}`;
}

// Form submit handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingOverlay.style.display = 'flex';
    
    try {
        // Validate contact number
        const contact = form.contact.value.trim();
        if (!/^[6-9]\d{9}$/.test(contact)) {
            throw new Error('Please enter a valid 10-digit contact number starting with 6, 7, 8, or 9');
        }

        // Generate internship ID
        const internshipId = await generateInternshipId();
        
        // Collect form data
        const formData = {
            internshipId,
            fullName: form.fullName.value.trim(),
            dob: form.dob.value,
            gender: form.gender.value,
            email: form.email.value.trim(),
            contact: contact,
            address: form.address.value.trim(),
            zipCode: form.zipCode.value.trim(),
            college: form.college.value.trim(),
            degreeProgram: form.degreeProgram.value,
            branch: form.branch.value.trim(),
            semester: form.semester.value,
            gpa: form.gpa.value,
            graduationYear: form.graduationYear.value,
            hasBacklogs: form.hasBacklogs.value,
            backlogCount: form.hasBacklogs.value === 'Yes' ? form.backlogCount.value : '',
            programmingLanguages: form.programmingLanguages.value.trim(),
            toolsSoftware: form.toolsSoftware.value.trim(),
            areaOfInterest: form.areaOfInterest.value.trim(),
            startDate: form.startDate.value,
            duration: form.duration.value,
            preferredDomain: form.preferredDomain.value,
            whyJoin: form.whyJoin.value.trim(),
            priorExperience: form.priorExperience.value,
            expCompany: form.priorExperience.value === 'Yes' ? form.expCompany.value.trim() : '',
            expDuration: form.priorExperience.value === 'Yes' ? form.expDuration.value.trim() : '',
            expRole: form.priorExperience.value === 'Yes' ? form.expRole.value.trim() : '',
            hearAbout: form.hearAbout.value,
            documents: getCheckedDocuments(),
            submittedAt: serverTimestamp(),
            status: 'pending'
        };

        // Upload files to Cloudinary
        const photographFile = form.photograph.files[0];
        const signatureFile = form.signature.files[0];
        
        if (!photographFile || !signatureFile) {
            throw new Error('Photograph and signature are required.');
        }

        try {
            formData.photograph = await uploadToCloudinary(photographFile);
            formData.signature = await uploadToCloudinary(signatureFile);
        } catch (uploadError) {
            console.error('Error uploading files:', uploadError);
            throw new Error('Failed to upload files. Please try again.');
        }

        // Create Firebase Authentication account
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.contact);
            formData.userId = userCredential.user.uid;
        } catch (authError) {
            console.error('Error creating authentication account:', authError);
            if (authError.code === 'auth/email-already-in-use') {
                throw new Error('An account with this email already exists. Please use a different email or try logging in.');
            }
            throw new Error('Failed to create account. Please try again.');
        }

        // Save to Firestore
        try {
            console.log('Attempting to save registration to Firestore...');
            const studentRegistrationsRef = collection(db, 'student-registrations');
            const docRef = await addDoc(studentRegistrationsRef, formData);
            console.log('Registration saved successfully with ID:', docRef.id);

            // Show success message
            loadingOverlay.style.display = 'none';
            alert(`Registration submitted successfully! Your Internship ID is: ${internshipId}`);
            
            // Reset form
            form.reset();
            document.getElementById('photographPreview').innerHTML = '';
            document.getElementById('signaturePreview').innerHTML = '';
            document.getElementById('backlogCountGroup').style.display = 'none';
            document.getElementById('experienceDetails').style.display = 'none';

            // Notify parent window if in iframe
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'registration-complete' }, '*');
            }
        } catch (firestoreError) {
            console.error('Firestore error:', {
                code: firestoreError.code,
                message: firestoreError.message,
                stack: firestoreError.stack
            });
            
            let errorMessage = 'Failed to save registration. ';
            switch (firestoreError.code) {
                case 'permission-denied':
                    errorMessage += 'Permission denied. Please contact support.';
                    break;
                case 'unavailable':
                    errorMessage += 'Service unavailable. Please check your internet connection.';
                    break;
                case 'invalid-argument':
                    errorMessage += 'Invalid data provided. Please check your form entries.';
                    break;
                default:
                    errorMessage += firestoreError.message || 'An unknown error occurred.';
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Registration error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        loadingOverlay.style.display = 'none';
        alert('Error submitting registration: ' + (error.message || 'An unknown error occurred. Please try again.'));
    }
});
