import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const app = admin.app()
const databaseId = process.env.FIRESTORE_DATABASE_ID || 'kcm-db'
export const databaseIdInUse = databaseId
export const db = getFirestore(app, databaseId)
export { admin }
