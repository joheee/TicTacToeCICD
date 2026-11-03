#!/usr/bin/env bash
# Runs on the server, sent by deploy/ssm-run.sh (EC2, as root) or deploy/ssh-run.sh (Droplet, as the deploy user).
# Deploys IMAGE_TAG with Docker Compose: writes the compose file and .env, pulls the image, runs migrations,
# then starts the new app. Never print .env: it holds the database password.
#
# Two switches pick the target (the defaults are the EC2 path):
#   ENV_SOURCE=ssm (default)  .env values come from Parameter Store (needs AWS_REGION, SSM_PARAM_PREFIX)
#   ENV_SOURCE=file           .env values come from the file at ENV_FILE (KEY=VALUE lines, sent by the workflow)
#   REGISTRY=ecr (default)    log in to the ECR registry in IMAGE_REPO before pulling
#   REGISTRY=ghcr             no login: the GHCR package is public
set -euo pipefail

: "${IMAGE_TAG:?}" "${IMAGE_REPO:?}"
ENV_SOURCE=${ENV_SOURCE:-ssm}
REGISTRY=${REGISTRY:-ecr}

bundle=$(cd "$(dirname "$0")/../.." && pwd)
app=/opt/app
install -d -m 755 "$app"
install -m 644 "$bundle/docker-compose.yml" "$app/docker-compose.yml"
install -m 644 "$bundle/Caddyfile" "$app/Caddyfile"

# .env values: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, SITE_ADDRESS, ...
umask 077
env_file=$(mktemp)
case "$ENV_SOURCE" in
  ssm)
    : "${AWS_REGION:?}" "${SSM_PARAM_PREFIX:?}"
    aws ssm get-parameters-by-path --region "$AWS_REGION" --path "$SSM_PARAM_PREFIX" \
      --with-decryption --query 'Parameters[].[Name,Value]' --output text |
      awk -F'\t' '{ name = $1; sub(/.*\//, "", name); print name "=" $2 }' > "$env_file"
    where="parameter $SSM_PARAM_PREFIX/"
    ;;
  file)
    : "${ENV_FILE:?}"
    cat "$ENV_FILE" > "$env_file"
    where="value "
    ;;
  *) echo "Unknown ENV_SOURCE: $ENV_SOURCE" >&2; exit 2 ;;
esac

for key in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB SITE_ADDRESS; do
  grep -q "^$key=" "$env_file" || { echo "Missing ${where}$key" >&2; exit 1; }
done
if grep -q '=CHANGE_ME$' "$env_file"; then
  echo "Warning: some .env values still hold the CHANGE_ME placeholder." >&2
fi

grep -q '^APP_PORT=' "$env_file" || echo "APP_PORT=3000" >> "$env_file"
# Caddy terminates TLS, so the session cookie is HTTPS-only.
grep -q '^COOKIE_SECURE=' "$env_file" || echo "COOKIE_SECURE=true" >> "$env_file"
# Browsers remember "HTTPS only" for this long (1 year); see the Caddyfile.
grep -q '^HSTS_MAX_AGE=' "$env_file" || echo "HSTS_MAX_AGE=31536000" >> "$env_file"
printf 'COMPOSE_PROFILES=proxy\nIMAGE_REPO=%s\nIMAGE_TAG=%s\n' "$IMAGE_REPO" "$IMAGE_TAG" >> "$env_file"
mv "$env_file" "$app/.env"
umask 022

case "$REGISTRY" in
  ecr)
    : "${AWS_REGION:?}"
    aws ecr get-login-password --region "$AWS_REGION" |
      docker login --username AWS --password-stdin "${IMAGE_REPO%%/*}" > /dev/null
    ;;
  ghcr) ;;
  *) echo "Unknown REGISTRY: $REGISTRY" >&2; exit 2 ;;
esac

cd "$app"
echo "Deploying $IMAGE_REPO:$IMAGE_TAG"
docker compose pull --quiet
# The app starts only after the migrate service exits 0; a failed migration fails this command.
docker compose up -d --no-build --remove-orphans
docker compose ps
docker image prune -f > /dev/null
echo "Deployed $IMAGE_TAG"
