#!/bin/bash

# KCM Development Environment Setup Script
echo "🚀 Setting up KCM development environment..."

# Install global tools
echo "📦 Installing global packages..."
npm install -g firebase-tools@latest yarn@latest

# Install Chrome for Playwright (if needed)
echo "🌐 Installing Chrome for testing..."
npx playwright install chromium --with-deps

# Navigate to monorepo and install dependencies
echo "📁 Setting up monorepo..."
cd kateri-monorepo || exit 1

# Install all dependencies
echo "⬇️ Installing dependencies..."
yarn install

# Build shared package first
echo "🔨 Building shared package..."
yarn workspace @kateri/shared build

# Initialize Firebase emulators (if firebase.json exists in root)
echo "🔥 Setting up Firebase emulators..."
cd ..
if [ -f "firebase.json" ]; then
    echo "📋 Firebase configuration found, initializing emulators..."
    firebase setup:emulators:firestore --project demo-project
    firebase setup:emulators:auth --project demo-project
    firebase setup:emulators:functions --project demo-project
    firebase setup:emulators:storage --project demo-project
else
    echo "⚠️ No firebase.json found, skipping emulator setup"
fi

# Create .env files from examples if they don't exist
echo "⚙️ Setting up environment files..."
cd kateri-monorepo

if [ -f "packages/web/.env.example" ] && [ ! -f "packages/web/.env.local" ]; then
    cp packages/web/.env.example packages/web/.env.local
    echo "✅ Created packages/web/.env.local from example"
fi

if [ -f "packages/functions/.env.local.example" ] && [ ! -f "packages/functions/.env.local" ]; then
    cp packages/functions/.env.local.example packages/functions/.env.local
    echo "✅ Created packages/functions/.env.local from example"
fi

# Display helpful information
echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📝 Quick start commands:"
echo "  yarn workspace @kateri/web dev       # Start React dev server"
echo "  yarn workspace @kateri/functions serve  # Start functions emulator"
echo "  firebase emulators:start --only firestore,auth,storage  # Start Firebase emulators"
echo ""
echo "🌐 Default ports:"
echo "  - React app: http://localhost:5173"
echo "  - Firebase UI: http://localhost:4000"
echo "  - Functions: http://localhost:5001"
echo ""
echo "⚠️ Don't forget to:"
echo "  1. Configure your Firebase project ID in .firebaserc"
echo "  2. Set up environment variables in .env.local files"
echo "  3. Review Firebase security rules"
echo ""