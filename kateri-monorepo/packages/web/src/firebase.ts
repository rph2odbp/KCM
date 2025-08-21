import { initializeApp, getApp, getApps } from 'firebase/app'
import type { FirebaseOptions } from 'firebase/app'
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
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
export const CONFIG_OK = missing.length === 0
if (!CONFIG_OK) {
  const msg = `Firebase config missing required env vars: ${missing.join(', ')}`
  // Do not throw in development to avoid a blank page; surface clearly in console
  console.error(msg)
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
// Persist auth across reloads like the Fireship example
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* ignore envs that don't support persistence */
})
export const projectId = getEnv('VITE_FIREBASE_PROJECT_ID')!
export const databaseId = getEnv('VITE_FIRESTORE_DATABASE_ID') || 'kcm-db'
const dbInstance = getFirestore(app, databaseId)
// Allow region override via env (defaults to us-central1)
const functionsRegion = getEnv('VITE_FIREBASE_FUNCTIONS_REGION') || 'us-central1'
const FUNCTIONS_ORIGIN = getEnv('VITE_FUNCTIONS_ORIGIN') // Optional full https origin for tunnels
export const functions = FUNCTIONS_ORIGIN
  ? getFunctions(app, FUNCTIONS_ORIGIN)
  : getFunctions(app, functionsRegion)
export const storage = getStorage(app)

// Use emulators during local dev if desired
const useEmulators = getEnv('VITE_USE_EMULATORS') === 'true' || getEnv('VITE_USE_EMULATORS') === '1'
export const IS_EMULATOR = useEmulators
const DISABLE_AUTH = getEnv('VITE_DISABLE_AUTH') === 'true'
const EMULATOR_HOST = getEnv('VITE_EMULATOR_HOST') || '127.0.0.1'
const AUTH_URL = getEnv('VITE_AUTH_EMULATOR_URL') // Optional full URL (supports https)
const FS_URL = getEnv('VITE_FS_EMULATOR_URL') // Optional full URL (supports https)
// Default emulator ports aligned with repo firebase.json
const FS_PORT = Number(getEnv('VITE_EMULATOR_FS_PORT') || '8088')
const FUNC_PORT = Number(getEnv('VITE_EMULATOR_FUNC_PORT') || '5001')
const STORAGE_PORT = Number(getEnv('VITE_EMULATOR_STORAGE_PORT') || '9198')
const isBrowser = typeof window !== 'undefined'
declare global {
  // Track emulator wiring on window without using 'any'
  interface Window {
    __FIREBASE_EMULATORS_CONNECTED__?: boolean
  }
}
// When served through an HTTPS tunnel (e.g. Codespaces) the Firestore WebChannel (http://host:port) is blocked as mixed content.
// Detect that scenario and skip connectFirestoreEmulator, relying on REST calls via Vite proxy instead.
const HTTPS_TUNNEL = isBrowser && window.location.protocol === 'https:'
export const FIRESTORE_REST_ONLY = useEmulators && HTTPS_TUNNEL

if (useEmulators && isBrowser && !window.__FIREBASE_EMULATORS_CONNECTED__) {
  if (!DISABLE_AUTH) {
    if (AUTH_URL) {
      console.info('[KCM] Connecting Auth emulator via AUTH_URL:', AUTH_URL)
      connectAuthEmulator(auth, AUTH_URL, { disableWarnings: true })
    } else {
      const proxied = `${window.location.origin}/emulator/auth`
      console.info('[KCM] Connecting Auth emulator via same-origin proxy:', proxied)
      connectAuthEmulator(auth, proxied, { disableWarnings: true })
    }
  } else {
    console.info('[KCM] Auth disabled (VITE_DISABLE_AUTH=true); skipping Auth emulator connection')
  }
  // Firestore emulator connection (skip if REST-only mode to avoid mixed content in HTTPS tunnel)
  if (!FIRESTORE_REST_ONLY) {
    if (FS_URL) {
      try {
        const u = new URL(FS_URL)
        const host = u.hostname
        const port = Number(u.port || FS_PORT)
        connectFirestoreEmulator(dbInstance, host, port)
      } catch (e) {
        console.warn('Invalid VITE_FS_EMULATOR_URL, falling back to host/port:', e)
        connectFirestoreEmulator(dbInstance, EMULATOR_HOST, FS_PORT)
      }
    } else {
      const loc = window && window.location
      const host = (loc && loc.hostname) || EMULATOR_HOST
      const port = (loc && Number(loc.port)) || 5173
      connectFirestoreEmulator(dbInstance, host, port)
    }
  } else {
    console.info(
      '[KCM] Skipping connectFirestoreEmulator due to HTTPS tunnel; using REST-only mode',
    )
  }
  // Functions: if a custom origin is provided, skip connectFunctionsEmulator
  if (!FUNCTIONS_ORIGIN) {
    connectFunctionsEmulator(functions, EMULATOR_HOST, FUNC_PORT)
  }
  connectStorageEmulator(storage, EMULATOR_HOST, STORAGE_PORT)
  window.__FIREBASE_EMULATORS_CONNECTED__ = true
}

export const db = dbInstance

// Optional analytics (browser-only):
// isSupported().then((ok) => { if (ok) getAnalytics(app) })
