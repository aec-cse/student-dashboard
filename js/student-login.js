import { initializeFirebase } from './services/firebase-config.js';
import { signIn, handleAuthError } from './services/auth-service.js';
import { handleError, showMessage } from './utils/common.js';

// Initialize Firebase when the script loads
initializeFirebase().catch(error => {
    console.error('Failed to initialize Firebase:', error);
    showMessage('Failed to initialize the application. Please refresh the page.', 'error');
});

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Get form data
        const email = event.target.querySelector('#email').value.trim();
        const password = event.target.querySelector('#password').value.trim();

        // Validate inputs
        if (!email || !password) {
            showMessage('Please enter both email and password', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage('Please enter a valid email address', 'error');
            event.target.querySelector('#email').focus();
            return;
        }

        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        // Attempt login
        await signIn(email, password);
        
        // Redirect to dashboard on success
        window.location.href = 'student-dashboard.html';

    } catch (error) {
        // Show appropriate error message
        const message = handleAuthError(error);
        showMessage(message, 'error');
        
        // Reset form state
        event.target.querySelector('button[type="submit"]').disabled = false;
        event.target.querySelector('button[type="submit"]').textContent = 'Login';
    }
}

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}); 