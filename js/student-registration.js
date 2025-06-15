// import { initializeFirebase } from './services/firebase-config.js';
// import { saveRegistration } from './services/student-service.js';
// import { collectFormData, handleError, showMessage } from './utils/common.js';

// Add your Firebase imports here, for example:
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

// Form submit handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingOverlay.style.display = 'flex';
    try {
        // Collect form data
        const data = {
            fullName: form.fullName.value.trim(),
            dob: form.dob.value,
            gender: form.gender.value,
            email: form.email.value.trim(),
            contact: form.contact.value.trim(),
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
        if (!photographFile || !signatureFile) throw new Error('Photograph and signature are required.');
        data.photograph = await uploadToCloudinary(photographFile);
        data.signature = await uploadToCloudinary(signatureFile);

        // Save to Firestore
        await addDoc(collection(db, 'student-registrations'), data);

        loadingOverlay.style.display = 'none';
        alert('Registration submitted successfully!');
        form.reset();
        document.getElementById('photographPreview').innerHTML = '';
        document.getElementById('signaturePreview').innerHTML = '';
        backlogCountGroup.style.display = 'none';
        experienceDetails.style.display = 'none';
        // Optionally, notify parent window (for admin dashboard modal)
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'registration-complete' }, '*');
        }
    } catch (error) {
        loadingOverlay.style.display = 'none';
        alert('Error submitting registration: ' + (error.message || error));
    }
});
