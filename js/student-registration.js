import { initializeFirebase } from './services/firebase-config.js';
import { saveRegistration } from './services/student-service.js';
import { collectFormData, handleError, showMessage } from './utils/common.js';

// Initialize Firebase when the script loads
initializeFirebase().catch(error => {
    console.error('Failed to initialize Firebase:', error);
    showMessage('Failed to initialize the application. Please refresh the page.', 'error');
});

// Preview image before upload
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    const file = input.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = e => preview.src = e.target.result;
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
    }
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Validate form
        if (!validateForm()) {
            return;
        }

        // Get form data
        const formData = await collectFormData(event.target);
        const photographFile = event.target.querySelector('#photograph').files[0];
        const signatureFile = event.target.querySelector('#signature').files[0];

        // Validate required files
        if (!photographFile || !signatureFile) {
            throw new Error('Please upload both photograph and signature');
        }

        // Save registration
        const result = await saveRegistration(formData, photographFile, signatureFile);
        
        // Show success message
        showMessage(
            `Registration successful! Your Internship ID is ${result.internshipId}. ` +
            `You can now log in using your email (${result.email}) and mobile number (${result.contact}).`,
            'success'
        );

        // Reset form and clear previews
        event.target.reset();
        clearPreviews();

    } catch (error) {
        handleError(error, 'submitting registration');
    }
}

// Validate form fields
function validateForm() {
    const form = document.getElementById('registrationForm');
    if (!form) return false;

    // Required fields
    const requiredFields = [
        'fullName', 'email', 'contact', 'college', 'course',
        'semester', 'startDate', 'endDate', 'photograph', 'signature'
    ];

    for (const fieldId of requiredFields) {
        const field = form.querySelector(`#${fieldId}`);
        if (!field || !field.value.trim()) {
            showMessage(`Please fill in the ${fieldId.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
            field.focus();
            return false;
        }
    }

    // Validate email format
    const email = form.querySelector('#email').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage('Please enter a valid email address', 'error');
        form.querySelector('#email').focus();
        return false;
    }

    // Validate contact number
    const contact = form.querySelector('#contact').value;
    if (!/^\d{10}$/.test(contact.replace(/\D/g, ''))) {
        showMessage('Please enter a valid 10-digit mobile number', 'error');
        form.querySelector('#contact').focus();
        return false;
    }

    // Validate dates
    const startDate = new Date(form.querySelector('#startDate').value);
    const endDate = new Date(form.querySelector('#endDate').value);
    const today = new Date();

    if (startDate < today) {
        showMessage('Start date cannot be in the past', 'error');
        form.querySelector('#startDate').focus();
        return false;
    }

    if (endDate <= startDate) {
        showMessage('End date must be after start date', 'error');
        form.querySelector('#endDate').focus();
        return false;
    }

    return true;
}

// Clear image previews
function clearPreviews() {
    const photographPreview = document.getElementById('photographPreview');
    const signaturePreview = document.getElementById('signaturePreview');
    
    if (photographPreview) photographPreview.src = '';
    if (signaturePreview) signaturePreview.src = '';
}

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Add image preview handlers
    const photographInput = document.getElementById('photograph');
    const signatureInput = document.getElementById('signature');
    
    if (photographInput) {
        photographInput.addEventListener('change', () => previewImage(photographInput, 'photographPreview'));
    }
    
    if (signatureInput) {
        signatureInput.addEventListener('change', () => previewImage(signatureInput, 'signaturePreview'));
    }
});
