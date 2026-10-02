// api/_firebaseAdmin.js
//
// FIX: switched from `import admin from "firebase-admin"` to Firebase's
// dedicated modern-module imports (`firebase-admin/app`, `firebase-admin/
// auth`). The old style doesn't reliably work in this kind of JavaScript
// project setup — `admin.apps` could come back as undefined, crashing
// immediately before even reaching our own code. This new style is the
// one Firebase specifically ships for this situation.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let initError = null;
let app = null;

if (getApps().length === 0) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    initError = "FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.";
    console.error("[ProjectPilot] " + initError);
  } else {
    try {
      const serviceAccount = JSON.parse(raw);
      app = initializeApp({ credential: cert(serviceAccount) });
    } catch (e) {
      initError =
        "FIREBASE_SERVICE_ACCOUNT_KEY is set but could not be used. This usually " +
        "means the JSON got mangled during copy-paste. Re-download the key from " +
        "Firebase console -> Project settings -> Service accounts -> Generate new " +
        "private key, and paste its ENTIRE raw content as one Vercel environment " +
        "variable value. Underlying error: " + String(e);
      console.error("[ProjectPilot] " + initError);
    }
  }
} else {
  app = getApps()[0];
}

// Reads the "Authorization: Bearer <idToken>" header, verifies it against
// Firebase, and returns the verified user's uid — or throws a readable
// error if anything is wrong, including setup problems.
export async function requireUser(req) {
  if (initError || !app) {
    const err = new Error("Server authentication is misconfigured: " + (initError || "unknown init failure"));
    err.statusCode = 500;
    throw err;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    const err = new Error("Missing authentication token.");
    err.statusCode = 401;
    throw err;
  }
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded.uid;
  } catch (e) {
    const err = new Error("Invalid or expired authentication token.");
    err.statusCode = 401;
    throw err;
  }
}
