#!/usr/bin/env bash
# Runs one of the deploy/remote/*.sh scripts on the DigitalOcean Droplet over SSH, as the deploy user.
# The DigitalOcean twin of deploy/ssm-run.sh; the scripts are the same ones, switched with ENV_SOURCE=file
# and REGISTRY=ghcr.
#
# Usage: deploy/ssh-run.sh <deploy|rollback|mark-good|backup|counts> [KEY=VALUE ...]
# Needs: DO_SSH_HOST, DO_DEPLOY_USER, and ~/.ssh/id_deploy plus ~/.ssh/known_hosts (the workflow writes them).
# For deploy and rollback also POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB and SITE_ADDRESS in the environment.
#
# The compose file, the Caddyfile, the remote scripts and the .env values travel as a gzipped tarball on ssh's
# stdin, so the secrets never appear on a command line or in the logs. The host key must already be pinned.
set -euo pipefail

action=${1:?usage: ssh-run.sh <deploy|rollback|mark-good|backup|counts> [KEY=VALUE ...]}
shift
: "${DO_SSH_HOST:?}" "${DO_DEPLOY_USER:?}"

root=$(git rev-parse --show-toplevel)
[ -f "$root/deploy/remote/$action.sh" ] || { echo "Unknown action: $action" >&2; exit 2; }

umask 077
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# Only deploy and rollback write .env, so only they need the secrets. backup and counts read the running stack.
# backup writes the dump to stdout, so nothing else in this script may print to stdout.
if [ "$action" = deploy ] || [ "$action" = rollback ]; then
  : "${POSTGRES_USER:?}" "${POSTGRES_PASSWORD:?}" "${POSTGRES_DB:?}" "${SITE_ADDRESS:?}"
  printf 'POSTGRES_USER=%s\nPOSTGRES_PASSWORD=%s\nPOSTGRES_DB=%s\nSITE_ADDRESS=%s\n' \
    "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$POSTGRES_DB" "$SITE_ADDRESS" > "$tmp/deploy.env"
else
  : > "$tmp/deploy.env"
fi

exports="export ENV_SOURCE=file REGISTRY=ghcr; "
for kv in "$@"; do
  exports+="export $(printf '%q' "$kv"); "
done

remote="set -eu; umask 077; d=\$(mktemp -d); trap 'rm -rf \"\$d\"' EXIT; tar -xzf - -C \"\$d\"; export ENV_FILE=\"\$d/deploy.env\"; ${exports}bash \"\$d/deploy/remote/$action.sh\""

tar -czf - -C "$root" docker-compose.yml Caddyfile deploy/remote -C "$tmp" deploy.env |
  ssh -i "$HOME/.ssh/id_deploy" -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
    -o UserKnownHostsFile="$HOME/.ssh/known_hosts" -o BatchMode=yes -o ServerAliveInterval=30 \
    "$DO_DEPLOY_USER@$DO_SSH_HOST" "$remote"
