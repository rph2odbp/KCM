"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupFirestoreDaily = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const google_auth_library_1 = require("google-auth-library");
const sentry_1 = require("./sentry");
function ts() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}
exports.backupFirestoreDaily = (0, scheduler_1.onSchedule)({
    region: 'us-central1',
    schedule: '0 3 * * *',
    timeZone: 'America/New_York',
    memory: '512MiB',
    timeoutSeconds: 540,
    secrets: [sentry_1.SENTRY_DSN_SECRET],
    // Optional: run as a dedicated SA for least privilege if provided via env
    serviceAccount: process.env.FIRESTORE_BACKUP_SERVICE_ACCOUNT ||
        // default to the dedicated backup SA created for this project
        `kcm-backup@${process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com`,
}, async () => {
    const operationId = ts();
    const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
        firebase_functions_1.logger.error('Missing project id in environment', { operationId });
        return;
    }
    // Target the Firestore database: default unless explicitly configured
    const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    const databaseName = `projects/${projectId}/databases/${databaseId}`;
    // Choose bucket: prefer explicit env var; otherwise use a dedicated "-backups" bucket
    // (avoids appspot.com domain ownership constraints)
    const bucket = process.env.FIRESTORE_BACKUP_BUCKET || `${projectId}-backups`;
    const prefix = `gs://${bucket}/firestore-exports/${databaseId}/${operationId}`;
    try {
        const auth = new google_auth_library_1.GoogleAuth({
            scopes: [
                'https://www.googleapis.com/auth/datastore',
                'https://www.googleapis.com/auth/cloud-platform',
            ],
        });
        firebase_functions_1.logger.info('Starting Firestore export', {
            operationId,
            databaseName,
            outputUriPrefix: prefix,
        });
        const res = await auth.request({
            url: `https://firestore.googleapis.com/v1/${databaseName}:exportDocuments`,
            method: 'POST',
            data: {
                outputUriPrefix: prefix,
                // collectionIds: ['users', 'campers'], // Optional: restrict to specific collections
            },
        });
        firebase_functions_1.logger.info('Export triggered', { operationId, operation: res.data?.name });
    }
    catch (err) {
        const e = err;
        firebase_functions_1.logger.error('Export failed', { operationId, message: e?.message, stack: e?.stack });
        throw err;
    }
});
//# sourceMappingURL=backup.js.map