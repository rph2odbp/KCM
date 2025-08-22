"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupFirestoreDaily = exports.cleanupDeletedUsersDaily = exports.onCamperUpdatedV2 = exports.dailyHealthCheckV2 = exports.helloWorld = exports.createRegistration = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
require("./admin");
const cors_1 = __importDefault(require("cors"));
const sentry_1 = require("./sentry");
var register_1 = require("./register");
Object.defineProperty(exports, "createRegistration", { enumerable: true, get: function () { return register_1.createRegistration; } });
// Initialize Sentry lazily (env or secret)
(0, sentry_1.ensureSentryInitialized)();
// admin + db are initialized in ./admin
const corsHandler = (0, cors_1.default)({ origin: true });
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
exports.onCamperUpdatedV2 = (0, firestore_1.onDocumentUpdated)({
    region: 'us-central1',
    document: 'campers/{camperId}',
    database: 'kcm-db',
    secrets: [sentry_1.SENTRY_DSN_SECRET],
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
//# sourceMappingURL=index.js.map