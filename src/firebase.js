// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnXz1rkkMqxe564Px5OUAIJCbSbZKHvw8",
  authDomain: "blocapp-production.firebaseapp.com",
  projectId: "blocapp-production",
  storageBucket: "blocapp-production.firebasestorage.app",
  messagingSenderId: "863224331178",
  appId: "1:863224331178:web:ef06ed8ffa96051bc0c9d3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;