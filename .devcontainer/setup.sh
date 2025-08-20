#!/bin/bash
set -e
echo "🚀 Setting up KCM development environment..."

# Ensure monorepo exists
if [ ! -d kateri-monorepo ]; then
  echo "❌ kateri-monorepo directory missing!"
  exit 1
else
  echo "✅ kateri-monorepo directory exists."
fi

# Ensure firebase.json exists
if [ ! -f firebase.json ]; then
  echo "❌ firebase.json missing!"
  exit 1
else
  echo "✅ firebase.json exists."
fi

echo "📦 Installing global packages..."
npm install -g firebase-tools@latest yarn@latest

echo "🌐 Installing Chrome for testing..."
npx playwright install chromium --with-deps

echo "📁 Setting up monorepo..."
cd kateri-monorepo

echo "⬇️ Installing dependencies..."
corepack enable || true
yarn install

# Build shared package if present (helps TypeScript projects in workspaces)
if yarn workspaces info >/dev/null 2>&1; then
  if yarn workspace @kateri/shared --silent --version >/dev/null 2>&1; then
    echo "🔨 Building @kateri/shared workspace..."
    yarn workspace @kateri/shared build || true
  fi
fi

# Create local env files from examples if missing (non-destructive)
echo "⚙️ Ensuring .env local files exist where examples are present..."
for p in packages/*; do
  if [ -d "$p" ]; then
    if [ -f "$p/.env.example" ] && [ ! -f "$p/.env.local" ]; then
      cp "$p/.env.example" "$p/.env.local" && echo "  ✅ Created $p/.env.local from example"
    fi
    if [ -f "$p/.env.example" ] && [ ! -f "$p/.env" ]; then
      # keep .env optional but create from example for easier local dev
      cp "$p/.env.example" "$p/.env" && echo "  ✅ Created $p/.env from example"
    fi
  fi
done

echo ""
echo "🎉 Development environment setup complete!"
echo "Quick start commands (from repo root):"
echo "  corepack enable || true"
echo "  yarn install"
echo "  yarn workspace @kateri/web dev       # Start React dev server"
echo "  yarn workspace @kateri/functions serve  # Start functions emulator (local)"
echo "  yarn emulators                       # Start Firebase emulators (if configured)"
echo ""