// Format mobile number (remove leading zeros)
export function formatMobileNumber(number) {
    // Remove any non-digit characters and leading zeros
    return number.replace(/\D/g, '').replace(/^0+/, '');
}

// Format date as dd/mm/yyyy
export function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// Get month abbreviation
export function getMonthAbbreviation() {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return months[new Date().getMonth()];
}

// Generate a unique application ID
export function generateApplicationId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `APP${timestamp}${random}`;
}

// Show message to user
export function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.innerHTML = `
        <i class="fas fa-${getMessageIcon(type)}"></i>
        ${message}
    `;

    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.insertBefore(messageDiv, contentArea.firstChild);
        setTimeout(() => messageDiv.remove(), 5000);
    } else {
        console.error('Content area not found for message display');
    }
}

// Get icon for message type
function getMessageIcon(type) {
    switch (type) {
        case 'success':
            return 'check-circle';
        case 'error':
            return 'exclamation-circle';
        case 'warning':
            return 'exclamation-triangle';
        default:
            return 'info-circle';
    }
}

// Validate email format
export function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

// Validate mobile number format
export function validateMobileNumber(number) {
    const cleanNumber = formatMobileNumber(number);
    return cleanNumber.length === 10;
}

// Handle form data collection
export function collectFormData(form) {
    const formData = new FormData(form);
    const data = {};

    // Process each form field
    for (let [key, value] of formData.entries()) {
        // Skip file inputs as they're handled separately
        if (key === 'photograph' || key === 'signature') {
            continue;
        }

        // Handle contact number specially
        if (key === 'contact') {
            data[key] = formatMobileNumber(value);
        }
        // Handle checkboxes for documents
        else if (key === 'documents') {
            if (!data.documents) {
                data.documents = [];
            }
            data.documents.push(value);
        }
        // Handle all other fields
        else {
            // Only trim string values
            data[key] = typeof value === 'string' ? value.trim() : value;
        }
    }

    // Get files
    const photographFile = formData.get('photograph');
    const signatureFile = formData.get('signature');

    return { data, photographFile, signatureFile };
}

// Clear form previews
export function clearPreviews() {
    const previews = document.querySelectorAll('.file-preview');
    previews.forEach(preview => {
        preview.innerHTML = '';
    });
}

// Handle errors consistently
export function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    let errorMessage = `Error ${context}. `;

    if (error.code) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'This email is already registered.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Please provide a valid mobile number (at least 6 characters).';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email format.';
                break;
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password.';
                break;
            case 'auth/too-many-requests':
                errorMessage += 'Too many failed attempts. Please try again later.';
                break;
            case 'permission-denied':
                errorMessage += 'Permission denied. Please contact support.';
                break;
            case 'unavailable':
                errorMessage += 'Service temporarily unavailable. Please try again later.';
                break;
            default:
                errorMessage += error.message || 'Please try again.';
        }
    } else {
        errorMessage += error.message || 'Please try again.';
    }

    showMessage(errorMessage, 'error');
    throw error;
} 