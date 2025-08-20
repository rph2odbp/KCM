#!/usr/bin/env bash
set -euo pipefail

# Seeder for Firebase emulators: creates an auth user and a /users/{uid} profile with roles
# Usage: ./scripts/seed-emulator.sh [email] [password] [roles_csv]
# Defaults: email=Ryanhallford.br@gmail.com password=password roles=parent,staff

EMAIL=${1:-Ryanhallford.br@gmail.com}
PASSWORD=${2:-password}
ROLES_CSV=${3:-parent,staff}
PROJECT_ID=${FIREBASE_PROJECT:-demo-project}
AUTH_PORT=${AUTH_EMULATOR_PORT:-9110}
FIRESTORE_PORT=${FIRESTORE_EMULATOR_PORT:-8088}

echo "Seeding emulator with user: $EMAIL (roles: $ROLES_CSV)"

# 1) Create user in Auth emulator via REST

SIGNUP_RESP=$(curl -s -X POST "http://localhost:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\", \"returnSecureToken\": true}")

# If the email already exists in the auth emulator, attempt sign-in to retrieve the uid
if echo "$SIGNUP_RESP" | grep -q 'EMAIL_EXISTS'; then
  echo "Email already exists in Auth emulator; attempting sign-in with provided password..."
  SIGNIN_RESP=$(curl -s -X POST "http://localhost:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\", \"returnSecureToken\": true}")
  SEED_UID=$(echo "$SIGNIN_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('localId',''))")
  if [ -z "$SEED_UID" ]; then
    echo "Sign-in failed for existing email. Response:"
    echo "$SIGNIN_RESP"
    exit 1
  fi
  echo "Signed in existing auth user with uid: $SEED_UID"
else
  SEED_UID=$(echo "$SIGNUP_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('localId',''))")
  if [ -z "$SEED_UID" ]; then
    echo "Failed to create user in Auth emulator. Response:"
    echo "$SIGNUP_RESP"
    exit 1
  fi
  echo "Created auth user with uid: $SEED_UID"
fi

# 2) Write user profile to Firestore emulator using REST API
USER_DOC_PATH="projects/${PROJECT_ID}/databases/(default)/documents/users/${SEED_UID}"

ROLES_JSON=$(printf '%s' "$ROLES_CSV" | awk -F, '{ for (i=1; i<=NF; i++) { gsub(/^\s+|\s+$/,"", $i); if (length($i)) { printf("{ \"stringValue\": \"%s\" }%s", $i, (i<NF?", ":"")) } } }')

cat > /tmp/kcm_user.json <<EOF
{
  "fields": {
    "email": { "stringValue": "${EMAIL}" },
    "displayName": { "stringValue": "Emulator Seed User" },
  "roles": { "arrayValue": { "values": [ ${ROLES_JSON} ] } }
  }
}
EOF

curl -s -X PATCH "http://localhost:${FIRESTORE_PORT}/v1/${USER_DOC_PATH}?documentId=${SEED_UID}" \
  -H "Content-Type: application/json" \
  -d @/tmp/kcm_user.json > /tmp/kcm_user_resp.json

if grep -q 'error' /tmp/kcm_user_resp.json; then
  echo "Failed to write user document to Firestore emulator. Response:";
  cat /tmp/kcm_user_resp.json; exit 1
fi

echo "Wrote user document to Firestore emulator for uid: $SEED_UID"
echo "Seed complete. Sign in using the emulator auth endpoint and the password provided."
