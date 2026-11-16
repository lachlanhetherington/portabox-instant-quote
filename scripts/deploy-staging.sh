#!/usr/bin/env bash
# Kept for muscle memory: deploys staging with the committed config.
# See scripts/deploy.sh (config in deploy/, secrets in Secret Manager).
exec "$(dirname "$0")/deploy.sh" staging "$@"
