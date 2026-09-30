// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Real Firebase Project Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCWs4RoIjNLZkaJl-x0TqWZn8O_kFvnClM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "project-pilot-8e2be.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "project-pilot-8e2be",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "project-pilot-8e2be.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1034703452526",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1034703452526:web:5c343c00778a9b49b0a97f"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = "project-pilot";
export const isFirebaseConfigured = true;
