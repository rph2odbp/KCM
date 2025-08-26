#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=${PROJECT_ID:-}
SA=${GCP_SERVICE_ACCOUNT_EMAIL:-}
if [[ -z "${PROJECT_ID}" || -z "${SA}" ]]; then
  echo "Usage: PROJECT_ID=... GCP_SERVICE_ACCOUNT_EMAIL=... $0" >&2
  exit 1
fi

roles=(
  roles/firebasehosting.admin
  roles/viewer
)

for role in "${roles[@]}"; do
  echo "Granting $role to $SA on $PROJECT_ID"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:${SA}" \
    --role "$role" \
    --quiet >/dev/null
done

echo "Done."
