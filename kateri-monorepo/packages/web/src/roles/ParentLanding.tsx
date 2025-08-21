import { httpsCallable } from 'firebase/functions'
import { functions, db, app } from '../firebase'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, getFirestore } from 'firebase/firestore'

export default function ParentLanding() {
  return (
    <section>
      <h2>Parent Portal</h2>
      <p>Welcome to the parent portal. Register your camper for a session below.</p>
      <ParentRegistration />
    </section>
  )
}

function ParentRegistration() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [sessions, setSessions] = useState<
    { id: string; name: string; startDate: string; endDate: string }[]
  >([])
  const [selected, setSelected] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [grade, setGrade] = useState(2)
  const [status, setStatus] = useState<string>('')

  const currentYear = new Date().getFullYear()
  const genderKey = gender === 'male' ? 'boys' : 'girls'
  const colRef = useMemo(
    () => collection(db, 'sessions', String(year), genderKey),
    [year, genderKey],
  )

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(query(colRef))
        let items = snap.docs.map(d => {
          const data = d.data() as unknown
          const s = data as Partial<{ name: string; startDate: string; endDate: string }>
          return {
            id: d.id,
            name: String(s.name ?? d.id),
            startDate: String(s.startDate ?? ''),
            endDate: String(s.endDate ?? ''),
          }
        })
        if (items.length === 0) {
          // Fallback: attempt to read from the default database in case seeding went there
          const altCol = collection(getFirestore(app), 'sessions', String(year), genderKey)
          const altSnap = await getDocs(query(altCol))
          items = altSnap.docs.map(d => {
            const data = d.data() as unknown
            const s = data as Partial<{ name: string; startDate: string; endDate: string }>
            return {
              id: d.id,
              name: String(s.name ?? d.id),
              startDate: String(s.startDate ?? ''),
              endDate: String(s.endDate ?? ''),
            }
          })
        }
        setSessions(items)
        if (items.length > 0) {
          setSelected(items[0].id)
        } else if (year === currentYear) {
          // If no sessions for current year, try next year automatically
          setYear(currentYear + 1)
        } else {
          setSelected('')
        }
      } catch (e) {
        setStatus(`Failed to load sessions: ${(e as Error).message}`)
      }
    }
    void run()
  }, [colRef, year, currentYear, genderKey])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Submitting...')
    try {
      type CreateRegResponse = {
        success: boolean
        data?: { registrationId: string; camperId: string }
      }
      const call = httpsCallable<Record<string, unknown>, CreateRegResponse>(
        functions,
        'createRegistration',
      )
      const res = await call({
        year,
        sessionId: selected,
        camper: {
          firstName,
          lastName,
          dateOfBirth: dob,
          gender,
          gradeCompleted: grade,
        },
      })
      const data = res.data?.data
      setStatus(data ? `Success: ${data.registrationId}` : 'Success')
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
      <label>
        Year
        <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} />
      </label>
      <label>
        Session
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          {sessions.length === 0 && (
            <option value="" disabled>
              No sessions available
            </option>
          )}
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.startDate} → {s.endDate})
            </option>
          ))}
        </select>
      </label>
      <label>
        Camper First Name
        <input value={firstName} onChange={e => setFirstName(e.target.value)} required />
      </label>
      <label>
        Camper Last Name
        <input value={lastName} onChange={e => setLastName(e.target.value)} required />
      </label>
      <label>
        Date of Birth
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} required />
      </label>
      <label>
        Gender
        <select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')}>
          <option value="male">Boy</option>
          <option value="female">Girl</option>
        </select>
      </label>
      <label>
        Grade Completed (2-8)
        <input
          type="number"
          min={2}
          max={8}
          value={grade}
          onChange={e => setGrade(parseInt(e.target.value))}
          required
        />
      </label>
      <button type="submit">Create Registration</button>
      <div aria-live="polite">{status}</div>
    </form>
  )
}
