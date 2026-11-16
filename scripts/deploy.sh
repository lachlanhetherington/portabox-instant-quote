#!/usr/bin/env bash
# Deploy this folder to Cloud Run as staging or production.
#
# Usage:
#   scripts/deploy.sh staging
#   scripts/deploy.sh production
#
# Config comes from the repo, not from local files:
#   deploy/<env>.env.yaml   non-secret settings (committed)
#   deploy/<env>.secrets    env var -> Secret Manager secret name (committed; values live in Secret Manager)
# So every deploy gets the same settings and staff list, whichever folder it runs from.
#
# Overrides: GCP_PROJECT, GCP_REGION, SERVICE_ACCOUNT.
set -euo pipefail

cd "$(dirname "$0")/.."

ENVIRONMENT="${1:-}"
case "$ENVIRONMENT" in
  staging)    SERVICE=portabox-staging; MIN_INSTANCES=0; MAX_INSTANCES=1 ;;
  production) SERVICE=portabox-prod;    MIN_INSTANCES=1; MAX_INSTANCES=3 ;;
  *) echo "Usage: scripts/deploy.sh staging|production" >&2; exit 1 ;;
esac

GCP_PROJECT="${GCP_PROJECT:-gen-lang-client-0776892310}"
GCP_REGION="${GCP_REGION:-australia-southeast1}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-portabox-run@${GCP_PROJECT}.iam.gserviceaccount.com}"
ENV_YAML="deploy/${ENVIRONMENT}.env.yaml"
SECRETS_FILE="deploy/${ENVIRONMENT}.secrets"

die() { echo "Error: $*" >&2; exit 1; }
[[ -f "$ENV_YAML" ]] || die "missing $ENV_YAML"
[[ -f "$SECRETS_FILE" ]] || die "missing $SECRETS_FILE"
grep -q 'REPLACE-WITH' "$ENV_YAML" && die "$ENV_YAML still has REPLACE-WITH placeholders"

# Deploy what's on main, not whatever this folder happens to have.
git fetch -q origin main
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
DIRTY="$(git status --porcelain --untracked-files=no)"
BEHIND="$(git rev-list --count HEAD..origin/main)"
if [[ "$ENVIRONMENT" == production ]]; then
  [[ "$BRANCH" == main ]] || die "production deploys only from main (this folder is on $BRANCH)"
  [[ -z "$DIRTY" ]] || die "uncommitted changes; commit or discard them first"
  [[ "$BEHIND" == 0 ]] || die "main is $BEHIND commit(s) behind origin/main; run git pull"
else
  [[ "$BRANCH" == main && -z "$DIRTY" && "$BEHIND" == 0 ]] || {
    echo "Warning: deploying $BRANCH ($([[ -n "$DIRTY" ]] && echo 'uncommitted changes, ')$BEHIND behind origin/main), not main."
    read -r -p "Continue? [y/N] " ok; [[ "$ok" == y || "$ok" == Y ]] || exit 1
  }
fi

gcloud iam service-accounts describe "$SERVICE_ACCOUNT" --project "$GCP_PROJECT" >/dev/null 2>&1 \
  || die "service account $SERVICE_ACCOUNT not found; run scripts/setup-gcp.sh first"

# KEY=secret-name lines -> KEY=secret-name:latest,...
SECRETS="$(grep -Ev '^[[:space:]]*(#|$)' "$SECRETS_FILE" | sed -E 's/^[[:space:]]*([A-Z0-9_]+)[[:space:]]*=[[:space:]]*([A-Za-z0-9_-]+)[[:space:]]*$/\1=\2:latest/' | paste -sd, -)"
[[ -n "$SECRETS" ]] || die "$SECRETS_FILE lists no secrets"
for pair in ${SECRETS//,/ }; do
  name="${pair#*=}"; name="${name%:latest}"
  gcloud secrets describe "$name" --project "$GCP_PROJECT" >/dev/null 2>&1 \
    || die "secret $name not found; run scripts/push-secrets.sh $ENVIRONMENT <env-file>"
done

echo "Deploying $(git rev-parse --short HEAD) to $SERVICE ($ENVIRONMENT) in $GCP_PROJECT ($GCP_REGION)..."
gcloud run deploy "$SERVICE" \
  --project "$GCP_PROJECT" \
  --region "$GCP_REGION" \
  --source . \
  --allow-unauthenticated \
  --service-account "$SERVICE_ACCOUNT" \
  --env-vars-file "$ENV_YAML" \
  --set-secrets "$SECRETS" \
  --memory 1Gi \
  --cpu-boost \
  --startup-probe "httpGet.path=/health,periodSeconds=2,timeoutSeconds=2,failureThreshold=30" \
  --liveness-probe "httpGet.path=/health,periodSeconds=30,timeoutSeconds=5,failureThreshold=3" \
  --min-instances "$MIN_INSTANCES" \
  --max-instances "$MAX_INSTANCES" \
  --labels "env=${ENVIRONMENT},commit=$(git rev-parse --short HEAD)" \
  --quiet

URL="$(gcloud run services describe "$SERVICE" --project "$GCP_PROJECT" --region "$GCP_REGION" --format 'value(status.url)')"
echo
echo "$SERVICE is live: $URL"
APP_URL="$(grep -E '^APP_URL:' "$ENV_YAML" | sed -E 's/^APP_URL:[[:space:]]*"?([^"]*)"?.*/\1/')"
echo "APP_URL is $APP_URL (from $ENV_YAML). Twilio signature checks need it to be the URL Twilio calls."
