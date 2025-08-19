#!/usr/bin/env bash
set -euo pipefail

# Configure a lifecycle policy on a GCS bucket to delete old Firestore export objects.
# Usage:
#   ./scripts/set-bucket-lifecycle.sh <BUCKET_NAME> <DAYS>
# Example:
#   ./scripts/set-bucket-lifecycle.sh kcm-firebase-b7d6a.appspot.com 60

if [[ ${1:-} == "" || ${2:-} == "" ]]; then
  echo "Usage: $0 <BUCKET_NAME> <DAYS>" >&2
  exit 1
fi

BUCKET_NAME="$1"
DAYS="$2"

TMP_JSON="$(mktemp)"
cat >"${TMP_JSON}" <<JSON
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": {
        "age": ${DAYS},
        "matchesPrefix": ["firestore-exports/"]
      }
    }
  ]
}
JSON

gcloud storage buckets update "gs://${BUCKET_NAME}" --lifecycle-file="${TMP_JSON}" --quiet

echo "Lifecycle set: delete gs://${BUCKET_NAME}/firestore-exports/* objects older than ${DAYS} days."
