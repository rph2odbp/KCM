#!/usr/bin/env bash
set -euo pipefail

# Grants required IAM for Cloud Functions runtimes to access Firestore and secrets.
# Usage:
#   PROJECT_ID=kcm-firebase-xxxx ./scripts/setup-functions-iam.sh
# or
#   ./scripts/setup-functions-iam.sh kcm-firebase-xxxx

PROJECT_ID=${PROJECT_ID:-${1:-}}
if [[ -z "${PROJECT_ID}" ]]; then
  echo "Usage: PROJECT_ID=<project> $0" >&2
  exit 1
fi

echo "Using project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" >/dev/null

PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
APPENGINE_SA="${PROJECT_ID}@appspot.gserviceaccount.com"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Firestore access for runtimes (Gen2 + Gen1)
echo "Granting roles/datastore.user to runtime SAs..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user" || true

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${APPENGINE_SA}" \
  --role="roles/datastore.user" || true

# Cloud Build pushes images to Artifact Registry (if needed)
echo "Ensuring Cloud Build can push to Artifact Registry..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/artifactregistry.writer" || true

# Optional: Secret Manager accessor for runtime SA (SENTRY_DSN)
if gcloud secrets describe SENTRY_DSN --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Granting Secret Manager accessor on SENTRY_DSN to runtime SA..."
  gcloud secrets add-iam-policy-binding SENTRY_DSN \
    --project "${PROJECT_ID}" \
    --member "serviceAccount:${RUNTIME_SA}" \
    --role roles/secretmanager.secretAccessor || true
else
  echo "Note: Secret SENTRY_DSN not found; skipping secret accessor grant."
fi

echo "Done."
