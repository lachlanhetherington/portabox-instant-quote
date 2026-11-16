#!/usr/bin/env bash
# Copy secret values from a local env file into Secret Manager, for the secrets
# that deploy/<env>.secrets lists. Values are passed on stdin and never printed.
#
# Usage:
#   scripts/push-secrets.sh staging .env.staging
#   scripts/push-secrets.sh production .env.production
#
# Creates missing secrets (stored in Sydney only, per the org's location policy) and
# adds a new version only when the value changed. Running deploy.sh afterwards picks
# up the latest versions. To change one value later (e.g. add a staff email), edit the
# env file and run this again, then redeploy.
set -euo pipefail

cd "$(dirname "$0")/.."

ENVIRONMENT="${1:-}"; ENV_FILE="${2:-}"
[[ "$ENVIRONMENT" == staging || "$ENVIRONMENT" == production ]] && [[ -f "$ENV_FILE" ]] || {
  echo "Usage: scripts/push-secrets.sh staging|production <env-file>" >&2; exit 1; }

GCP_PROJECT="${GCP_PROJECT:-gen-lang-client-0776892310}"
GCP_REGION="${GCP_REGION:-australia-southeast1}"
SECRETS_FILE="deploy/${ENVIRONMENT}.secrets"

# Read one KEY's value from the env file (same rules as dotenv: optional quotes).
env_value() {
  python3 - "$ENV_FILE" "$1" <<'PY'
import sys
path, want = sys.argv[1], sys.argv[2]
val = None
for raw in open(path):
    line = raw.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    k, v = line.split('=', 1)
    if k.strip() != want:
        continue
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in '"\'':
        v = v[1:-1]
    val = v
sys.stdout.write(val or '')
PY
}

missing=0
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
  key="$(echo "${line%%=*}" | tr -d '[:space:]')"
  name="$(echo "${line#*=}" | tr -d '[:space:]')"
  value="$(env_value "$key")"
  if [[ -z "$value" ]]; then
    echo "! $key: not set in $ENV_FILE (secret $name not changed)"
    missing=1
    continue
  fi
  if ! gcloud secrets describe "$name" --project "$GCP_PROJECT" >/dev/null 2>&1; then
    gcloud secrets create "$name" --project "$GCP_PROJECT" \
      --replication-policy user-managed --locations "$GCP_REGION" \
      --labels "env=${ENVIRONMENT}" --quiet >/dev/null
    printf '%s' "$value" | gcloud secrets versions add "$name" --project "$GCP_PROJECT" --data-file=- --quiet >/dev/null
    echo "+ $key -> $name (created)"
    continue
  fi
  current="$(gcloud secrets versions access latest --secret "$name" --project "$GCP_PROJECT" 2>/dev/null || true)"
  if [[ "$current" == "$value" ]]; then
    echo "= $key -> $name (unchanged)"
  else
    printf '%s' "$value" | gcloud secrets versions add "$name" --project "$GCP_PROJECT" --data-file=- --quiet >/dev/null
    echo "~ $key -> $name (new version)"
  fi
done < "$SECRETS_FILE"

echo
[[ "$missing" == 0 ]] && echo "Done. Redeploy to use the new values: scripts/deploy.sh $ENVIRONMENT" \
  || echo "Some secrets were skipped. A deploy fails until every secret in $SECRETS_FILE exists."
