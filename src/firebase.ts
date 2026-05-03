import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// ─── Primary app: Auth + all existing web collections ────────────────────────
// (donors, requests, inventory, etc.) live here.
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// ─── Shared app: used ONLY for emergency alerts ───────────────────────────────
// The mobile app listens to this project, so alerts written here are instantly
// visible on the mobile app's Live Emergencies feed.
const sharedFirebaseConfig = {
  apiKey: "AIzaSyCei9tToBL04L9xjqBsCi-LC-nfwQCGnR4",
  authDomain: "blood-bank-7b50a.firebaseapp.com",
  projectId: "blood-bank-7b50a",
  storageBucket: "blood-bank-7b50a.firebasestorage.app",
  messagingSenderId: "102264137239",
  appId: "1:102264137239:web:206a17e0209778f2469e52",
};

const sharedApp = initializeApp(sharedFirebaseConfig, 'shared');
export const sharedDb = getFirestore(sharedApp);

// Sign in anonymously on the shared project so Firestore rules allow
// the web admin to read/write the alerts collection.
const sharedAuth = getAuth(sharedApp);
signInAnonymously(sharedAuth).catch((err) => {
  console.warn('[SharedFirebase] Anonymous sign-in failed:', err.message);
});
