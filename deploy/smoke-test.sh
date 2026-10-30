#!/usr/bin/env bash
# Smoke test against the public URL. Passes when /api/health returns 200 with status "ok"
# (and, if given, the expected version) and /login returns 200. Retries until the timeout.
#
# Usage: deploy/smoke-test.sh <app-url> [expected-version]
set -euo pipefail

url=${1:?usage: smoke-test.sh <app-url> [expected-version]}
url=${url%/}
want=${2:-}
deadline=$((SECONDS + ${SMOKE_TIMEOUT:-120}))

while true; do
  health=$(curl -sS --max-time 5 -w '\n%{http_code}' "$url/api/health" 2>&1 || true)
  code=${health##*$'\n'}
  body=${health%$'\n'*}
  login=$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "$url/login" 2>/dev/null || true)

  if [ "$code" = 200 ] && [ "$login" = 200 ] &&
    jq -e --arg v "$want" '.status == "ok" and ($v == "" or .version == $v)' <<< "$body" > /dev/null 2>&1; then
    echo "Smoke test passed: $body"
    exit 0
  fi

  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "Smoke test failed. /api/health -> $code $body, /login -> $login (expected version: ${want:-any})" >&2
    exit 1
  fi
  sleep 5
done
