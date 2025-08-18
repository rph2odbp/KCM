// Gen 2 auth triggers (non-blocking) to replace Gen 1 auth functions.
// These are imported and exported by index.ts.
import { onUserCreated, onUserDeleted, type AuthUserRecord } from 'firebase-functions/v2/auth'
import { type CloudEvent } from 'firebase-functions/v2'
import { logger } from 'firebase-functions'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const db = getFirestore('kcm-db')

export const createUserProfileV2 = onUserCreated(
  { region: 'us-central1' },
  async (event: CloudEvent<AuthUserRecord>) => {
    const u = event.data
    const profile = {
      id: u.uid,
      email: u.email,
      firstName: '',
      lastName: '',
      role: 'guardian',
      phoneNumber: u.phoneNumber || '',
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    await db.collection('users').doc(u.uid).set(profile)
    logger.info(`User profile created (v2) for ${u.email}`, { uid: u.uid })
  },
)

export const deleteUserDataV2 = onUserDeleted(
  { region: 'us-central1' },
  async (event: CloudEvent<AuthUserRecord>) => {
    const u = event.data
    await db.collection('users').doc(u.uid).delete()
    logger.info(`User data cleanup (v2) for ${u.email}`, { uid: u.uid })
  },
)
