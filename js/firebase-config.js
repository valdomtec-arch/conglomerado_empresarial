// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
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

// Credenciales oficiales de tu app "Empresas y Proyectos"
const firebaseConfig = {
  apiKey: "AIzaSyC4jinx3kH6Mo9LYD_KAM-3tpxKevroffk",
  authDomain: "conglomerado-empresarial.firebaseapp.com",
  projectId: "conglomerado-empresarial",
  storageBucket: "conglomerado-empresarial.appspot.com",
  messagingSenderId: "36848994870",
  appId: "1:36848994870:web:2fa267a5e1d35ce1baa697"
};

// Inicialización
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Persistencia offline con IndexedDB
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistencia: múltiples pestañas abiertas.');
  } else if (err.code === 'unimplemented') {
    console.warn('El navegador no soporta IndexedDB.');
  }
});

// Exportaciones completas para consumo en toda la aplicación
export { 
  app, 
  db, 
  auth, 
  storage,
  // Auth
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  // Firestore
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
