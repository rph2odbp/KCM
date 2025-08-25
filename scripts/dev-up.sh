#!/usr/bin/env bash
set -euo pipefail

echo "[dev-up] Ensuring Yarn is preferred and cleaning npm lockfiles..."
mkdir -p .vscode
cat > .vscode/settings.json <<'JSON'
{
  "npm.packageManager": "yarn",
  "typescript.tsdk": "node_modules/typescript/lib"
}
JSON
find . -maxdepth 2 -type f -name package-lock.json -print -delete || true
find . -maxdepth 2 -type f -name npm-shrinkwrap.json -print -delete || true

echo "[dev-up] Installing dependencies (root)..."
corepack enable || true
yarn install --inline-builds --silent || yarn install --inline-builds

echo "[dev-up] Installing dependencies (monorepo)..."
yarn --cwd kateri-monorepo install --inline-builds --silent || yarn --cwd kateri-monorepo install --inline-builds

echo "[dev-up] Starting web dev server..."
( yarn web:dev ) > /tmp/kcm_web.log 2>&1 & echo $! > /tmp/kcm_web.pid

echo "[dev-up] Waiting for port 3000 to open..."
for i in {1..20}; do
  ss -ltn '( sport = :3000 )' | grep -q 3000 && break || true
  sleep 1
done

echo "[dev-up] Open ports:" && (ss -ltnp | grep -E ":(3000)\b" || true)

echo "[dev-up] Tail web log:" && (tail -n 30 /tmp/kcm_web.log || true)

echo "[dev-up] Done. Open your forwarded port 3000."
