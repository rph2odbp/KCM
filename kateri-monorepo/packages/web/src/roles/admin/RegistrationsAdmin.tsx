import { useEffect, useMemo, useState } from 'react'
import {
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase'

type Row = {
  id: string
  year: number
  gender: 'boys' | 'girls'
  sessionId: string
  camperId: string
  parentId: string
  status: string
}

export default function RegistrationsAdmin() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [genderFilter, setGenderFilter] = useState<'all' | 'boys' | 'girls'>('all')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'incomplete' | 'pendingPayment' | 'confirmed' | 'waitlisted' | 'cancelled'
  >('all')
  const [search, setSearch] = useState('')
  const [camperNames, setCamperNames] = useState<Record<string, string>>({})
  const [parentEmails, setParentEmails] = useState<Record<string, string>>({})

  useEffect(() => {
    const run = async () => {
      setStatus('')
      try {
        const cg = collectionGroup(db, 'registrations')
        const snap = await getDocs(query(cg, where('year', '==', year)))
        const items = snap.docs.map(d => {
          const data = d.data() as Partial<Row>
          return {
            id: d.id,
            year: Number(data.year ?? year),
            gender: (data.gender as 'boys' | 'girls') || 'boys',
            sessionId: String(data.sessionId ?? ''),
            camperId: String(data.camperId ?? ''),
            parentId: String(data.parentId ?? ''),
            status: String(data.status ?? ''),
          }
        })
        items.sort((a, b) => a.sessionId.localeCompare(b.sessionId) || a.id.localeCompare(b.id))
        setRows(items)
      } catch (e) {
        setStatus(`Failed to load registrations: ${(e as Error).message}`)
      }
    }
    void run()
  }, [year])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return rows.filter(r => {
      if (genderFilter !== 'all' && r.gender !== genderFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (!s) return true
      return (
        r.sessionId.toLowerCase().includes(s) ||
        r.camperId.toLowerCase().includes(s) ||
        r.parentId.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s)
      )
    })
  }, [rows, genderFilter, statusFilter, search])

  useEffect(() => {
    const run = async () => {
      try {
        const camperIds = Array.from(new Set(rows.map(r => r.camperId)))
        const parentIds = Array.from(new Set(rows.map(r => r.parentId)))
        const camperEntries: Array<[string, string]> = []
        for (const id of camperIds) {
          if (camperNames[id]) continue
          try {
            const ref = doc(db, 'campers', id)
            const snap = await getDoc(ref)
            if (snap.exists()) {
              const d = snap.data() as Partial<{ firstName: string; lastName: string }>
              const name = `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || id
              camperEntries.push([id, name])
            }
          } catch {
            // ignore
          }
        }
        const parentEntries: Array<[string, string]> = []
        for (const id of parentIds) {
          if (parentEmails[id]) continue
          try {
            const ref = doc(db, 'users', id)
            const snap = await getDoc(ref)
            if (snap.exists()) {
              const d = snap.data() as Partial<{ email: string; displayName: string }>
              const val = d.email || d.displayName || id
              parentEntries.push([id, String(val)])
            }
          } catch {
            // ignore
          }
        }
        if (camperEntries.length)
          setCamperNames(prev => Object.fromEntries([...Object.entries(prev), ...camperEntries]))
        if (parentEntries.length)
          setParentEmails(prev => Object.fromEntries([...Object.entries(prev), ...parentEntries]))
      } catch {
        // no-op
      }
    }
    void run()
  }, [rows, camperNames, parentEmails])

  const updateStatus = async (r: Row, newStatus: Row['status']) => {
    try {
      setStatus('')
      const ref = doc(db, 'sessions', String(r.year), r.gender, r.sessionId, 'registrations', r.id)
      await updateDoc(ref, { status: newStatus, updatedAt: serverTimestamp() })
      setRows(prev => prev.map(x => (x.id === r.id ? { ...x, status: newStatus } : x)))
    } catch (e) {
      setStatus(`Failed to update status: ${(e as Error).message}`)
    }
  }

  const exportCsv = () => {
    const header = ['regId', 'year', 'gender', 'sessionId', 'camperId', 'parentId', 'status']
    const lines = [header.join(',')]
    for (const r of filtered) {
      const row = [r.id, r.year, r.gender, r.sessionId, r.camperId, r.parentId, r.status]
        .map(v => String(v).replace(/"/g, '""'))
        .map(v => (v.includes(',') ? `"${v}"` : v))
        .join(',')
      lines.push(row)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registrations-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section>
      <h3>Registrations</h3>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <label>
          Year
          <input
            type="number"
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            style={{ marginLeft: 6 }}
          />
        </label>
        <label>
          Gender
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value as typeof genderFilter)}
            style={{ marginLeft: 6 }}
          >
            <option value="all">All</option>
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            style={{ marginLeft: 6 }}
          >
            <option value="all">All</option>
            <option value="incomplete">Incomplete</option>
            <option value="pendingPayment">Pending Payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label>
          Search
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="reg/session/camper/parent"
            style={{ marginLeft: 6 }}
          />
        </label>
        <button type="button" onClick={exportCsv}>
          Export CSV
        </button>
        <span aria-live="polite">{status}</span>
      </div>
      <table style={{ width: '100%', maxWidth: 980 }}>
        <thead>
          <tr>
            <th>Session</th>
            <th>Gender</th>
            <th>Camper</th>
            <th>Parent</th>
            <th>Status</th>
            <th>Reg ID</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td>{r.sessionId}</td>
              <td>{r.gender}</td>
              <td>{camperNames[r.camperId] || r.camperId}</td>
              <td>{parentEmails[r.parentId] || r.parentId}</td>
              <td>
                <select
                  value={r.status}
                  onChange={e => updateStatus(r, e.target.value as Row['status'])}
                >
                  <option value="incomplete">Incomplete</option>
                  <option value="pendingPayment">Pending Payment</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </td>
              <td style={{ fontFamily: 'monospace' }}>{r.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
