import * as Sentry from '@sentry/node'
import { defineSecret } from 'firebase-functions/params'

// Secret definition: provide via Secret Manager as SENTRY_DSN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SENTRY_DSN_SECRET = defineSecret('SENTRY_DSN') as any

let sentryInitialized = false

export function ensureSentryInitialized() {
  if (sentryInitialized) return
  const dsn = process.env.SENTRY_DSN
  if (dsn) {
    // Prefer GOOGLE_CLOUD_PROJECT for Cloud Functions, fallback to GCLOUD_PROJECT
    const env =
      process.env.SENTRY_ENV ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      'development'
    const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0')
    Sentry.init({ dsn, environment: env, tracesSampleRate })
  }
  sentryInitialized = true
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined)
  } catch {
    // no-op: capturing errors should not throw
  }
}
