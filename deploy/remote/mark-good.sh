#!/usr/bin/env bash
# Runs on the EC2 instance as root, sent by deploy/ssm-run.sh after the smoke test passed.
# Records IMAGE_TAG as the rollback target.
set -euo pipefail

: "${IMAGE_TAG:?}"
echo "$IMAGE_TAG" > /opt/app/last_good_tag
echo "$(date -u +%FT%TZ) $IMAGE_TAG" >> /opt/app/deploy_history
echo "Marked $IMAGE_TAG as last good"
