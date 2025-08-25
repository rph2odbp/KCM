import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const app = admin.app()
// Use explicit database ID if provided; otherwise default to 'kcm-db'
export const databaseIdInUse = process.env.FIRESTORE_DATABASE_ID || 'kcm-db'
export const db = getFirestore(app, databaseIdInUse)
export { admin }
