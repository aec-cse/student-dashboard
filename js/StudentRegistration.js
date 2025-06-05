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

  const firebaseConfig = {
    apiKey: "AIzaSyA1RR9d31qkKdBsbH02NBMEydIuqmLgOwA",
    authDomain: "student-login-system-47e0a.firebaseapp.com",
    projectId: "student-login-system-47e0a",
    storageBucket: "student-login-system-47e0a.firebasestorage.app",
    messagingSenderId: "497762887092",
    appId: "1:497762887092:web:1484a822eff9e2b121fee1"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const storage = getStorage(app);

  const form = document.querySelector("form");
  const firebaseStatusDiv = document.getElementById("firebaseStatus");

  function showFirebaseStatus(message, success, append = false) {
    if (!firebaseStatusDiv) return;

    firebaseStatusDiv.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
    firebaseStatusDiv.classList.add(success ? 'bg-green-100' : 'bg-red-100');
    firebaseStatusDiv.classList.add(success ? 'text-green-700' : 'text-red-700');
    firebaseStatusDiv.innerHTML = append ? `${firebaseStatusDiv.innerHTML}<br>${message}` : message;
  }

  async function uploadFile(file, folderName) {
    const fileRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const data = {};

      try {
        // Extract all non-file fields
        for (const [key, value] of formData.entries()) {
          const input = form.querySelector(`[name="${key}"]`);
          if (input && input.type !== 'file') {
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
        }

        // Upload files: photo and signature
        const fileFields = ['photo', 'signature'];
        for (const field of fileFields) {
          const file = formData.get(field);
          if (file && file.name) {
            const url = await uploadFile(file, field);
            data[`${field}URL`] = url;
          }
        }

        // Add timestamp
        data['submittedAt'] = serverTimestamp();

        // Save to Firestore
        await addDoc(collection(db, "student_registrations"), data);

        showFirebaseStatus("🎉 Registration successful!", true);
        form.reset();
      } catch (error) {
        console.error("❌ Error submitting form:", error);
        showFirebaseStatus("⚠️ Submission failed: " + error.message, false);
      }
    });
  } else {
    showFirebaseStatus("⚠️ Form not found.", false);
  }
});
