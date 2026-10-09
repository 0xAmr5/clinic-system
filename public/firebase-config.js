import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqpJ69jv9U9VOs8U-G-Zrkh1hRQSjHIu0",
  authDomain: "bani-mazar-hospital.firebaseapp.com",
  projectId: "bani-mazar-hospital",
  storageBucket: "bani-mazar-hospital.firebasestorage.app",
  messagingSenderId: "386457192007",
  appId: "1:386457192007:web:d5a45e2115a37d5c609362"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy 
};