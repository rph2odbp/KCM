import React, { useMemo, useState } from 'react'
import { useAuth } from './auth'
import { CONFIG_PLACEHOLDER, projectId } from './firebase'
import { useNavigate } from 'react-router-dom'
import './login.css'

export default function Login() {
  const { signIn, register, signInWithGoogle, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = useMemo(() => email.trim() !== '' && password.length >= 8, [email, password])
  const navigate = useNavigate()

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
      // Redirect to role selector which will decide the next area
      navigate('/roles')
    } catch (err: unknown) {
      setError((err as Error).message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register(email, password)
      // new users will not have roles yet; go to roles page so they can see status
      navigate('/roles')
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const doGoogle = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate('/roles')
    } catch (err: unknown) {
      setError((err as Error).message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const doReset = async () => {
    if (!email) {
      setError('Enter your email to reset password')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await resetPassword(email)
      alert('Password reset email sent')
    } catch (err: unknown) {
      setError((err as Error).message || 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-wrap">
      <div className="auth-card" role="region" aria-label="Sign in">
        <header className="auth-header">
          <h1 className="brand">Kateri Camp Management</h1>
          <p className="subtitle">Sign in to continue</p>
        </header>
        {CONFIG_PLACEHOLDER && (
          <div className="alert" role="alert">
            Invalid Firebase client configuration: using placeholder values. Check packages/web/.env
            for a real API key and app config. Authentication is disabled until fixed.
          </div>
        )}
        {error && !CONFIG_PLACEHOLDER && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={doSignIn} className="auth-form" noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-group">
              <input
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                required
              />
              <button
                type="button"
                className="link"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="actions">
            <button
              className="primary"
              type="submit"
              disabled={loading || !canSubmit || CONFIG_PLACEHOLDER}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={doRegister}
              disabled={loading || !canSubmit || CONFIG_PLACEHOLDER}
            >
              {loading ? 'Registering…' : 'Create account'}
            </button>
          </div>
        </form>
        {
          <div className="oauth">
            <button
              className="google"
              type="button"
              onClick={doGoogle}
              disabled={loading || CONFIG_PLACEHOLDER}
            >
              Continue with Google
            </button>
          </div>
        }
        <div className="footer-actions">
          <button
            className="link"
            type="button"
            onClick={doReset}
            disabled={loading || !email || CONFIG_PLACEHOLDER}
          >
            Forgot your password?
          </button>
        </div>
        <p className="disclaimer">
          By continuing you agree to our Terms and acknowledge our Privacy Policy.
        </p>
        {import.meta.env.DEV && (
          <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
            Env: project <strong>{projectId}</strong>, apiKey prefix{' '}
            <strong>{(import.meta.env.VITE_FIREBASE_API_KEY || '').slice(0, 8)}…</strong>
          </div>
        )}
      </div>
    </section>
  )
}
