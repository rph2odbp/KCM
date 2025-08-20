Local development instructions for the web package

1. Install dependencies (from repo root):
   corepack enable || true
   yarn install

2. Copy env example:
   cp packages/web/.env.example packages/web/.env

3. (Optional) Enable Sentry for client errors by setting in `.env`:
   VITE_ENABLE_SENTRY=true
   VITE_SENTRY_DSN=<your-public-dsn>

4. Start dev server:
   cd packages/web && yarn dev

Notes:

- The app uses Vite and React 18.
- Sentry configuration is optional; keep `VITE_ENABLE_SENTRY=false` in CI/PRs.

Authentication (modeled after Fireship example):

- Supports email/password, Google sign-in, and password reset.
- When `VITE_USE_EMULATORS=true`, Auth connects to the local emulator via same-origin proxy to avoid CORS in tunnels.
- Ensure `.env` has emulator-friendly placeholders, e.g. `VITE_FIREBASE_API_KEY=fake-api-key` and `VITE_FIREBASE_PROJECT_ID=demo-project`.
- Seed local emulators with a user and role document:

  ./scripts/seed-emulator.sh "Ryanhallford.br@gmail.com" "password"

- Sign in with the seeded user, then pick a role from the top bar.
- If a 400 appears for `identitytoolkit.googleapis.com`, check the dev server console for proxy logs that show the exact emulator error body.
