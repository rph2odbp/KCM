import { z } from 'zod'

// ============================================================================
// Base Types
// ============================================================================

export const TimestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const UserIdSchema = z.string().uuid()
export const CamperIdSchema = z.string().uuid()

// ============================================================================
// User Management
// ============================================================================

// Roles for authentication/authorization
export const UserRoleSchema = z.enum(['parent', 'staff', 'admin', 'medic'])

export const UserProfileSchema = z
  .object({
    id: UserIdSchema,
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: UserRoleSchema, // legacy single-role; app uses roles array in Firestore
    phoneNumber: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .merge(TimestampSchema)

// ============================================================================
// Camper Management
// ============================================================================

export const CamperSchema = z
  .object({
    id: CamperIdSchema,
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.date(),
    parentId: UserIdSchema,
    gender: z.enum(['male', 'female']),
    gradeCompleted: z.number().int().min(2).max(8), // must be 2–8 before camp
    // School info (requested)
    school: z.string().optional(),
    // Optional camper profile photo (Firebase Storage path)
    photoPath: z.string().optional(),
    emergencyContacts: z.array(
      z.object({
        name: z.string().min(1),
        relationship: z.string().min(1),
        phoneNumber: z.string().min(1),
        email: z.string().email().optional(),
      }),
    ),
    registrationStatus: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
    medicalInfo: z.object({
      allergies: z.array(z.string()).default([]),
      dietaryRestrictions: z.array(z.string()).default([]),
      medications: z
        .array(
          z.object({
            name: z.string().min(1).default(''),
            dosage: z.string().default(''),
            times: z.object({
              breakfast: z.boolean().default(false),
              lunch: z.boolean().default(false),
              dinner: z.boolean().default(false),
              beforeBed: z.boolean().default(false),
              other: z.boolean().default(false),
              otherText: z.string().optional(),
            }),
          }),
        )
        .default([]),
      conditions: z.array(z.string()).default([]),
      canSwim: z.boolean().default(false),
      allowSunscreen: z.boolean().default(true),
      physicianName: z.string().optional(),
      physicianPhone: z.string().optional(),
      insuranceProvider: z.string().optional(),
      policyNumber: z.string().optional(),
      insuranceCardPath: z.string().optional(), // Firebase Storage path to uploaded card image/PDF
      additionalNotes: z.string().optional(),
    }),
  })
  .merge(TimestampSchema)

// ============================================================================
// Sessions and Registrations (year → session → registrations)
// ============================================================================

export const SessionGenderSchema = z.enum(['boys', 'girls'])

export const SessionSchema = z
  .object({
    id: z.string(),
    year: z.number().int().min(2000),
    name: z.string().min(1),
    gender: SessionGenderSchema,
    startDate: z.date(),
    endDate: z.date(),
    capacity: z.number().int().min(1),
    price: z.number().nonnegative(),
    waitlistOpen: z.boolean().default(true),
  })
  .merge(TimestampSchema)

export const RegistrationStatusSchema = z.enum([
  'incomplete',
  'pendingPayment',
  'confirmed',
  'waitlisted',
  'cancelled',
])

export const RegistrationSchema = z
  .object({
    id: z.string(),
    year: z.number().int().min(2000),
    sessionId: z.string(),
    parentId: UserIdSchema,
    camperId: CamperIdSchema,
    status: RegistrationStatusSchema,
    formCompletion: z.object({
      parent: z.boolean().default(false),
      camper: z.boolean().default(false),
      health: z.boolean().default(false),
      consents: z.boolean().default(false),
      payment: z.boolean().default(false),
    }),
    addOns: z.object({ messagePackets: z.number().int().min(0).default(0) }).default({
      messagePackets: 0,
    }),
    cabinId: z.string().optional(),
    depositPaid: z.boolean().default(false),
    totalDue: z.number().nonnegative().default(0),
  })
  .merge(TimestampSchema)

// ============================================================================
// Medical Records (MAR)
// ============================================================================

export const MedicationLogSchema = z
  .object({
    id: z.string().uuid(),
    camperId: CamperIdSchema,
    medicationName: z.string().min(1),
    dosage: z.string().min(1),
    administeredBy: UserIdSchema,
    administeredAt: z.date(),
    notes: z.string().optional(),
    side_effects: z.string().optional(),
  })
  .merge(TimestampSchema)

export const MedicalRecordSchema = z
  .object({
    id: z.string().uuid(),
    camperId: CamperIdSchema,
    recordType: z.enum(['incident', 'medication', 'illness', 'injury', 'allergy_reaction']),
    description: z.string().min(1),
    treatment: z.string().optional(),
    recordedBy: UserIdSchema,
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    resolved: z.boolean().default(false),
  })
  .merge(TimestampSchema)

// ============================================================================
// Payment Processing
// ============================================================================

export const PaymentStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
])

export const PaymentSchema = z
  .object({
    id: z.string().uuid(),
    guardianId: UserIdSchema, // legacy name; equals parentId
    camperId: CamperIdSchema,
    amount: z.number().positive(),
    currency: z.string().default('USD'),
    status: PaymentStatusSchema,
    paymentMethod: z.string().optional(),
    adyenReference: z.string().optional(),
    description: z.string().optional(),
  })
  .merge(TimestampSchema)

// ============================================================================
// Photo Gallery
// ============================================================================

export const PhotoSchema = z
  .object({
    id: z.string().uuid(),
    url: z.string().url(),
    thumbnail: z.string().url().optional(),
    uploadedBy: UserIdSchema,
    tags: z.array(z.string()).default([]),
    permissions: z.object({
      public: z.boolean().default(false),
      allowedGuardians: z.array(UserIdSchema).default([]),
      allowedCampers: z.array(CamperIdSchema).default([]),
    }),
    metadata: z.object({
      filename: z.string(),
      size: z.number(),
      mimeType: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  })
  .merge(TimestampSchema)

// ============================================================================
// Type Exports
// ============================================================================

export type UserRole = z.infer<typeof UserRoleSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
export type Camper = z.infer<typeof CamperSchema>
export type Session = z.infer<typeof SessionSchema>
export type Registration = z.infer<typeof RegistrationSchema>
export type MedicationLog = z.infer<typeof MedicationLogSchema>
export type MedicalRecord = z.infer<typeof MedicalRecordSchema>
export type Payment = z.infer<typeof PaymentSchema>
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>
export type Photo = z.infer<typeof PhotoSchema>

// ============================================================================
// Utility Functions
// ============================================================================

export const createTimestamp = () => ({
  createdAt: new Date(),
  updatedAt: new Date(),
})

export const updateTimestamp = (existing: { createdAt: Date }) => ({
  ...existing,
  updatedAt: new Date(),
})

// ============================================================================
// Validation Helpers
// ============================================================================

export const validateCamper = (data: unknown) => CamperSchema.parse(data)
export const validateUserProfile = (data: unknown) => UserProfileSchema.parse(data)
export const validatePayment = (data: unknown) => PaymentSchema.parse(data)
export const validateMedicalRecord = (data: unknown) => MedicalRecordSchema.parse(data)
export const validatePhoto = (data: unknown) => PhotoSchema.parse(data)

// ============================================================================
// API Response Types
// ============================================================================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  })

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}
