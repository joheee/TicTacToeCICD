#!/usr/bin/env bash
# Runs on the Droplet as the deploy user, sent by deploy/ssh-run.sh. Writes a pg_dump of the app database to
# STDOUT (custom format, already compressed), which backup-do.yml uploads to the Spaces bucket. Nothing else
# may print to stdout. The dump runs inside the db container, so no password is needed and nothing secret
# is read or printed here.
set -euo pipefail

cd /opt/app
docker compose exec -T db sh -c 'pg_dump --format=custom --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
