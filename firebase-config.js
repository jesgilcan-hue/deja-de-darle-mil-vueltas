// Configuración de Firebase para Editorial Menos Ruido
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiWnQ5y-A8nuzaZkVye0oYfH1D1uRqUyw",
  authDomain: "editorialmenosruido.firebaseapp.com",
  projectId: "editorialmenosruido",
  storageBucket: "editorialmenosruido.firebasestorage.app",
  messagingSenderId: "126181347561",
  appId: "1:126181347561:web:c23c2edfd0a58eea40a078",
  measurementId: "G-W6LH6DB04K"
};

// Inicialización de la app
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configuración de roles y seguridad
export const DEVELOPER_EMAIL = "jesgilcan@gmail.com";
export const DEVELOPER_PIN = "1111";

/**
 * Comprueba si un usuario es el desarrollador/administrador
 */
export function isDeveloper(user) {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();
}

/**
 * Guarda o actualiza los datos del usuario en Firestore
 */
export async function syncUserProfile(user) {
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const isDev = isDeveloper(user);
  
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL || '',
    role: isDev ? 'admin' : 'client',
    lastLogin: serverTimestamp()
  };

  if (!snap.exists()) {
    userData.createdAt = serverTimestamp();
    await setDoc(userRef, userData);
  } else {
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      displayName: user.displayName || snap.data().displayName || '',
      photoURL: user.photoURL || snap.data().photoURL || ''
    });
  }

  return { ...snap.data(), ...userData };
}
