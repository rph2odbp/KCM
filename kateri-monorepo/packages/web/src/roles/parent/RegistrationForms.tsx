import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { auth, db, storage, functions } from '../../firebase'
import { httpsCallable } from 'firebase/functions'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes } from 'firebase/storage'

type EmergencyContact = { name: string; relationship: string; phoneNumber: string; email?: string }

export default function RegistrationForms() {
  const { year, gender, sessionId, regId } = useParams()
  const uid = auth.currentUser?.uid || ''
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('')
  const [camperId, setCamperId] = useState<string>('')
  const [formCompletion, setFormCompletion] = useState<
    Partial<{ parent: boolean; camper: boolean; health: boolean; consents: boolean }>
  >({})

  // Guardian
  const [gFullName, setGFullName] = useState('')
  const [gEmail, setGEmail] = useState('')
  const [gPhone, setGPhone] = useState('')
  const [gAddress, setGAddress] = useState('')
  const [secondGEnabled, setSecondGEnabled] = useState(false)
  const [g2FullName, setG2FullName] = useState('')
  const [g2Email, setG2Email] = useState('')
  const [g2Phone, setG2Phone] = useState('')
  const [g2Address, setG2Address] = useState('')

  // Camper
  const [school, setSchool] = useState('')
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { name: '', relationship: '', phoneNumber: '' },
  ])

  // Health
  const [allergies, setAllergies] = useState<string[]>([])
  const [dietary, setDietary] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [canSwim, setCanSwim] = useState<boolean>(false)
  const [allowSunscreen, setAllowSunscreen] = useState<boolean>(true)
  const [physicianName, setPhysicianName] = useState('')
  const [physicianPhone, setPhysicianPhone] = useState('')
  const [insuranceProvider, setInsuranceProvider] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null)
  const [insurancePath, setInsurancePath] = useState('')

  // Consents
  const [consentMedical, setConsentMedical] = useState(false)
  const [consentLiability, setConsentLiability] = useState(false)
  const [consentPhoto, setConsentPhoto] = useState(false)
  const [signature, setSignature] = useState('')

  const regPath = useMemo(
    () => `sessions/${String(year)}/${String(gender)}/${String(sessionId)}/registrations/${String(regId)}`,
    [year, gender, sessionId, regId],
  )

  useEffect(() => {
    async function bootstrap() {
      try {
        if (!uid) throw new Error('Not signed in')
        // load registration → camperId
        const rRef = doc(db, regPath)
        const rSnap = await getDoc(rRef)
        if (!rSnap.exists()) throw new Error('Registration not found')
        const rData = rSnap.data() as Partial<{
          camperId: string
          formCompletion: { parent?: boolean; camper?: boolean; health?: boolean; consents?: boolean }
        }>
        const cId = String(rData.camperId || '')
        if (!cId) throw new Error('Missing camperId on registration')
        setCamperId(cId)
        if (rData.formCompletion) setFormCompletion(rData.formCompletion)

        // load user profile (for guardian info)
        const uRef = doc(db, 'users', uid)
        const uSnap = await getDoc(uRef)
        if (uSnap.exists()) {
          const u = uSnap.data() as any
          setGEmail(String(u.email || ''))
          setGPhone(String(u.phoneNumber || ''))
          setGFullName([u.firstName, u.lastName].filter(Boolean).join(' '))
          setGAddress(String(u.address || ''))
          if (u.secondGuardian) {
            setSecondGEnabled(true)
            setG2FullName(String(u.secondGuardian.fullName || ''))
            setG2Email(String(u.secondGuardian.email || ''))
            setG2Phone(String(u.secondGuardian.phone || ''))
            setG2Address(String(u.secondGuardian.address || ''))
          }
        }

        // load camper
        const cRef = doc(db, 'campers', cId)
        const cSnap = await getDoc(cRef)
        if (cSnap.exists()) {
          const c = cSnap.data() as any
          setSchool(String(c.school || ''))
          const ecs = Array.isArray(c.emergencyContacts) ? (c.emergencyContacts as any[]) : []
          if (ecs.length > 0) setContacts(ecs as EmergencyContact[])
          const m = c.medicalInfo || {}
          setAllergies(Array.isArray(m.allergies) ? m.allergies : [])
          setDietary(Array.isArray(m.dietaryRestrictions) ? m.dietaryRestrictions : [])
          setMedications(Array.isArray(m.medications) ? m.medications : [])
          setConditions(Array.isArray(m.conditions) ? m.conditions : [])
          setCanSwim(Boolean(m.canSwim))
          setAllowSunscreen(m.allowSunscreen === false ? false : true)
          setPhysicianName(String(m.physicianName || ''))
          setPhysicianPhone(String(m.physicianPhone || ''))
          setInsuranceProvider(String(m.insuranceProvider || ''))
          setPolicyNumber(String(m.policyNumber || ''))
          setInsurancePath(String(m.insuranceCardPath || ''))
        }
      } catch (e) {
        setStatus((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    void bootstrap()
  }, [regPath, uid])

  const emailOk = (s: string) => /.+@.+\..+/.test(s)
  const phoneDigits = (s: string) => (s || '').replace(/\D/g, '')
  const phoneOk = (s: string) => phoneDigits(s).length >= 10

  const saveGuardian = async () => {
    if (!uid) return
    // basic validation
    const parts = gFullName.trim().split(/\s+/)
    if (parts.length < 2) return setStatus('Please enter your full name (first and last).')
    if (!emailOk(gEmail)) return setStatus('Please enter a valid email.')
    if (!phoneOk(gPhone)) return setStatus('Please enter a valid 10-digit phone number.')
    setStatus('Saving guardian…')
    const [firstName, ...rest] = gFullName.trim().split(' ')
    const lastName = rest.join(' ')
    const payload: any = {
      email: gEmail,
      phoneNumber: gPhone,
      address: gAddress,
      updatedAt: serverTimestamp(),
    }
    if (firstName) payload.firstName = firstName
    if (lastName) payload.lastName = lastName
    if (secondGEnabled) {
      payload.secondGuardian = {
        fullName: g2FullName,
        email: g2Email,
        phone: g2Phone,
        address: g2Address,
      }
    } else {
      payload.secondGuardian = null
    }
    await setDoc(doc(db, 'users', uid), payload, { merge: true })
    // mark section complete
    try {
      const call = httpsCallable(functions, 'markRegistrationSectionComplete')
      await call({ year: Number(year), gender, sessionId, registrationId: regId, section: 'parent' })
  setFormCompletion((fc: Partial<{ parent: boolean; camper: boolean; health: boolean; consents: boolean }>) => ({ ...fc, parent: true }))
    } catch {/* ignore */}
    setStatus('Guardian saved')
  }

  const saveCamper = async () => {
    if (!camperId) return
    // require at least one contact
    const cleansed = contacts.filter((c: EmergencyContact) => c.name || c.relationship || c.phoneNumber)
    if (cleansed.length < 1)
      return setStatus('Please add at least one emergency contact (name, relationship, phone).')
    if (!cleansed[0].name || !cleansed[0].relationship || !phoneOk(cleansed[0].phoneNumber || ''))
      return setStatus('First emergency contact requires name, relationship, and a valid phone number.')
    setStatus('Saving camper…')
    await setDoc(
      doc(db, 'campers', camperId),
      {
        school,
        emergencyContacts: cleansed.slice(0, 2),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    try {
      const call = httpsCallable(functions, 'markRegistrationSectionComplete')
      await call({ year: Number(year), gender, sessionId, registrationId: regId, section: 'camper' })
  setFormCompletion((fc: Partial<{ parent: boolean; camper: boolean; health: boolean; consents: boolean }>) => ({ ...fc, camper: true }))
    } catch {/* ignore */}
    setStatus('Camper saved')
  }

  const saveHealth = async () => {
    if (!camperId) return
    if (!physicianName) return setStatus('Please enter a primary physician name.')
    if (!phoneOk(physicianPhone)) return setStatus('Please enter a valid physician phone number.')
    if (!insuranceProvider) return setStatus('Please enter an insurance provider.')
    if (!policyNumber) return setStatus('Please enter a policy number.')
    setStatus('Saving health…')
    let path = insurancePath
    if (insuranceFile) {
      const ext = (insuranceFile.name.split('.').pop() || 'bin').toLowerCase()
      const key = `medical/${uid}/${camperId}/insurance-card-${Date.now()}.${ext}`
      const sRef = storageRef(storage, key)
      await uploadBytes(sRef, insuranceFile)
      path = key
      setInsurancePath(path)
    }
    await setDoc(
      doc(db, 'campers', camperId),
      {
        medicalInfo: {
          allergies,
          dietaryRestrictions: dietary,
          medications,
          conditions,
          canSwim,
          allowSunscreen,
          physicianName,
          physicianPhone,
          insuranceProvider,
          policyNumber,
          insuranceCardPath: path,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    try {
      const call = httpsCallable(functions, 'markRegistrationSectionComplete')
      await call({ year: Number(year), gender, sessionId, registrationId: regId, section: 'health' })
  setFormCompletion((fc: Partial<{ parent: boolean; camper: boolean; health: boolean; consents: boolean }>) => ({ ...fc, health: true }))
    } catch {/* ignore */}
    setStatus('Health saved')
  }

  const saveConsents = async () => {
    if (!camperId) return
    if (!consentMedical || !consentLiability || !consentPhoto)
      return setStatus('Please acknowledge all required consents.')
    if (!signature.trim()) return setStatus('Please type your full name as a signature.')
    setStatus('Saving consents…')
    await updateDoc(doc(db, 'campers', camperId), {
      consents: {
        medicalRelease: consentMedical,
        liabilityWaiver: consentLiability,
        photoRelease: consentPhoto,
        guardianSignatureName: signature,
        guardianSignatureAt: new Date().toISOString(),
        acknowledgedBy: uid,
      },
      updatedAt: serverTimestamp(),
    })
    try {
      const call = httpsCallable(functions, 'markRegistrationSectionComplete')
      await call({ year: Number(year), gender, sessionId, registrationId: regId, section: 'consents' })
  setFormCompletion((fc: Partial<{ parent: boolean; camper: boolean; health: boolean; consents: boolean }>) => ({ ...fc, consents: true }))
    } catch {/* ignore */}
    setStatus('Consents saved')
  }

  // helpers handled inline where needed

  if (loading) return <div>Loading…</div>

  return (
    <section style={{ maxWidth: 740 }}>
      <h3>Registration Forms</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, marginTop: 4 }}>
        <Badge label="Guardian" done={!!formCompletion.parent} />
        <Badge label="Camper" done={!!formCompletion.camper} />
        <Badge label="Health" done={!!formCompletion.health} />
        <Badge label="Consents" done={!!formCompletion.consents} />
      </div>
      {status && (
        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', padding: 8, margin: '8px 0' }}>
          {status}
        </div>
      )}

  <h4>Guardian Information</h4>
  <p style={{ marginTop: -6, color: '#555' }}>Section status is updated when you click Save.</p>
      <div className="field">
        <label>Full Name</label>
        <input value={gFullName} onChange={e => setGFullName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email</label>
        <input value={gEmail} onChange={e => setGEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>Primary Phone</label>
        <input value={gPhone} onChange={e => setGPhone(e.target.value)} />
      </div>
      <div className="field">
        <label>Mailing Address</label>
        <input value={gAddress} onChange={e => setGAddress(e.target.value)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={secondGEnabled} onChange={e => setSecondGEnabled(e.target.checked)} id="secondG" />
        <label htmlFor="secondG">Add a second guardian for billing/communications</label>
      </div>
      {secondGEnabled && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="field">
            <label>Second Guardian Full Name</label>
            <input value={g2FullName} onChange={e => setG2FullName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={g2Email} onChange={e => setG2Email(e.target.value)} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={g2Phone} onChange={e => setG2Phone(e.target.value)} />
          </div>
          <div className="field">
            <label>Address</label>
            <input value={g2Address} onChange={e => setG2Address(e.target.value)} />
          </div>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <button className="primary" onClick={saveGuardian}>Save Guardian</button>
      </div>

  <h4>Camper Information</h4>
      <div className="field">
        <label>School</label>
        <input value={school} onChange={e => setSchool(e.target.value)} />
      </div>
      <div>
        <strong>Emergency Contacts (up to 2)</strong>
        {contacts.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 6, marginTop: 6 }}>
            <input placeholder="Name" value={c.name} onChange={e => {
              const arr = [...contacts]; arr[i] = { ...c, name: e.target.value }; setContacts(arr)
            }} />
            <input placeholder="Relationship" value={c.relationship} onChange={e => {
              const arr = [...contacts]; arr[i] = { ...c, relationship: e.target.value }; setContacts(arr)
            }} />
            <input placeholder="Phone" value={c.phoneNumber} onChange={e => {
              const arr = [...contacts]; arr[i] = { ...c, phoneNumber: e.target.value }; setContacts(arr)
            }} />
            <input placeholder="Email (optional)" value={c.email || ''} onChange={e => {
              const arr = [...contacts]; arr[i] = { ...c, email: e.target.value }; setContacts(arr)
            }} />
            <button onClick={() => setContacts(contacts.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        {contacts.length < 2 && (
          <div style={{ marginTop: 6 }}>
            <button className="secondary" onClick={() => setContacts([...contacts, { name: '', relationship: '', phoneNumber: '' }])}>+ Add Contact</button>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 16 }}>
        <button className="primary" onClick={saveCamper}>Save Camper</button>
      </div>

  <h4>Health</h4>
  <p>Ability to swim: “My child is able to swim without assistance.”</p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <label><input type="checkbox" checked={canSwim} onChange={e => setCanSwim(e.target.checked)} /> Yes</label>
      </div>
      <p>Sunscreen: “I give permission for camp staff to apply sunscreen to my child as needed.”</p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <label><input type="checkbox" checked={allowSunscreen} onChange={e => setAllowSunscreen(e.target.checked)} /> Yes</label>
      </div>
      <DynList title="Allergies" items={allergies} setItems={setAllergies} placeholder="e.g., Peanuts" />
      <DynList title="Dietary Restrictions" items={dietary} setItems={setDietary} placeholder="e.g., Gluten-free" />
      <DynList title="Medications (name – dosage – frequency)" items={medications} setItems={setMedications} placeholder="e.g., Amoxicillin – 250mg – daily" />
      <DynList title="Medical Conditions" items={conditions} setItems={setConditions} placeholder="e.g., Asthma" />

      <div className="field">
        <label>Primary Physician</label>
        <input value={physicianName} onChange={e => setPhysicianName(e.target.value)} />
      </div>
      <div className="field">
        <label>Physician Phone</label>
        <input value={physicianPhone} onChange={e => setPhysicianPhone(e.target.value)} />
      </div>
      <div className="field">
        <label>Insurance Provider</label>
        <input value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} />
      </div>
      <div className="field">
        <label>Policy Number</label>
        <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
      </div>
      <div className="field">
        <label>Upload Health Insurance Card (image/PDF)</label>
        <input type="file" accept="image/*,application/pdf" onChange={e => setInsuranceFile(e.target.files?.[0] || null)} />
        {insurancePath && (
          <div style={{ fontSize: 12, color: '#555' }}>Uploaded: {insurancePath}</div>
        )}
      </div>
      <div style={{ marginBottom: 16 }}>
        <button className="primary" onClick={saveHealth}>Save Health</button>
      </div>

  <h4>Consents</h4>
      <div style={{ display: 'grid', gap: 8 }}>
        <label><input type="checkbox" checked={consentMedical} onChange={e => setConsentMedical(e.target.checked)} /> Medical Release</label>
        <label><input type="checkbox" checked={consentLiability} onChange={e => setConsentLiability(e.target.checked)} /> Liability Waiver</label>
        <label><input type="checkbox" checked={consentPhoto} onChange={e => setConsentPhoto(e.target.checked)} /> Photo Release</label>
        <div className="field">
          <label>Guardian Signature (type full name)</label>
          <input value={signature} onChange={e => setSignature(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <button className="primary" onClick={saveConsents}>Save Consents</button>
      </div>

  <div style={{ marginTop: 16 }}>
        <Link to={`/parent/registration/${year}/${gender}/${encodeURIComponent(sessionId!)}/${regId}`}>← Back to Registration</Link>
      </div>
    </section>
  )
}

function DynList({
  title,
  items,
  setItems,
  placeholder,
}: {
  title: string
  items: string[]
  setItems: (x: string[]) => void
  placeholder?: string
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <strong>{title}</strong>
      {items.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input style={{ flex: 1 }} value={v} placeholder={placeholder} onChange={e => {
            const copy = [...items]; copy[i] = e.target.value; setItems(copy)
          }} />
          <button onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <div style={{ marginTop: 6 }}>
        <button className="secondary" onClick={() => setItems([...(items || []), ''])}>+ Add</button>
      </div>
    </div>
  )
}

function Badge({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        border: `1px solid ${done ? '#10b981' : '#e5e7eb'}`,
        background: done ? '#ecfdf5' : '#fff',
        color: done ? '#065f46' : '#6b7280',
      }}
    >
      {done ? '✓ ' : ''}
      {label}
    </span>
  )
}
