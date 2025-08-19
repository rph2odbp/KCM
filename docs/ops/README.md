# Operations Runbook

This runbook documents IAM, alerts, schedules, backups, and restore steps for KCM.

## Service Accounts and IAM

- Runtime service account for Functions (Gen 2): consider creating `kcm-functions@<PROJECT_ID>.iam.gserviceaccount.com`.
  - Grant to this SA:
    - roles/datastore.importExportAdmin (project)
    - roles/storage.objectAdmin (backup bucket)
  - Assign this SA on functions that need it (backupFirestoreDaily).
- GitHub Actions OIDC deploy SA: already configured; ensure Workload Identity binding and least privilege.

## Schedules (UTC)

- 03:00 America/New_York: backupFirestoreDaily (Firestore export of kcm-db)
- 03:30 America/New_York: cleanupDeletedUsersDaily (removes stale Firestore user docs)

## Backups

- Bucket: `gs://kcm-firebase-b7d6a-backups` (set via `FIRESTORE_BACKUP_BUCKET`).
- Lifecycle: delete `firestore-exports/*` objects after 60 days.
- Env vars for gen2 are committed in `kateri-monorepo/packages/functions-gen2/.env.kcm-firebase-b7d6a`.

### Setup helpers

- IAM for backups + env vars:
  - ./scripts/setup-backup-iam.sh <PROJECT_ID> <BUCKET_NAME> [SERVICE_ACCOUNT_ID]
  - Grants roles and sets `FIRESTORE_BACKUP_SERVICE_ACCOUNT` and `FIRESTORE_BACKUP_BUCKET` for the gen2 codebase.
  - In this project, we use SA `kcm-backup@kcm-firebase-b7d6a.iam.gserviceaccount.com` and bucket `kcm-firebase-b7d6a-backups`.
- Bucket lifecycle policy:
  - ./scripts/set-bucket-lifecycle.sh <BUCKET_NAME> <DAYS>

## Restore Procedure (Tested periodically)

1. Choose an export prefix: `gs://<bucket>/firestore-exports/kcm-db/<timestamp>`
2. Create a temporary Firestore database (e.g., `kcm-restore`) to validate import.
3. Import via gcloud:
   - gcloud firestore databases import gs://<bucket>/firestore-exports/kcm-db/<timestamp> --project <PROJECT_ID> --database=kcm-restore
4. Validate data, indexes, rules.
5. Promote if necessary or selectively copy collections.

## Alerts

- Cloud Run (functions) error rate alert: threshold over 5m.
- Log-based alerts:
  - text: "Export failed" (backup)
  - text: "User cleanup" with deleted/skipped anomalies
- Optional: 0 invocation alert for scheduled jobs.

## Monitoring Dashboard

- Template JSON: `docs/ops/monitoring-dashboard.json`
- Create/update with: `scripts/create-monitoring-dashboard.sh <PROJECT_ID>`

## helloWorld health endpoint (private)

- Function: `helloWorld` (HTTPS, us-central1) is a simple liveness/smoke check returning `{ message: "Hello from KCM Firebase Functions (Node 22)!" }`.
- Access: Private. Unauthenticated requests return 401/403 by design.
- Call with auth (from a trusted environment) by including an identity token in the `Authorization: Bearer <ID_TOKEN>` header for the Cloud Run URL shown in the function’s details.
- If you need a public uptime check later, we can switch the invoker to allow unauthenticated requests.

- Direct link (project: kcm-firebase-b7d6a): https://console.cloud.google.com/monitoring/dashboards/builder/ca85d400-f5df-4e6d-999c-8c0c8671dbc5?project=kcm-firebase-b7d6a
- Includes:
  - Cloud Run request_count for `backupfirestoredaily`
  - Functions 5xx request rate
  - Recent backup export logs

## Secrets (Functions Gen 2)

- Secret Manager is used for server-side Sentry:
  - Secret name: `SENTRY_DSN` (project: kcm-firebase-b7d6a)
  - Functions declare this secret via `defineSecret` and read it at runtime; no code changes needed on rotation.
- Rotate/update DSN:
  - Add a new version with your DSN (preferred):
    - echo -n '<YOUR_SENTRY_DSN>' | gcloud secrets versions add SENTRY_DSN --data-file=- --project kcm-firebase-b7d6a
  - To temporarily disable, add a version with value `disabled` (empty DSN disables Sentry init).
- Access:
  - Runtime SAs already have `roles/secretmanager.secretAccessor` on `SENTRY_DSN`.
  - If you introduce a custom runtime SA, grant it accessor on the secret.

## Monthly Restore Drill

- GitHub workflow issues a reminder on the 1st of each month: `.github/workflows/restore-drill-reminder.yml`
- Issue template: `.github/restore-drill-issue.md`

## SLOs

- Backup success rate: 99% weekly. RTO: ability to restore within 4 hours.
- Auth profile creation latency: < 2s p95.

---

## Phase 0 optional backlog (for later review)

- High 5xx error-rate alert per function (e.g., >2% over 5m) and attach verified email channel.
- Private health check job: Cloud Scheduler calling `helloWorld` with OIDC; ensure run.invoker on the job SA.
- Secrets parity: move `SENTRY_TRACES_SAMPLE_RATE` and `SENTRY_ENV` to params/secrets.
- CI polish: run emulator smoke on all PRs (develop/main) and unify Node to 22 in the smoke workflow.
- Dashboard extras: cold starts, instance count, memory/CPU by function.
- Tests and runbooks: add a couple of targeted unit tests and extend restore/rollback runbooks with quick scripts.
