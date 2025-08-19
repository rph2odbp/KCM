# @kateri/functions-gen2

Gen 2 Cloud Functions (Node 22) for KCM.

## Deployed functions

- helloWorld (HTTPS)
- dailyHealthCheckV2 (Scheduler)
- onCamperUpdatedV2 (Firestore, db: kcm-db)
- createUserProfileV2 (Identity blocking: before user created)
- cleanupDeletedUsersDaily (Scheduler: removes Firestore user docs for deleted Auth users)
- backupFirestoreDaily (Scheduler: Firestore export for named DB to GCS)

## Firestore export (backupFirestoreDaily)

- Exports database `kcm-db` daily to a Cloud Storage bucket.
- Bucket selection:
  - If `FIRESTORE_BACKUP_BUCKET` is set, exports to that bucket (we use `kcm-firebase-b7d6a-backups`).
  - Otherwise defaults to `${PROJECT_ID}-backups`.

### Required IAM

Grant to the function's runtime service account (we use `kcm-backup@<PROJECT_ID>.iam.gserviceaccount.com`, set via the function config):

- roles/datastore.importExportAdmin (on the project)
- roles/storage.objectAdmin (on the target bucket)

Notes:

- We use a dedicated bucket with a 60-day lifecycle on `firestore-exports/*`.
- Project env for gen2 is stored in `.env.<PROJECT_ID>` (see `.env.kcm-firebase-b7d6a`).

### How to set the bucket

- CLI (optional): set an env var at deploy time or configure via the Cloud Console > Cloud Run service > Variables.
- For GitHub Actions, configure an environment variable at the job level or use a parameterized deploy (not secret).

## Cleanup job (cleanupDeletedUsersDaily)

- Lists all Auth users and removes `users/{uid}` Firestore docs for accounts that no longer exist.
- Safe, idempotent, runs daily.

## Notes

- Firestore named database: code initializes Admin SDK with `getFirestore('kcm-db')`.
- All functions run in `us-central1`.
