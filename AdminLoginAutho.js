// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1RR9d31qkKdBsbH02NBMEydIuqmLgOwA",
  authDomain: "student-login-system-47e0a.firebaseapp.com",
  projectId: "student-login-system-47e0a",
  storageBucket: "student-login-system-47e0a.firebasestorage.app",
  messagingSenderId: "497762887092",
  appId: "1:497762887092:web:1484a822eff9e2b121fee1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Admin login logic
const loginBtn = document.getElementById("adminLoginBtn");
loginBtn.addEventListener("click", function (event) {
  event.preventDefault();

  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;

  // Example hardcoded check (optional)
  const adminEmail = "admin@example.com"; // Replace with your admin email
  if (email !== adminEmail) {
    alert("Access denied: Not an admin account.");
    return;
  }

  // Firebase login
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Admin login successful!");
      window.location.href = "adminDashboard.html"; // Redirect after login
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
});
