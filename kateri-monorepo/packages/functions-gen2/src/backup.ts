import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { GoogleAuth } from 'google-auth-library'
import { SENTRY_DSN_SECRET } from './sentry'

function ts(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
}

export const backupFirestoreDaily = onSchedule(
  {
    region: 'us-central1',
    schedule: '0 3 * * *',
    timeZone: 'America/New_York',
    memory: '512MiB',
    timeoutSeconds: 540,
    secrets: [SENTRY_DSN_SECRET],
    // Optional: run as a dedicated SA for least privilege if provided via env
    serviceAccount:
      (process.env.FIRESTORE_BACKUP_SERVICE_ACCOUNT as any) ||
      // default to the dedicated backup SA created for this project
      (`kcm-backup@${process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com` as any),
  },
  async () => {
    const operationId = ts()
    const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
    if (!projectId) {
      logger.error('Missing project id in environment', { operationId })
      return
    }

    // Target the named Firestore database
    const databaseId = 'kcm-db'
    const databaseName = `projects/${projectId}/databases/${databaseId}`

    // Choose bucket: prefer explicit env var; otherwise use a dedicated "-backups" bucket
    // (avoids appspot.com domain ownership constraints)
    const bucket = process.env.FIRESTORE_BACKUP_BUCKET || `${projectId}-backups`
    const prefix = `gs://${bucket}/firestore-exports/${databaseId}/${operationId}`

    try {
      const auth = new GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/datastore',
          'https://www.googleapis.com/auth/cloud-platform',
        ],
      })

      logger.info('Starting Firestore export', {
        operationId,
        databaseName,
        outputUriPrefix: prefix,
      })

      const res = await auth.request<{ name?: string }>({
        url: `https://firestore.googleapis.com/v1/${databaseName}:exportDocuments`,
        method: 'POST',
        data: {
          outputUriPrefix: prefix,
          // collectionIds: ['users', 'campers'], // Optional: restrict to specific collections
        },
      })

      logger.info('Export triggered', { operationId, operation: res.data?.name })
    } catch (err: any) {
      logger.error('Export failed', { operationId, message: err?.message, stack: err?.stack })
      throw err
    }
  },
)
