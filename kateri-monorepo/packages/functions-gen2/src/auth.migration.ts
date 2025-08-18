// Auth to Gen 2 migration scaffolding (not exported yet)
// When ready to migrate, uncomment exports and deploy in codebase gen2 (Node 22).
// Note: Non-blocking user create/delete triggers are provided under v2 providers.
// import { user } from 'firebase-functions/v2/identity' // for blocking triggers (beforeUserCreated, etc.)
// import { onUserCreated, onUserDeleted } from 'firebase-functions/v2/providers/auth' // non-blocking triggers
// import { logger } from 'firebase-functions'
// import * as admin from 'firebase-admin'
// import { getFirestore, FieldValue } from 'firebase-admin/firestore'
//
// const db = getFirestore('kcm-db')
//
// export const createUserProfileV2 = onUserCreated({ region: 'us-central1' }, async (event) => {
//   const u = event.data
//   const profile = {
//     id: u.uid,
//     email: u.email,
//     firstName: '',
//     lastName: '',
//     role: 'guardian',
//     phoneNumber: u.phoneNumber || '',
//     isActive: true,
//     createdAt: FieldValue.serverTimestamp(),
//     updatedAt: FieldValue.serverTimestamp(),
//   }
//   await db.collection('users').doc(u.uid).set(profile)
//   logger.info(`User profile created (v2) for ${u.email}`, { uid: u.uid })
// })
//
// export const deleteUserDataV2 = onUserDeleted({ region: 'us-central1' }, async (event) => {
//   const u = event.data
//   await db.collection('users').doc(u.uid).delete()
//   logger.info(`User data cleanup (v2) for ${u.email}`, { uid: u.uid })
// })
