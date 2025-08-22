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

Authentication:

- Supports email/password, Google sign-in, and password reset.
- The app targets real Firebase only; emulator mode is not supported.

Admin roles:

- Roles live in Firestore at `users/{uid}.roles`.
- New accounts default to `parent` and `staff`.
- Admin can be granted via production scripts or the Admin UI.
