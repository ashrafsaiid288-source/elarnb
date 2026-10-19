/**
 * Firebase Configuration File
 * 
 * IMPORTANT: SETUP GUIDE FOR DEVELOPERS
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (free Spark plan)
 * 3. Add a Web App to the project
 * 4. Copy the firebaseConfig object from the console and paste it below.
 * 5. In Firebase Console -> Authentication -> Sign-in method -> Enable Email/Password
 * 6. In Firebase Console -> Firestore Database -> Create database (start in test mode)
 */

const firebaseConfig = {
  apiKey: "AIzaSyCeeredwO274CDjE0k4RbNhRC7ahSv5DXY",
    authDomain: "elarnab.firebaseapp.com",
    projectId: "elarnab",
    storageBucket: "elarnab.firebasestorage.app",
    messagingSenderId: "371017287026",
    appId: "1:371017287026:web:0ebd5b8ab9def19734c9eb"
};

// Initialize Firebase only if the config is valid
let app, auth, db;

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase initialized successfully");
    } else {
        console.error("FIREBASE NOT CONFIGURED: Please replace firebaseConfig values in js/firebase-config.js");
    }
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// Make globally available if using simple scripts setup
window.fbAuth = auth;
window.fbDb = db;
