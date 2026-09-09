import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";

const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};

// Read Firebase Config for panic-guard-e858d
export const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || "panic-guard-e858d",
  appId: env.VITE_FIREBASE_APP_ID || "1:41204418952:web:c00e8339484c29a00c923d",
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyC4pFNM9ZndbqpdJbWE-PRXpVepMRL1lYk",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "panic-guard-e858d.firebaseapp.com",
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || "ai-studio-panicguardbotnde-384600a4-914d-49c1-86de-391986570dd8",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "panic-guard-e858d.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "41204418952",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

// Initialize App (Singleton Safe)
let app: any;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  console.warn("[Firebase] initializeApp fallback:", e);
  app = getApps()[0] || initializeApp(firebaseConfig, "panic-guard-app");
}

// Initialize Services safely
let auth: any;
try {
  auth = getAuth(app);
} catch (e) {
  console.warn("[Firebase] getAuth init notice:", e);
}

let db: any;
try {
  // Initialize getFirestore with custom databaseId if specified and not "(default)"
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("[Firebase] getFirestore init notice:", e);
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
};

export type { FirebaseUser };
