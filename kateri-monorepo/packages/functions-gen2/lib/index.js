"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrationEnvHealthz = exports.ensureUserProfile = exports.backupFirestoreDaily = exports.cleanupDeletedUsersDaily = exports.onCamperUpdatedV2 = exports.dailyHealthCheckV2 = exports.helloWorld = exports.getSessionHoldsSummary = exports.ensureSessionCountersDaily = exports.sweepExpiredHoldsV2 = exports.releaseExpiredHolds = exports.confirmRegistration = exports.startRegistration = exports.createRegistration = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
require("./admin");
const admin_1 = require("./admin");
const firestore_2 = require("firebase-admin/firestore");
const cors_1 = __importDefault(require("cors"));
const sentry_1 = require("./sentry");
var register_1 = require("./register");
Object.defineProperty(exports, "createRegistration", { enumerable: true, get: function () { return register_1.createRegistration; } });
Object.defineProperty(exports, "startRegistration", { enumerable: true, get: function () { return register_1.startRegistration; } });
Object.defineProperty(exports, "confirmRegistration", { enumerable: true, get: function () { return register_1.confirmRegistration; } });
Object.defineProperty(exports, "releaseExpiredHolds", { enumerable: true, get: function () { return register_1.releaseExpiredHolds; } });
Object.defineProperty(exports, "sweepExpiredHoldsV2", { enumerable: true, get: function () { return register_1.sweepExpiredHoldsV2; } });
Object.defineProperty(exports, "ensureSessionCountersDaily", { enumerable: true, get: function () { return register_1.ensureSessionCountersDaily; } });
Object.defineProperty(exports, "getSessionHoldsSummary", { enumerable: true, get: function () { return register_1.getSessionHoldsSummary; } });
// Initialize Sentry lazily (env or secret)
(0, sentry_1.ensureSentryInitialized)();
// admin + db are initialized in ./admin
const corsHandler = (0, cors_1.default)({ origin: true });
// Set a default runtime service account for all functions (can be overridden per-function)
(0, v2_1.setGlobalOptions)({
    ...(process.env.FUNCTIONS_RUNTIME_SERVICE_ACCOUNT
        ? { serviceAccount: process.env.FUNCTIONS_RUNTIME_SERVICE_ACCOUNT }
        : { serviceAccount: 'github-deployer@kcm-firebase-b7d6a.iam.gserviceaccount.com' }),
});
exports.helloWorld = (0, https_1.onRequest)({ region: 'us-central1', invoker: 'private', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (request, response) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        await new Promise(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            corsHandler(request, response, () => resolve());
        });
        firebase_functions_1.logger.info('Hello world function called', { structuredData: true });
        response.json({ message: 'Hello from KCM Firebase Functions (Node 22)!' });
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'helloWorld' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        firebase_functions_1.logger.error('helloWorld failed', { message: err?.message });
        response.status(500).json({ error: 'Internal error' });
    }
});
exports.dailyHealthCheckV2 = (0, scheduler_1.onSchedule)({
    region: 'us-central1',
    schedule: '0 6 * * *',
    timeZone: 'America/New_York',
    secrets: [sentry_1.SENTRY_DSN_SECRET],
}, async (event) => {
    try {
        firebase_functions_1.logger.info('Daily health check completed', { timestamp: event.scheduleTime });
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'dailyHealthCheckV2' });
        throw err;
    }
});
const FUNCTIONS_SERVICE_ACCOUNT = process.env.FUNCTIONS_RUNTIME_SERVICE_ACCOUNT;
exports.onCamperUpdatedV2 = (0, firestore_1.onDocumentUpdated)({
    region: 'us-central1',
    document: 'campers/{camperId}',
    database: process.env.FIRESTORE_DATABASE_ID || '(default)',
    secrets: [sentry_1.SENTRY_DSN_SECRET],
    ...(FUNCTIONS_SERVICE_ACCOUNT ? { serviceAccount: FUNCTIONS_SERVICE_ACCOUNT } : {}),
}, async (event) => {
    try {
        if (!event.data)
            return;
        const before = event.data.before.data();
        const after = event.data.after.data();
        firebase_functions_1.logger.info('Camper updated', { camperId: event.params.camperId, changes: { before, after } });
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'onCamperUpdatedV2', camperId: event.params.camperId });
        throw err;
    }
});
// Auth (Gen 2) triggers
// Note: createUserProfileV2 (identity blocking) requires GCIP; omitted for Firebase Auth projects.
var auth_cleanup_1 = require("./auth.cleanup");
Object.defineProperty(exports, "cleanupDeletedUsersDaily", { enumerable: true, get: function () { return auth_cleanup_1.cleanupDeletedUsersDaily; } });
// Firestore export backup (daily)
var backup_1 = require("./backup");
Object.defineProperty(exports, "backupFirestoreDaily", { enumerable: true, get: function () { return backup_1.backupFirestoreDaily; } });
// Auth user profile bootstrap on create
// Note: Gen1-style onCreate trigger lives in @kateri/functions (Gen1 codebase)
// Callable to ensure a user's profile exists (server-side, bypasses rules)
exports.ensureUserProfile = (0, https_1.onCall)({ region: 'us-central1' }, async (req) => {
    const uid = req.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    const email = (req.data?.email || '').toLowerCase();
    const ref = admin_1.db.collection('users').doc(uid);
    await ref.set({
        email,
        displayName: '',
        roles: firestore_2.FieldValue.arrayUnion('parent', 'staff'),
        isActive: true,
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
        createdAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
});
// Health endpoint to verify registration environment wiring
exports.registrationEnvHealthz = (0, https_1.onRequest)({ region: 'us-central1', invoker: 'private', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (req, res) => {
    try {
        const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
        // List years under sessions
        const years = await admin_1.db.collection('sessions').listDocuments();
        const yearIds = years.map(d => d.id);
        const { year, gender, sessionId } = req.query;
        let exists;
        if (year && gender && sessionId) {
            const sRef = admin_1.db
                .collection('sessions')
                .doc(String(year))
                .collection(String(gender))
                .doc(String(sessionId));
            const sSnap = await sRef.get();
            exists = sSnap.exists;
        }
        res.json({ ok: true, databaseId, years: yearIds, exists });
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'registrationEnvHealthz' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.status(500).json({ ok: false, error: err?.message || 'error' });
    }
});
//# sourceMappingURL=index.js.map