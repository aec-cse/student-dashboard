// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Replace with your Firebase project's configuration object
    const firebaseConfig = {
        apiKey: "AIzaSyCc8lRuA4Gm6pyVheG2s0ta_RbJog4SFhg",
        authDomain: "test-a60bc.firebaseapp.com",
        projectId: "test-a60bc",
        storageBucket: "test-a60bc.firebasestorage.app",
        messagingSenderId: "873136509647",
        appId: "1:873136509647:web:695df40ae55c8dfed19dba"
      };

    let auth;
    let db;
    const registrationForm = document.getElementById('registrationForm');
    const firebaseStatusDiv = document.getElementById('firebaseStatus');

    // Function to show status messages
    function showFirebaseStatus(message, success, append = false) {
        if (!firebaseStatusDiv) {
            console.warn("firebaseStatus div not found");
            return;
        }
        firebaseStatusDiv.classList.remove('hidden');
        if (success) {
            firebaseStatusDiv.classList.remove('bg-red-100', 'text-red-700');
            firebaseStatusDiv.classList.add('bg-green-100', 'text-green-700');
        } else {
            firebaseStatusDiv.classList.remove('bg-green-100', 'text-green-700');
            firebaseStatusDiv.classList.add('bg-red-100', 'text-red-700');
        }
        if (append && firebaseStatusDiv.textContent && firebaseStatusDiv.textContent.length > 0) {
             firebaseStatusDiv.innerHTML += `<br>${message}`;
        } else {
            firebaseStatusDiv.textContent = message;
        }
    }

    // Initialize Firebase
    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            throw new Error("Firebase SDKs not loaded. Ensure they are included in your HTML before this script.");
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized successfully!");
        } else {
            firebase.app(); // if already initialized, use that one
            console.log("Firebase was already initialized.");
        }
        auth = firebase.auth();
        db = firebase.firestore();

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        showFirebaseStatus(`Error initializing Firebase: ${error.message}. Please check your configuration and ensure Firebase SDKs are loaded.`, false);
        // Prevent form submission if Firebase fails to initialize
        if (registrationForm) {
            registrationForm.addEventListener('submit', function(event) {
                event.preventDefault();
                // Using the custom status div instead of alert
                showFirebaseStatus("Firebase is not configured correctly. Cannot submit form.", false);
            });
        }
        return; // Stop further script execution if Firebase fails
    }

    // Add event listener only if the form exists and Firebase initialized
    if (registrationForm && auth && db) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            // Get form data
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const contactNumber = document.getElementById('contactNumber').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const dob = document.getElementById('dob').value;
            const address = document.getElementById('address').value;

            // Basic validation
            if (!firstName || !lastName || !contactNumber || !email || !password || !dob || !address) {
                showFirebaseStatus("Please fill in all fields.", false);
                return;
            }
            if (password.length < 6) {
                showFirebaseStatus("Password must be at least 6 characters long.", false);
                return;
            }

            try {
                // 1. Create user with email and password
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                showFirebaseStatus(`User registered successfully with UID: ${user.uid}`, true);
                console.log("User registered:", user);

                // 2. Store additional student details in Firestore
                await db.collection('students').doc(user.uid).set({
                    firstName: firstName,
                    lastName: lastName,
                    contactNumber: contactNumber,
                    email: email,
                    dob: dob,
                    address: address,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showFirebaseStatus("Student details saved to Firestore!", true, true);
                console.log("Student details saved to Firestore");

                registrationForm.reset();

            } catch (error) {
                console.error("Error during registration:", error);
                let errorMessage = "An error occurred during registration.";
                if (error.code) {
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = "This email address is already in use.";
                            break;
                        case 'auth/invalid-email':
                            errorMessage = "The email address is not valid.";
                            break;
                        case 'auth/weak-password':
                            errorMessage = "The password is too weak.";
                            break;
                        default:
                            errorMessage = error.message;
                    }
                }
                showFirebaseStatus(errorMessage, false);
            }
        });
    } else {
        if (!registrationForm) {
            console.error("Registration form not found in the DOM.");
            showFirebaseStatus("Error: Registration form element not found.", false);
        }
    }
});
