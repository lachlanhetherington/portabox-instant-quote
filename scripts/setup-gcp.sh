#!/usr/bin/env bash
# One-time Google Cloud setup for separate staging and production (Phase 1A).
# Safe to run again: each step skips what already exists.
#
#   1. Turns on Secret Manager.
#   2. Creates the service account the app runs as (portabox-run), with only the
#      access it needs: Firestore read/write, reading secrets, writing logs/metrics.
#   3. Creates the "staging" Firestore database in Sydney.
#   4. Publishes firestore.rules to both databases.
#
# Usage: scripts/setup-gcp.sh
set -euo pipefail

cd "$(dirname "$0")/.."

GCP_PROJECT="${GCP_PROJECT:-gen-lang-client-0776892310}"
GCP_REGION="${GCP_REGION:-australia-southeast1}"
SA_NAME=portabox-run
SA_EMAIL="${SA_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"

echo "== 1. Secret Manager API"
gcloud services enable secretmanager.googleapis.com firebaserules.googleapis.com --project "$GCP_PROJECT"

echo "== 2. Service account $SA_EMAIL"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project "$GCP_PROJECT" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" --project "$GCP_PROJECT" \
    --display-name "Portabox app (Cloud Run)" \
    --description "Runs portabox-staging and portabox-prod. Firestore, secrets, logs only."
fi
for role in roles/datastore.user roles/secretmanager.secretAccessor roles/logging.logWriter roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT" \
    --member "serviceAccount:${SA_EMAIL}" --role "$role" --condition None --quiet >/dev/null
  echo "   $role"
done

echo "== 3. Firestore database 'staging' ($GCP_REGION)"
if gcloud firestore databases describe --database staging --project "$GCP_PROJECT" >/dev/null 2>&1; then
  echo "   already exists"
else
  gcloud firestore databases create --database staging --location "$GCP_REGION" \
    --type firestore-native --project "$GCP_PROJECT"
fi

echo "== 4. Publish firestore.rules to (default) and staging"
TOKEN="$(gcloud auth print-access-token)"
API="https://firebaserules.googleapis.com/v1/projects/${GCP_PROJECT}"
RULESET="$(python3 -c 'import json,sys; print(json.dumps({"source":{"files":[{"name":"firestore.rules","content":open("firestore.rules").read()}]}}))' \
  | curl -sf -X POST "$API/rulesets" -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $GCP_PROJECT" \
      -H 'Content-Type: application/json' -d @- \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')"
for release in cloud.firestore cloud.firestore/staging; do
  body="{\"release\":{\"name\":\"projects/${GCP_PROJECT}/releases/${release}\",\"rulesetName\":\"${RULESET}\"}}"
  if curl -sf -o /dev/null -X PATCH "$API/releases/${release}" -H "Authorization: Bearer $TOKEN" \
       -H "x-goog-user-project: $GCP_PROJECT" -H 'Content-Type: application/json' -d "$body"; then
    echo "   $release updated"
  else
    curl -sf -o /dev/null -X POST "$API/releases" -H "Authorization: Bearer $TOKEN" \
      -H "x-goog-user-project: $GCP_PROJECT" -H 'Content-Type: application/json' \
      -d "{\"name\":\"projects/${GCP_PROJECT}/releases/${release}\",\"rulesetName\":\"${RULESET}\"}"
    echo "   $release created"
  fi
done

echo
echo "Setup done. Next:"
echo "  scripts/push-secrets.sh staging .env.staging"
echo "  npm run settings:copy -- --from-db \"(default)\" --from-env portabox-staging --to-db staging"
echo "  scripts/deploy.sh staging"
