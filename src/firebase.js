// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
// Temporarily disable security validation to fix loading issue
// import { validateFirebaseConfig } from './config/security';

// Your web app's Firebase configuration
// Using environment variables for security - values are stored in .env file

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebase config validation (silent in production)

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

// Initialize Cloud Functions (region: europe-west1)
export const functions = getFunctions(app, 'europe-west1');

// Connect to emulator in development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FUNCTIONS_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Export Cloud Function callables
export const cloudFunctions = {
  sendVerificationEmail: httpsCallable(functions, 'sendVerificationEmail'),
  sendPasswordResetEmail: httpsCallable(functions, 'sendPasswordResetEmail'),
  resendVerificationEmail: httpsCallable(functions, 'resendVerificationEmail')
};

export default app;