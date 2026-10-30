#!/usr/bin/env bash
# Runs one of the deploy/remote/*.sh scripts on the EC2 instance with SSM Run Command,
# waits for it, prints its output and exits with its result.
#
# Usage: deploy/ssm-run.sh <deploy|rollback|mark-good> [KEY=VALUE ...]
# Needs: AWS credentials (the deploy role), AWS_REGION, EC2_INSTANCE_ID.
#
# The compose file and the remote scripts are sent inside the command as a gzipped tarball,
# so the instance needs no git checkout and no S3 bucket.
set -euo pipefail

action=${1:?usage: ssm-run.sh <deploy|rollback|mark-good> [KEY=VALUE ...]}
shift
: "${AWS_REGION:?}" "${EC2_INSTANCE_ID:?}"

root=$(git rev-parse --show-toplevel)
[ -f "$root/deploy/remote/$action.sh" ] || { echo "Unknown action: $action" >&2; exit 2; }

bundle=$(tar -czf - -C "$root" docker-compose.yml deploy/remote | base64 -w0)

exports=""
for kv in "$@"; do
  exports+="export $(printf '%q' "$kv"); "
done

# AWS-RunShellScript runs this as root with bash on Amazon Linux 2023.
remote="set -eu; d=\$(mktemp -d); echo '$bundle' | base64 -d | tar -xzf - -C \"\$d\"; ${exports}bash \"\$d/deploy/remote/$action.sh\""
params=$(jq -n --arg c "$remote" '{commands: [$c], executionTimeout: ["900"]}')

command_id=$(aws ssm send-command \
  --region "$AWS_REGION" \
  --instance-ids "$EC2_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "tictactoe $action" \
  --parameters "$params" \
  --query Command.CommandId --output text)
echo "SSM command $command_id ($action) sent to $EC2_INSTANCE_ID"

status=Pending
for _ in $(seq 1 180); do
  sleep 5
  # Right after send-command the invocation may not exist yet.
  status=$(aws ssm get-command-invocation --region "$AWS_REGION" \
    --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" \
    --query Status --output text 2>/dev/null || echo Pending)
  case "$status" in
    Pending | InProgress | Delayed) continue ;;
    *) break ;;
  esac
done

aws ssm get-command-invocation --region "$AWS_REGION" \
  --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" \
  --query '[StandardOutputContent, StandardErrorContent]' --output text || true

echo "SSM command $action finished with status: $status"
[ "$status" = Success ]
