import React from 'react'

type ErrorBoundaryState = { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<Record<string, unknown>>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<Record<string, unknown>>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Wire external error tracking here (e.g., Sentry) if desired
    // Example:
    // if (import.meta.env.VITE_SENTRY_DSN) {
    //   const Sentry = await import('@sentry/react')
    //   Sentry.captureException(error)
    // }
    console.error('Unhandled error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Something went wrong</h2>
          <p>Try reloading the page. If the problem persists, contact support.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
