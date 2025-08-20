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
import { doc, onSnapshot } from 'firebase/firestore'

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

  // Subscribe once to auth state
  useEffect(() => {
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
  }, [])

  // Separate effect: when user exists subscribe to their profile doc for roles
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(
      ref,
      snap => {
        const data = snap.data() || {}
        const r = Array.isArray(data.roles) ? data.roles : []
        setRoles(r)
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
  }, [user, currentRole])

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email: string, password: string) => {
    const cred = await firebaseCreateUser(auth, email, password)
    // create a minimal user profile in Firestore for role metadata
    try {
      await import('firebase/firestore').then(async ({ doc, setDoc }) => {
        const ref = doc(db, 'users', cred.user.uid)
        await setDoc(ref, { email, displayName: '', roles: ['parent', 'staff'] })
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
