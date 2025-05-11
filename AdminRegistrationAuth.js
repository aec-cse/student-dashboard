import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Select elements
const submit = document.querySelector("button[type='submit']");
const statusDiv = document.getElementById("firebaseStatus");

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

submit.addEventListener("click", function (event) {
  event.preventDefault();

  // Collect form values
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const birthdate = document.getElementById("birthdate").value.trim();
  const gender = document.querySelector("input[name='gender']:checked")?.value || "Not specified";
  const address = document.getElementById("address").value.trim();
  const country = document.getElementById("country").value.trim();
  const city = document.getElementById("city").value.trim();
  const region = document.getElementById("region").value.trim();
  const postalCode = document.getElementById("postalCode").value.trim();

  // Basic validation
  if (!fullName || !email || !password || !phone || !birthdate || !address || !country || !city || !region || !postalCode) {
    showStatus("Please fill out all required fields.");
    return;
  }

  // Register user and store data
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      return setDoc(doc(db, "users", user.uid), {
        uid: user.uid, // Explicitly storing UID in document
        fullName,
        email,
        phone,
        birthdate,
        gender,
        address,
        country,
        city,
        region,
        postalCode,
        createdAt: new Date()
      });
    })
    .then(() => {
      showStatus("User registered successfully!", true);
      setTimeout(() => {
        window.location.href = "AdminLogin.html";
      }, 1000);
    })
    .catch((error) => {
      console.error(error);
      showStatus("Registration failed: " + error.message);
    });
});
