import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'

// Create a query client for React Query
const queryClient = new QueryClient()

function App() {
  // Placeholder state (reserved for future use)
  const [_count, _setCount] = useState(0)

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1>🏕️ KCM - Kateri Camp Management</h1>
            <p>Welcome to the camp management platform</p>
          </header>

          <nav style={{ padding: '20px' }}>
            <Link to="/" style={{ marginRight: '20px' }}>
              Home
            </Link>
            <Link to="/campers" style={{ marginRight: '20px' }}>
              Campers
            </Link>
            <Link to="/medical" style={{ marginRight: '20px' }}>
              Medical
            </Link>
            <Link to="/photos">Photos</Link>
          </nav>

          <main style={{ padding: '20px' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/campers" element={<CampersPage />} />
              <Route path="/medical" element={<MedicalPage />} />
              <Route path="/photos" element={<PhotosPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

// Placeholder components
function Home() {
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome to the KCM dashboard. This is where camp administrators can manage:</p>
      <ul>
        <li>Camper registration and rosters</li>
        <li>Medical administration records (MAR)</li>
        <li>Payment processing with Adyen</li>
        <li>Photo galleries with permission controls</li>
        <li>Reports and analytics</li>
        <li>AI-powered features</li>
      </ul>
      <p>
        <strong>Status:</strong> Development environment - Firebase emulators ready
      </p>
    </div>
  )
}

function CampersPage() {
  return (
    <div>
      <h2>Camper Management</h2>
      <p>Manage camper registration, profiles, and rosters.</p>
      <p>
        <em>Feature coming soon...</em>
      </p>
    </div>
  )
}

function MedicalPage() {
  return (
    <div>
      <h2>Medical Administration Records (MAR)</h2>
      <p>Track medications, incidents, and medical history.</p>
      <p>
        <em>Feature coming soon...</em>
      </p>
    </div>
  )
}

function PhotosPage() {
  return (
    <div>
      <h2>Photo Gallery</h2>
      <p>Secure photo sharing with permission controls.</p>
      <p>
        <em>Feature coming soon...</em>
      </p>
    </div>
  )
}

export default App
