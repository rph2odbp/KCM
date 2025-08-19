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
exports.backupFirestoreDaily = exports.cleanupDeletedUsersDaily = exports.onCamperUpdatedV2 = exports.dailyHealthCheckV2 = exports.helloWorld = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const firestore_2 = require("firebase-admin/firestore");
const cors_1 = __importDefault(require("cors"));
const sentry_1 = require("./sentry");
// Initialize Sentry lazily (env or secret)
(0, sentry_1.ensureSentryInitialized)();
admin.initializeApp();
(0, firestore_2.getFirestore)('kcm-db');
const corsHandler = (0, cors_1.default)({ origin: true });
exports.helloWorld = (0, https_1.onRequest)({ region: 'us-central1', invoker: 'private', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (request, response) => {
    try {
        await new Promise((resolve, reject) => corsHandler(request, response, () => resolve()));
        firebase_functions_1.logger.info('Hello world function called', { structuredData: true });
        response.json({ message: 'Hello from KCM Firebase Functions (Node 22)!' });
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'helloWorld' });
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
//# sourceMappingURL=index.js.map