import { logger } from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { db } from './admin'
import { SENTRY_DSN_SECRET, captureException } from './sentry'

type CreateRegistrationInput = {
  year: number
  sessionId: string
  camper: {
    id?: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: 'male' | 'female'
    gradeCompleted: number
  }
}

export const createRegistration = onCall<CreateRegistrationInput>(
  { region: 'us-central1', invoker: 'public', secrets: [SENTRY_DSN_SECRET] },
  async request => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'UNAUTHENTICATED')
    }
    try {
      const { year, sessionId, camper } = (request.data || {}) as CreateRegistrationInput
      if (!year || !sessionId || !camper?.firstName || !camper?.lastName) {
        throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT')
      }
      if (camper.gender !== 'male' && camper.gender !== 'female') {
        throw new HttpsError('invalid-argument', 'INVALID_GENDER')
      }
      if (camper.gradeCompleted < 2 || camper.gradeCompleted > 8) {
        throw new HttpsError('invalid-argument', 'GRADE_OUT_OF_RANGE')
      }

      const genderKey = camper.gender === 'male' ? 'boys' : 'girls'
      const sessionRef = db
        .collection('sessions')
        .doc(String(year))
        .collection(genderKey)
        .doc(sessionId)

      const sessionSnap = await sessionRef.get()
      if (!sessionSnap.exists) {
        throw new HttpsError('not-found', 'SESSION_NOT_FOUND')
      }
      const sessionData = sessionSnap.data() as {
        capacity?: number
        waitlistOpen?: boolean
      }

      // Capacity and waitlist logic: count active (non-cancelled, non-waitlisted) regs
      const activeStatuses = ['pendingPayment', 'confirmed']
      const regsCol = sessionRef.collection('registrations')
      const snap = await regsCol.where('status', 'in', activeStatuses as unknown as string[]).get()
      const currentActive = snap.size
      const capacity = Number(sessionData.capacity ?? 0)
      const waitlistOpen = Boolean(sessionData.waitlistOpen ?? true)
      const isFull = capacity > 0 && currentActive >= capacity

      // Ensure camper exists or create under /campers
      let camperId = camper.id
      if (!camperId) {
        const camperRef = db.collection('campers').doc()
        camperId = camperRef.id
        await camperRef.set({
          id: camperId,
          firstName: camper.firstName,
          lastName: camper.lastName,
          dateOfBirth: new Date(camper.dateOfBirth),
          parentId: uid,
          gender: camper.gender,
          gradeCompleted: camper.gradeCompleted,
          emergencyContacts: [],
          registrationStatus: 'pending',
          medicalInfo: { allergies: [], medications: [], conditions: [] },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: uid,
        })
      }

      // Create a registration record
      const regRef = sessionRef.collection('registrations').doc()
      const initialStatus = isFull ? (waitlistOpen ? 'waitlisted' : 'cancelled') : 'incomplete'
      if (isFull && !waitlistOpen) {
        throw new HttpsError('failed-precondition', 'SESSION_FULL')
      }
      const regData = {
        id: regRef.id,
        year,
        gender: genderKey,
        sessionId,
        parentId: uid,
        camperId,
        status: initialStatus,
        formCompletion: {
          parent: false,
          camper: false,
          health: false,
          consents: false,
          payment: false,
        },
        addOns: { messagePackets: 0 },
        depositPaid: false,
        totalDue: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }
      await regRef.set(regData)

      logger.info('Registration created', { uid, year, sessionId, camperId, regId: regRef.id })
      return { success: true, data: { registrationId: regRef.id, camperId } }
    } catch (err) {
      captureException(err, { function: 'createRegistration' })
      logger.error('createRegistration failed', { message: (err as Error).message })
      throw err
    }
  },
)

type StartRegistrationInput = CreateRegistrationInput & { holdMinutes?: number }

export const startRegistration = onCall<StartRegistrationInput>(
  { region: 'us-central1', invoker: 'public', secrets: [SENTRY_DSN_SECRET] },
  async request => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED')
    try {
      const { year, sessionId, camper, holdMinutes } = (request.data ||
        {}) as StartRegistrationInput
      logger.info('startRegistration begin', {
        year,
        sessionId,
        camperGender: camper?.gender,
        hasNames: Boolean(camper?.firstName && camper?.lastName),
      })
      if (!year || !sessionId || !camper?.firstName || !camper?.lastName)
        throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT')
      if (camper.gender !== 'male' && camper.gender !== 'female')
        throw new HttpsError('invalid-argument', 'INVALID_GENDER')
      if (camper.gradeCompleted < 2 || camper.gradeCompleted > 8)
        throw new HttpsError('invalid-argument', 'GRADE_OUT_OF_RANGE')

      const genderKey = camper.gender === 'male' ? 'boys' : 'girls'
      const sessionRef = db
        .collection('sessions')
        .doc(String(year))
        .collection(genderKey)
        .doc(sessionId)
      logger.info('startRegistration target', {
        databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
        path: `sessions/${String(year)}/${genderKey}/${sessionId}`,
      })
      const regsCol = sessionRef.collection('registrations')
      const holdsCol = sessionRef.collection('holds')

      // ensure camper exists
      let camperId = camper.id
      if (!camperId) {
        const camperRef = db.collection('campers').doc()
        camperId = camperRef.id
        await camperRef.set({
          id: camperId,
          firstName: camper.firstName,
          lastName: camper.lastName,
          dateOfBirth: new Date(camper.dateOfBirth),
          parentId: uid,
          gender: camper.gender,
          gradeCompleted: camper.gradeCompleted,
          emergencyContacts: [],
          registrationStatus: 'pending',
          medicalInfo: { allergies: [], medications: [], conditions: [] },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: uid,
        })
      }

      const result = await db.runTransaction(async tx => {
        const sSnap = await tx.get(sessionRef)
        if (!sSnap.exists) {
          logger.warn('SESSION_NOT_FOUND', {
            year,
            gender: genderKey,
            sessionId,
            databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
          })
          throw new HttpsError('not-found', 'SESSION_NOT_FOUND')
        }
        const sData = (sSnap.data() || {}) as {
          capacity?: number
          waitlistOpen?: boolean
          holdCount?: number
          confirmedCount?: number
        }
        const capacity = Number(sData.capacity ?? 0)
        const waitlistOpen = Boolean(sData.waitlistOpen ?? true)
        const holdCount = Number(sData.holdCount ?? 0)
        const confirmedCount = Number(sData.confirmedCount ?? 0)

        const isFull = capacity > 0 && confirmedCount + holdCount >= capacity
        if (isFull) {
          if (!waitlistOpen) return { status: 'SESSION_FULL' as const }
          // Return waitlist signal; do not create reg here
          return { status: 'WAITLIST' as const }
        }

        const holdId = `${uid}_${camperId}`
        const minutes = Math.max(5, Math.min(holdMinutes ?? 15, 30))
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + minutes * 60 * 1000))

        // Try to find an existing registration for this camper in this session
        const existingQ = await tx.get(regsCol.where('camperId', '==', camperId).limit(1))
        if (!existingQ.empty) {
          const rDoc = existingQ.docs[0]
          const rData = rDoc.data() as Partial<{
            status: string
            holdId?: string
            holdExpiresAt?: Timestamp
            parentId?: string
          }>
          const holdDocSnap = await tx.get(holdsCol.doc(holdId))
          const now = Timestamp.now()
          const activeHold =
            rData.status === 'holding' &&
            rData.holdExpiresAt &&
            now.toMillis() < (rData.holdExpiresAt as Timestamp).toMillis() &&
            holdDocSnap.exists
          if (activeHold) {
            // Reuse current active hold
            return {
              status: 'HOLDING' as const,
              regId: rDoc.id,
              camperId,
              expiresAt: rData.holdExpiresAt,
            }
          }
          // Refresh or create hold for this existing registration
          tx.set(holdsCol.doc(holdId), {
            id: holdId,
            parentId: uid,
            camperId,
            registrationId: rDoc.id,
            expiresAt,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })
          // Only increment if there was no hold doc to begin with (prevents double count)
          if (!holdDocSnap.exists) {
            tx.update(sessionRef, {
              holdCount: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
            })
          } else {
            tx.update(sessionRef, { updatedAt: FieldValue.serverTimestamp() })
          }
          tx.update(regsCol.doc(rDoc.id), {
            status: 'holding',
            holdId,
            holdExpiresAt: expiresAt,
            updatedAt: FieldValue.serverTimestamp(),
          })
          return { status: 'HOLDING' as const, regId: rDoc.id, camperId, expiresAt }
        }

        // No existing registration; create new
        const regRef = regsCol.doc()
        tx.set(holdsCol.doc(holdId), {
          id: holdId,
          parentId: uid,
          camperId,
          registrationId: regRef.id,
          expiresAt,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        tx.update(sessionRef, {
          holdCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        })
        tx.set(regRef, {
          id: regRef.id,
          year,
          gender: genderKey,
          sessionId,
          parentId: uid,
          camperId,
          status: 'holding',
          holdId,
          holdExpiresAt: expiresAt,
          formCompletion: {
            parent: false,
            camper: false,
            health: false,
            consents: false,
            payment: false,
          },
          addOns: { messagePackets: 0 },
          depositPaid: false,
          totalDue: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        return { status: 'HOLDING' as const, regId: regRef.id, camperId, expiresAt }
      })

      if (result.status === 'SESSION_FULL' || result.status === 'WAITLIST') {
        return { success: true, data: { registrationId: '', camperId, status: result.status } }
      }
      return {
        success: true,
        data: {
          registrationId: result.regId!,
          camperId: result.camperId!,
          holdExpiresAt: (result.expiresAt as Timestamp).toDate().toISOString(),
          status: result.status,
        },
      }
    } catch (err) {
      captureException(err, { function: 'startRegistration' })
      logger.error('startRegistration failed', { message: (err as Error).message })
      throw err
    }
  },
)

type ConfirmInput = {
  year: number
  gender: 'boys' | 'girls'
  sessionId: string
  registrationId: string
  depositSuccess?: boolean
}
export const confirmRegistration = onCall<ConfirmInput>(
  { region: 'us-central1', invoker: 'public', secrets: [SENTRY_DSN_SECRET] },
  async request => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED')
    try {
      const { year, gender, sessionId, registrationId, depositSuccess } = (request.data ||
        {}) as ConfirmInput
      if (!year || !gender || !sessionId || !registrationId)
        throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT')
      if (!depositSuccess) throw new HttpsError('failed-precondition', 'DEPOSIT_REQUIRED')
      const sessionRef = db
        .collection('sessions')
        .doc(String(year))
        .collection(gender)
        .doc(sessionId)
      const regRef = sessionRef.collection('registrations').doc(registrationId)
      const holdsCol = sessionRef.collection('holds')

      await db.runTransaction(async tx => {
        const [sSnap, rSnap] = await Promise.all([tx.get(sessionRef), tx.get(regRef)])
        if (!sSnap.exists) throw new HttpsError('not-found', 'SESSION_NOT_FOUND')
        if (!rSnap.exists) throw new HttpsError('not-found', 'REG_NOT_FOUND')
        const rData = rSnap.data() as Partial<{
          status: string
          holdId?: string
          holdExpiresAt?: Timestamp
          parentId: string
        }>
        if (rData.parentId && rData.parentId !== uid)
          throw new HttpsError('permission-denied', 'PERMISSION_DENIED')
        if (rData.status !== 'holding')
          throw new HttpsError('failed-precondition', 'INVALID_STATUS')
        const now = Timestamp.now()
        if (rData.holdExpiresAt && now.toMillis() > (rData.holdExpiresAt as Timestamp).toMillis()) {
          throw new HttpsError('failed-precondition', 'HOLD_EXPIRED')
        }
        // confirm
        tx.update(sessionRef, {
          holdCount: FieldValue.increment(-1),
          confirmedCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        })
        tx.update(regRef, {
          status: 'confirmed',
          depositPaid: true,
          updatedAt: FieldValue.serverTimestamp(),
        })
        if (rData.holdId) tx.delete(holdsCol.doc(rData.holdId))
      })
      return { ok: true }
    } catch (err) {
      captureException(err, { function: 'confirmRegistration' })
      logger.error('confirmRegistration failed', { message: (err as Error).message })
      throw err
    }
  },
)

// Stubbed deposit initiation (to be replaced by real PSP integration)
export const initiateDeposit = onCall<{
  year: number
  gender: 'boys' | 'girls'
  sessionId: string
  registrationId: string
  amount?: number
}>(
  { region: 'us-central1', invoker: 'public', secrets: [SENTRY_DSN_SECRET] },
  async request => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED')
    try {
      const { year, gender, sessionId, registrationId, amount } = (request.data || {}) as {
        year: number
        gender: 'boys' | 'girls'
        sessionId: string
        registrationId: string
        amount?: number
      }
      if (!year || !gender || !sessionId || !registrationId)
        throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT')

      const sessionRef = db
        .collection('sessions')
        .doc(String(year))
        .collection(gender)
        .doc(sessionId)
      const regRef = sessionRef.collection('registrations').doc(registrationId)

      const regSnap = await regRef.get()
      if (!regSnap.exists) throw new HttpsError('not-found', 'REG_NOT_FOUND')
      const reg = regSnap.data() as Partial<{
        parentId: string
        status: string
        depositPaid?: boolean
      }>
      if (!reg.parentId || reg.parentId !== uid)
        throw new HttpsError('permission-denied', 'PERMISSION_DENIED')
      if (reg.status !== 'holding') throw new HttpsError('failed-precondition', 'INVALID_STATUS')

      const paymentsCol = db.collection('payments')
      const paymentRef = paymentsCol.doc()
      const depositAmount = Number.isFinite(amount) ? Number(amount) : 100
      await paymentRef.set({
        id: paymentRef.id,
        parentId: uid,
        registrationPath: regRef.path,
        amount: depositAmount,
        currency: 'USD',
        status: 'authorized',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      return { ok: true, paymentId: paymentRef.id }
    } catch (err) {
      captureException(err, { function: 'initiateDeposit' })
      throw err
    }
  },
)

// Optional: release expired holds (sweeper)
export const releaseExpiredHolds = onCall<{
  year: number
  gender: 'boys' | 'girls'
  sessionId: string
}>({ region: 'us-central1', invoker: 'private', secrets: [SENTRY_DSN_SECRET] }, async request => {
  const { year, gender, sessionId } =
    request.data || ({} as { year: number; gender: 'boys' | 'girls'; sessionId: string })
  const sessionRef = db.collection('sessions').doc(String(year)).collection(gender).doc(sessionId)
  const regsCol = sessionRef.collection('registrations')
  const holdsCol = sessionRef.collection('holds')
  const now = Timestamp.now()
  try {
    const expiredHolds = await holdsCol.where('expiresAt', '<=', now).get()
    let toRelease = 0
    const batch = db.batch()
    expiredHolds.forEach(h => {
      const data = h.data() as Partial<{ registrationId: string }>
      if (data.registrationId) {
        batch.update(regsCol.doc(String(data.registrationId)), {
          status: 'expired',
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
      batch.delete(h.ref)
      toRelease++
    })
    if (toRelease > 0) {
      batch.update(sessionRef, {
        holdCount: FieldValue.increment(-toRelease),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    await batch.commit()
    return { ok: true, released: toRelease }
  } catch (err) {
    captureException(err, { function: 'releaseExpiredHolds' })
    logger.error('releaseExpiredHolds failed', { message: (err as Error).message })
    throw err
  }
})

// Scheduled sweep to release expired holds across all sessions
export const sweepExpiredHoldsV2 = onSchedule(
  {
    region: 'us-central1',
    schedule: '*/5 * * * *',
    timeZone: 'America/New_York',
    secrets: [SENTRY_DSN_SECRET],
  },
  async () => {
    const now = Timestamp.now()
    try {
      const expired = await db
        .collectionGroup('holds')
        .where('expiresAt', '<=', now)
        .limit(200)
        .get()
      const bySession: Record<string, Array<{ holdId: string; regId?: string }>> = {}
      expired.forEach(h => {
        const parts = h.ref.path.split('/')
        const idx = parts.findIndex(p => p === 'sessions')
        if (idx >= 0 && parts.length >= idx + 5) {
          const sessionPath = parts.slice(0, idx + 4).join('/') // sessions/{year}/{gender}/{sessionId}
          const data = h.data() as Partial<{ registrationId: string }>
          ;(bySession[sessionPath] ||= []).push({ holdId: h.id, regId: data.registrationId })
        }
      })
      const commits: Promise<unknown>[] = []
      for (const [sessionPath, items] of Object.entries(bySession)) {
        const batch = db.batch()
        const sessionRef = db.doc(sessionPath)
        let releaseCount = 0
        for (const it of items) {
          const holdRef = sessionRef.collection('holds').doc(it.holdId)
          batch.delete(holdRef)
          if (it.regId) {
            const regRef = sessionRef.collection('registrations').doc(it.regId)
            batch.update(regRef, {
              status: 'expired',
              updatedAt: FieldValue.serverTimestamp(),
            })
          }
          releaseCount++
        }
        if (releaseCount > 0) {
          batch.update(sessionRef, {
            holdCount: FieldValue.increment(-releaseCount),
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
        commits.push(batch.commit())
      }
      await Promise.all(commits)
      logger.info('sweepExpiredHoldsV2 completed', {
        sessionsProcessed: Object.keys(bySession).length,
      })
    } catch (err) {
      captureException(err, { function: 'sweepExpiredHoldsV2' })
      logger.error('sweepExpiredHoldsV2 failed', { message: (err as Error).message })
      throw err
    }
  },
)

// Daily job to ensure counters exist on all session docs
export const ensureSessionCountersDaily = onSchedule(
  {
    region: 'us-central1',
    schedule: '0 3 * * *',
    timeZone: 'America/New_York',
    secrets: [SENTRY_DSN_SECRET],
  },
  async () => {
    try {
      const years = await db.collection('sessions').get()
      for (const y of years.docs) {
        for (const g of ['boys', 'girls'] as const) {
          const col = y.ref.collection(g)
          const snap = await col.get()
          if (snap.empty) continue
          const batch = db.batch()
          let updates = 0
          snap.forEach(d => {
            const data = d.data() as Partial<{ holdCount: number; confirmedCount: number }>
            const patch: Record<string, unknown> = {}
            if (data.holdCount === undefined) patch.holdCount = 0
            if (data.confirmedCount === undefined) patch.confirmedCount = 0
            if (Object.keys(patch).length) {
              patch['updatedAt'] = FieldValue.serverTimestamp()
              batch.set(d.ref, patch, { merge: true })
              updates++
            }
          })
          if (updates > 0) await batch.commit()
        }
      }
      logger.info('ensureSessionCountersDaily completed')
    } catch (err) {
      captureException(err, { function: 'ensureSessionCountersDaily' })
      logger.error('ensureSessionCountersDaily failed', { message: (err as Error).message })
      throw err
    }
  },
)

// Admin-only callable: get current holds count per session (lightweight summary)
export const getSessionHoldsSummary = onCall<{ year: number; gender: 'boys' | 'girls' }>(
  { region: 'us-central1', invoker: 'private', secrets: [SENTRY_DSN_SECRET] },
  async request => {
    try {
      const { year, gender } = (request.data || {}) as { year: number; gender: 'boys' | 'girls' }
      if (!year || (gender !== 'boys' && gender !== 'girls')) throw new Error('INVALID_ARGUMENT')
      const col = db.collection('sessions').doc(String(year)).collection(gender)
      const snap = await col.get()
      const results: Array<{ sessionId: string; holdCount: number; confirmedCount: number }> = []
      snap.forEach(d => {
        const data = d.data() as Partial<{ holdCount: number; confirmedCount: number }>
        results.push({
          sessionId: d.id,
          holdCount: Number(data.holdCount ?? 0),
          confirmedCount: Number(data.confirmedCount ?? 0),
        })
      })
      return { ok: true, data: results }
    } catch (err) {
      captureException(err, { function: 'getSessionHoldsSummary' })
      logger.error('getSessionHoldsSummary failed', { message: (err as Error).message })
      throw err
    }
  },
)
