// Firebase initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, doc, setDoc, addDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase configuration
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
const db = getFirestore(app);

// Sample data
const sampleData = {
    courses: [
        {
            courseName: "Introduction to Computer Science",
            courseCode: "CS101",
            instructor: "Dr. Smith",
            schedule: "Mon/Wed 10:00 AM - 11:30 AM",
            credits: 3,
            description: "Basic concepts of computer science and programming"
        },
        {
            courseName: "Data Structures and Algorithms",
            courseCode: "CS201",
            instructor: "Dr. Johnson",
            schedule: "Tue/Thu 1:00 PM - 2:30 PM",
            credits: 4,
            description: "Study of fundamental data structures and algorithms"
        },
        {
            courseName: "Database Management Systems",
            courseCode: "CS301",
            instructor: "Dr. Williams",
            schedule: "Mon/Wed 2:00 PM - 3:30 PM",
            credits: 3,
            description: "Principles and practices of database design and management"
        }
    ],
    students: [
        {
            name: "John Doe",
            email: "john.doe@example.com",
            studentId: "STU001",
            department: "Computer Science",
            semester: "Fall 2024",
            enrollmentDate: new Date("2024-01-15")
        },
        {
            name: "Jane Smith",
            email: "jane.smith@example.com",
            studentId: "STU002",
            department: "Computer Science",
            semester: "Fall 2024",
            enrollmentDate: new Date("2024-01-15")
        }
    ]
};

// Initialize database with sample data
async function initializeDatabase() {
    try {
        // Add courses
        for (const course of sampleData.courses) {
            const courseRef = doc(collection(db, "courses"));
            await setDoc(courseRef, {
                ...course,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`Added course: ${course.courseName}`);
        }

        // Add students
        for (const student of sampleData.students) {
            const studentRef = doc(collection(db, "students"));
            await setDoc(studentRef, {
                ...student,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`Added student: ${student.name}`);

            // Add enrollments for each student
            for (const course of sampleData.courses) {
                const enrollmentRef = doc(collection(db, "enrollments"));
                await setDoc(enrollmentRef, {
                    studentId: studentRef.id,
                    courseId: course.courseCode,
                    enrollmentDate: new Date(),
                    status: "active"
                });
                console.log(`Enrolled ${student.name} in ${course.courseName}`);

                // Add sample attendance records
                for (let i = 0; i < 5; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const attendanceRef = doc(collection(db, "attendance"));
                    await setDoc(attendanceRef, {
                        studentId: studentRef.id,
                        courseId: course.courseCode,
                        date: date,
                        status: ["present", "absent", "late"][Math.floor(Math.random() * 3)],
                        remarks: ""
                    });
                }

                // Add sample grades
                const gradesRef = doc(collection(db, "grades"));
                const midterm = Math.floor(Math.random() * 30) + 70;
                const final = Math.floor(Math.random() * 40) + 60;
                const assignment = Math.floor(Math.random() * 20) + 80;
                const total = midterm + final + assignment;
                const letterGrade = total >= 90 ? "A" : 
                                  total >= 80 ? "B" : 
                                  total >= 70 ? "C" : 
                                  total >= 60 ? "D" : "F";

                await setDoc(gradesRef, {
                    studentId: studentRef.id,
                    courseId: course.courseCode,
                    midterm,
                    final,
                    assignment,
                    total,
                    letterGrade,
                    semester: "Fall 2024",
                    updatedAt: new Date()
                });
            }

            // Add sample notifications
            const notifications = [
                {
                    title: "Welcome to Student Portal",
                    message: "Welcome to your student dashboard! You can now access your courses, grades, and attendance records.",
                    type: "info"
                },
                {
                    title: "Course Registration Open",
                    message: "Course registration for Spring 2024 is now open. Please register before the deadline.",
                    type: "warning"
                },
                {
                    title: "Important: Midterm Schedule",
                    message: "Midterm examinations will begin next week. Please check your schedule.",
                    type: "important"
                }
            ];

            for (const notification of notifications) {
                const notificationRef = doc(collection(db, "notifications"));
                await setDoc(notificationRef, {
                    studentId: studentRef.id,
                    ...notification,
                    timestamp: new Date(),
                    read: false
                });
            }
        }

        console.log("Database initialization completed successfully!");
    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

// Run initialization
// initializeDatabase();

export { initializeDatabase }; 