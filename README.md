# Student Dashboard - Educational Website Login System

---
<div align="center">

![GitHub Repo stars](https://img.shields.io/github/stars/aec-cse/student-dashboard?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/aec-cse/student-dashboard?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/aec-cse/student-dashboard?style=for-the-badge)
![GitHub pull requests](https://img.shields.io/github/issues-pr/aec-cse/student-dashboard?style=for-the-badge)
![GitHub contributors](https://img.shields.io/github/contributors/aec-cse/student-dashboard?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/aec-cse/student-dashboard?style=for-the-badge)

[![Contributors](https://contrib.rocks/image?repo=aec-cse/student-dashboard)](https://github.com/aec-cse/student-dashboard/graphs/contributors)

</div>

> View the [GitHub commit activity page](https://github.com/aec-cse/student-dashboard/graphs/commit-activity) for a live, interactive graph.


**Project ID:** ATITS-INT-PROJ-001  
**Assigned by:** Anusaya Trading and IT Solutions  
**Deadline:** 5 June 2025

## Overview

A comprehensive web application for managing student information and administrative tasks. This system provides separate interfaces for students and administrators, with secure authentication and user management. The project serves as a practical implementation of web development concepts using modern technologies.

## Features

### Student Features
- Secure student login system
- Personal dashboard with student-specific information
- Profile management
- Protected student resources

### Admin Features
- Secure admin authentication
- Administrative dashboard
- Student registration and management
- System oversight and monitoring
- User credential generation

## Technical Implementation

### Frontend Architecture
- **HTML5** - Semantic markup for all pages
- **CSS3** - Modern styling with responsive design
- **JavaScript (ES6+)** - Client-side functionality and validation

### Backend Options

#### Firebase Implementation
- Firebase Authentication for secure user management
- Firestore Database for data persistence
- Real-time updates and synchronization
- Secure cloud hosting

## Project Structure

```
student-dashboard/
├── index.html                  # Landing page
├── student-dashboard.html      # Student dashboard
├── admin-dashboard.html        # Admin dashboard
├── student-login.html          # Student login
├── admin-login.html            # Admin login
├── student-registration.html   # Student registration
├── studentlogin.html           # (legacy/alternate student login)
├── js/
│   ├── student-dashboard.js    # Student dashboard logic
│   ├── admin-dashboard.js      # Admin dashboard logic
│   ├── student-login.js        # Student login logic
│   ├── admin-login.js          # Admin login logic
│   ├── student-registration.js # Student registration logic
│   └── studentlogin.js         # (legacy/alternate student login logic)
├── css/
│   ├── admin-dashboard.css
│   ├── student-dashboard.css
│   ├── login.css
│   ├── student-registration.css
├── email-config.js
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── Logo.png
└── README.md
```

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Internet connection
- (For PHP/MySQL) Local server environment (XAMPP/WAMP/MAMP)

### Setup Instructions

#### Firebase Setup
1. Clone the repository
2. Configure Firebase:
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Add Firebase configuration
   - Set up security rules
3. Open `index.html` with live server in your browser


## Security Features

- Secure password hashing
- Role-based access control
- Protected routes and resources
- Session management
- Input validation and sanitization

## Development Guidelines

### Code Style
- Follow HTML5 semantic markup
- Use CSS3 best practices
- Implement ES6+ JavaScript standards
- Maintain consistent naming conventions

### Best Practices
- Regular security audits
- Code documentation
- Error handling
- Responsive design
- Cross-browser compatibility

## Project Notes

### Implementation Notes
- Admin credentials are pre-configured for initial setup
- Student registration requires admin approval
- All passwords are securely hashed
- Session timeouts implemented for security

### Known Challenges
- Implementing secure authentication
- Managing user sessions
- Cross-browser compatibility
- Database optimization

### Assumptions
- Admin users are trusted personnel
- Students have valid email addresses
- Modern browser support
- Stable internet connection
