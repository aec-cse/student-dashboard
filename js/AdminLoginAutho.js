// =======================
// Firebase Configuration
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyD3yUUmQ7ZWZF1ODnmTd3sWlv1qjSq00zE",
  authDomain: "admin-af1fc.firebaseapp.com",
  projectId: "admin-af1fc",
  storageBucket: "admin-af1fc.firebasestorage.app",
  messagingSenderId: "1042593739824",
  appId: "1:1042593739824:web:a3c401e02fb3578fc769f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// =======================
// DOM Element References
// =======================
const loginBtn = document.getElementById("adminLoginBtn");
const statusDiv = document.getElementById("firebaseStatus"); // Div for displaying status messages

// ============================
// Utility: Show Status Message
// ============================
function showStatus(message, success = false) {
  if (!statusDiv) {
    alert(message); // Fallback if status div not found
    return;
  }

  // Reset previous styles and message
  statusDiv.classList.remove("hidden", "text-red-700", "text-green-700", "bg-red-100", "bg-green-100");
  statusDiv.textContent = message;

  // Apply color styling based on success/failure
  if (success) {
    statusDiv.classList.add("text-green-700", "bg-green-100");
  } else {
    statusDiv.classList.add("text-red-700", "bg-red-100");
  }
}

// =========================================
// Login Event Handler: Restrict to One Admin
// =========================================
loginBtn.addEventListener("click", (event) => {
  event.preventDefault(); // Prevent default form submission

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  // Hardcoded allowed admin credentials
  const allowedEmail = "anusayatradingsolutions@gmail.com";
  const allowedPassword = "8308156115";

  // Check if fields are filled
  if (!email || !password) {
    showStatus("Please enter both email and password.");
    return;
  }

  // Allow only specific admin credentials to proceed
  if (email !== allowedEmail || password !== allowedPassword) {
    showStatus("Access denied. Invalid admin credentials.");
    return;
  }

  // Proceed with Firebase authentication
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      showStatus("Login successful!", true);

      // Redirect to admin dashboard after brief delay
      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 1000);
    })
    .catch((error) => {
      // Determine error message based on Firebase error code
      let errorMsg = "Login failed. Please try again.";

      switch (error.code) {
        case "auth/user-not-found":
        case "auth/invalid-email":
          errorMsg = "No account found with that email.";
          break;
        case "auth/wrong-password":
          errorMsg = "Incorrect password. Please try again.";
          break;
        case "auth/too-many-requests":
          errorMsg = "Too many failed attempts. Please reset your password or try later.";
          break;
        default:
          console.error("Login error:", error.code); // Log unexpected errors
      }

      showStatus(errorMsg);
    });
});
