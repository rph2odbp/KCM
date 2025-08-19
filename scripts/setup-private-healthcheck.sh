#!/usr/bin/env bash
# Grants Cloud Run invocation to a service account and creates/updates a Cloud Scheduler job
# that calls the private helloWorld function with OIDC.
# Usage: ./setup-private-healthcheck.sh <PROJECT_ID> [REGION] [SERVICE_ACCOUNT]
# Defaults: REGION=us-central1, SERVICE_ACCOUNT="<PROJECT_NUMBER>-compute@developer.gserviceaccount.com"

set -euo pipefail

PROJECT_ID="${1:-kcm-firebase-b7d6a}"
REGION="${2:-us-central1}"

if ! command -v gcloud >/dev/null; then
  echo "gcloud CLI is required" >&2
  exit 1
fi

# Get project number for default compute service account if not provided
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SERVICE_ACCOUNT="${3:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"

FUNCTION_ID="helloWorld"
RUN_SERVICE_ID="helloworld"
FUNCTION_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_ID}"
JOB_NAME="${FUNCTION_ID}-healthcheck"

echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo "SA:      $SERVICE_ACCOUNT"
echo "URL:     $FUNCTION_URL"

echo "Granting run.invoker on Cloud Run service '${RUN_SERVICE_ID}' to ${SERVICE_ACCOUNT} (if needed)"
#gcloud run services add-iam-policy-binding sometimes fails if region mismatch; ensure region is us-central1 per function

gcloud run services add-iam-policy-binding "${RUN_SERVICE_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  >/dev/null || true

echo "Creating or updating Cloud Scheduler job '${JOB_NAME}'"
set +e
gcloud scheduler jobs describe "${JOB_NAME}" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1
EXISTS=$?
set -e

if [ $EXISTS -eq 0 ]; then
  gcloud scheduler jobs update http "${JOB_NAME}" \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --schedule="*/5 * * * *" \
    --time-zone="America/New_York" \
    --http-method=GET \
    --uri="${FUNCTION_URL}" \
    --oidc-service-account-email="$SERVICE_ACCOUNT" \
    --oidc-token-audience="${FUNCTION_URL}" \
    >/dev/null
  echo "Updated scheduler job: ${JOB_NAME}"
else
  gcloud scheduler jobs create http "${JOB_NAME}" \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --schedule="*/5 * * * *" \
    --time-zone="America/New_York" \
    --http-method=GET \
    --uri="${FUNCTION_URL}" \
    --oidc-service-account-email="$SERVICE_ACCOUNT" \
    --oidc-token-audience="${FUNCTION_URL}" \
    >/dev/null
  echo "Created scheduler job: ${JOB_NAME}"
fi

echo "Done. The job will call the private health endpoint every 5 minutes with OIDC."
