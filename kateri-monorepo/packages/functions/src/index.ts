import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import type { Request, Response } from 'express'

// Initialize Firebase Admin SDK for compatibility; no Gen 1 exports remain.
admin.initializeApp()
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
    const db = getFirestore()
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
