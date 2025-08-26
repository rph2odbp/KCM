import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'
import { AuthProvider, useAuth } from './auth'
import Login from './Login'
import RoleSelector from './RoleSelector'
import Topbar from './components/Topbar'
import ParentLanding from './roles/ParentLanding'
import RegistrationDetail from './roles/parent/RegistrationDetail'
import RegistrationStepper from './roles/parent/RegistrationStepper'
import RegistrationFormsPlaceholder from './roles/parent/RegistrationFormsPlaceholder'
import PaymentReceipt from './roles/parent/PaymentReceipt'
import StaffLanding from './roles/StaffLanding'
import AdminLanding from './roles/AdminLanding'

// Create a query client for React Query
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            {import.meta.env.VITE_APP_ENV === 'staging' && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  background: '#d97706',
                  color: '#fff',
                  padding: '4px 8px',
                  fontSize: 12,
                  zIndex: 9999,
                }}
              >
                STAGING
              </div>
            )}
            <Topbar />

            <main className="container">
              <Routes>
                <Route path="/" element={<RoleAwareLanding />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/roles"
                  element={
                    <Protected>
                      <RoleSelector />
                    </Protected>
                  }
                />
                {/* Parent registration dedicated pages */}
                <Route
                  path="/parent/register"
                  element={
                    <Protected>
                      <RoleProtected role="parent">
                        <RegistrationStepper />
                      </RoleProtected>
                    </Protected>
                  }
                />
                <Route
                  path="/parent/registration/:year/:gender/:sessionId/:regId"
                  element={
                    <Protected>
                      <RoleProtected role="parent">
                        <RegistrationDetail />
                      </RoleProtected>
                    </Protected>
                  }
                />
                <Route
                  path="/parent/registration/:year/:gender/:sessionId/:regId/forms"
                  element={
                    <Protected>
                      <RoleProtected role="parent">
                        <RegistrationFormsPlaceholder />
                      </RoleProtected>
                    </Protected>
                  }
                />
                <Route
                  path="/parent/payment/:paymentId"
                  element={
                    <Protected>
                      <RoleProtected role="parent">
                        <PaymentReceipt />
                      </RoleProtected>
                    </Protected>
                  }
                />

                {/* Role-specific roots */}
                <Route
                  path="/parent/*"
                  element={
                    <Protected>
                      <RoleProtected role="parent">
                        <ParentLanding />
                      </RoleProtected>
                    </Protected>
                  }
                />
                <Route
                  path="/staff/*"
                  element={
                    <Protected>
                      <RoleProtected role="staff">
                        <StaffLanding />
                      </RoleProtected>
                    </Protected>
                  }
                />
                <Route
                  path="/admin/*"
                  element={(() => {
                    const bypassVal = (
                      import.meta as unknown as { env: Record<string, string | undefined> }
                    ).env.VITE_BYPASS_ADMIN_ROLE
                    const bypass = bypassVal === 'true' || bypassVal === '1'
                    return bypass ? (
                      <Protected>
                        <AdminLanding />
                      </Protected>
                    ) : (
                      <Protected>
                        <RoleProtected role="admin">
                          <AdminLanding />
                        </RoleProtected>
                      </Protected>
                    )
                  })()}
                />
                <Route
                  path="/campers"
                  element={
                    <Protected>
                      <CampersPage />
                    </Protected>
                  }
                />
                <Route
                  path="/medical"
                  element={
                    <Protected>
                      <MedicalPage />
                    </Protected>
                  }
                />
                <Route
                  path="/photos"
                  element={
                    <Protected>
                      <PhotosPage />
                    </Protected>
                  }
                />
              </Routes>
            </main>

            <footer className="footer">
              <div className="container">
                © {new Date().getFullYear()} KCM — Production-ready camp management
              </div>
            </footer>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function RoleAwareLanding() {
  const { user, loading, currentRole, rolesReady } = useAuth()
  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  // Fast-path: if we already have a selected role, go straight there
  if (currentRole === 'parent') return <Navigate to="/parent" replace />
  if (currentRole === 'staff') return <Navigate to="/staff" replace />
  if (currentRole === 'admin') return <Navigate to="/admin" replace />
  // While resolving roles from profile, show a neutral loader (avoid flashing admin copy)
  if (!rolesReady) return <div>Loading your panel…</div>
  // If roles are resolved but none selected, send user to role selector
  return <Navigate to="/roles" replace />
}

function CampersPage() {
  return (
    <section>
      <h2>Camper Management</h2>
      <p>Manage camper registration, profiles, and rosters.</p>
    </section>
  )
}

function MedicalPage() {
  return (
    <section>
      <h2>Medical Administration Records (MAR)</h2>
      <p>Track medications, incidents, and medical history.</p>
    </section>
  )
}

function PhotosPage() {
  return (
    <section>
      <h2>Photo Gallery</h2>
      <p>Secure photo sharing with permission controls.</p>
    </section>
  )
}

export default App

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RoleProtected({ role, children }: { role: string; children: JSX.Element }) {
  const { currentRole, loading, rolesReady } = useAuth()
  if (loading || !rolesReady) return <div>Loading...</div>
  // Dev bypass: allow viewing admin routes without the admin role when enabled via env
  const bypassVal = (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_BYPASS_ADMIN_ROLE
  const bypassAdmin = bypassVal === 'true' || bypassVal === '1'
  if (role === 'admin' && bypassAdmin) {
    return children
  }
  // If no role selected or role doesn't match, direct user to role picker
  if (!currentRole) return <Navigate to="/roles" replace />
  if (currentRole !== role) return <Navigate to="/roles" replace />
  return children
}
