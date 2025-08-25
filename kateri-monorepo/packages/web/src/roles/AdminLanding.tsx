import { Link, Routes, Route } from 'react-router-dom'
import SessionsAdmin from './admin/SessionsAdmin'
import AdminDashboard from './admin/AdminDashboard'
import RegistrationsAdmin from './admin/RegistrationsAdmin'

export default function AdminLanding() {
  return (
    <section>
      <h2>Admin Portal</h2>
      <p>
        Welcome to the admin portal. Admins can manage users, settings, billing, and system
        configuration.
      </p>
      <nav style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
        <Link to="">Dashboard</Link>
        <Link to="sessions">Manage Sessions</Link>
        <Link to="registrations">Registrations</Link>
      </nav>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="sessions" element={<SessionsAdmin />} />
        <Route path="registrations" element={<RegistrationsAdmin />} />
      </Routes>
    </section>
  )
}
