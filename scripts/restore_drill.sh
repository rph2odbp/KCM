#!/usr/bin/env bash
# Restore drill: import the latest Firestore export into a temporary database and report status.
set -euo pipefail
PROJECT="${PROJECT:-kcm-firebase-b7d6a}"
DB_ID="${1:-kcm-restore}"
EXPORT_BASE="gs://kcm-firebase-b7d6a-backups/firestore-exports/kcm-db"

# Find latest export prefix
LATEST=$(gsutil ls -d "${EXPORT_BASE}/*/" 2>/dev/null | sort | tail -n1 || true)
if [[ -z "${LATEST:-}" ]]; then
  echo "No exports found under ${EXPORT_BASE}" >&2
  exit 1
fi
LATEST_NO_SLASH="${LATEST%/}"
echo "Latest export: ${LATEST_NO_SLASH}"

# Ensure temp database exists
if ! gcloud firestore databases describe --database="${DB_ID}" --project "${PROJECT}" >/dev/null 2>&1; then
  echo "Creating temp database: ${DB_ID}"
  gcloud firestore databases create \
    --project "${PROJECT}" \
    --database="${DB_ID}" \
    --location=nam5 \
    --type=firestore-native \
    --delete-protection | sed -n '1,120p'
else
  echo "Temp database already exists: ${DB_ID}"
fi

# Kick off import via Firestore Admin REST API
ACCESS_TOKEN=$(gcloud auth print-access-token)
URL="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DB_ID}:importDocuments"
BODY=$(jq -n --arg p "${LATEST_NO_SLASH}" '{inputUriPrefix: $p}')
echo "Starting import to ${DB_ID} from ${LATEST_NO_SLASH}"
HTTP=$(curl -s -o /tmp/import_${DB_ID}.json -w "%{http_code}\n" -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${BODY}" \
  "${URL}")
cat /tmp/import_${DB_ID}.json | sed -n '1,120p'
echo "HTTP ${HTTP}"
OP_NAME=$(jq -r '.name // empty' /tmp/import_${DB_ID}.json)
if [[ -z "${OP_NAME:-}" ]]; then
  echo "No operation name returned; import may not have started." >&2
  exit 1
fi

# Poll the long-running operation
echo "Operation: ${OP_NAME}"
for i in $(seq 1 60); do # up to ~10 minutes
  curl -s -H "Authorization: Bearer ${ACCESS_TOKEN}" "https://firestore.googleapis.com/v1/${OP_NAME}" -o /tmp/op_${DB_ID}.json
  doneFlag=$(jq -r '.done // false' /tmp/op_${DB_ID}.json)
  state=$(jq -r '.metadata.operationState // .metadata.state // empty' /tmp/op_${DB_ID}.json)
  echo "Attempt ${i}: done=${doneFlag} state=${state}"
  if [[ "${doneFlag}" == "true" ]]; then
    echo "Final operation snapshot:"
    sed -n '1,200p' /tmp/op_${DB_ID}.json
    # Check for error
    err=$(jq -r '.error.message // empty' /tmp/op_${DB_ID}.json)
    if [[ -n "${err}" ]]; then
      echo "Import finished with error: ${err}" >&2
      exit 2
    fi
    echo "Import completed successfully."
    exit 0
  fi
  sleep 10
done

echo "Import not finished within timeout; check operation status manually: ${OP_NAME}"
exit 3
