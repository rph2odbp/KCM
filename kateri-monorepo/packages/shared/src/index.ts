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

export const UserRoleSchema = z.enum(['guardian', 'staff', 'admin', 'medic'])

export const UserProfileSchema = z
  .object({
    id: UserIdSchema,
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: UserRoleSchema,
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
    guardianId: UserIdSchema,
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
      medications: z.array(z.string()).default([]),
      conditions: z.array(z.string()).default([]),
      additionalNotes: z.string().optional(),
    }),
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
    guardianId: UserIdSchema,
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
