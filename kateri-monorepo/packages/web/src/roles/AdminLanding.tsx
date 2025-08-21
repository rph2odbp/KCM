import { Link, Routes, Route } from 'react-router-dom'
import SessionsAdmin from './admin/SessionsAdmin'

export default function AdminLanding() {
  return (
    <section>
      <h2>Admin Portal</h2>
      <p>
        Welcome to the admin portal. Admins can manage users, settings, billing, and system
        configuration.
      </p>
      <nav style={{ marginBottom: 12 }}>
        <Link to="sessions">Manage Sessions</Link>
      </nav>
      <Routes>
        <Route path="sessions" element={<SessionsAdmin />} />
      </Routes>
    </section>
  )
}
