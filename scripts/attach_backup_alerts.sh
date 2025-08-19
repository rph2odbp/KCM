#!/usr/bin/env bash
set -euo pipefail
EMAIL="ryanhallford.br@gmail.com"
DISPLAY="KCM Backup Alerts (email)"
DESC="Firestore backup alerts for KCM"

# Find or create email notification channel
CHANNEL_NAME=$(gcloud alpha monitoring channels list --format=json \
  | jq -r --arg email "$EMAIL" '.[] | select(.labels.email_address==$email) | .name' | head -n1 || true)
if [[ -z "${CHANNEL_NAME:-}" ]]; then
  CHANNEL_NAME=$(gcloud alpha monitoring channels create \
    --type=email \
    --display-name="$DISPLAY" \
    --description="$DESC" \
    --channel-labels=email_address="$EMAIL" \
    --format='value(name)')
  echo "created channel: $CHANNEL_NAME"
else
  echo "using existing channel: $CHANNEL_NAME"
fi

# Get policy names by display name
P1_NAME=$(gcloud alpha monitoring policies list --format=json \
  | jq -r '.[] | select(.displayName=="Backup export failed (functions-gen2)") | .name' | head -n1)
P2_NAME=$(gcloud alpha monitoring policies list --format=json \
  | jq -r '.[] | select(.displayName=="Backup export not running daily (functions-gen2)") | .name' | head -n1)

if [[ -z "${P1_NAME:-}" || -z "${P2_NAME:-}" ]]; then
  echo "Could not find one or both alert policies" >&2
  exit 1
fi

echo "Attaching channel to: $P1_NAME and $P2_NAME"
for P in "$P1_NAME" "$P2_NAME"; do
  TMP=$(mktemp)
  gcloud alpha monitoring policies describe "$P" --format=json > "$TMP"
  jq --arg nc "$CHANNEL_NAME" '(.notificationChannels //= []) | (.notificationChannels |= (if index($nc) then . else . + [$nc] end))' "$TMP" > "${TMP}.patched"
  gcloud alpha monitoring policies update --policy-from-file="${TMP}.patched" >/dev/null
  echo "updated: $P"
  rm -f "$TMP" "${TMP}.patched"
done

echo "Done. If this is a new email channel, check $EMAIL for a verification email and click the link to enable notifications."
