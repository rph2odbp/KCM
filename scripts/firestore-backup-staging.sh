#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${FIREBASE_PROJECT_ID:-}" ]]; then echo "FIREBASE_PROJECT_ID required" >&2; exit 1; fi
if [[ -z "${BUCKET:-}" ]]; then echo "BUCKET (gs://) required" >&2; exit 1; fi
STAMP=$(date +%Y%m%d-%H%M%S)
echo "Exporting Firestore $FIREBASE_PROJECT_ID -> $BUCKET/$STAMP"
gcloud firestore export "$BUCKET/$STAMP" --project="$FIREBASE_PROJECT_ID"
echo Done.
