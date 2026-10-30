#!/usr/bin/env bash
# Runs on the EC2 instance as root, sent by deploy/ssm-run.sh. Deploys IMAGE_TAG with Docker Compose:
# writes the compose file and .env, pulls from ECR, runs migrations, then starts the new app.
# Never print .env: it holds the database password.
set -euo pipefail

: "${IMAGE_TAG:?}" "${IMAGE_REPO:?}" "${AWS_REGION:?}" "${SSM_PARAM_PREFIX:?}"

bundle=$(cd "$(dirname "$0")/../.." && pwd)
app=/opt/app
install -d -m 755 "$app"
install -m 644 "$bundle/docker-compose.yml" "$app/docker-compose.yml"

# .env from Parameter Store (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, COOKIE_SECURE, ...).
umask 077
env_file=$(mktemp)
aws ssm get-parameters-by-path --region "$AWS_REGION" --path "$SSM_PARAM_PREFIX" \
  --with-decryption --query 'Parameters[].[Name,Value]' --output text |
  awk -F'\t' '{ name = $1; sub(/.*\//, "", name); print name "=" $2 }' > "$env_file"

for key in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB; do
  grep -q "^$key=" "$env_file" || { echo "Missing parameter $SSM_PARAM_PREFIX/$key" >&2; exit 1; }
done
if grep -q '=CHANGE_ME$' "$env_file"; then
  echo "Warning: some parameters under $SSM_PARAM_PREFIX still hold the CHANGE_ME placeholder." >&2
fi

grep -q '^APP_PORT=' "$env_file" || echo "APP_PORT=80" >> "$env_file"
grep -q '^COOKIE_SECURE=' "$env_file" || echo "COOKIE_SECURE=false" >> "$env_file"
printf 'IMAGE_REPO=%s\nIMAGE_TAG=%s\n' "$IMAGE_REPO" "$IMAGE_TAG" >> "$env_file"
mv "$env_file" "$app/.env"
umask 022

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "${IMAGE_REPO%%/*}" > /dev/null

cd "$app"
echo "Deploying $IMAGE_REPO:$IMAGE_TAG"
docker compose pull --quiet
# The app starts only after the migrate service exits 0; a failed migration fails this command.
docker compose up -d --no-build --remove-orphans
docker compose ps
docker image prune -f > /dev/null
echo "Deployed $IMAGE_TAG"
