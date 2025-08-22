import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'

type Gender = 'male' | 'female'

type SessionItem = {
  id: string
  name: string
  startDate: string
  endDate: string
}

export default function RegistrationStepper() {
  const [step, setStep] = useState(1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [gender, setGender] = useState<Gender>('male')
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [sessionId, setSessionId] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [grade, setGrade] = useState(2)

  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const genderKey = gender === 'male' ? 'boys' : 'girls'
  const colRef = useMemo(
    () => collection(db, 'sessions', String(year), genderKey),
    [year, genderKey],
  )

  useEffect(() => {
    const run = async () => {
      setStatus('')
      try {
        const snap = await getDocs(query(colRef))
        const items = snap.docs.map(d => {
          const data = d.data() as Partial<SessionItem> & {
            startDate?: string
            endDate?: string
          }
          return {
            id: d.id,
            name: String(data.name ?? d.id),
            startDate: String(data.startDate ?? ''),
            endDate: String(data.endDate ?? ''),
          }
        })
        setSessions(items)
        if (items.length > 0) setSessionId(items[0].id)
      } catch (e) {
        setStatus(`Failed to load sessions: ${(e as Error).message}`)
      }
    }
    void run()
  }, [colRef])

  const canNextFrom1 = year >= 2000 && sessions.length > 0 && !!sessionId
  const canNextFrom2 = firstName && lastName && dob && grade >= 2 && grade <= 8

  const submit = async () => {
    setSubmitting(true)
    setStatus('Submitting...')
    try {
      type Resp = { success: boolean; data?: { registrationId: string; camperId: string } }
      const call = httpsCallable<Record<string, unknown>, Resp>(functions, 'createRegistration')
      const res = await call({
        year,
        sessionId,
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
      setStep(3)
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={{ maxWidth: 560 }}>
      <h3>New Registration</h3>
      <ol style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0 }}>
        <li>
          <strong>{step === 1 ? '1. Select Session' : '1. Select Session'}</strong>
        </li>
        <li>
          <strong>{step === 2 ? '2. Camper Info' : '2. Camper Info'}</strong>
        </li>
        <li>
          <strong>3. Done</strong>
        </li>
      </ol>

      {step === 1 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            Year
            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} />
          </label>
          <label>
            Gender
            <select value={gender} onChange={e => setGender(e.target.value as Gender)}>
              <option value="male">Boy</option>
              <option value="female">Girl</option>
            </select>
          </label>
          <label>
            Session
            <select value={sessionId} onChange={e => setSessionId(e.target.value)}>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startDate} → {s.endDate})
                </option>
              ))}
            </select>
          </label>
          <div>
            <button disabled={!canNextFrom1} onClick={() => setStep(2)}>
              Next
            </button>
          </div>
          <div aria-live="polite">{status}</div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            Camper First Name
            <input value={firstName} onChange={e => setFirstName(e.target.value)} />
          </label>
          <label>
            Camper Last Name
            <input value={lastName} onChange={e => setLastName(e.target.value)} />
          </label>
          <label>
            Date of Birth
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </label>
          <label>
            Grade Completed (2–8)
            <input
              type="number"
              min={2}
              max={8}
              value={grade}
              onChange={e => setGrade(parseInt(e.target.value))}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(1)}>Back</button>
            <button disabled={!canNextFrom2 || submitting} onClick={submit}>
              Submit
            </button>
          </div>
          <div aria-live="polite">{status}</div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p>Registration submitted.</p>
          <div aria-live="polite">{status}</div>
        </div>
      )}
    </section>
  )
}
