import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Firebase config
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

const loginBtn = document.getElementById("adminLoginBtn");
const statusDiv = document.getElementById("firebaseStatus"); // Status feedback div

function showStatus(message, success = false) {
  if (!statusDiv) {
    alert(message);
    return;
  }

  statusDiv.classList.remove("hidden", "text-red-700", "text-green-700", "bg-red-100", "bg-green-100");
  statusDiv.textContent = message;
  if (success) {
    statusDiv.classList.add("text-green-700", "bg-green-100");
  } else {
    statusDiv.classList.add("text-red-700", "bg-red-100");
  }
}

loginBtn.addEventListener("click", (event) => {
  event.preventDefault();

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  if (!email || !password) {
    showStatus("Please enter both email and password.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      showStatus("Login successful!", true);
      setTimeout(() => {
        window.location.href = "admin-dashboard.html"; // Redirect all users to a common dashboard
      }, 1000);
    })
    .catch((error) => {
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
          console.error("Login error:", error.code);
      }
      showStatus(errorMsg);
    });
});
