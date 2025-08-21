import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db } from './admin'
import { SENTRY_DSN_SECRET } from './sentry'

export const cleanupDeletedUsersDaily = onSchedule(
  {
    region: 'us-central1',
    schedule: '30 3 * * *',
    timeZone: 'America/New_York',
    timeoutSeconds: 540,
    secrets: [SENTRY_DSN_SECRET],
  },
  async () => {
    logger.info('Starting daily cleanup of deleted users')

    const auth = admin.auth()
    const uids = new Set<string>()

    // List all auth users (paged)
    let nextPageToken: string | undefined
    do {
      const res = await auth.listUsers(1000, nextPageToken)
      for (const user of res.users) uids.add(user.uid)
      nextPageToken = res.pageToken || undefined
    } while (nextPageToken)

    // Fetch all Firestore user docs
    const snap = await db.collection('users').select().get()
    let deleted = 0
    let skipped = 0
    for (const doc of snap.docs) {
      if (!uids.has(doc.id)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = doc.data() as any
        if (data?.role === 'admin') {
          skipped++
          logger.info('Skipping deletion of admin user doc', { uid: doc.id })
          continue
        }
        await doc.ref.delete()
        deleted++
      }
    }
    logger.info('User cleanup complete', { checked: snap.size, deleted, skipped })
  },
)
