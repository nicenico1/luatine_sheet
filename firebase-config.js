/**
 * Firebase Configuration — Fiche RP
 *
 * HOW TO SET UP (one-time, ~5 minutes):
 *
 *   1.  Go to  https://console.firebase.google.com/
 *   2.  Click "Add project" → name it (e.g. "fiche-rp") → create.
 *   3.  In Project Settings (⚙) → General → "Your apps" → click the Web icon (</>).
 *       Register the app (any nickname), skip Firebase Hosting.
 *       Copy the firebaseConfig object values below.
 *   4.  In the left sidebar → Build → Firestore Database → "Create database"
 *       → choose a region close to you → Start in **test mode** → Create.
 *   5.  Build → Storage → "Get started" → Start in **test mode** → Done.
 *   6.  Paste your config values below and push to GitHub.
 *
 * SECURITY NOTE: These values are PUBLIC by design (like an API endpoint).
 * Firebase security is enforced by Firestore / Storage rules, not by hiding this file.
 *
 * RECOMMENDED FIRESTORE RULES (Firestore → Rules tab):
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /sheets/{sheetId} {
 *         allow read : if true;
 *         allow write: if true;
 *       }
 *     }
 *   }
 *
 * RECOMMENDED STORAGE RULES (Storage → Rules tab):
 *   rules_version = '2';
 *   service firebase.storage {
 *     match /b/{bucket}/o {
 *       match /images/{allPaths=**} {
 *         allow read : if true;
 *         allow write: if request.resource.size < 10 * 1024 * 1024;
 *       }
 *     }
 *   }
 */

const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCq99-iJDE-nZJKvo8d0oRj8v5xTeY5134",
    authDomain:        "luatine-sheet.firebaseapp.com",
    projectId:         "luatine-sheet",
    storageBucket:     "luatine-sheet.firebasestorage.app",
    messagingSenderId: "679591300034",
    appId:             "1:679591300034:web:f3168ead48ec0cf0d2e45b",
    measurementId:     "G-0VD3H0FBB0"
};

const FIREBASE_COLLECTION = "sheets";
const FIREBASE_DOC_ID     = "lua-tyler";
