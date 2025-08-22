import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import './admin'
import cors from 'cors'
import { SENTRY_DSN_SECRET, ensureSentryInitialized, captureException } from './sentry'
export { createRegistration } from './register'

// Initialize Sentry lazily (env or secret)
ensureSentryInitialized()

// admin + db are initialized in ./admin

const corsHandler = cors({ origin: true })

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

export const onCamperUpdatedV2 = onDocumentUpdated(
  {
    region: 'us-central1',
    document: 'campers/{camperId}',
    database: 'kcm-db',
    secrets: [SENTRY_DSN_SECRET],
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
