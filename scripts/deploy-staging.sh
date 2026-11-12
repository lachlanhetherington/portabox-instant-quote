#!/usr/bin/env bash
# Deploy the current folder to the Cloud Run staging service.
#
# Usage:
#   scripts/deploy-staging.sh            # deploy using .env.staging
#
# Config (override with env vars):
#   GCP_PROJECT   Google Cloud project   (default: the app's Firebase project)
#   GCP_REGION    Cloud Run region       (default: australia-southeast1, Sydney)
#   SERVICE       Cloud Run service name (default: portabox-staging)
#
# Runtime settings come from .env.staging (gitignored, same format as .env).
# They are set as Cloud Run env vars; nothing secret is baked into the image.
set -euo pipefail

cd "$(dirname "$0")/.."

GCP_PROJECT="${GCP_PROJECT:-gen-lang-client-0776892310}"
GCP_REGION="${GCP_REGION:-australia-southeast1}"
SERVICE="${SERVICE:-portabox-staging}"
ENV_FILE=".env.staging"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.example to $ENV_FILE and fill in the staging values." >&2
  exit 1
fi

# Convert KEY=VALUE lines into the YAML file Cloud Run expects.
ENV_YAML="$(mktemp -t portabox-staging-env).yaml"
trap 'rm -f "$ENV_YAML"' EXIT
python3 - "$ENV_FILE" "$ENV_YAML" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
out = []
for raw in open(src):
    line = raw.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    key, value = key.strip(), value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in '"\'':
        value = value[1:-1]
    if key in ('PORT', 'NODE_ENV'):  # managed by Cloud Run / the image
        continue
    out.append(f"{key}: {json.dumps(value)}")
open(dst, 'w').write("\n".join(out) + "\n")
PY

echo "Deploying $SERVICE to $GCP_PROJECT ($GCP_REGION)..."
gcloud run deploy "$SERVICE" \
  --project "$GCP_PROJECT" \
  --region "$GCP_REGION" \
  --source . \
  --allow-unauthenticated \
  --env-vars-file "$ENV_YAML" \
  --memory 1Gi \
  --min-instances 0 \
  --max-instances 1 \
  --quiet

# Prefer the stable, readable URL (https://SERVICE-PROJECTNUMBER.REGION.run.app); fall back to status.url.
URL="$(gcloud run services describe "$SERVICE" --project "$GCP_PROJECT" --region "$GCP_REGION" \
  --format "value(metadata.annotations['run.googleapis.com/urls'])" | python3 -c 'import json,sys; t=sys.stdin.read().strip(); print(json.loads(t)[0] if t else "")')"
if [[ -z "$URL" ]]; then
  URL="$(gcloud run services describe "$SERVICE" --project "$GCP_PROJECT" --region "$GCP_REGION" --format 'value(status.url)')"
fi

# APP_URL must match the public URL for Twilio signature checks.
CURRENT_APP_URL="$(grep -E '^APP_URL=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"' || true)"
if [[ "$CURRENT_APP_URL" != "$URL" ]]; then
  echo "Setting APP_URL=$URL on the service (also update it in $ENV_FILE)."
  gcloud run services update "$SERVICE" --project "$GCP_PROJECT" --region "$GCP_REGION" \
    --update-env-vars "APP_URL=$URL" --quiet >/dev/null
fi

echo
echo "Staging is live: $URL"
echo "Remember to add $(echo "$URL" | sed 's#https://##') to Firebase Authorized domains"
echo "and $URL/* to the Google Maps key's website restrictions."
