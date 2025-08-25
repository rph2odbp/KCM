import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'
import { useNavigate, useSearchParams } from 'react-router-dom'

type Gender = 'male' | 'female'

type SessionItem = {
  id: string
  name: string
  startDate: string
  endDate: string
}

export default function RegistrationStepper() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [holdUntil, setHoldUntil] = useState<number | null>(null)
  const [regId, setRegId] = useState<string | null>(null)

  const genderKey = gender === 'male' ? 'boys' : 'girls'
  const colRef = useMemo(
    () => collection(db, 'sessions', String(year), genderKey),
    [year, genderKey],
  )

  // Prefill from query params: year, gender(boys/girls), sessionId
  useEffect(() => {
    const qpYear = parseInt(searchParams.get('year') || '')
    if (!Number.isNaN(qpYear) && qpYear >= 2000) setYear(qpYear)
    const qpGender = (searchParams.get('gender') || '').toLowerCase()
    if (qpGender === 'boys') setGender('male')
    else if (qpGender === 'girls') setGender('female')
    const qpSession = searchParams.get('sessionId')
    if (qpSession) setSessionId(qpSession)
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        if (!sessionId && items.length > 0) setSessionId(items[0].id)
      } catch (e) {
        setStatus(`Failed to load sessions: ${(e as Error).message}`)
      }
    }
    void run()
    // sessionId is intentionally not included to avoid resetting selection when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colRef])

  const canNextFrom1 = year >= 2000 && sessions.length > 0 && !!sessionId
  const canNextFrom2 = firstName && lastName && dob && grade >= 2 && grade <= 8

  const submit = async () => {
    setSubmitting(true)
    setStatus('Submitting...')
    try {
      type StartResp = {
        success: boolean
        data?: { registrationId: string; camperId: string; holdExpiresAt?: string; status: string }
      }
      const call = httpsCallable<Record<string, unknown>, StartResp>(functions, 'startRegistration')
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
      if (!data) throw new Error('No response data')
      if (data.status === 'WAITLIST') {
        setStatus('Session is full; you have been routed to the waitlist flow.')
        setStep(3)
        return
      }
      if (!data.registrationId) throw new Error('Failed to create registration')
      setRegId(data.registrationId)
      if (data.holdExpiresAt) setHoldUntil(new Date(data.holdExpiresAt).getTime())
      setStatus('Seat held. Complete the basics and confirm with deposit to keep it.')
      setStep(2)
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!holdUntil) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [holdUntil])

  const secondsLeft = holdUntil ? Math.max(0, Math.floor((holdUntil - now) / 1000)) : null

  const confirm = async () => {
    if (!regId) return
    setSubmitting(true)
    setStatus('Confirming...')
    try {
      const gKey = gender === 'male' ? 'boys' : 'girls'
      const call = httpsCallable<Record<string, unknown>, { ok: boolean }>(
        functions,
        'confirmRegistration',
      )
      const res = await call({
        year,
        gender: gKey,
        sessionId,
        registrationId: regId,
        depositSuccess: true,
      })
      if (!res.data?.ok) throw new Error('Confirmation failed')
      navigate(`/parent/registration/${year}/${gKey}/${encodeURIComponent(sessionId)}/${regId}`, {
        state: { justCreated: true },
      })
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
          {secondsLeft !== null && (
            <div style={{ padding: 8, background: '#fff7ed', border: '1px solid #f59e0b' }}>
              Seat held for {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, '0')} minutes. Complete and confirm to keep it.
            </div>
          )}
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
            {!regId ? (
              <button disabled={!canNextFrom2 || submitting} onClick={submit}>
                Hold seat
              </button>
            ) : (
              <button disabled={submitting} onClick={confirm}>
                Confirm (mock deposit)
              </button>
            )}
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
