"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCamperUpdate = exports.dailyHealthCheck = exports.deleteUserData = exports.createUserProfile = exports.helloWorld = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
// import { validateCamper, validatePayment } from '@kateri/shared'
// Initialize Firebase Admin SDK
admin.initializeApp();
// Configure CORS
const corsHandler = (0, cors_1.default)({ origin: true });
// ============================================================================
// Hello World Function (for testing)
// ============================================================================
exports.helloWorld = functions.https.onRequest((request, response) => {
    corsHandler(request, response, () => {
        functions.logger.info('Hello world function called', { structuredData: true });
        response.json({
            message: 'Hello from KCM Firebase Functions!',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    });
});
// ============================================================================
// User Management Functions
// ============================================================================
exports.createUserProfile = functions.auth.user().onCreate(async (user) => {
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
        };
        await admin.firestore().collection('users').doc(user.uid).set(userProfile);
        functions.logger.info(`User profile created for ${user.email}`, { uid: user.uid });
    }
    catch (error) {
        functions.logger.error('Error creating user profile', error);
    }
});
exports.deleteUserData = functions.auth.user().onDelete(async (user) => {
    try {
        // Delete user profile
        await admin.firestore().collection('users').doc(user.uid).delete();
        // TODO: Implement GDPR-compliant data deletion
        // - Remove or anonymize related camper records
        // - Handle payment data according to financial regulations
        // - Clean up photo permissions and uploads
        functions.logger.info(`User data cleanup initiated for ${user.email}`, { uid: user.uid });
    }
    catch (error) {
        functions.logger.error('Error during user data cleanup', error);
    }
});
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
exports.dailyHealthCheck = functions.pubsub.schedule('0 6 * * *')
    .timeZone('America/New_York')
    .onRun(async (context) => {
    try {
        // TODO: Implement daily health checks
        // 1. Check system status
        // 2. Validate data integrity
        // 3. Send admin notifications if needed
        functions.logger.info('Daily health check completed', {
            timestamp: context.timestamp
        });
    }
    catch (error) {
        functions.logger.error('Error during daily health check', error);
    }
});
// ============================================================================
// Database Triggers
// ============================================================================
exports.onCamperUpdate = functions.firestore
    .document('campers/{camperId}')
    .onUpdate(async (change, context) => {
    try {
        const before = change.before.data();
        const after = change.after.data();
        // TODO: Implement camper update logic
        // 1. Log important changes
        // 2. Send notifications to guardians
        // 3. Update related records if needed
        functions.logger.info('Camper updated', {
            camperId: context.params.camperId,
            changes: { before, after }
        });
    }
    catch (error) {
        functions.logger.error('Error handling camper update', error);
    }
});
//# sourceMappingURL=index.js.map