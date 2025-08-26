import { logger } from 'firebase-functions'
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import './admin'
import { db, databaseIdInUse } from './admin'
import { FieldValue } from 'firebase-admin/firestore'
import cors from 'cors'
import { SENTRY_DSN_SECRET, ensureSentryInitialized, captureException } from './sentry'
export {
  createRegistration,
  startRegistration,
  confirmRegistration,
  releaseExpiredHolds,
  sweepExpiredHoldsV2,
  ensureSessionCountersDaily,
  getSessionHoldsSummary,
  markRegistrationSectionComplete,
} from './register'
export { initiateDeposit } from './payments'

// Initialize Sentry lazily (env or secret)
ensureSentryInitialized()

// admin + db are initialized in ./admin

const corsHandler = cors({ origin: true })

// Set a default runtime service account for all functions (can be overridden per-function)
setGlobalOptions({
  ...(process.env.FUNCTIONS_RUNTIME_SERVICE_ACCOUNT
    ? { serviceAccount: process.env.FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }
    : { serviceAccount: 'github-deployer@kcm-firebase-b7d6a.iam.gserviceaccount.com' }),
})

export const helloWorld = onRequest(
  { region: 'us-central1', invoker: 'private', secrets: [SENTRY_DSN_SECRET] },
  async (request, response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      await new Promise<void>(resolve => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        corsHandler(request as any, response as any, () => resolve())
      })
      logger.info('Hello world function called', { structuredData: true })
      response.json({ message: 'Hello from KCM Firebase Functions (Node 22)!' })
    } catch (err) {
      captureException(err, { function: 'helloWorld' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.error('helloWorld failed', { message: (err as any)?.message })
      response.status(500).json({ error: 'Internal error' })
    }
  },
)

export const dailyHealthCheckV2 = onSchedule(
  {
    region: 'us-central1',
    schedule: '0 6 * * *',
    timeZone: 'America/New_York',
    secrets: [SENTRY_DSN_SECRET],
  },
  async event => {
    try {
      logger.info('Daily health check completed', { timestamp: event.scheduleTime })
    } catch (err) {
      captureException(err, { function: 'dailyHealthCheckV2' })
      throw err
    }
  },
)

const FUNCTIONS_SERVICE_ACCOUNT = process.env.FUNCTIONS_RUNTIME_SERVICE_ACCOUNT as
  | string
  | undefined

export const onCamperUpdatedV2 = onDocumentUpdated(
  {
    region: 'us-central1',
    document: 'campers/{camperId}',
    database: process.env.FIRESTORE_DATABASE_ID || '(default)',
    secrets: [SENTRY_DSN_SECRET],
    ...(FUNCTIONS_SERVICE_ACCOUNT ? { serviceAccount: FUNCTIONS_SERVICE_ACCOUNT } : {}),
  },
  async event => {
    try {
      if (!event.data) return
      const before = event.data.before.data()
      const after = event.data.after.data()
      logger.info('Camper updated', { camperId: event.params.camperId, changes: { before, after } })
    } catch (err) {
      captureException(err, { function: 'onCamperUpdatedV2', camperId: event.params.camperId })
      throw err
    }
  },
)

// Auth (Gen 2) triggers
// Note: createUserProfileV2 (identity blocking) requires GCIP; omitted for Firebase Auth projects.
export { cleanupDeletedUsersDaily } from './auth.cleanup'

// Firestore export backup (daily)
export { backupFirestoreDaily } from './backup'

// Auth user profile bootstrap on create
// Note: Gen1-style onCreate trigger lives in @kateri/functions (Gen1 codebase)

// Callable to ensure a user's profile exists (server-side, bypasses rules)
export const ensureUserProfile = onCall({ region: 'us-central1' }, async req => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  const email = (req.data?.email || '').toLowerCase()
  const ref = db.collection('users').doc(uid)
  await ref.set(
    {
      email,
      displayName: '',
      roles: FieldValue.arrayUnion('parent', 'staff'),
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  return { ok: true }
})

// Debug/support callable: list the caller's registrations (fallback when client rules block CG reads)
export const listMyRegistrations = onCall({ region: 'us-central1' }, async req => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required')
  try {
    const inputYear = (req.data?.year ?? undefined) as number | string | undefined
    const yearFilter = inputYear !== undefined && inputYear !== null && String(inputYear) !== ''
      ? String(inputYear)
      : undefined
    const items: Array<{
      id: string
      year: number
      gender: 'boys' | 'girls'
      sessionId: string
      camperId: string
      status: string
      missing?: Record<string, string[]>
  paymentStatus?: string
  paymentAmount?: number
  paymentId?: string
    }> = []
    const years = yearFilter
      ? [db.collection('sessions').doc(yearFilter)]
      : await db.collection('sessions').listDocuments()
    for (const yRef of years) {
      for (const gender of ['boys', 'girls'] as const) {
        const sessSnap = await yRef.collection(gender).get()
        for (const s of sessSnap.docs) {
          const regsSnap = await s.ref
            .collection('registrations')
            .where('parentId', '==', uid)
            .get()
          regsSnap.forEach(d => {
            const data = d.data() as Partial<{
              year: number
              gender: 'boys' | 'girls'
              sessionId: string
              camperId: string
              status: string
              missing?: Record<string, string[]>
            }>
            items.push({
              id: d.id,
              year: Number((data.year ?? Number(yRef.id)) || 0),
              gender: (data.gender as 'boys' | 'girls') || (gender as 'boys' | 'girls'),
              sessionId: String(data.sessionId ?? s.id),
              camperId: String(data.camperId ?? ''),
              status: String(data.status ?? ''),
              missing: (data.missing as Record<string, string[]>) || undefined,
            })
          })
        }
      }
    }
    // Enrich with latest payment per registration for this user
    const paymentsSnap = await db
      .collection('payments')
      .where('parentId', '==', uid)
      .get()
    const byReg: Record<string, { id?: string; status?: string; amount?: number; updatedAt?: unknown }> = {}
    paymentsSnap.forEach(p => {
      const d = p.data() as Partial<{ registrationId: string; status: string; amount: number; updatedAt: unknown }>
      if (!d.registrationId) return
      const prev = byReg[d.registrationId] || {}
      // Prefer the latest updatedAt if present; otherwise overwrite; store id
      const next = { id: p.id, status: d.status, amount: d.amount, updatedAt: d.updatedAt }
      byReg[d.registrationId] = (d.updatedAt ? next : prev.updatedAt ? prev : next) as any
    })
    items.forEach(it => {
      const pay = byReg[it.id]
      if (pay) {
        it.paymentStatus = String(pay.status || '')
        it.paymentAmount = typeof pay.amount === 'number' ? Number(pay.amount) : undefined
        it.paymentId = String(pay.id || '')
      }
    })
    logger.info('listMyRegistrations scanned', { uid, count: items.length, year: yearFilter })
    return { ok: true, data: items }
  } catch (err) {
    captureException(err, { function: 'listMyRegistrations', uid })
    // Map common Firestore/IAM errors to HttpsError with a proper status code
    const msg = (err as Error).message || ''
    if (/PERMISSION_DENIED|permission/i.test(msg)) {
      throw new HttpsError('permission-denied', 'PERMISSION_DENIED')
    }
    throw new HttpsError('internal', 'INTERNAL')
  }
})

// Health endpoint to verify registration environment wiring
export const registrationEnvHealthz = onRequest(
  { region: 'us-central1', invoker: 'private', secrets: [SENTRY_DSN_SECRET] },
  async (req, res) => {
    try {
  const databaseId = databaseIdInUse
      // List years under sessions
      const years = await db.collection('sessions').listDocuments()
      const yearIds = years.map(d => d.id)
      const { year, gender, sessionId } = req.query as {
        year?: string
        gender?: string
        sessionId?: string
      }
      let exists: boolean | undefined
      if (year && gender && sessionId) {
        const sRef = db
          .collection('sessions')
          .doc(String(year))
          .collection(String(gender))
          .doc(String(sessionId))
        const sSnap = await sRef.get()
        exists = sSnap.exists
      }
      res.json({ ok: true, databaseId, years: yearIds, exists })
    } catch (err) {
      captureException(err, { function: 'registrationEnvHealthz' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.status(500).json({ ok: false, error: (err as any)?.message || 'error' })
    }
  },
)

// Simple auth echo for debugging client tokens and backend DB
export const whoami = onCall({ region: 'us-central1' }, async req => {
  const uid = req.auth?.uid || null
  return { ok: true, uid, databaseId: databaseIdInUse }
})
