import { db } from '../firebase'
import { useEffect, useState } from 'react'
import { collection, getDocs, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
// Registration routes are handled at the app level

export default function ParentLanding() {
  return (
    <section>
      <h2>Parent Portal</h2>
      <p>Welcome to the parent portal. Browse sessions, register, and manage your registrations.</p>
      <nav style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
        <Link to="/parent/register">Start a new registration</Link>
      </nav>
      <SessionsList />
      <ManageRegistrations />
      {/* Nested registration routes removed; handled at app-level for a dedicated page */}
    </section>
  )
}

function SessionsList() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [status, setStatus] = useState('')
  type Gender = 'boys' | 'girls'
  type Row = {
    id: string
    name: string
    gender: Gender
    startDate: string
    endDate: string
    capacity: number
    price?: number
    confirmed: number
    holding: number
  }
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    const run = async () => {
      setStatus('Loading…')
      try {
        const genders: Gender[] = ['boys', 'girls']
        // Fetch both genders in parallel to reduce latency
        const snaps = await Promise.all(
          genders.map(g => getDocs(query(collection(db, 'sessions', String(year), g)))),
        )
        const all: Row[] = []
        snaps.forEach((snap, idx) => {
          const g = genders[idx]
          snap.docs.forEach(d => {
            const s = d.data() as Partial<{
              name: string
              startDate: string
              endDate: string
              capacity: number
              price?: number
              confirmedCount?: number
              holdCount?: number
            }>
            all.push({
              id: d.id,
              name: String(s.name ?? d.id),
              gender: g,
              startDate: String(s.startDate ?? ''),
              endDate: String(s.endDate ?? ''),
              capacity: Number(s.capacity ?? 0),
              price: s.price !== undefined ? Number(s.price) : undefined,
              confirmed: Number(s.confirmedCount ?? 0),
              holding: Number(s.holdCount ?? 0),
            })
          })
        })
        all.sort(
          (a, b) =>
            (a.startDate || '').localeCompare(b.startDate || '') || a.id.localeCompare(b.id),
        )
        setRows(all)
        setStatus('')
      } catch (e) {
        setStatus(`Failed to load sessions: ${(e as Error).message}`)
      }
    }
    void run()
  }, [year])

  return (
    <section style={{ marginTop: 12 }}>
      <h3>Sessions</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <label>
          Year
          <input
            type="number"
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            style={{ marginLeft: 6 }}
          />
        </label>
        <span aria-live="polite">{status}</span>
      </div>
      <table style={{ width: '100%', maxWidth: 860 }}>
        <thead>
          <tr>
            <th>Session</th>
            <th>Dates</th>
            <th>Spots Left</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            // Spots left accounts for both confirmed and active holds
            const spotsLeft = Math.max(0, r.capacity - (r.confirmed + r.holding))
            return (
              <tr key={`${r.gender}-${r.id}`}>
                <td>
                  {r.name} ({r.gender})
                </td>
                <td>
                  {r.startDate} → {r.endDate}
                </td>
                <td>{spotsLeft}</td>
                <td>{r.price ?? 0}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function ManageRegistrations() {
  const { user } = useAuth()
  const [items, setItems] = useState<
    Array<{
      id: string
      year: number
      gender: 'boys' | 'girls'
      sessionId: string
      camperId: string
      status: string
      missing?: Record<string, string[]>
    }>
  >([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    const run = async () => {
      if (!user) return
      setStatus('Loading registrations…')
      try {
        // Server-side callable (best practice for user-owned lists)
        const fn = httpsCallable(functions, 'listMyRegistrations')
        const resp = (await fn({})) as unknown as { data?: { ok: boolean; data?: any[] } }
        if (resp?.data?.ok) {
          const serverRows = (resp.data.data || []) as Array<{
            id: string
            year: number
            gender: 'boys' | 'girls'
            sessionId: string
            camperId: string
            status: string
            missing?: Record<string, string[]>
          }>
          setItems(serverRows)
          setStatus('')
          return
        }
        setItems([])
        setStatus('')
      } catch (e) {
        const err = e as Error & { code?: string }
        console.warn('[KCM] ManageRegistrations error', err)
        const code = (err as any)?.code || (err as any)?.name || ''
        setStatus(`Failed to load registrations: ${err.message}${code ? ` (code: ${code})` : ''}`)
      }
    }
    void run()
  }, [user])

  return (
    <section style={{ marginTop: 16 }}>
      <h3>Manage Registrations</h3>
      <div aria-live="polite" style={{ marginBottom: 8 }}>
        {status}
      </div>
      <table style={{ width: '100%', maxWidth: 980 }}>
        <thead>
          <tr>
            <th>Year</th>
            <th>Gender</th>
            <th>Session</th>
            <th>Camper</th>
            <th>Status</th>
            <th>Missing</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map(r => {
            const resumeHref = `/parent/registration/${r.year}/${r.gender}/${encodeURIComponent(
              r.sessionId,
            )}/${r.id}`
            return (
              <tr key={r.id}>
                <td>{r.year}</td>
                <td>{r.gender}</td>
                <td>
                  <Link to={resumeHref}>{r.sessionId}</Link>
                </td>
                <td>{r.camperId}</td>
                <td>{r.status}</td>
                <td>
                  {r.missing
                    ? Object.entries(r.missing)
                        .map(([k, v]) => `${k}: ${v.join(', ')}`)
                        .join(' | ')
                    : ''}
                </td>
                <td>
                  <Link to={resumeHref}>Resume</Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {items.length === 0 && (
        <div style={{ marginTop: 8, color: '#555' }}>
          No registrations found yet. If you just held a spot, try refreshing this page.
        </div>
      )}
    </section>
  )
}
