import { getFirebaseInstance } from './firebase-config.js';
import { 
    collection, addDoc, getDoc, getDocs, query, 
    where, orderBy, limit, doc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
    createUserWithEmailAndPassword 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    formatMobileNumber, formatDate, getMonthAbbreviation, 
    generateApplicationId, handleError 
} from '../utils/common.js';

// Upload image to Cloudinary
async function uploadToCloudinary(file, previewId) {
    if (!file) {
        throw new Error('No file provided for upload');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'student_registration');

    try {
        const response = await fetch('https://api.cloudinary.com/v1_1/your-cloud-name/image/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload image');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        handleError(error, 'uploading image');
    }
}

// Generate internship ID
async function generateInternshipId() {
    try {
        const { db } = getFirebaseInstance();
        const year = new Date().getFullYear();
        const month = getMonthAbbreviation();
        
        const studentCollection = collection(db, 'student-registrations');
        const querySnapshot = await getDocs(query(
            studentCollection,
            where('internshipId', '>=', `ATIT-${year}-${month}-`),
            where('internshipId', '<=', `ATIT-${year}-${month}-999`),
            orderBy('internshipId', 'desc'),
            limit(1)
        ));

        let serialNumber = 1;
        if (!querySnapshot.empty) {
            const lastId = querySnapshot.docs[0].data().internshipId;
            const lastSerial = parseInt(lastId.split('-')[3]);
            serialNumber = lastSerial + 1;
        }

        // Pad serial number with zeros to ensure 3 digits
        const paddedSerial = serialNumber.toString().padStart(3, '0');
        return `ATIT-${year}-${month}-${paddedSerial}`;
    } catch (error) {
        handleError(error, 'generating internship ID');
    }
}

// Create user account
async function createUserAccount(email, password) {
    try {
        const { auth } = getFirebaseInstance();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        handleError(error, 'creating user account');
    }
}

// Save registration to Firestore
export async function saveRegistration(data, photographFile, signatureFile) {
    const { db } = getFirebaseInstance();

    try {
        console.log('Starting registration process...');
        
        // Generate internship ID
        const internshipId = await generateInternshipId();
        console.log('Generated Internship ID:', internshipId);

        // Get current date
        const currentDate = new Date();
        const formattedDate = formatDate(currentDate);

        // Format contact number
        const contactNumber = formatMobileNumber(data.contact);
        if (contactNumber.length !== 10) {
            throw new Error('Please provide a valid 10-digit mobile number');
        }

        // Upload images
        console.log('Uploading images...');
        const [photographURL, signatureURL] = await Promise.all([
            uploadToCloudinary(photographFile, 'photographPreview'),
            uploadToCloudinary(signatureFile, 'signaturePreview')
        ]);
        console.log('Images uploaded successfully');

        // Create user account
        console.log('Creating user account...');
        const user = await createUserAccount(data.email, contactNumber);
        console.log('User account created:', user.uid);

        // Prepare registration data
        const registrationData = {
            ...data,
            contact: contactNumber,
            internshipId: String(internshipId),
            photographURL,
            signatureURL,
            email: data.email,
            status: 'pending',
            applicationDate: formattedDate,
            registeredAt: currentDate.toISOString(),
            applicationId: generateApplicationId(),
            userId: user.uid,
            submittedAt: currentDate.toISOString()
        };

        // Save to Firestore
        console.log('Saving registration data...');
        const docRef = await addDoc(collection(db, 'student-registrations'), registrationData);
        
        // Verify save
        const savedDoc = await getDoc(docRef);
        if (!savedDoc.exists()) {
            throw new Error('Failed to verify saved registration data');
        }

        console.log('Registration saved successfully:', docRef.id);
        return {
            docId: docRef.id,
            internshipId,
            email: data.email,
            contact: contactNumber
        };
    } catch (error) {
        handleError(error, 'saving registration');
    }
}

// Get student registration by ID
export async function getRegistrationById(registrationId) {
    try {
        const { db } = getFirebaseInstance();
        const docRef = doc(db, 'student-registrations', registrationId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Registration not found');
        }
        
        return docSnap.data();
    } catch (error) {
        handleError(error, 'getting registration');
    }
}

// Get student registrations by status
export async function getRegistrationsByStatus(status) {
    try {
        const { db } = getFirebaseInstance();
        const q = query(
            collection(db, 'student-registrations'),
            where('status', '==', status),
            orderBy('submittedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        handleError(error, 'getting registrations');
    }
} 