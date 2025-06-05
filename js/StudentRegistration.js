// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
  // ✅ Updated Firebase project credentials
  const firebaseConfig = {
    apiKey: "AIzaSyD3yUUmQ7ZWZF1ODnmTd3sWlv1qjSq00zE",
    authDomain: "admin-af1fc.firebaseapp.com",
    projectId: "admin-af1fc",
    storageBucket: "admin-af1fc.firebasestorage.app",
    messagingSenderId: "1042593739824",
    appId: "1:1042593739824:web:a3c401e02fb3578fc769f5"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const storage = getStorage(app);

  const form = document.getElementById("registrationForm");
  const firebaseStatusDiv = document.getElementById("firebaseStatus");

  // Show feedback message
  function showFirebaseStatus(message, success, append = false) {
    if (!firebaseStatusDiv) return;
    firebaseStatusDiv.classList.remove("hidden", "bg-green-100", "text-green-700", "bg-red-100", "text-red-700");
    firebaseStatusDiv.classList.add(success ? "bg-green-100" : "bg-red-100");
    firebaseStatusDiv.classList.add(success ? "text-green-700" : "text-red-700");
    firebaseStatusDiv.innerHTML = append ? firebaseStatusDiv.innerHTML + "<br>" + message : message;
  }

  // Upload a file to Firebase Storage and return the download URL
  async function uploadFile(file, folderName) {
    const fileRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  // Handle form submission
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const data = {};

      try {
        // Collect non-file fields
        for (const [key, value] of formData.entries()) {
          const input = form.querySelector(`[name="${key}"]`);
          if (!input || input.type === "file") continue;

          if (data[key]) {
            if (Array.isArray(data[key])) {
              data[key].push(value);
            } else {
              data[key] = [data[key], value];
            }
          } else {
            data[key] = value;
          }
        }

        // Upload files: photo and signature
        const fileFields = ["photo", "signature"];
        for (const field of fileFields) {
          const file = formData.get(field);
          if (file && file.name) {
            const url = await uploadFile(file, field);
            data[`${field}URL`] = url;
          }
        }

        data.submittedAt = serverTimestamp();

        await addDoc(collection(db, "student_registrations"), data);

        showFirebaseStatus("🎉 Registration successful!", true);
        form.reset();
      } catch (error) {
        console.error("❌ Submission error:", error);
        showFirebaseStatus("⚠️ Submission failed: " + error.message, false);
      }
    });
  } else {
    showFirebaseStatus("⚠️ Form not found.", false);
  }
});
