import { initializeApp, getApp, getApps } from 'firebase/app'
import type { FirebaseOptions } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'
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
// Detect obviously placeholder config seen in local examples
const looksPlaceholder = () => {
  const apiKey = getEnv('VITE_FIREBASE_API_KEY') || ''
  const appId = getEnv('VITE_FIREBASE_APP_ID') || ''
  const project = getEnv('VITE_FIREBASE_PROJECT_ID') || ''
  return (
    apiKey === 'fake-api-key' || project === 'demo-project' || /(^|:)123456789(:|$)/.test(appId)
  )
}
export const CONFIG_PLACEHOLDER = looksPlaceholder()

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
const envDatabaseId = getEnv('VITE_FIRESTORE_DATABASE_ID')
const useDefaultDb = !envDatabaseId || envDatabaseId === '(default)'
export const databaseId = useDefaultDb ? '(default)' : envDatabaseId
const dbInstance = useDefaultDb ? getFirestore(app) : getFirestore(app, envDatabaseId!)
// Allow region override via env (defaults to us-central1). Do NOT use custom origin in production.
const functionsRegion = getEnv('VITE_FIREBASE_FUNCTIONS_REGION') || 'us-central1'
export const functions = getFunctions(app, functionsRegion)
export const storage = getStorage(app)
export const db = dbInstance

// Optional analytics (browser-only):
// isSupported().then((ok) => { if (ok) getAnalytics(app) })
// One-time visibility of effective config (safe subset)
try {
  const safeKey = `${(getEnv('VITE_FIREBASE_API_KEY') || '').slice(0, 8)}…`
  console.info('[KCM] Firebase project:', projectId, 'appId:', getEnv('VITE_FIREBASE_APP_ID'))
  console.info('[KCM] Firebase apiKey:', safeKey, 'placeholder:', CONFIG_PLACEHOLDER)
  console.info('[KCM] Functions region:', functionsRegion)
  console.info('[KCM] Firestore databaseId:', databaseId)
} catch {
  // ignore
}
