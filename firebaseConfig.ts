// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAZf6cxF6eLSzCkbXK5dOneN4n3ljSlXxs",
  authDomain: "whatsapp-bluetooth-5ebcf.firebaseapp.com",
  projectId: "whatsapp-bluetooth-5ebcf",
  storageBucket: "whatsapp-bluetooth-5ebcf.firebasestorage.app",
  messagingSenderId: "351416683558",
  appId: "1:351416683558:web:5eea99c40830ec4f046ae7",
};

// Initialize Firebase and export the service instances
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
