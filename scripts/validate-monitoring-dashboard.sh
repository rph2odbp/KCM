#!/usr/bin/env bash
# Simple validation helper for the monitoring dashboard script.
# Verifies required tools and prints the create command.
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found. Please install Google Cloud SDK and authenticate."
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found. Install jq (apt: jq) to continue."
  exit 2
fi

PROJECT_ID=${1:-}
if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <PROJECT_ID>"
  exit 1
fi

DASHBOARD_JSON="$(dirname "$0")/../docs/ops/monitoring-dashboard.json"
if [ ! -f "$DASHBOARD_JSON" ]; then
  echo "Dashboard JSON missing: $DASHBOARD_JSON"
  exit 1
fi

echo "Validated tools and dashboard JSON. To create/update the dashboard run:"
echo "  ./scripts/create-monitoring-dashboard.sh ${PROJECT_ID}"

echo "Tip: test with a small project or `--dry-run` by inspecting the JSON file first." 
