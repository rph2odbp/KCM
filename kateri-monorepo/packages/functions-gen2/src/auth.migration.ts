// Gen 2 auth trigger using Identity blocking hook (before create)
// These are imported and exported by index.ts.
import {
  beforeUserCreated,
  type AuthBlockingEvent,
  type AuthUserRecord,
} from 'firebase-functions/v2/identity'
import { logger } from 'firebase-functions'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const db = getFirestore('kcm-db')

export const createUserProfileV2 = beforeUserCreated(
  { region: 'us-central1' },
  async (event: AuthBlockingEvent) => {
    const u = event.data as AuthUserRecord
    const ctx = (event as any).context as {
      locale?: string
      ipAddress?: string
      userAgent?: string
    }
    const providerIds = (u.providerData || []).map(p => p.providerId)
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
    logger.info('User profile created (blocking)', {
      uid: u.uid,
      email: u.email,
      tenantId: u.tenantId || null,
      providerIds,
      locale: ctx?.locale,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    })
  },
) as any
