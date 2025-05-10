// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { initializeApp } from "firebase/app";
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

//register button
const submit = document.getElementById("submit");
submit.addEventListener("click", function (event) {
  event.preventDefault();

  //inputs
  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  const contactNo = document.getElementById("contactNo");
  const dob = document.getElementById("dob");
  const address = document.getElementById("address");
  const email = document.getElementById("email");
  const password = document.getElementById("password");

  createUserWithEmailAndPassword(auth, email.value, password.value)
    .then((userCredential) => {
      // Signed up 
      const user = userCredential.user;
      // ...
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
      // ..
    });
});