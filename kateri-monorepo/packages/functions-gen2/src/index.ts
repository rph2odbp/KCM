import { logger } from 'firebase-functions'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import cors from 'cors'

admin.initializeApp()
getFirestore('kcm-db')

const corsHandler = cors({ origin: true })

export const helloWorld = onRequest({ region: 'us-central1' }, (request, response) => {
  corsHandler(request as any, response as any, () => {
    logger.info('Hello world function called', { structuredData: true })
    response.json({ message: 'Hello from KCM Firebase Functions (Node 22)!' })
  })
})

export const dailyHealthCheckV2 = onSchedule(
  { region: 'us-central1', schedule: '0 6 * * *', timeZone: 'America/New_York' },
  async event => {
    logger.info('Daily health check completed', { timestamp: event.scheduleTime })
  },
)

export const onCamperUpdatedV2 = onDocumentUpdated(
  { region: 'us-central1', document: 'campers/{camperId}', database: 'kcm-db' },
  async event => {
    if (!event.data) return
    const before = event.data.before.data()
    const after = event.data.after.data()
    logger.info('Camper updated', { camperId: event.params.camperId, changes: { before, after } })
  },
)

// Auth (Gen 2) triggers
export { createUserProfileV2, deleteUserDataV2 } from './auth.migration'
