import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK for compatibility; no Gen 1 exports remain.
admin.initializeApp()
getFirestore('kcm-db')

// Auth triggers migrated to Gen 2 (see @kateri/functions-gen2)
