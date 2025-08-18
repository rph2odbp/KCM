import { initializeApp, getApp, getApps } from 'firebase/app'
import type { FirebaseOptions } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
// import { getAnalytics, isSupported } from 'firebase/analytics' // optional

// Pull configuration from Vite env variables
const getEnv = (key: string) => import.meta.env[key as keyof ImportMetaEnv] as string | undefined

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

const missing = requiredKeys.filter(k => !getEnv(k))
if (missing.length) {
  // Fail fast with a clear error during development; in production just warn
  const msg = `Firebase config missing required env vars: ${missing.join(', ')}`
  // eslint-disable-next-line no-console
  console.warn(msg)
  if (import.meta.env.MODE !== 'production') {
    throw new Error(msg)
  }
}

const firebaseConfig: FirebaseOptions = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY')!,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN')!,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID')!,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET')!,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID')!,
  appId: getEnv('VITE_FIREBASE_APP_ID')!,
  ...(getEnv('VITE_FIREBASE_MEASUREMENT_ID')
    ? { measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID')! }
    : {}),
}

// Avoid re-initializing during HMR
const appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const app = appInstance
export const auth = getAuth(app)
let dbInstance = getFirestore(app)
// Allow region override via env (defaults to us-central1)
const functionsRegion = getEnv('VITE_FIREBASE_FUNCTIONS_REGION') || 'us-central1'
const FUNCTIONS_ORIGIN = getEnv('VITE_FUNCTIONS_ORIGIN') // Optional full https origin for tunnels
export const functions = FUNCTIONS_ORIGIN
  ? getFunctions(app, FUNCTIONS_ORIGIN)
  : getFunctions(app, functionsRegion)
export const storage = getStorage(app)

// Use emulators during local dev if desired
const useEmulators = getEnv('VITE_USE_EMULATORS') === 'true' || getEnv('VITE_USE_EMULATORS') === '1'
const EMULATOR_HOST = getEnv('VITE_EMULATOR_HOST') || '127.0.0.1'
const AUTH_URL = getEnv('VITE_AUTH_EMULATOR_URL') // Optional full URL (supports https)
const FS_URL = getEnv('VITE_FS_EMULATOR_URL') // Optional full URL (supports https)
const AUTH_PORT = Number(getEnv('VITE_EMULATOR_AUTH_PORT') || '9100')
const FS_PORT = Number(getEnv('VITE_EMULATOR_FS_PORT') || '8087')
const FUNC_PORT = Number(getEnv('VITE_EMULATOR_FUNC_PORT') || '5001')
const STORAGE_PORT = Number(getEnv('VITE_EMULATOR_STORAGE_PORT') || '9197')
const isBrowser = typeof window !== 'undefined'
const EMULATOR_FLAG = '__FIREBASE_EMULATORS_CONNECTED__'
if (useEmulators && isBrowser && !(window as any)[EMULATOR_FLAG]) {
  // Auth supports a full URL (works over https tunnels like Codespaces)
  if (AUTH_URL) {
    connectAuthEmulator(auth, AUTH_URL, { disableWarnings: true })
  } else {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true })
  }
  // Firestore via full URL using initializeFirestore with ssl and host:port
  if (FS_URL) {
    try {
      const u = new URL(FS_URL)
      const hostPort = u.host // includes :port if present
      const ssl = u.protocol === 'https:'
      dbInstance = initializeFirestore(app, { host: hostPort, ssl })
    } catch (e) {
      console.warn('Invalid VITE_FS_EMULATOR_URL, falling back to host/port:', e)
      connectFirestoreEmulator(dbInstance, EMULATOR_HOST, FS_PORT)
    }
  } else {
    connectFirestoreEmulator(dbInstance, EMULATOR_HOST, FS_PORT)
  }
  // Functions: if a custom origin is provided, skip connectFunctionsEmulator
  if (!FUNCTIONS_ORIGIN) {
    connectFunctionsEmulator(functions, EMULATOR_HOST, FUNC_PORT)
  }
  connectStorageEmulator(storage, EMULATOR_HOST, STORAGE_PORT)
  ;(window as any)[EMULATOR_FLAG] = true
}

export const db = dbInstance

// Optional analytics (browser-only):
// isSupported().then((ok) => { if (ok) getAnalytics(app) })
