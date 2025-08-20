import React, { useState } from 'react'
import { useAuth } from './auth'
import { IS_EMULATOR } from './firebase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn, register, signInWithGoogle, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      alert(
        IS_EMULATOR
          ? 'Password reset simulated by Auth emulator (no email sent)'
          : 'Password reset email sent',
      )
    } catch (err: unknown) {
      setError((err as Error).message || 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2>Sign in</h2>
      <form onSubmit={doSignIn}>
        <div>
          <label>
            Email
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" />
          </label>
        </div>
        <div>
          <label>
            Password
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" />
          </label>
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading}>
            Sign in
          </button>
          <button type="button" onClick={doRegister} disabled={loading} style={{ marginLeft: 8 }}>
            Register
          </button>
          {!IS_EMULATOR && (
            <button type="button" onClick={doGoogle} disabled={loading} style={{ marginLeft: 8 }}>
              Sign in with Google
            </button>
          )}
          <button type="button" onClick={doReset} disabled={loading} style={{ marginLeft: 8 }}>
            Reset password
          </button>
        </div>
      </form>
    </section>
  )
}
