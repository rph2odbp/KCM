import { logger } from 'firebase-functions'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './admin'
import { SENTRY_DSN_SECRET, captureException } from './sentry'

type InitiateDepositInput = {
  year: number
  gender: 'boys' | 'girls'
  sessionId: string
  registrationId: string
  amount?: number
}

export const initiateDeposit = onCall<InitiateDepositInput>(
  { region: 'us-central1', invoker: 'public', secrets: [SENTRY_DSN_SECRET] },
  async req => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED')
    try {
      const { year, gender, sessionId, registrationId, amount } = (req.data ||
        {}) as InitiateDepositInput
      if (!year || !gender || !sessionId || !registrationId)
        throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT')

      const regRef = db
        .collection('sessions')
        .doc(String(year))
        .collection(gender)
        .doc(sessionId)
        .collection('registrations')
        .doc(registrationId)
      const regSnap = await regRef.get()
      if (!regSnap.exists) throw new HttpsError('not-found', 'REG_NOT_FOUND')
      const r = regSnap.data() as Partial<{
        parentId: string
        status: string
        totalDue?: number
      }>
      if (r.parentId !== uid) throw new HttpsError('permission-denied', 'PERMISSION_DENIED')
      if (r.status !== 'holding')
        throw new HttpsError('failed-precondition', 'INVALID_STATUS')

      const depositAmount = Number(
        amount ?? (typeof r.totalDue === 'number' && isFinite(r.totalDue) ? Math.min(r.totalDue, 250) : 250),
      )
      const payRef = db.collection('payments').doc()
      await payRef.set({
        id: payRef.id,
        parentId: uid,
        registrationId,
        registrationPath: regRef.path,
        year,
        gender,
        sessionId,
        amount: depositAmount,
        currency: 'USD',
        provider: 'stub',
        status: 'authorized',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      logger.info('initiateDeposit authorized', { uid, registrationId, paymentId: payRef.id })
      return { ok: true, paymentId: payRef.id }
    } catch (err) {
      captureException(err, { function: 'initiateDeposit' })
      const msg = (err as Error).message || ''
      if (/UNAUTHENTICATED|permission/i.test(msg)) throw err
      if (/INVALID_ARGUMENT|INVALID_STATUS|REG_NOT_FOUND/.test(msg)) throw err
      throw new HttpsError('internal', 'INTERNAL')
    }
  },
)
