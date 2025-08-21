#!/usr/bin/env bash
set -euo pipefail

# Seed sample sessions in Firestore emulator under sessions/{year}/{boys|girls}/{sessionId}
# Usage: ./scripts/seed-sessions.sh [year]

YEAR=${1:-$(date +%Y)}
PROJECT_ID=${FIREBASE_PROJECT:-demo-project}
FIRESTORE_PORT=${FIRESTORE_EMULATOR_PORT:-8088}
DATABASE_ID=${FIRESTORE_DATABASE_ID:-kcm-db}

create_session() {
  local GENDER=$1
  local SID=$2
  local NAME=$3
  local START=$4
  local END=$5
  local CAPACITY=$6
  local PRICE=$7

  local PATH="projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/sessions/${YEAR}/${GENDER}/${SID}"
  local TMPFILE="/tmp/kcm_session_${GENDER}_${SID}.json"
  printf '%s\n' "{\n  \"fields\": {\n    \"id\": { \"stringValue\": \"${SID}\" },\n    \"year\": { \"integerValue\": \"${YEAR}\" },\n    \"name\": { \"stringValue\": \"${NAME}\" },\n    \"gender\": { \"stringValue\": \"${GENDER}\" },\n    \"startDate\": { \"stringValue\": \"${START}\" },\n    \"endDate\": { \"stringValue\": \"${END}\" },\n    \"capacity\": { \"integerValue\": \"${CAPACITY}\" },\n    \"price\": { \"doubleValue\": ${PRICE} },\n    \"waitlistOpen\": { \"booleanValue\": true }\n  }\n}" > "${TMPFILE}"

  curl -s -X PATCH "http://localhost:${FIRESTORE_PORT}/v1/${PATH}?currentDocument.exists=true" \
    -H "Content-Type: application/json" \
  -d @"${TMPFILE}" > /tmp/kcm_session_${GENDER}_${SID}_resp.json || true

  # Try create if patch failed (doc missing)
  if grep -q 'NOT_FOUND' /tmp/kcm_session_${GENDER}_${SID}_resp.json 2>/dev/null; then
    curl -s -X PATCH "http://localhost:${FIRESTORE_PORT}/v1/${PATH}" \
      -H "Content-Type: application/json" \
  -d @"${TMPFILE}" > /tmp/kcm_session_${GENDER}_${SID}_resp.json
  fi

  if grep -q 'error' /tmp/kcm_session_${GENDER}_${SID}_resp.json; then
    echo "Failed to write session ${GENDER}/${SID}. Response:" >&2
    cat /tmp/kcm_session_${GENDER}_${SID}_resp.json >&2
    exit 1
  fi
  echo "Seeded session: ${YEAR}/${GENDER}/${SID}"
}

if [ "${YEAR}" = "2026" ]; then
  # Authoritative Summer 2026 sessions (capacity 210 each)
  create_session boys boys-w1 "Boys Camp Week 1" "2026-05-31" "2026-06-06" 210 0
  create_session boys boys-w2 "Boys Camp Week 2" "2026-06-07" "2026-06-13" 210 0
  create_session boys boys-w3 "Boys Camp Week 3" "2026-06-14" "2026-06-20" 210 0
  create_session boys boys-w4 "Boys Camp Week 4" "2026-06-21" "2026-06-27" 210 0
  create_session girls girls-w1 "Girls Camp Week 1" "2026-06-28" "2026-07-04" 210 0
  create_session girls girls-w2 "Girls Camp Week 2" "2026-07-05" "2026-07-11" 210 0
  create_session girls girls-w3 "Girls Camp Week 3" "2026-07-12" "2026-07-18" 210 0
  create_session girls girls-w4 "Girls Camp Week 4" "2026-07-19" "2026-07-25" 210 0
else
  # Defaults: create one boys and one girls session around July
  create_session boys session-1 "Boys Week 1" "${YEAR}-07-07" "${YEAR}-07-13" 120 450.00
  create_session girls session-1 "Girls Week 1" "${YEAR}-07-14" "${YEAR}-07-20" 120 450.00
fi

echo "Sessions seeding complete."
