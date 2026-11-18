import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, terminate, clearIndexedDbPersistence, doc, getDoc, setDoc as _setDoc, updateDoc as _updateDoc, deleteDoc as _deleteDoc, addDoc as _addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6D6lvqErC4rXALCu9Tp_4_iI6fwjjR5k",
  authDomain: "p-finance-app.firebaseapp.com",
  projectId: "p-finance-app",
  storageBucket: "p-finance-app.firebasestorage.app",
  messagingSenderId: "157182448469",
  appId: "1:157182448469:web:bf091bf38a027e004115dc"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { db = initializeFirestore(app, {}); }
/* Offline: i dati restano consultabili, le modifiche richiedono connessione */
const wr = f => (...a) => navigator.onLine ? f(...a) : Promise.reject(Object.assign(new Error('offline'), { code: 'network-offline' }));
const setDoc = wr(_setDoc), updateDoc = wr(_updateDoc), deleteDoc = wr(_deleteDoc), addDoc = wr(_addDoc);

// Rende disponibili agli altri file i componenti Firebase
Object.assign(window, { auth, db, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, serverTimestamp, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, terminate, clearIndexedDbPersistence });
