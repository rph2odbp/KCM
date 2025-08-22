import * as admin from 'firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { auth } from 'firebase-functions/v1'
import { logger } from 'firebase-functions'
import type { Request, Response } from 'express'
// Local helper (avoid cross-package import)
function defaultRolesForEmail(email: string) {
  const lower = (email || '').toLowerCase()
  const base = ['parent', 'staff']
  const adminEmails = new Set<string>(['ryanhallford.br@gmail.com', 'ryanhallford.tx@gmail.com'])
  return adminEmails.has(lower) ? [...base, 'admin'] : base
}

// Initialize Firebase Admin SDK for compatibility; no Gen 1 exports remain.
admin.initializeApp()
// Ensure Firestore default app uses the named database 'kcm-db'
getFirestore('kcm-db')

// Auth triggers migrated to Gen 2 (see @kateri/functions-gen2)
// Callable admin helper (local dev) to set custom claims and mirror roles to /users/{uid}
// Usage (dev): call via admin SDK or HTTP call with server credentials.
// Note: in production, protect this behind proper admin checks.
export const setUserRoles = async (req: Request, res: Response) => {
  try {
    const { uid, roles } = req.body || {}
    if (!uid || !Array.isArray(roles)) {
      res.status(400).send({ error: 'uid and roles[] required' })
      return
    }
    const claims: Record<string, boolean> = {}
    roles.forEach((r: string) => (claims[r] = true))
    await admin.auth().setCustomUserClaims(uid, claims)
    const db = getFirestore('kcm-db')
    await db
      .collection('users')
      .doc(uid)
      .set({ roles, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    res.status(200).send({ ok: true })
  } catch (e) {
    console.error('setUserRoles error', e)
    res.status(500).send({ error: String(e) })
  }
}

// Gen1 auth trigger kept on Node 18 runtime
export const createUserProfile = auth.user().onCreate(async u => {
  const uid = u.uid
  const email = (u.email || '').toLowerCase()

  const roles = defaultRolesForEmail(email)

  const db = getFirestore('kcm-db')
  await db
    .collection('users')
    .doc(uid)
    .set(
      {
        email,
        displayName: u.displayName || '',
        roles: FieldValue.arrayUnion(...roles),
        isActive: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

  logger.info('User profile ensured on create (Gen1)', { uid, email, roles })
})
