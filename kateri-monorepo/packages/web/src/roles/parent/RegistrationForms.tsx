import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { auth, db, storage } from '../../firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

type SecondGuardian = {
  fullName: string
  email: string
  phone: string
  address: string
}

type CamperDoc = {
  school?: string
  photoPath?: string
  emergencyContacts?: Array<{
    name: string
    relationship: string
    phoneNumber: string
    email?: string
  }>
  medicalInfo?: {
    allergies?: string[]
    dietaryRestrictions?: string[]
    medications?: unknown
    conditions?: string[]
    physicianName?: string
    physicianPhone?: string
    insuranceProvider?: string
    policyNumber?: string
    canSwim?: boolean
    allowSunscreen?: boolean
    insuranceCardPath?: string
  }
}

type MedicationEntry = {
  name: string
  dosage: string
  times: {
    breakfast: boolean
    lunch: boolean
    dinner: boolean
    beforeBed: boolean
    other: boolean
    otherText?: string
  }
}

const emptyMedication = (): MedicationEntry => ({
  name: '',
  dosage: '',
  times: {
    breakfast: false,
    lunch: false,
    dinner: false,
    beforeBed: false,
    other: false,
    otherText: '',
  },
})

export default function RegistrationForms() {
  const { year, gender, sessionId, regId } = useParams()
  const user = auth.currentUser
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [camperId, setCamperId] = useState<string>('')

  // Guardian
  const [secondGuardian, setSecondGuardian] = useState<SecondGuardian>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  })

  // Camper
  const [school, setSchool] = useState('')
  const [contacts, setContacts] = useState<
    Array<{ name: string; relationship: string; phoneNumber: string; email?: string }>
  >([{ name: '', relationship: '', phoneNumber: '', email: '' }])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPath, setPhotoPath] = useState('')

  // Health
  const [allergies, setAllergies] = useState<string[]>([])
  const [dietary, setDietary] = useState<string[]>([])
  const [medications, setMedications] = useState<MedicationEntry[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [physicianName, setPhysicianName] = useState('')
  const [physicianPhone, setPhysicianPhone] = useState('')
  const [insuranceProvider, setInsuranceProvider] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [canSwim, setCanSwim] = useState(false)
  const [allowSunscreen, setAllowSunscreen] = useState(true)
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null)
  const [insuranceCardPath, setInsuranceCardPath] = useState('')

  const regPath = useMemo(
    () => `sessions/${String(year)}/${String(gender)}/${String(sessionId)}/registrations/${regId}`,
    [year, gender, sessionId, regId],
  )

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setStatus('Sign in required')
        return
      }
      try {
        // 1) Load registration to get camperId
        const rRef = doc(db, regPath)
        const rSnap = await getDoc(rRef)
        if (!rSnap.exists()) throw new Error('Registration not found')
        const r = rSnap.data() as { camperId?: string; parentId?: string }
        if (r.parentId !== user.uid) throw new Error('Not your registration')
        if (!r.camperId) throw new Error('Missing camper')
        setCamperId(r.camperId)

        // 2) Load user (for second guardian)
        const uRef = doc(db, 'users', user.uid)
        const uSnap = await getDoc(uRef)
        type UserDoc = { secondGuardian?: Partial<SecondGuardian> }
        const ug = (uSnap.exists() ? (uSnap.data() as UserDoc).secondGuardian : undefined) as
          | SecondGuardian
          | undefined
        if (ug) {
          const { fullName = '', email = '', phone = '', address = '' } = ug
          setSecondGuardian({ fullName, email, phone, address })
        }

        // 3) Load camper
        const cRef = doc(db, 'campers', r.camperId)
        const cSnap = await getDoc(cRef)
        if (cSnap.exists()) {
          const c = cSnap.data() as Partial<CamperDoc>
          setSchool(c.school || '')
          setPhotoPath(c.photoPath || '')
          const ec = Array.isArray(c.emergencyContacts) ? c.emergencyContacts : []
          setContacts(
            ec.length
              ? ec.slice(0, 2)
              : [{ name: '', relationship: '', phoneNumber: '', email: '' }],
          )
          const m = c.medicalInfo || {}
          setAllergies(Array.isArray(m.allergies) ? m.allergies : [])
          setDietary(Array.isArray(m.dietaryRestrictions) ? m.dietaryRestrictions : [])
          const medsRaw = (m as any).medications
          let meds: MedicationEntry[] = []
          if (Array.isArray(medsRaw)) {
            if (medsRaw.length && typeof medsRaw[0] === 'string') {
              meds = (medsRaw as string[]).map(s => ({
                name: s,
                dosage: '',
                times: {
                  breakfast: false,
                  lunch: false,
                  dinner: false,
                  beforeBed: false,
                  other: false,
                  otherText: '',
                },
              }))
            } else {
              meds = (medsRaw as any[]).map(it => ({
                name: String(it?.name ?? ''),
                dosage: String(it?.dosage ?? ''),
                times: {
                  breakfast: Boolean(it?.times?.breakfast),
                  lunch: Boolean(it?.times?.lunch),
                  dinner: Boolean(it?.times?.dinner),
                  beforeBed: Boolean(it?.times?.beforeBed),
                  other: Boolean(it?.times?.other),
                  otherText: typeof it?.times?.otherText === 'string' ? it.times.otherText : '',
                },
              }))
            }
          }
          setMedications(meds)
          setConditions(Array.isArray(m.conditions) ? m.conditions : [])
          setPhysicianName(m.physicianName || '')
          setPhysicianPhone(m.physicianPhone || '')
          setInsuranceProvider(m.insuranceProvider || '')
          setPolicyNumber(m.policyNumber || '')
          setCanSwim(Boolean(m.canSwim))
          setAllowSunscreen(m.allowSunscreen !== false)
          setInsuranceCardPath(m.insuranceCardPath || '')
        }
      } catch (e) {
        setStatus((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [user, regPath])

  const saveGuardian = async () => {
    if (!user) return
    setStatus('Saving guardian…')
    await setDoc(doc(db, 'users', user.uid), { secondGuardian }, { merge: true })
    setStatus('Guardian saved')
  }

  const saveCamper = async () => {
    if (!user || !camperId) return
    setStatus('Saving camper…')
    const ec = contacts.filter(c => c.name && c.relationship && c.phoneNumber).slice(0, 2)
    let uploadedPhotoPath = photoPath
    if (photoFile && user) {
      const fname = `camper-photo-${Date.now()}-${photoFile.name}`
      const path = `photos/${user.uid}/${camperId}/${fname}`
      const r = ref(storage, path)
      await uploadBytes(r, photoFile)
      uploadedPhotoPath = path
    }
    await updateDoc(doc(db, 'campers', camperId), {
      school: school || '',
      emergencyContacts: ec,
      photoPath: uploadedPhotoPath || '',
    })
    setPhotoFile(null)
    setPhotoPath(uploadedPhotoPath)
    setStatus('Camper saved')
  }

  const saveHealth = async () => {
    if (!user || !camperId) return
    setStatus('Saving health…')
    let uploadedPath = insuranceCardPath
    if (insuranceFile) {
      const fname = `insurance-card-${Date.now()}-${insuranceFile.name}`
      const path = `medical/${user!.uid}/${camperId}/${fname}`
      const r = ref(storage, path)
      await uploadBytes(r, insuranceFile)
      const url = await getDownloadURL(r)
      // We store the storage path; URL is available if needed for preview
      uploadedPath = path
      console.info('Uploaded insurance card', { path, url })
    }
    await updateDoc(doc(db, 'campers', camperId), {
      medicalInfo: {
        allergies,
        dietaryRestrictions: dietary,
        medications,
        conditions,
        physicianName,
        physicianPhone,
        insuranceProvider,
        policyNumber,
        canSwim,
        allowSunscreen,
        insuranceCardPath: uploadedPath || '',
      },
    })
    setInsuranceFile(null)
    setInsuranceCardPath(uploadedPath)
    setStatus('Health saved')
  }

  // helpers removed (unused)

  if (loading) return <div>Loading…</div>

  return (
    <section style={{ maxWidth: 760 }}>
      <h3>Registration Forms</h3>
      {status && (
        <div style={{ margin: '8px 0', padding: 8, border: '1px solid #ddd' }}>{status}</div>
      )}

      <details open>
        <summary style={{ fontWeight: 700 }}>1) Guardian Information</summary>
        <div style={{ paddingLeft: 12 }}>
          <p>Optional second guardian for billing and communication.</p>
          <label>
            Full Name
            <input
              value={secondGuardian.fullName}
              onChange={e => setSecondGuardian({ ...secondGuardian, fullName: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={secondGuardian.email}
              onChange={e => setSecondGuardian({ ...secondGuardian, email: e.target.value })}
            />
          </label>
          <label>
            Phone
            <input
              value={secondGuardian.phone}
              onChange={e => setSecondGuardian({ ...secondGuardian, phone: e.target.value })}
            />
          </label>
          <label>
            Address
            <input
              value={secondGuardian.address}
              onChange={e => setSecondGuardian({ ...secondGuardian, address: e.target.value })}
            />
          </label>
          <div style={{ marginTop: 8 }}>
            <button onClick={saveGuardian}>Save Guardian</button>
          </div>
        </div>
      </details>

      <details>
        <summary style={{ fontWeight: 700 }}>2) Camper Information</summary>
        <div style={{ paddingLeft: 12 }}>
          <label>
            School
            <input value={school} onChange={e => setSchool(e.target.value)} />
          </label>
          <div style={{ marginTop: 8 }}>
            <label>
              Upload Camper Photo (image)
              <input
                type="file"
                accept="image/*"
                onChange={e => setPhotoFile(e.target.files?.[0] || null)}
              />
            </label>
            {photoPath && <div style={{ fontSize: 12, color: '#555' }}>Saved: {photoPath}</div>}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Emergency Contacts (up to 2)</strong>
            {contacts.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <input
                  placeholder="Name"
                  value={c.name}
                  onChange={e => {
                    const next = contacts.slice()
                    next[i] = { ...c, name: e.target.value }
                    setContacts(next)
                  }}
                />
                <input
                  placeholder="Relationship"
                  value={c.relationship}
                  onChange={e => {
                    const next = contacts.slice()
                    next[i] = { ...c, relationship: e.target.value }
                    setContacts(next)
                  }}
                />
                <input
                  placeholder="Phone"
                  value={c.phoneNumber}
                  onChange={e => {
                    const next = contacts.slice()
                    next[i] = { ...c, phoneNumber: e.target.value }
                    setContacts(next)
                  }}
                />
                <input
                  placeholder="Email (optional)"
                  value={c.email || ''}
                  onChange={e => {
                    const next = contacts.slice()
                    next[i] = { ...c, email: e.target.value }
                    setContacts(next)
                  }}
                />
                <button
                  onClick={() => {
                    const next = contacts.slice()
                    next.splice(i, 1)
                    setContacts(
                      next.length
                        ? next
                        : [{ name: '', relationship: '', phoneNumber: '', email: '' }],
                    )
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            {contacts.length < 2 && (
              <div style={{ marginTop: 6 }}>
                <button
                  onClick={() =>
                    setContacts([
                      ...contacts,
                      { name: '', relationship: '', phoneNumber: '', email: '' },
                    ])
                  }
                >
                  Add Contact
                </button>
              </div>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={saveCamper}>Save Camper</button>
          </div>
        </div>
      </details>

      <details>
        <summary style={{ fontWeight: 700 }}>3) Health</summary>
        <div style={{ paddingLeft: 12 }}>
          <BoolRow
            label="My child is able to swim without assistance."
            value={canSwim}
            onChange={setCanSwim}
          />
          <BoolRow
            label="I give permission for camp staff to apply sunscreen to my child as needed."
            value={allowSunscreen}
            onChange={setAllowSunscreen}
          />

          <MultiList title="Allergies" items={allergies} setItems={setAllergies} />
          <MultiList title="Dietary Restrictions" items={dietary} setItems={setDietary} />
          <MedicationList meds={medications} setMeds={setMedications} />
          <MultiList title="Medical Conditions" items={conditions} setItems={setConditions} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>
              Primary Physician
              <input value={physicianName} onChange={e => setPhysicianName(e.target.value)} />
            </label>
            <label>
              Physician Phone
              <input value={physicianPhone} onChange={e => setPhysicianPhone(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>
              Insurance Provider
              <input
                value={insuranceProvider}
                onChange={e => setInsuranceProvider(e.target.value)}
              />
            </label>
            <label>
              Policy Number
              <input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              Upload Health Insurance Card (image/PDF)
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setInsuranceFile(e.target.files?.[0] || null)}
              />
            </label>
            {insuranceCardPath && (
              <div style={{ fontSize: 12, color: '#555' }}>Saved: {insuranceCardPath}</div>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={saveHealth}>Save Health</button>
          </div>
        </div>
      </details>

      <div style={{ marginTop: 16 }}>
        <Link
          to={`/parent/registration/${year}/${gender}/${encodeURIComponent(String(sessionId))}/${regId}`}
        >
          ← Back to Registration Details
        </Link>
      </div>
    </section>
  )
}

function BoolRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} /> {label}
    </label>
  )
}

function MultiList({
  title,
  items,
  setItems,
  placeholder,
}: {
  title: string
  items: string[]
  setItems: (v: string[]) => void
  placeholder?: string
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <strong>{title}</strong>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            placeholder={placeholder || `Add ${title.toLowerCase()}…`}
            value={it}
            onChange={e => {
              const next = items.slice()
              next[i] = e.target.value
              setItems(next)
            }}
          />
          <button
            onClick={() => {
              const next = items.slice()
              next.splice(i, 1)
              setItems(next)
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <div style={{ marginTop: 6 }}>
        <button onClick={() => setItems([...items, ''])}>Add</button>
      </div>
    </div>
  )
}

function MedicationList({
  meds,
  setMeds,
}: {
  meds: MedicationEntry[]
  setMeds: (v: MedicationEntry[]) => void
}) {
  const update = (i: number, next: Partial<MedicationEntry>) => {
    const copy = meds.slice()
    copy[i] = { ...copy[i], ...next, times: { ...copy[i].times, ...(next as any).times } }
    setMeds(copy)
  }
  return (
    <div style={{ marginTop: 8 }}>
      <strong>Medications</strong>
      {meds.map((m, i) => (
        <div
          key={i}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}
        >
          <label>
            Name
            <input value={m.name} onChange={e => update(i, { name: e.target.value })} />
          </label>
          <label>
            Dosage
            <input value={m.dosage} onChange={e => update(i, { dosage: e.target.value })} />
          </label>
          <div style={{ gridColumn: '1 / span 2' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={m.times.breakfast}
                  onChange={e => update(i, { times: { breakfast: e.target.checked } as any })}
                />{' '}
                Breakfast
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={m.times.lunch}
                  onChange={e => update(i, { times: { lunch: e.target.checked } as any })}
                />{' '}
                Lunch
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={m.times.dinner}
                  onChange={e => update(i, { times: { dinner: e.target.checked } as any })}
                />{' '}
                Dinner
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={m.times.beforeBed}
                  onChange={e => update(i, { times: { beforeBed: e.target.checked } as any })}
                />{' '}
                Before Bed
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={m.times.other}
                  onChange={e => update(i, { times: { other: e.target.checked } as any })}
                />{' '}
                Other
              </label>
              {m.times.other && (
                <input
                  placeholder="Specify other time"
                  value={m.times.otherText || ''}
                  onChange={e => update(i, { times: { otherText: e.target.value } as any })}
                />
              )}
            </div>
          </div>
          <div style={{ gridColumn: '1 / span 2' }}>
            <button
              onClick={() => {
                const copy = meds.slice()
                copy.splice(i, 1)
                setMeds(copy.length ? copy : [emptyMedication()])
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 6 }}>
        <button onClick={() => setMeds([...meds, emptyMedication()])}>Add Medication</button>
      </div>
    </div>
  )
}
