#!/usr/bin/env bash
# Re-deploy ArkivLog to Vercel from scratch.
#
# Usage:
#   1. Make sure `apps/web/.env` exists with ARKIV_SERVICE_PRIVATE_KEY set.
#   2. Make sure `apps/demo/.env` exists with VERTEX_PROJECT_ID, VERTEX_CLIENT_EMAIL,
#      and VERTEX_PRIVATE_KEY set.
#   3. Run from repo root:  bash scripts/redeploy.sh
#
# What it does:
#   - Creates the `web` Vercel project (if absent), pushes non-sensitive env vars,
#     reads the sensitive ones from local .env and pushes those too, then deploys.
#   - Same for `demo`, pointing ARKIVLOG_ENDPOINT at the freshly-deployed web URL.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"
DEMO_DIR="$REPO_ROOT/apps/demo"

# Demo wallet + key + project (from local keystore, used by DEMO_MODE).
DEMO_OWNER_WALLET="0x8274e93cf884162175408c0c76735d0d5c93a838"
DEMO_API_KEY="ak_yqoloQmSy7JrTAkiR_wTnOeY0Jvzx0ck"
DEMO_PROJECT_KEY="0x787d8bbac91c8b151946dbf7002f2cdd8eb064c16590a82f8cd9406c766a0f81"

# --- helpers ----------------------------------------------------------------

push_env() {
  local name="$1"
  local value="$2"
  echo "$value" | vercel env add "$name" production --force 2>/dev/null | tail -1 || true
}

read_env_var() {
  local file="$1"
  local key="$2"
  grep -E "^${key}=" "$file" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

# --- apps/web ---------------------------------------------------------------

echo "==> Deploying apps/web..."
cd "$WEB_DIR"

if [ ! -f .env ]; then
  echo "ERROR: $WEB_DIR/.env not found — need ARKIV_SERVICE_PRIVATE_KEY." >&2
  exit 1
fi

ARKIV_SERVICE_PRIVATE_KEY="$(read_env_var .env ARKIV_SERVICE_PRIVATE_KEY)"
if [ -z "$ARKIV_SERVICE_PRIVATE_KEY" ]; then
  echo "ERROR: ARKIV_SERVICE_PRIVATE_KEY missing from $WEB_DIR/.env." >&2
  exit 1
fi

# First deploy to create the project. Env vars come next.
vercel --prod --yes

push_env NEXT_PUBLIC_DEMO_MODE "true"
push_env DEMO_OWNER_WALLET "$DEMO_OWNER_WALLET"
push_env DEMO_API_KEY "$DEMO_API_KEY"
push_env DEMO_PROJECT_KEY "$DEMO_PROJECT_KEY"
push_env SESSION_SECRET "$(openssl rand -hex 32)"
push_env ARKIV_SERVICE_PRIVATE_KEY "$ARKIV_SERVICE_PRIVATE_KEY"

# Re-deploy to pick up the env vars (first deploy was env-less).
WEB_DEPLOY_URL="$(vercel --prod --yes 2>&1 | tail -3 | grep -oE 'https://[^ ]+vercel.app' | head -1)"
echo "✓ apps/web ready: $WEB_DEPLOY_URL"

# Vercel auto-assigns a stable alias like <project>-<scope>.vercel.app.
# Pull it so we can wire it into apps/demo.
WEB_ALIAS="$(vercel ls web 2>/dev/null | grep -oE 'web-[a-z0-9-]+\.vercel\.app' | head -1)"
WEB_URL="https://${WEB_ALIAS:-${WEB_DEPLOY_URL#https://}}"
echo "✓ apps/web public URL: $WEB_URL"

# --- apps/demo --------------------------------------------------------------

echo ""
echo "==> Deploying apps/demo..."
cd "$DEMO_DIR"

if [ ! -f .env ]; then
  echo "ERROR: $DEMO_DIR/.env not found — need VERTEX_*." >&2
  exit 1
fi

VERTEX_PROJECT_ID="$(read_env_var .env VERTEX_PROJECT_ID)"
VERTEX_CLIENT_EMAIL="$(read_env_var .env VERTEX_CLIENT_EMAIL)"
VERTEX_PRIVATE_KEY="$(grep -E '^VERTEX_PRIVATE_KEY=' .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"

for v in VERTEX_PROJECT_ID VERTEX_CLIENT_EMAIL VERTEX_PRIVATE_KEY; do
  if [ -z "${!v}" ]; then
    echo "ERROR: $v missing from $DEMO_DIR/.env." >&2
    exit 1
  fi
done

vercel --prod --yes

push_env ARKIVLOG_ENDPOINT "$WEB_URL/api/logs"
push_env ARKIVLOG_API_KEY "$DEMO_API_KEY"
push_env MODEL "gemini-2.5-flash"
push_env VERTEX_LOCATION "us-central1"
push_env VERTEX_PROJECT_ID "$VERTEX_PROJECT_ID"
push_env VERTEX_CLIENT_EMAIL "$VERTEX_CLIENT_EMAIL"
push_env VERTEX_PRIVATE_KEY "$VERTEX_PRIVATE_KEY"

DEMO_DEPLOY_URL="$(vercel --prod --yes 2>&1 | tail -3 | grep -oE 'https://[^ ]+vercel.app' | head -1)"
DEMO_ALIAS="$(vercel ls demo 2>/dev/null | grep -oE 'demo-[a-z0-9-]+\.vercel\.app' | head -1)"
DEMO_URL="https://${DEMO_ALIAS:-${DEMO_DEPLOY_URL#https://}}"

echo ""
echo "================================================================"
echo "✓ Re-deploy complete"
echo ""
echo "  🖥️  Dashboard:  $WEB_URL"
echo "  🤖  Demo chat:  $DEMO_URL"
echo "================================================================"
