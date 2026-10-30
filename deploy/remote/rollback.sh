#!/usr/bin/env bash
# Runs on the EC2 instance as root, sent by deploy/ssm-run.sh. Redeploys the last tag that passed
# the smoke test (recorded by mark-good.sh).
set -euo pipefail

last=$(cat /opt/app/last_good_tag 2>/dev/null || true)
if [ -z "$last" ]; then
  echo "No last good tag recorded (first deploy?), nothing to roll back to." >&2
  exit 1
fi

echo "Rolling back to $last"
IMAGE_TAG=$last exec bash "$(dirname "$0")/deploy.sh"
