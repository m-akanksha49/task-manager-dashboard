import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your config
const firebaseConfig = {
  apiKey: "AIzaSyA5jmMBbUDKnBoMHNWqGg80-Vc6poIIX60",
  authDomain: "task-manager-dashboard-e383a.firebaseapp.com",
  projectId: "task-manager-dashboard-e383a",
  storageBucket: "task-manager-dashboard-e383a.firebasestorage.app",
  messagingSenderId: "145290178143",
  appId: "1:145290178143:web:2d1d4466db8b28fdb435ea"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Add these (VERY IMPORTANT)
export const auth = getAuth(app);
export const db = getFirestore(app);