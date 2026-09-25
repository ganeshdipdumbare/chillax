#!/usr/bin/env bash
# Starts coturn + a fresh ngrok tunnel, points Vercel's TURN_URLS at it, and redeploys production.
set -euo pipefail
cd "$(dirname "$0")"

docker compose up -d coturn
docker compose up -d --force-recreate ngrok

url=""
for _ in $(seq 1 30); do
  url=$(docker compose logs --no-log-prefix ngrok 2>/dev/null | grep -o 'url=tcp://[^ ]*' | tail -1 | cut -d= -f2 || true)
  [ -n "$url" ] && break
  sleep 1
done
if [ -z "$url" ]; then
  echo "ngrok did not open a tunnel. Recent log:" >&2
  docker compose logs --no-log-prefix --tail 5 ngrok >&2
  exit 1
fi

turn_urls="turn:${url#tcp://}?transport=tcp"
echo "Tunnel: $turn_urls"

cd ..
vercel env rm TURN_URLS production -y >/dev/null 2>&1 || true
printf '%s' "$turn_urls" | vercel env add TURN_URLS production >/dev/null
vercel redeploy chillax-ruby.vercel.app --target production
echo "Relay is live. Stop it with: cd turn && docker compose down"
