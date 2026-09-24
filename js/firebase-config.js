// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  getDoc,
  onSnapshot, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4jinx3kH6Mo9LYD_KAM-3tpxKevrofFk",
  authDomain: "conglomerado-empresarial.firebaseapp.com",
  projectId: "conglomerado-empresarial",
  storageBucket: "conglomerado-empresarial.firebasestorage.app",
  messagingSenderId: "36848994870",
  appId: "1:36848994870:web:2fa267a5e1d35ce1baa697",
  measurementId: "G-1LPLVQJ8G0"
};

// Inicialización de la app
const app = initializeApp(firebaseConfig);

// APUNTAR AL ID EXACTO DE TU BASE DE DATOS
const db = getFirestore(app, "conglomerado-empresarial");

const auth = getAuth(app);
const storage = getStorage(app);

export { 
  app, 
  db, 
  auth, 
  storage,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where
};
