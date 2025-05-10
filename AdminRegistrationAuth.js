// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Your web app's Firebase configuration
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
const database = getDatabase(app);

// Register button
const submit = document.querySelector("button[type='submit']");
submit.addEventListener("click", function (event) {
  event.preventDefault();

  // Input values
  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value;
  const birthdate = document.getElementById("birthdate").value;
  const gender = document.querySelector("input[name='gender']:checked")?.value || "Not specified";
  const address = document.getElementById("address").value;
  const country = document.getElementById("country").value;
  const city = document.getElementById("city").value;
  const region = document.getElementById("region").value;
  const postalCode = document.getElementById("postalCode").value;

  // Create user
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      // Save extra user info in Realtime Database
      set(ref(database, 'users/' + user.uid), {
        fullName,
        email,
        phone,
        birthdate,
        gender,
        address,
        country,
        city,
        region,
        postalCode
      });

      alert("User registered successfully!");
      window.location.href = "login.html"; // Redirect to login or dashboard
    })
    .catch((error) => {
      alert(error.message);
    });
});
