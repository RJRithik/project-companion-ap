// api/_firebaseAdmin.js
//
// FIX: firebase-admin itself has a deep internal dependency conflict in
// this project's environment (its jwks-rsa dependency tries to
// require() a newer jose package that no longer supports that style of
// import — this breaks inside firebase-admin's own code, not ours, so
// there was no way to fix it by editing our file further).
//
// Since we only ever used firebase-admin for ONE thing — checking that a
// login token is genuinely valid — this replaces it with the same check
// done directly, using the modern "jose" library alone. This is a
// well-established, secure way to verify Firebase ID tokens without the
// heavier Admin SDK: we fetch Google's public verification keys, and
// use them to confirm the token was really issued by Firebase for this
// project and hasn't expired or been tampered with.

import { jwtVerify, createRemoteJWKSet } from "jose";

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

// Reads the "Authorization: Bearer <idToken>" header, verifies it really
// was issued by Firebase for THIS project and hasn't expired, and
// returns the verified user's uid — or throws a readable error.
export async function requireUser(req) {
  if (!PROJECT_ID) {
    const err = new Error("Server is missing VITE_FIREBASE_PROJECT_ID in environment variables.");
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
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    // Firebase puts the user's unique id in the standard "sub" claim.
    if (!payload.sub) {
      throw new Error("Token has no subject claim.");
    }
    return payload.sub;
  } catch (e) {
    const err = new Error("Invalid or expired authentication token.");
    err.statusCode = 401;
    throw err;
  }
}
