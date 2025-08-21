import { logger } from 'firebase-functions'
import { onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './admin'
import { SENTRY_DSN_SECRET, captureException } from './sentry'

type CreateRegistrationInput = {
  year: number
  sessionId: string
  camper: {
    id?: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: 'male' | 'female'
    gradeCompleted: number
  }
}

export const createRegistration = onCall<CreateRegistrationInput>(
  { region: 'us-central1', invoker: 'public', secrets: [SENTRY_DSN_SECRET] },
  async request => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new Error('UNAUTHENTICATED')
    }
    try {
      const { year, sessionId, camper } = (request.data || {}) as CreateRegistrationInput
      if (!year || !sessionId || !camper?.firstName || !camper?.lastName) {
        throw new Error('INVALID_ARGUMENT')
      }
      if (camper.gender !== 'male' && camper.gender !== 'female') {
        throw new Error('INVALID_GENDER')
      }
      if (camper.gradeCompleted < 2 || camper.gradeCompleted > 8) {
        throw new Error('GRADE_OUT_OF_RANGE')
      }

      const genderKey = camper.gender === 'male' ? 'boys' : 'girls'
      const sessionRef = db
        .collection('sessions')
        .doc(String(year))
        .collection(genderKey)
        .doc(sessionId)

      const sessionSnap = await sessionRef.get()
      if (!sessionSnap.exists) {
        throw new Error('SESSION_NOT_FOUND')
      }
      const sessionData = sessionSnap.data() as {
        capacity?: number
        waitlistOpen?: boolean
      }

      // Capacity and waitlist logic: count active (non-cancelled, non-waitlisted) regs
      const activeStatuses = ['pendingPayment', 'confirmed']
      const regsCol = sessionRef.collection('registrations')
      const snap = await regsCol.where('status', 'in', activeStatuses as unknown as string[]).get()
      const currentActive = snap.size
      const capacity = Number(sessionData.capacity ?? 0)
      const waitlistOpen = Boolean(sessionData.waitlistOpen ?? true)
      const isFull = capacity > 0 && currentActive >= capacity

      // Ensure camper exists or create under /campers
      let camperId = camper.id
      if (!camperId) {
        const camperRef = db.collection('campers').doc()
        camperId = camperRef.id
        await camperRef.set({
          id: camperId,
          firstName: camper.firstName,
          lastName: camper.lastName,
          dateOfBirth: new Date(camper.dateOfBirth),
          parentId: uid,
          gender: camper.gender,
          gradeCompleted: camper.gradeCompleted,
          emergencyContacts: [],
          registrationStatus: 'pending',
          medicalInfo: { allergies: [], medications: [], conditions: [] },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: uid,
        })
      }

      // Create a registration record
      const regRef = sessionRef.collection('registrations').doc()
      const initialStatus = isFull ? (waitlistOpen ? 'waitlisted' : 'cancelled') : 'incomplete'
      if (isFull && !waitlistOpen) {
        throw new Error('SESSION_FULL')
      }
      const regData = {
        id: regRef.id,
        year,
        sessionId,
        parentId: uid,
        camperId,
        status: initialStatus,
        formCompletion: {
          parent: false,
          camper: false,
          health: false,
          consents: false,
          payment: false,
        },
        addOns: { messagePackets: 0 },
        depositPaid: false,
        totalDue: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }
      await regRef.set(regData)

      logger.info('Registration created', { uid, year, sessionId, camperId, regId: regRef.id })
      return { success: true, data: { registrationId: regRef.id, camperId } }
    } catch (err) {
      captureException(err, { function: 'createRegistration' })
      logger.error('createRegistration failed', { message: (err as Error).message })
      throw err
    }
  },
)
