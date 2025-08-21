// React import not needed in this file (JSX runtime handles it)
import { useAuth } from './auth'
import { IS_EMULATOR } from './firebase'
import { useNavigate } from 'react-router-dom'

export default function RoleSelector() {
  const { roles, setCurrentRole } = useAuth()
  const navigate = useNavigate()

  if (!roles || roles.length === 0) {
    return (
      <section>
        <h2>No roles assigned</h2>
        <p>
          Your account doesn&apos;t have any roles yet. Contact support if you believe this is an
          error.
        </p>
      </section>
    )
  }

  const choose = (r: string) => {
    setCurrentRole(r)
    navigate('/')
  }

  return (
    <section>
      <h2>Select your role</h2>
      <p>You can have multiple roles; pick the hat you want to wear this session.</p>
      {IS_EMULATOR && (
        <button
          onClick={() => {
            // Nudge Firestore onSnapshot by setting the same current role (no-op) so UI re-renders
            // Useful when roles were changed externally via scripts
            if (roles && roles.length) {
              setCurrentRole(null)
              setTimeout(() => setCurrentRole(roles[0] || null), 0)
            }
          }}
          style={{ marginBottom: 8 }}
        >
          Refresh roles
        </button>
      )}
      <ul>
        {roles.map(r => (
          <li key={r}>
            <button onClick={() => choose(r)}>{r}</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
