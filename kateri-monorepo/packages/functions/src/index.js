"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCamperUpdate = exports.dailyHealthCheck = exports.deleteUserData = exports.createUserProfile = exports.helloWorld = void 0;
var functions = require("firebase-functions");
var admin = require("firebase-admin");
var cors = require("cors");
// import { validateCamper, validatePayment } from '@kateri/shared'
// Initialize Firebase Admin SDK
admin.initializeApp();
// Configure CORS
var corsHandler = cors({ origin: true });
// ============================================================================
// Hello World Function (for testing)
// ============================================================================
exports.helloWorld = functions.https.onRequest(function (request, response) {
    corsHandler(request, response, function () {
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
exports.createUserProfile = functions.auth.user().onCreate(function (user) { return __awaiter(void 0, void 0, void 0, function () {
    var userProfile, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userProfile = {
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
                return [4 /*yield*/, admin.firestore().collection('users').doc(user.uid).set(userProfile)];
            case 1:
                _a.sent();
                functions.logger.info("User profile created for ".concat(user.email), { uid: user.uid });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                functions.logger.error('Error creating user profile', error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.deleteUserData = functions.auth.user().onDelete(function (user) { return __awaiter(void 0, void 0, void 0, function () {
    var error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                // Delete user profile
                return [4 /*yield*/, admin.firestore().collection('users').doc(user.uid).delete()
                    // TODO: Implement GDPR-compliant data deletion
                    // - Remove or anonymize related camper records
                    // - Handle payment data according to financial regulations
                    // - Clean up photo permissions and uploads
                ];
            case 1:
                // Delete user profile
                _a.sent();
                // TODO: Implement GDPR-compliant data deletion
                // - Remove or anonymize related camper records
                // - Handle payment data according to financial regulations
                // - Clean up photo permissions and uploads
                functions.logger.info("User data cleanup initiated for ".concat(user.email), { uid: user.uid });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                functions.logger.error('Error during user data cleanup', error_2);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
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
    .onRun(function (context) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
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
        return [2 /*return*/];
    });
}); });
// ============================================================================
// Database Triggers
// ============================================================================
exports.onCamperUpdate = functions.firestore
    .document('campers/{camperId}')
    .onUpdate(function (change, context) { return __awaiter(void 0, void 0, void 0, function () {
    var before, after;
    return __generator(this, function (_a) {
        try {
            before = change.before.data();
            after = change.after.data();
            // TODO: Implement camper update logic
            // 1. Log important changes
            // 2. Send notifications to guardians
            // 3. Update related records if needed
            functions.logger.info('Camper updated', {
                camperId: context.params.camperId,
                changes: { before: before, after: after }
            });
        }
        catch (error) {
            functions.logger.error('Error handling camper update', error);
        }
        return [2 /*return*/];
    });
}); });
