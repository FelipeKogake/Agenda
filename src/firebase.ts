import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAE9DB7ihzL9g16wWp7GqUuGTnAoee686A',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'agenda-2e1df.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'agenda-2e1df',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'agenda-2e1df.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '764649860827',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:764649860827:web:8f88373af1685a081b66fe',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
