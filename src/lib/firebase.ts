// src/lib/firebase.ts
//
// This connects the app to YOUR real Firebase project. The original code
// expected special values (__firebase_config, __app_id) that only exist
// inside one specific AI tool's own preview environment — they don't
// exist anywhere else, so the app would crash immediately outside it.
//
// This file replaces that with real configuration, read from environment
// variables (set in a .env file locally, and in Vercel's project settings
// once deployed). None of these values are secret — Firebase's web config
// is meant to be public; real security comes from Firestore's rules
// (see firestore.rules in this project) and Firebase Authentication.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  // This makes the problem obvious immediately instead of a confusing
  // crash somewhere else, if the .env file is missing or not set up yet.
  console.error(
    "[ProjectPilot] Firebase config is missing. Check that your .env file " +
    "has all VITE_FIREBASE_* values set — see .env.example."
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Every project's data lives under this path in Firestore:
//   artifacts/{APP_ID}/users/{uid}/projects/{projectId}
// APP_ID just namespaces your data — it can be any fixed string, it does
// not need to match anything from Firebase itself.
export const APP_ID = "project-pilot";
