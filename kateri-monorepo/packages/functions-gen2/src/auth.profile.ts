import { auth } from 'firebase-functions/v1'
import { logger } from 'firebase-functions'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './admin'
import { defaultRolesForEmail } from './roles.util.js'

export const createUserProfile = auth.user().onCreate(async u => {
  const uid = u.uid
  const email = (u.email || '').toLowerCase()

  const roles = defaultRolesForEmail(email)

  const docRef = db.doc(`users/${uid}`)
  await docRef.set(
    {
      email,
      displayName: u.displayName || '',
      // Use arrayUnion to add default roles without removing any existing ones (e.g., admin)
      roles: FieldValue.arrayUnion(...roles),
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  logger.info('User profile ensured on create', { uid, email, roles })
})
