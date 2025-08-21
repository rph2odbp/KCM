import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { CONFIG_OK } from './firebase'
import ErrorBoundary from './error-boundary'
import './index.css'

// Optional Sentry setup (enabled via env flags)
const enableSentry = import.meta.env.VITE_ENABLE_SENTRY === 'true'
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
let SentryBoundary: React.ComponentType<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>
> | null = null
if (enableSentry && sentryDsn) {
  import('@sentry/react')
    .then(Sentry => {
      const env = (import.meta.env.VITE_SENTRY_ENV as string) || import.meta.env.MODE
      const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0')
      const replaysSessionSampleRate = Number(
        import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0',
      )
      const replaysOnErrorSampleRate = Number(
        import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1',
      )
      const integrations: unknown[] = []
      if (typeof Sentry.browserTracingIntegration === 'function') {
        integrations.push(Sentry.browserTracingIntegration())
      }
      if (typeof Sentry.replayIntegration === 'function') {
        integrations.push(Sentry.replayIntegration())
      }
      Sentry.init({
        dsn: sentryDsn,
        environment: env,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        integrations: integrations as any,
        tracesSampleRate,
        replaysSessionSampleRate,
        replaysOnErrorSampleRate,
      })
      SentryBoundary = Sentry.ErrorBoundary as React.ComponentType<
        React.PropsWithChildren<{ fallback?: React.ReactNode }>
      >
    })
    .catch(() => {
      // ignore failures silently in client
    })
}

const Root = () => (
  <>
    {!CONFIG_OK && (
      <div style={{ padding: 16, background: '#fff8e1', borderBottom: '1px solid #f0d58a' }}>
        Missing Firebase config. Check your .env/.env.local in packages/web.
      </div>
    )}
    {enableSentry && sentryDsn && SentryBoundary ? (
      <SentryBoundary
        fallback={
          <div style={{ padding: 24 }}>
            <h2>Something went wrong</h2>
          </div>
        }
      >
        <App />
      </SentryBoundary>
    ) : (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    )}
  </>
)

console.info('[KCM] Booting React app…')
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
