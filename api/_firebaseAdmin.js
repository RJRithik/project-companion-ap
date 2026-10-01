// api/_firebaseAdmin.js
//
// Shared helper for API routes. Verifies that a request really comes from
// the logged-in user it claims to be.
//
// FIX: the JSON.parse of the service account key now has a try/catch
// around it. Before, if that value was malformed in any way, it would
// throw at the moment this file loads — crashing EVERY function that
// uses it (chat.js AND transcribe.js both), with no useful error message
// anywhere. Now a bad key gives a clear, readable error instead.

import admin from "firebase-admin";

let initError = null;

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    initError = "FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.";
    console.error("[ProjectPilot] " + initError);
  } else {
    try {
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      initError =
        "FIREBASE_SERVICE_ACCOUNT_KEY is set but could not be parsed as valid JSON. " +
        "This usually happens when the key's newlines get mangled during copy-paste. " +
        "Re-download the key from Firebase console -> Project settings -> Service " +
        "accounts -> Generate new private key, and paste its ENTIRE raw content as " +
        "one Vercel environment variable value, without editing it. " +
        "Underlying error: " + String(e);
      console.error("[ProjectPilot] " + initError);
    }
  }
}

// Reads the "Authorization: Bearer <idToken>" header, verifies it against
// Firebase, and returns the verified user's uid — or throws a readable
// error if anything is wrong, including setup problems.
export async function requireUser(req) {
  if (initError) {
    const err = new Error("Server authentication is misconfigured: " + initError);
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
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch (e) {
    const err = new Error("Invalid or expired authentication token.");
    err.statusCode = 401;
    throw err;
  }
}
