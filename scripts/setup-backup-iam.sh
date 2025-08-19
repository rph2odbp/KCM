#!/usr/bin/env bash
set -euo pipefail

# Setup least-privilege IAM for Firestore backups and set env vars for Functions Gen 2
# Usage:
#   ./scripts/setup-backup-iam.sh <PROJECT_ID> <BUCKET_NAME> [SERVICE_ACCOUNT_ID]
# Example:
#   ./scripts/setup-backup-iam.sh kcm-firebase-b7d6a kcm-firebase-b7d6a.appspot.com kcm-backup

if [[ ${1:-} == "" || ${2:-} == "" ]]; then
  echo "Usage: $0 <PROJECT_ID> <BUCKET_NAME> [SERVICE_ACCOUNT_ID]" >&2
  exit 1
fi

PROJECT_ID="$1"
BUCKET_NAME="$2"   # e.g., kcm-firebase-b7d6a.appspot.com
SA_ID="${3:-kcm-backup}" # short id, not email
SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Project: ${PROJECT_ID}"
echo "Bucket:  ${BUCKET_NAME}"
echo "SA:      ${SA_EMAIL}"

echo "Ensuring service account exists..."
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_ID}" \
    --project "${PROJECT_ID}" \
    --display-name "KCM Firestore Backup SA"
else
  echo "Service account already exists."
fi

echo "Granting roles/datastore.importExportAdmin on project..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/datastore.importExportAdmin" \
  --quiet >/dev/null

echo "Granting roles/storage.objectAdmin on bucket..."
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/storage.objectAdmin" \
  --quiet >/dev/null

echo "Setting functions gen2 environment variables..."
# Requires Firebase CLI authenticated. Applies to the gen2 codebase only.
firebase functions:env:set \
  FIRESTORE_BACKUP_SERVICE_ACCOUNT="${SA_EMAIL}" \
  FIRESTORE_BACKUP_BUCKET="${BUCKET_NAME}" \
  --project "${PROJECT_ID}" \
  --codebase gen2

cat <<EOF

Done.
- Runtime env set for gen2: FIRESTORE_BACKUP_SERVICE_ACCOUNT=${SA_EMAIL}, FIRESTORE_BACKUP_BUCKET=${BUCKET_NAME}
- Re-deploy gen2 to apply: firebase deploy --only functions:gen2 --project ${PROJECT_ID}

EOF
