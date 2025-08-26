import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, Timestamp, collection, getDocs, query, where, orderBy, limit as qlimit } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import { db } from '../../firebase'
import { useAuth } from '../../auth'

type RegData = {
  id: string
  year: number
  sessionId: string
  parentId: string
  camperId: string
  status: string
  formCompletion?: {
    parent?: boolean
    camper?: boolean
    health?: boolean
    consents?: boolean
    payment?: boolean
  }
  addOns?: { messagePackets?: number }
  depositPaid?: boolean
  totalDue?: number
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export default function RegistrationDetail() {
  const { year, gender, sessionId, regId } = useParams()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { justCreated?: boolean } }
  const { user } = useAuth()
  const [status, setStatus] = useState('')
  const [data, setData] = useState<RegData | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [reholdStatus, setReholdStatus] = useState('')
  const [reholding, setReholding] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payStatus, setPayStatus] = useState('')
  const [paymentId, setPaymentId] = useState<string>('')
  const [paymentSummary, setPaymentSummary] = useState<{ status?: string; amount?: number } | null>(null)

  useEffect(() => {
    const run = async () => {
      setStatus('')
      try {
        if (!year || !gender || !sessionId || !regId) return
        const ref = doc(db, 'sessions', String(year), gender, sessionId, 'registrations', regId)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          setStatus('Registration not found')
          setData(null)
          return
        }
        const d = snap.data() as Partial<RegData>
        setData({
          id: regId,
          year: Number(d.year ?? Number(year)),
          sessionId: String(d.sessionId ?? sessionId),
          parentId: String(d.parentId ?? ''),
          camperId: String(d.camperId ?? ''),
          status: String(d.status ?? ''),
          formCompletion: d.formCompletion,
          addOns: d.addOns,
          depositPaid: Boolean(d.depositPaid),
          totalDue: Number(d.totalDue ?? 0),
          createdAt: d.createdAt as Timestamp | undefined,
          updatedAt: d.updatedAt as Timestamp | undefined,
        })
        // also fetch session name for display
        const sRef = doc(db, 'sessions', String(year), gender, sessionId)
        const sSnap = await getDoc(sRef)
        if (sSnap.exists()) {
          const s = sSnap.data() as Partial<{ name: string }>
          setSessionName(String(s.name ?? sessionId))
        } else {
          setSessionName(sessionId)
        }
        // Fetch latest payment for this registration (owned by current user)
        if (user) {
          try {
            const paysCol = collection(db, 'payments')
            const qy = query(
              paysCol,
              where('parentId', '==', user.uid),
              where('registrationId', '==', regId),
              orderBy('updatedAt', 'desc'),
              qlimit(1),
            )
            const pSnap = await getDocs(qy)
            if (!pSnap.empty) {
              const p = pSnap.docs[0]
              const pd = p.data() as Partial<{ status: string; amount: number }>
              setPaymentId(p.id)
              setPaymentSummary({ status: pd.status, amount: pd.amount })
            }
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        setStatus(`Failed to load registration: ${(e as Error).message}`)
      }
    }
    void run()
  }, [year, gender, sessionId, regId, user])

  const showBanner = data && (data.status === 'holding' || data.status === 'expired')
  const isExpired = data && data.status === 'expired'
  const isHolding = data && data.status === 'holding'

  const handleRehold = async () => {
    if (!data) return
    setReholding(true)
    setReholdStatus('Requesting new hold…')
    try {
      const call = httpsCallable<
        Record<string, unknown>,
        {
          success: boolean
          data?: { registrationId: string; holdExpiresAt?: string; status: string }
        }
      >(functions, 'startRegistration')
      const res = await call({
        year: data.year,
        sessionId: data.sessionId,
        camper: { id: data.camperId },
      })
      const d = res.data?.data
      if (d?.status === 'HOLDING' && d.holdExpiresAt) {
        setReholdStatus('Seat re-held! You have a new window to confirm.')
        window.location.reload()
      } else if (d?.status === 'WAITLIST') {
        setReholdStatus('Session is full; you have been routed to the waitlist flow.')
      } else {
        setReholdStatus('Unable to re-hold seat.')
      }
    } catch (e) {
      setReholdStatus(`Error: ${(e as Error).message}`)
    } finally {
      setReholding(false)
    }
  }

  return (
    <section style={{ maxWidth: 720 }}>
      <h3 style={{ marginBottom: 8 }}>Registration Details</h3>
      {location.state?.justCreated && (
        <div
          style={{
            padding: 8,
            background: '#ecfdf5',
            border: '1px solid #10b981',
            marginBottom: 12,
          }}
        >
          Registration confirmed. Welcome to camp!
        </div>
      )}
      {showBanner && (
        <div
          style={{
            padding: 8,
            background: isExpired ? '#fef2f2' : '#fff7ed',
            border: isExpired ? '1px solid #ef4444' : '1px solid #f59e0b',
            marginBottom: 12,
          }}
        >
          {isHolding &&
            'Your seat is currently held. Please complete registration and confirm to keep your spot.'}
          {isExpired && (
            <span>
              Your hold expired. You can try to hold a seat again below.
              <br />
              <button
                className="btn"
                disabled={reholding}
                onClick={handleRehold}
                style={{ marginTop: 8 }}
              >
                Re-hold seat
              </button>
              <span style={{ marginLeft: 8 }}>{reholdStatus}</span>
            </span>
          )}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <Link to="/parent">← Back to Parent Portal</Link>
        <button
          type="button"
          className="btn"
          style={{ marginLeft: 8 }}
          onClick={() => navigate('/parent')}
        >
          Return to Parent Portal
        </button>
      </div>
      <div aria-live="polite" style={{ marginBottom: 8 }}>
        {status}
      </div>
      {!data ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <div>
            <strong>Registration ID:</strong> {data.id}
          </div>
          <div>
            <strong>Year:</strong> {data.year}
          </div>
          <div>
            <strong>Gender:</strong>{' '}
            {gender === 'boys' ? 'Boys' : gender === 'girls' ? 'Girls' : gender}
          </div>
          <div>
            <strong>Session:</strong> {sessionName} ({data.sessionId})
          </div>
          <div>
            <strong>Camper:</strong> {data.camperId}
          </div>
          <div>
            <strong>Status:</strong> {data.status}
          </div>
          <div>
            <strong>Deposit Paid:</strong> {data.depositPaid ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Total Due:</strong> ${Number.isFinite(data.totalDue) ? data.totalDue : 0}
          </div>
          <div>
            <strong>Form Completion:</strong>{' '}
            {data.formCompletion
              ? Object.entries(data.formCompletion)
                  .map(([k, v]) => `${k}: ${v ? '✓' : '✗'}`)
                  .join(' | ')
              : 'N/A'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            <div>
              Created: {data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleString() : '—'}
            </div>
            <div>
              Updated: {data.updatedAt ? new Date(data.updatedAt.toMillis()).toLocaleString() : '—'}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              onClick={() =>
                navigate(
                  `/parent/registration/${year}/${gender}/${encodeURIComponent(sessionId!)}/${regId}/forms`,
                )
              }
            >
              Start forms
            </button>
          </div>
          {data.status === 'holding' && (
            <div style={{ marginTop: 12, padding: 8, border: '1px solid #e5e7eb' }}>
              <h4>Payment</h4>
              <p style={{ margin: '6px 0' }}>
                To confirm your seat, pay the deposit now. This stub will mark the deposit as
                authorized and confirm your registration.
              </p>
              <button
                type="button"
                className="btn"
                disabled={paying}
                onClick={async () => {
                  if (!data) return
                  setPaying(true)
                  setPayStatus('Authorizing deposit…')
                  try {
                    const init = httpsCallable(
                      functions,
                      'initiateDeposit',
                    ) as unknown as (
                      input: {
                        year: number
                        gender: 'boys' | 'girls'
                        sessionId: string
                        registrationId: string
                        amount?: number
                      },
                    ) => Promise<{ data: { ok: boolean; paymentId?: string } }>
                    const r1 = await init({
                      year: data.year,
                      gender: (gender as 'boys' | 'girls') || 'boys',
                      sessionId: data.sessionId,
                      registrationId: data.id,
                    })
                    if (!r1.data?.ok) throw new Error('Deposit authorization failed')
                    if (r1.data.paymentId) setPaymentId(r1.data.paymentId)

                    setPayStatus('Confirming registration…')
                    const confirm = httpsCallable(
                      functions,
                      'confirmRegistration',
                    ) as unknown as (
                      input: {
                        year: number
                        gender: 'boys' | 'girls'
                        sessionId: string
                        registrationId: string
                        depositSuccess: boolean
                      },
                    ) => Promise<{ data: { ok: boolean } }>
                    const r2 = await confirm({
                      year: data.year,
                      gender: (gender as 'boys' | 'girls') || 'boys',
                      sessionId: data.sessionId,
                      registrationId: data.id,
                      depositSuccess: true,
                    })
                    if (!r2.data?.ok) throw new Error('Confirmation failed')

                    setPayStatus('Payment complete!')
                    // Keep user here and show a receipt link; optionally navigate
                    // navigate('/parent', { state: { justCreated: true } })
                  } catch (e) {
                    setPayStatus(`Payment error: ${(e as Error).message}`)
                  } finally {
                    setPaying(false)
                  }
                }}
              >
                Pay deposit
              </button>
              <span style={{ marginLeft: 8 }} aria-live="polite">
                {payStatus}
              </span>
              {paymentId && (
                <div style={{ marginTop: 8 }}>
                  <Link to={`/parent/payment/${paymentId}`}>View receipt</Link>
                  {paymentSummary && (
                    <span style={{ marginLeft: 8, color: '#555' }}>
                      {paymentSummary.status}
                      {typeof paymentSummary.amount === 'number' ? ` ($${paymentSummary.amount})` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
