import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
// import { getAnalytics, isSupported } from 'firebase/analytics' // optional

const firebaseConfig = {
  apiKey: 'AIzaSyB7x73tHifNnBOEUU_fDcouv9Amv9rBWNE',
  authDomain: 'kcm-firebase-b7d6a.firebaseapp.com',
  projectId: 'kcm-firebase-b7d6a',
  storageBucket: 'kcm-firebase-b7d6a.appspot.com',
  messagingSenderId: '643149621878',
  appId: '1:643149621878:web:150eec11fc49c4ef058d57',
  measurementId: 'G-74RRJMJV1Q',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app, 'us-central1')
export const storage = getStorage(app)

// Use emulators during local dev if desired
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9000', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 9099)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  connectStorageEmulator(storage, '127.0.0.1', 8085)
}

// Optional analytics (browser-only):
// isSupported().then((ok) => { if (ok) getAnalytics(app) })
