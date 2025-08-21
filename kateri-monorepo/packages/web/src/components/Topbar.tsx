import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Topbar() {
  const { roles, currentRole, setCurrentRole, signOut, user } = useAuth()
  const navigate = useNavigate()
  const bypassVal = (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_BYPASS_ADMIN_ROLE
  const adminBypass = bypassVal === 'true' || bypassVal === '1'
  const canSeeAdmin = adminBypass || (roles && roles.includes('admin'))

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const r = e.target.value || null
    setCurrentRole(r)
    // optional: navigate to a role root when switching
    if (r === 'parent') navigate('/parent')
    if (r === 'staff') navigate('/staff')
    if (r === 'admin') navigate('/admin')
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <Link to="/">KCM</Link>
        </div>
        <nav className="topnav">
          <Link to="/">Overview</Link>
          <Link to="/campers">Campers</Link>
          <Link to="/medical">Medical</Link>
          <Link to="/photos">Photos</Link>
          {canSeeAdmin && (
            <Link to="/admin" style={{ fontWeight: 600 }}>
              Admin
            </Link>
          )}
        </nav>
        <div className="top-actions">
          {canSeeAdmin && (
            <Link to="/admin" className="btn small" style={{ marginRight: 8 }}>
              Admin Portal
            </Link>
          )}
          {roles && roles.length > 0 && (
            <select
              aria-label="Role switcher"
              value={currentRole ?? ''}
              onChange={handleRoleChange}
            >
              {roles.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {user ? (
            <button
              className="btn small"
              onClick={async () => {
                await signOut()
                navigate('/login')
              }}
            >
              Sign out
            </button>
          ) : (
            <Link to="/login" className="btn small">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
