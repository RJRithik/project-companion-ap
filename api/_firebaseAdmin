// api/_firebaseAdmin.js
//
// Shared helper for API routes. Verifies that a request really comes from
// the logged-in user it claims to be — without this, anyone could send a
// fake "user ID" and read or change someone else's projects.
//
// Needs a Firebase service account key (server-side only secret, never
// the same as the public web config in src/lib/firebase.ts). Get one from:
// Firebase console -> Project settings -> Service accounts -> Generate
// new private key. That downloads a JSON file — copy its ENTIRE content
// into the FIREBASE_SERVICE_ACCOUNT_KEY environment variable as one line.

import admin from "firebase-admin";

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    console.error(
      "[ProjectPilot] FIREBASE_SERVICE_ACCOUNT_KEY is not set. " +
      "API routes that verify users will fail until this is configured."
    );
  } else {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

// Reads the "Authorization: Bearer <idToken>" header, verifies it against
// Firebase, and returns the verified user's uid — or throws if invalid.
export async function requireUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    const err = new Error("Missing authentication token.");
    err.statusCode = 401;
    throw err;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch (e) {
    const err = new Error("Invalid or expired authentication token.");
    err.statusCode = 401;
    throw err;
  }
}
