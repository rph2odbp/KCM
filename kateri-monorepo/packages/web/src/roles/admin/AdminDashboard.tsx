import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'

type Gender = 'boys' | 'girls'

type SessionRow = {
  id: string
  year: number
  name: string
  gender: Gender
  startDate: string
  endDate: string
  capacity: number
  price?: number
  // Metrics
  regCount: number
  confirmedCount: number
  pendingPaymentCount: number
  incompleteCount: number
  waitlistCount: number
}

export default function AdminDashboard() {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [genderFilter, setGenderFilter] = useState<'both' | Gender>('both')
  const [rows, setRows] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [holds, setHolds] = useState<Record<string, number>>({})

  const genders: Gender[] = useMemo(
    () => (genderFilter === 'both' ? ['boys', 'girls'] : [genderFilter]),
    [genderFilter],
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setStatus('')
      try {
        const all: SessionRow[] = []
        for (const g of genders) {
          const col = collection(db, 'sessions', String(year), g)
          const snap = await getDocs(query(col))
          const basics = snap.docs.map(d => {
            type SessionShape = Partial<
              Pick<SessionRow, 'name' | 'startDate' | 'endDate' | 'capacity' | 'price'>
            >
            const data = d.data() as SessionShape
            return {
              id: d.id,
              year,
              name: String(data.name ?? d.id),
              gender: g,
              startDate: String(data.startDate ?? ''),
              endDate: String(data.endDate ?? ''),
              capacity: Number(data.capacity ?? 0),
              price: data.price !== undefined ? Number(data.price) : undefined,
            }
          })
          // For each session, gather registration metrics
          const withMetrics = await Promise.all(
            basics.map(async b => {
              const regsCol = collection(db, 'sessions', String(year), g, b.id, 'registrations')
              const regsSnap = await getDocs(query(regsCol))
              let regCount = 0
              let confirmedCount = 0
              let pendingPaymentCount = 0
              let incompleteCount = 0
              let waitlistCount = 0
              for (const r of regsSnap.docs) {
                const rd = r.data() as { status?: string }
                const st = String(rd.status || '')
                if (st === 'waitlisted') waitlistCount++
                else {
                  regCount++
                  if (st === 'confirmed') confirmedCount++
                  else if (st === 'pendingPayment') pendingPaymentCount++
                  else if (st === 'incomplete') incompleteCount++
                }
              }
              return {
                ...(b as Omit<SessionRow, keyof SessionRow>),
                regCount,
                confirmedCount,
                pendingPaymentCount,
                incompleteCount,
                waitlistCount,
              } as SessionRow
            }),
          )
          all.push(...withMetrics)
        }
        all.sort(
          (a, b) =>
            (a.startDate || '').localeCompare(b.startDate || '') || a.id.localeCompare(b.id),
        )
        setRows(all)
        // Fetch server-summarized holds for a quick view
        const holdsMap: Record<string, number> = {}
        for (const g of genders) {
          try {
            const call = httpsCallable<
              Record<string, unknown>,
              { ok: boolean; data: Array<{ sessionId: string; holdCount: number }> }
            >(functions, 'getSessionHoldsSummary')
            const res = await call({ year, gender: g })
            const arr = res.data?.data || []
            for (const it of arr) holdsMap[`${g}/${it.sessionId}`] = Number(it.holdCount || 0)
          } catch {
            // ignore per-gender errors; continue
          }
        }
        setHolds(holdsMap)
      } catch (e) {
        setStatus(`Load error: ${(e as Error).message}`)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [year, genders])

  const totals = rows.reduce(
    (acc, r) => {
      const spotsLeft = Math.max(0, r.capacity - (r.confirmedCount + r.pendingPaymentCount))
      acc.capacity += r.capacity
      acc.confirmed += r.confirmedCount
      acc.pending += r.pendingPaymentCount
      acc.incomplete += r.incompleteCount
      acc.waitlist += r.waitlistCount
      acc.spotsLeft += spotsLeft
      return acc
    },
    { capacity: 0, confirmed: 0, pending: 0, incomplete: 0, waitlist: 0, spotsLeft: 0 },
  )

  return (
    <section>
      <h3>Admin Dashboard</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
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
            onChange={e => setGenderFilter(e.target.value as 'both' | Gender)}
            style={{ marginLeft: 6 }}
          >
            <option value="both">Both</option>
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </label>
        <span aria-live="polite">{status}</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <SummaryCard label="Capacity" value={totals.capacity} />
        <SummaryCard label="Confirmed" value={totals.confirmed} />
        <SummaryCard label="Pending" value={totals.pending} />
        <SummaryCard label="Incomplete" value={totals.incomplete} />
        <SummaryCard label="Waitlist" value={totals.waitlist} />
        <SummaryCard label="Spots Left" value={totals.spotsLeft} />
      </div>

      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Session</th>
            <th>Dates</th>
            <th>Capacity</th>
            <th>Confirmed</th>
            <th>Pending</th>
            <th>Incomplete</th>
            <th>Waitlist</th>
            <th>Spots Left</th>
            <th>Holds</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const spotsLeft = Math.max(0, r.capacity - (r.confirmedCount + r.pendingPaymentCount))
            return (
              <tr key={`${r.gender}-${r.id}`}>
                <td>
                  {r.name} ({r.gender})
                </td>
                <td>
                  {r.startDate} → {r.endDate}
                </td>
                <td>{r.capacity}</td>
                <td>{r.confirmedCount}</td>
                <td>{r.pendingPaymentCount}</td>
                <td>{r.incompleteCount}</td>
                <td>{r.waitlistCount}</td>
                <td>{spotsLeft}</td>
                <td>{holds[`${r.gender}/${r.id}`] ?? 0}</td>
                <td>{r.price ?? 0}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {loading && <div style={{ marginTop: 8 }}>Loading…</div>}
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '10px 12px',
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 12, color: '#475569' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  )
}
