import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { auth, db } from './firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'

type AuthContextType = {
  user: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<unknown>
  register: (email: string, password: string) => Promise<unknown>
  signInWithGoogle: () => Promise<unknown>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  roles: string[]
  currentRole: string | null
  setCurrentRole: (r: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<string[]>([])
  const [currentRole, setCurrentRoleState] = useState<string | null>(
    // persist selected role in localStorage to preserve across reloads
    typeof window !== 'undefined' ? window.localStorage.getItem('kcm_current_role') : null,
  )

  const disableAuthFlag =
    (import.meta as unknown as { env: Record<string, string | undefined> }).env
      .VITE_DISABLE_AUTH === 'true'

  // Subscribe once to auth state unless auth is disabled (dev bypass)
  useEffect(() => {
    if (disableAuthFlag) {
      // Simulate an authenticated user object
      const mockUser = {
        uid: 'dev-user',
        email: 'dev@example.com',
        displayName: 'Dev User',
      } as unknown as FirebaseUser
      setUser(mockUser)
      setRoles(['parent', 'staff', 'admin'])
      if (!currentRole) setCurrentRoleState('admin')
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
      if (!u) {
        setRoles([])
        setCurrentRoleState(null)
        try {
          window.localStorage.removeItem('kcm_current_role')
        } catch {
          /* ignore */
        }
      }
    })
    return unsub
  }, [disableAuthFlag, currentRole])

  // Separate effect: when user exists subscribe to their profile doc for roles
  useEffect(() => {
    if (!user || disableAuthFlag) return
    const ref = doc(db, 'users', user.uid)
    let wroteDefault = false
    // Ensure profile creation with retry/backoff to handle transient failures
    const ensureProfile = async () => {
      const baseDoc = {
        email: user.email || '',
        displayName: user.displayName || '',
        roles: ['parent', 'staff'],
      }
      let delay = 250
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          await setDoc(ref, baseDoc, { merge: true })
          console.info('[KCM] Ensured user profile (attempt', attempt, ')')
          return
        } catch (e) {
          if (attempt === 4) {
            console.warn('Failed to ensure user profile after retries', e)
            return
          }
          await new Promise(res => setTimeout(res, delay))
          delay *= 2
        }
      }
    }
    const unsub = onSnapshot(
      ref,
      async snap => {
        if (!snap.exists() && !wroteDefault) {
          // First sign-in (any provider): bootstrap a minimal profile with default roles
          wroteDefault = true
          await ensureProfile()
          return
        }
        const data = snap.data() || {}
        const r = Array.isArray(data.roles) ? data.roles : []
        setRoles(r)
        try {
          // Lightweight visibility to help debug role state during dev
          console.info('[KCM] Roles updated for user', user.uid, r)
        } catch {
          /* ignore */
        }
        // set default current role if not yet selected
        if (!currentRole && r.length) {
          setCurrentRoleState(r[0])
          try {
            window.localStorage.setItem('kcm_current_role', r[0])
          } catch {
            /* ignore */
          }
        }
      },
      err => {
        console.warn('Failed to load user profile', err)
        setRoles([])
      },
    )
    return unsub
  }, [user, currentRole, disableAuthFlag])

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email: string, password: string) => {
    const cred = await firebaseCreateUser(auth, email, password)
    // create a minimal user profile in Firestore for role metadata
    try {
      await import('firebase/firestore').then(async ({ doc, setDoc }) => {
        const ref = doc(db, 'users', cred.user.uid)
        let delay = 250
        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            await setDoc(
              ref,
              { email, displayName: '', roles: ['parent', 'staff'] },
              { merge: true },
            )
            console.info('[KCM] Created user profile after register (attempt', attempt, ')')
            break
          } catch (e) {
            if (attempt === 4) {
              console.warn('Failed to create user profile after register', e)
              break
            }
            await new Promise(res => setTimeout(res, delay))
            delay *= 2
          }
        }
      })
    } catch (err) {
      console.warn('Failed to create user profile after register', err)
    }
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const setCurrentRole = (r: string | null) => {
    setCurrentRoleState(r)
    try {
      if (r) window.localStorage.setItem('kcm_current_role', r)
      else window.localStorage.removeItem('kcm_current_role')
    } catch {
      /* ignore */
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        register,
        signInWithGoogle,
        resetPassword,
        signOut,
        roles,
        currentRole,
        setCurrentRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
