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
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupDeletedUsersDaily = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const admin_1 = require("./admin");
const sentry_1 = require("./sentry");
exports.cleanupDeletedUsersDaily = (0, scheduler_1.onSchedule)({
    region: 'us-central1',
    schedule: '30 3 * * *',
    timeZone: 'America/New_York',
    timeoutSeconds: 540,
    secrets: [sentry_1.SENTRY_DSN_SECRET],
}, async () => {
    firebase_functions_1.logger.info('Starting daily cleanup of deleted users');
    const auth = admin.auth();
    const uids = new Set();
    // List all auth users (paged)
    let nextPageToken;
    do {
        const res = await auth.listUsers(1000, nextPageToken);
        for (const user of res.users)
            uids.add(user.uid);
        nextPageToken = res.pageToken || undefined;
    } while (nextPageToken);
    // Fetch all Firestore user docs
    const snap = await admin_1.db.collection('users').select().get();
    let deleted = 0;
    let skipped = 0;
    for (const doc of snap.docs) {
        if (!uids.has(doc.id)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = doc.data();
            if (data?.role === 'admin') {
                skipped++;
                firebase_functions_1.logger.info('Skipping deletion of admin user doc', { uid: doc.id });
                continue;
            }
            await doc.ref.delete();
            deleted++;
        }
    }
    firebase_functions_1.logger.info('User cleanup complete', { checked: snap.size, deleted, skipped });
});
//# sourceMappingURL=auth.cleanup.js.map