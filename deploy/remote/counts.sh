#!/usr/bin/env bash
# Runs on the Droplet as the deploy user, sent by deploy/ssh-run.sh. Prints one "table count" line per app
# table, so a restore test can compare them with the restored copy.
set -euo pipefail

cd /opt/app
docker compose exec -T db sh -c 'psql -At -F " " -U "$POSTGRES_USER" -d "$POSTGRES_DB"' << 'SQL'
select 'users', count(*) from users
union all select 'games', count(*) from games;
SQL
