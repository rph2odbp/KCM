import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import cors from 'cors'
// import { validateCamper, validatePayment } from '@kateri/shared'

// Initialize Firebase Admin SDK
admin.initializeApp()

// Configure CORS
const corsHandler = cors({ origin: true })

// ============================================================================
// Hello World Function (for testing)
// ============================================================================

export const helloWorld = functions.https.onRequest((request, response) => {
  corsHandler(request, response, () => {
    functions.logger.info('Hello world function called', { structuredData: true })
    response.json({
      message: 'Hello from KCM Firebase Functions!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  })
})

// ============================================================================
// User Management Functions
// ============================================================================

export const createUserProfile = functions.auth.user().onCreate(async (user) => {
  try {
    const userProfile = {
      id: user.uid,
      email: user.email,
      firstName: '',
      lastName: '',
      role: 'guardian', // Default role
      phoneNumber: user.phoneNumber || '',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    await admin.firestore().collection('users').doc(user.uid).set(userProfile)
    
    functions.logger.info(`User profile created for ${user.email}`, { uid: user.uid })
  } catch (error) {
    functions.logger.error('Error creating user profile', error)
  }
})

export const deleteUserData = functions.auth.user().onDelete(async (user) => {
  try {
    // Delete user profile
    await admin.firestore().collection('users').doc(user.uid).delete()
    
    // TODO: Implement GDPR-compliant data deletion
    // - Remove or anonymize related camper records
    // - Handle payment data according to financial regulations
    // - Clean up photo permissions and uploads
    
    functions.logger.info(`User data cleanup initiated for ${user.email}`, { uid: user.uid })
  } catch (error) {
    functions.logger.error('Error during user data cleanup', error)
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

// ============================================================================
// Scheduled Functions
// ============================================================================

export const dailyHealthCheck = functions.pubsub.schedule('0 6 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      // TODO: Implement daily health checks
      // 1. Check system status
      // 2. Validate data integrity
      // 3. Send admin notifications if needed
      
      functions.logger.info('Daily health check completed', { 
        timestamp: context.timestamp 
      })
    } catch (error) {
      functions.logger.error('Error during daily health check', error)
    }
  })

// ============================================================================
// Database Triggers
// ============================================================================

export const onCamperUpdate = functions.firestore
  .document('campers/{camperId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data()
      const after = change.after.data()
      
      // TODO: Implement camper update logic
      // 1. Log important changes
      // 2. Send notifications to guardians
      // 3. Update related records if needed
      
      functions.logger.info('Camper updated', { 
        camperId: context.params.camperId,
        changes: { before, after }
      })
    } catch (error) {
      functions.logger.error('Error handling camper update', error)
    }
  })