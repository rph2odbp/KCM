import { useEffect, useMemo, useState } from 'react'
import { db, projectId, databaseId, auth } from '../../firebase'
import { collection, doc, getDocs, query, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

type Gender = 'boys' | 'girls'

type SessionDoc = {
  id: string
  year: number
  name: string
  gender: Gender
  startDate: string
  endDate: string
  capacity: number
  price?: number
  waitlistOpen?: boolean
}

export default function SessionsAdmin() {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [gender, setGender] = useState<Gender>('boys')
  const [sessions, setSessions] = useState<SessionDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const OFFLINE = import.meta.env.VITE_DEV_OFFLINE_SESSIONS === 'true'

  const lsKey = (y: number, g: string) => `kcm_offline_sessions_${y}_${g}`
  const readOffline = (y: number, g: string): SessionDoc[] => {
    try {
      const raw = localStorage.getItem(lsKey(y, g))
      if (!raw) return []
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  const writeOffline = (y: number, g: string, data: SessionDoc[]) => {
    try {
      localStorage.setItem(lsKey(y, g), JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }

  const colRef = useMemo(() => collection(db, 'sessions', String(year), gender), [year, gender])

  const load = async () => {
    setLoading(true)
    setStatus('')
    if (OFFLINE) {
      const offline = readOffline(year, gender)
      if (offline.length === 0) {
        // Seed with example data for quick UI iteration
        const seed: SessionDoc[] = [
          {
            id: `${gender}-w1`,
            year,
            name: `${gender === 'boys' ? 'Boys' : 'Girls'} Week 1`,
            gender,
            startDate: `${year}-06-10`,
            endDate: `${year}-06-15`,
            capacity: 210,
            price: 0,
            waitlistOpen: true,
          },
        ]
        writeOffline(year, gender, seed)
        setSessions(seed)
        setLoading(false)
        setStatus('Offline (seeded)')
        return
      }
      setSessions(offline)
      setLoading(false)
      setStatus('Offline')
      return
    }
    const toSessionDocs = (
      docs: Array<{ fields?: Record<string, Record<string, unknown>> }>,
    ): SessionDoc[] =>
      docs.map(dj => {
        const f = dj.fields || {}
        return {
          id: String(f.id?.stringValue || ''),
          year: Number(f.year?.integerValue || 0),
          name: String(f.name?.stringValue || ''),
          gender: (f.gender?.stringValue as Gender) || gender,
          startDate: String(f.startDate?.stringValue || ''),
          endDate: String(f.endDate?.stringValue || ''),
          capacity: Number(f.capacity?.integerValue || 0),
          price:
            f.price?.doubleValue !== undefined
              ? Number(f.price.doubleValue)
              : f.price?.integerValue !== undefined
                ? Number(f.price.integerValue)
                : undefined,
          waitlistOpen: !!(f.waitlistOpen?.booleanValue ?? false),
        }
      })
    const restList = async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => undefined)
      const url = `/v1/projects/${projectId}/databases/${databaseId}/documents/sessions/${year}/${gender}`
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const snippet = text ? ` ${text.slice(0, 200)}` : ''
        throw new Error(`REST list failed: ${res.status}${snippet}`)
      }
      const json = (await res.json()) as {
        documents?: Array<{ fields?: Record<string, Record<string, unknown>> }>
      }
      return toSessionDocs(json.documents || [])
    }
    try {
      // Production / hosted: use SDK first
      try {
        const snap = await getDocs(query(colRef))
        const items = snap.docs.map(d => {
          const data = d.data() as Partial<SessionDoc>
          return {
            id: d.id,
            year: Number(data.year ?? 0),
            name: String(data.name ?? ''),
            gender: (data.gender as Gender) ?? 'boys',
            startDate: String(data.startDate ?? ''),
            endDate: String(data.endDate ?? ''),
            capacity: Number(data.capacity ?? 0),
            price: data.price !== undefined ? Number(data.price) : undefined,
            waitlistOpen: data.waitlistOpen,
          }
        })
        // Sort by start date then id for stable order
        items.sort(
          (a, b) =>
            (a.startDate || '').localeCompare(b.startDate || '') || a.id.localeCompare(b.id),
        )
        setSessions(items)
        return
      } catch (sdkErr) {
        console.warn('[sessions-admin] SDK list failed, falling back to REST proxy', sdkErr)
      }
      const viaProxy = await restList()
      viaProxy.sort(
        (a, b) => (a.startDate || '').localeCompare(b.startDate || '') || a.id.localeCompare(b.id),
      )
      setSessions(viaProxy)
      return
    } catch (e) {
      const msg = (e as Error).message
      setStatus(`Load error: ${msg}`)
      // Offer automatic offline fallback if requested dynamically
      if (import.meta.env.DEV && !OFFLINE) {
        console.warn('[sessions-admin] enabling offline fallback due to load failure')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, gender])

  return (
    <section>
      <h3>Sessions Management</h3>
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
            value={gender}
            onChange={e => setGender(e.target.value as Gender)}
            style={{ marginLeft: 6 }}
          >
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </label>
        <button onClick={load} disabled={loading}>
          Refresh
        </button>
        <span aria-live="polite">{status}</span>
      </div>

      {/* Seed helpers removed: sessions already created for 2026 */}

      <NewOrEditSession
        year={year}
        gender={gender}
        onSaved={load}
        offline={OFFLINE}
        addOffline={s => {
          const list = readOffline(year, gender)
            .filter(existing => existing.id !== s.id)
            .concat([s])
          writeOffline(year, gender, list)
          setSessions(list)
        }}
      />

      <table style={{ width: '100%', marginTop: 16 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Dates</th>
            <th>Capacity</th>
            <th>Price</th>
            <th>Waitlist</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>
                {s.startDate} → {s.endDate}
              </td>
              <td>{s.capacity}</td>
              <td>{s.price ?? 0}</td>
              <td>{s.waitlistOpen ? 'Open' : 'Closed'}</td>
              <td>
                <InlineEdit year={year} gender={gender} session={s} onSaved={load} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function NewOrEditSession({
  year,
  gender,
  onSaved,
  offline,
  addOffline,
}: {
  year: number
  gender: Gender
  onSaved: () => void
  offline: boolean
  addOffline: (s: SessionDoc) => void
}) {
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [capacity, setCapacity] = useState(210)
  const [price, setPrice] = useState(0)
  const [waitlistOpen, setWaitlistOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    if (!id || !name || !start || !end) {
      setMsg('Please fill id, name, start and end dates')
      return
    }
    // Basic validation: id shape and dates
    if (!/^([a-z0-9-]+)$/.test(id)) {
      setMsg('ID must be lowercase letters, numbers, or hyphens (e.g., boys-w1)')
      return
    }
    const sd = new Date(start)
    const ed = new Date(end)
    if (
      !(sd instanceof Date && !isNaN(sd.valueOf())) ||
      !(ed instanceof Date && !isNaN(ed.valueOf()))
    ) {
      setMsg('Invalid dates')
      return
    }
    if (ed < sd) {
      setMsg('End date must be after start date')
      return
    }
    if (capacity <= 0) {
      setMsg('Capacity must be a positive number')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      const cap = Number.isFinite(Number(capacity)) ? Number(capacity) : 0
      const pr = Number.isFinite(Number(price)) ? Number(price) : 0
      const d = doc(db, 'sessions', String(year), gender, id)
      const payload = {
        id,
        year,
        name,
        gender,
        startDate: start,
        endDate: end,
        capacity: cap,
        price: pr,
        waitlistOpen,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      if (offline) {
        addOffline(payload)
        setMsg('Saved (offline)')
        onSaved()
        return
      }
      const writeViaRest = async () => {
        const url = `/v1/projects/${projectId}/databases/${databaseId}/documents/sessions/${year}/${gender}/${id}`
        const body = {
          fields: {
            id: { stringValue: String(id) },
            year: { integerValue: String(year) },
            name: { stringValue: String(name) },
            gender: { stringValue: String(gender) },
            startDate: { stringValue: String(start) },
            endDate: { stringValue: String(end) },
            capacity: { integerValue: String(cap) },
            price: { doubleValue: Number(pr) },
            waitlistOpen: { booleanValue: !!waitlistOpen },
            updatedAt: { stringValue: new Date().toISOString() },
            createdAt: { stringValue: new Date().toISOString() },
          },
        }
        const token = await auth.currentUser?.getIdToken().catch(() => undefined)
        const attempt = async (withAuth: boolean) => {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (withAuth && token) headers.Authorization = `Bearer ${token}`
          const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) })
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(`REST write${withAuth ? ' (auth)' : ''} failed: ${res.status} ${txt}`)
          }
        }
        try {
          await attempt(false)
        } catch (e) {
          if (token) await attempt(true)
          else throw e
        }
      }

      // Prevent accidental overwrite: check existence first
      const existing = await (await import('firebase/firestore')).getDoc(d)
      if (existing.exists()) {
        setMsg(`A session with id "${id}" already exists`)
        return
      }
      try {
        await setDoc(d, payload)
      } catch (sdkErr) {
        console.warn('[sessions-admin] SDK write failed, falling back to REST', sdkErr)
        await writeViaRest()
      }
      setMsg('Saved')
      onSaved()
    } catch (e) {
      console.error('Create session failed', e)
      setMsg(`Error: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <fieldset style={{ display: 'grid', gap: 8 }}>
      <legend>Create a new session</legend>
      <div>
        <label>
          ID
          <input value={id} onChange={e => setId(e.target.value)} placeholder="boys-w1" />
        </label>
      </div>
      <div>
        <label>
          Name
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Boys Camp Week 1"
          />
        </label>
      </div>
      <div>
        <label>
          Start
          <input type="date" value={start} onChange={e => setStart(e.target.value)} />
        </label>
        <label style={{ marginLeft: 8 }}>
          End
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Capacity
          <input
            type="number"
            value={capacity}
            onChange={e => setCapacity(parseInt(e.target.value))}
          />
        </label>
        <label style={{ marginLeft: 8 }}>
          Price
          <input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value))} />
        </label>
        <label style={{ marginLeft: 8 }}>
          Waitlist open
          <input
            type="checkbox"
            checked={waitlistOpen}
            onChange={e => setWaitlistOpen(e.target.checked)}
          />
        </label>
      </div>
      <button onClick={save} disabled={saving} type="button">
        Create
      </button>
      <span aria-live="polite">{msg}</span>
    </fieldset>
  )
}

function InlineEdit({
  year,
  gender,
  session,
  onSaved,
}: {
  year: number
  gender: Gender
  session: SessionDoc
  onSaved: () => void
}) {
  const [name, setName] = useState(session.name)
  const [start, setStart] = useState(session.startDate)
  const [end, setEnd] = useState(session.endDate)
  const [capacity, setCapacity] = useState(session.capacity)
  const [price, setPrice] = useState(session.price ?? 0)
  const [waitlistOpen, setWaitlistOpen] = useState(!!session.waitlistOpen)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true)
    try {
      setMsg('')
      if (!name) {
        setMsg('Name is required')
        return
      }
      const sd = new Date(start)
      const ed = new Date(end)
      if (
        !(sd instanceof Date && !isNaN(sd.valueOf())) ||
        !(ed instanceof Date && !isNaN(ed.valueOf()))
      ) {
        setMsg('Invalid dates')
        return
      }
      if (ed < sd) {
        setMsg('End date must be after start date')
        return
      }
      if (capacity <= 0) {
        setMsg('Capacity must be positive')
        return
      }
      const cap = Number.isFinite(Number(capacity)) ? Number(capacity) : 0
      const pr = Number.isFinite(Number(price)) ? Number(price) : 0
      const d = doc(db, 'sessions', String(year), gender, session.id)
      await updateDoc(d, {
        name,
        startDate: start,
        endDate: end,
        capacity: cap,
        price: pr,
        waitlistOpen,
        updatedAt: new Date().toISOString(),
      })
      onSaved()
    } catch (e) {
      console.error('Update failed', e)
      setMsg(`Error: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete session ${session.id}? This cannot be undone.`)) return
    setSaving(true)
    try {
      setMsg('')
      const d = doc(db, 'sessions', String(year), gender, session.id)
      await deleteDoc(d)
      onSaved()
    } catch (e) {
      console.error('Delete failed', e)
      setMsg(`Error: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input value={name} onChange={e => setName(e.target.value)} style={{ width: 180 }} />
      <input type="date" value={start} onChange={e => setStart(e.target.value)} />
      <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
      <input
        type="number"
        value={capacity}
        onChange={e => setCapacity(parseInt(e.target.value))}
        style={{ width: 80 }}
      />
      <input
        type="number"
        value={price}
        onChange={e => setPrice(parseFloat(e.target.value))}
        style={{ width: 80 }}
      />
      <label>
        Waitlist
        <input
          type="checkbox"
          checked={waitlistOpen}
          onChange={e => setWaitlistOpen(e.target.checked)}
        />
      </label>
      <button onClick={save} disabled={saving}>
        Save
      </button>
      <button onClick={remove} disabled={saving} style={{ color: '#b91c1c' }}>
        Delete
      </button>
      <span aria-live="polite" style={{ marginLeft: 8 }}>
        {msg}
      </span>
    </div>
  )
}
