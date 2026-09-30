// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Read from Vite environment variables or fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Check if valid API key is present
const hasValidConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== "demo-key");

if (!hasValidConfig) {
  console.warn(
    "[ProjectPilot] Firebase config is missing or invalid. Set VITE_FIREBASE_* environment variables in Vercel or update src/lib/firebase.ts directly."
  );
}

// Dummy fallback to prevent top-level uncaught module import crashes
const dummyConfig = {
  apiKey: "AIzaSyDummyKeyForInitializationOnly12345",
  authDomain: "project-pilot.firebaseapp.com",
  projectId: "project-pilot",
  storageBucket: "project-pilot.appspot.com",
  messagingSenderId: "100000000000",
  appId: "1:100000000000:web:dummy"
};

const activeConfig = hasValidConfig ? firebaseConfig : dummyConfig;

export const app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = "project-pilot";
export const isFirebaseConfigured = hasValidConfig;
