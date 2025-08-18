import { logger } from 'firebase-functions'
import * as functionsV1 from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
// import { validateCamper, validatePayment } from '@kateri/shared'

// Initialize Firebase Admin SDK
admin.initializeApp()
const db = getFirestore('kcm-db')

// Gen 1 auth triggers only in this codebase

// ============================================================================
// User Management Functions
// ============================================================================

export const createUserProfile = functionsV1.auth
  .user()
  .onCreate(async (user: admin.auth.UserRecord) => {
    try {
      const userProfile = {
        id: user.uid,
        email: user.email,
        firstName: '',
        lastName: '',
        role: 'guardian', // Default role
        phoneNumber: user.phoneNumber || '',
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }

      await db.collection('users').doc(user.uid).set(userProfile)

      logger.info(`User profile created for ${user.email}`, { uid: user.uid })
    } catch (error) {
      logger.error('Error creating user profile', error as any)
    }
  })

export const deleteUserData = functionsV1.auth
  .user()
  .onDelete(async (user: admin.auth.UserRecord) => {
    try {
      // Delete user profile
      await db.collection('users').doc(user.uid).delete()

      // TODO: Implement GDPR-compliant data deletion
      // - Remove or anonymize related camper records
      // - Handle payment data according to financial regulations
      // - Clean up photo permissions and uploads

      logger.info(`User data cleanup initiated for ${user.email}`, { uid: user.uid })
    } catch (error) {
      logger.error('Error during user data cleanup', error as any)
    }
  })

// ============================================================================
// Payment Processing Functions (Adyen Integration)
// ============================================================================

/*
export const createPayment = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    // TODO: Implement Adyen payment creation
    // 1. Validate payment data with shared schemas
    // 2. Create payment session with Adyen
    // 3. Store payment record in Firestore
    // 4. Return payment session data to client
    
    functions.logger.info('Payment creation requested', { 
      userId: context.auth.uid,
      amount: data.amount 
    })
    
    return { success: true, message: 'Payment creation not yet implemented' }
  } catch (error) {
    functions.logger.error('Error creating payment', error)
    throw new functions.https.HttpsError('internal', 'Payment creation failed')
  }
})

export const handlePaymentWebhook = functions.https.onRequest(async (request, response) => {
  corsHandler(request, response, async () => {
    try {
      // TODO: Implement Adyen webhook handling
      // 1. Verify webhook signature
      // 2. Process payment status updates
      // 3. Update Firestore payment records
      // 4. Send notifications to users
      
      functions.logger.info('Payment webhook received', { 
        body: request.body 
      })
      
      response.status(200).json({ received: true })
    } catch (error) {
      functions.logger.error('Error processing payment webhook', error)
      response.status(500).json({ error: 'Webhook processing failed' })
    }
  })
})
*/

// ============================================================================
// Medical Records Functions
// ============================================================================

/*
export const logMedication = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    // TODO: Implement medication logging
    // 1. Verify user has medical staff role
    // 2. Validate medication log data
    // 3. Store in Firestore with proper security
    // 4. Send notifications if needed
    
    functions.logger.info('Medication log requested', { 
      userId: context.auth.uid,
      camperId: data.camperId 
    })
    
    return { success: true, message: 'Medication logging not yet implemented' }
  } catch (error) {
    functions.logger.error('Error logging medication', error)
    throw new functions.https.HttpsError('internal', 'Medication logging failed')
  }
})
*/

// ============================================================================
// Photo Management Functions
// ============================================================================

/*
export const processPhotoUpload = functions.storage.object().onFinalize(async (object) => {
  try {
    // TODO: Implement photo processing
    // 1. Generate thumbnails
    // 2. Apply security scanning
    // 3. Update Firestore with photo metadata
    // 4. Set appropriate permissions
    
    functions.logger.info('Photo upload detected', { 
      name: object.name,
      size: object.size 
    })
  } catch (error) {
    functions.logger.error('Error processing photo upload', error)
  }
})
*/

// (Gen 2 HTTPS/Scheduled/Firestore functions moved to @kateri/functions-gen2)
