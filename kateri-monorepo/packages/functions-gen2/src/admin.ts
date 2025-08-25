import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const app = admin.app()
const databaseId = process.env.FIRESTORE_DATABASE_ID
export const databaseIdInUse = databaseId ?? '(default)'
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app)
export { admin }
