import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase'

export default function PaymentReceipt() {
  const { paymentId } = useParams()
  const [status, setStatus] = useState('')
  const [data, setData] = useState<
    | (Partial<{
        id: string
        parentId: string
        registrationId: string
        registrationPath: string
        year: number
        gender: 'boys' | 'girls'
        sessionId: string
        amount: number
        currency: string
        provider: string
        status: string
        createdAt: Timestamp
        updatedAt: Timestamp
      }> & { id: string })
    | null
  >(null)

  useEffect(() => {
    const run = async () => {
      if (!paymentId) return
      setStatus('Loading…')
      try {
        const ref = doc(db, 'payments', paymentId)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          setStatus('Payment not found')
          setData(null)
          return
        }
        const d = snap.data() as any
        setData({ id: snap.id, ...d })
        setStatus('')
      } catch (e) {
        setStatus(`Failed to load: ${(e as Error).message}`)
      }
    }
    void run()
  }, [paymentId])

  return (
    <section style={{ maxWidth: 720 }}>
      <h3>Payment Receipt</h3>
      <div style={{ textAlign: 'right', marginBottom: 8 }}>
        <button type="button" className="btn" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <div aria-live="polite" style={{ marginBottom: 8 }}>
        {status}
      </div>
      {!data ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <div><strong>Payment ID:</strong> {data.id}</div>
          <div><strong>Status:</strong> {data.status}</div>
          <div><strong>Amount:</strong> ${Number(data.amount ?? 0)}</div>
          <div><strong>Currency:</strong> {data.currency || 'USD'}</div>
          <div><strong>Provider:</strong> {data.provider || 'stub'}</div>
          <div><strong>Registration:</strong> {data.registrationId} ({data.registrationPath})</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            <div>Created: {data.createdAt ? new Date((data.createdAt as Timestamp).toMillis()).toLocaleString() : '—'}</div>
            <div>Updated: {data.updatedAt ? new Date((data.updatedAt as Timestamp).toMillis()).toLocaleString() : '—'}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to="/parent">← Back to Parent Portal</Link>
          </div>
        </div>
      )}
    </section>
  )
}
