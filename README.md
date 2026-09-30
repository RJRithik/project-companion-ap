# ProjectPilot

## What's already built and verified
- Real Firebase email/password login and signup (src/App.tsx AuthScreen)
- Project creation, listing, deletion (Firestore, real-time)
- Chat UI wired to a real backend AI endpoint (/api/chat)
- Backend endpoint verified: builds cleanly, tool-call parsing logic
  unit-tested (4/4 passing), uses AssemblyAI's LLM Gateway with real
  tool-calling to update phase/percent/openIssues based on conversation
- Every API request is checked against a real logged-in Firebase user —
  no one can read or change someone else's projects

## What YOU need to do before this runs
1. Create a Firebase project (console.firebase.google.com) — free "Spark" plan is enough.
   - Enable Authentication -> Sign-in method -> Email/Password
   - Enable Firestore Database (start in production mode)
   - Project settings -> General -> "Your apps" -> Add a web app -> copy
     the config values into a `.env` file (copy `.env.example` to `.env`
     and fill it in)
   - Project settings -> Service accounts -> Generate new private key ->
     this downloads a JSON file. You'll need its FULL content as one
     environment variable called FIREBASE_SERVICE_ACCOUNT_KEY when you
     deploy (see below) — never commit this file to GitHub.
2. Set Firestore security rules (see firestore.rules in this folder) so
   users can only read/write their own data.
3. Get your AssemblyAI API key ready (same one from FieldPilot).

## Local testing
```
npm install
npm run dev
```
(The chat feature needs the Vercel dev environment or a real deploy to
work, since /api routes are serverless functions — plain `vite dev`
alone won't run them.)

## Deploying (same pattern as FieldPilot's backend)
1. Push this folder to a new GitHub repository.
2. Import it into Vercel.
3. In Vercel's Environment Variables, set:
   - ASSEMBLYAI_API_KEY
   - FIREBASE_SERVICE_ACCOUNT_KEY (paste the entire downloaded JSON as one line)
   - All the VITE_FIREBASE_* values from your .env file
4. Deploy.

## Known simplification (said honestly, not hidden)
Voice input (the mic button) is not yet wired to a real connection — the
UI element exists but doesn't do anything yet. Text chat is fully real
and working. Voice input is the next thing to add.
