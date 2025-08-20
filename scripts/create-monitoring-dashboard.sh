#!/usr/bin/env bash
# Create a Cloud Monitoring dashboard with backup and functions signals.
# Requires: gcloud CLI, authenticated with project.
set -euo pipefail
PROJECT_ID="${1:-kcm-firebase-b7d6a}"
DASHBOARD_JSON="$(dirname "$0")/../docs/ops/monitoring-dashboard.json"

if ! command -v gcloud >/dev/null; then
  echo "gcloud CLI is required" >&2
  exit 1
fi

if [ ! -f "$DASHBOARD_JSON" ]; then
  echo "Dashboard JSON not found at $DASHBOARD_JSON" >&2
  exit 2
fi

# Create or update dashboard
NAME=$(jq -r '.displayName' "$DASHBOARD_JSON")
# Find an existing dashboard with the same displayName
EXISTING=$(gcloud monitoring dashboards list --format=json --project "$PROJECT_ID" | jq -r ".[] | select(.displayName==\"$NAME\") | .name" | head -n1 || true)
if [ -n "$EXISTING" ]; then
  echo "Updating dashboard: $NAME ($EXISTING)"
  TMP_CUR=$(mktemp)
  gcloud monitoring dashboards describe "$EXISTING" --format=json --project "$PROJECT_ID" > "$TMP_CUR"
  ETAG=$(jq -r '.etag' "$TMP_CUR")
  if [ -z "${ETAG:-}" ] || [ "$ETAG" = "null" ]; then
    echo "Missing etag; deleting and recreating dashboard to apply changes..."
    gcloud monitoring dashboards delete "$EXISTING" --quiet --project "$PROJECT_ID"
    gcloud monitoring dashboards create --config-from-file="$DASHBOARD_JSON" --project "$PROJECT_ID"
  else
    TMP_UPDATE=$(mktemp)
    # Inject name and etag into the new config for update
    jq --arg name "$EXISTING" --arg etag "$ETAG" '. + {name: $name, etag: $etag}' "$DASHBOARD_JSON" > "$TMP_UPDATE"
    gcloud monitoring dashboards update "$EXISTING" --config-from-file="$TMP_UPDATE" --project "$PROJECT_ID"
    rm -f "$TMP_UPDATE"
  fi
  rm -f "$TMP_CUR"
else
  echo "Creating dashboard: $NAME"
  gcloud monitoring dashboards create --config-from-file="$DASHBOARD_JSON" --project "$PROJECT_ID"
fi
