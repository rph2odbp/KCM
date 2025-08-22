# Kateri Camp Management (KCM) – Product Blueprint

This blueprint captures the current product vision and working agreements for the Parent, Staff, and Admin panels. It reflects decisions made so far and intentionally includes open questions/TBDs for future resolution.

## Overview

- Monorepo: Yarn workspaces (`@kateri/web`, `@kateri/functions`, `@kateri/functions-gen2`, `@kateri/shared`).
- Frontend: React + Vite + React Router + React Query.
- Backend: Firebase (Auth, Firestore, Storage, Functions Gen1/Gen2), Sentry optional.
- Local dev: Production APIs only; emulators are not supported.
- Types: Zod schemas in `@kateri/shared` define data shapes and validation.
- Security: Firestore rules enforce role-based and ownership access; production rules hardened for admin-only writes to system collections.

### CI/CD and Ops

- GitHub Actions: Node 22 + Corepack/Yarn 4; single primary workflow “Deploy Firebase Functions”.
- Auth: Keyless deploys via Workload Identity Federation (OIDC). If `FIREBASE_TOKEN` is present, it’s used; otherwise WIF is used (recommended).
- Secrets: `SENTRY_DSN` stored in Google Secret Manager and referenced by Gen2 functions; resolved at deploy time.
- Project/env: `kcm-firebase-b7d6a` (region `us-central1`), Firestore database id `kcm-db`.

## Roles and Permissions

- Global roles: `parent`, `staff`, `admin`, `medic` (stored as array field `users/{uid}.roles`).
- Staff subtypes: `staff_hired` indicates elevated staff access (rosters, reports).
- Defaults: New registrations/users default to `parent, staff`; `admin` is assigned via whitelist or admin action.
- Key rules (high level):
  - Parents can read/write their own profile and campers; create registrations for their campers only.
  - Staff (hired) can read all campers, sessions, and reports; writes limited to admins.
  - Medics can read/write medical records and logs.
  - Admins can read/write everything, manage roles, and system config.

## Panels

### Parent Panel

- Dashboard
  - Welcome + quick actions.
  - List available sessions by year and gender; filtered by camper grade gates (2nd–8th completed) and camper gender.
  - Show registration status per camper (incomplete, pendingPayment, confirmed, waitlisted, cancelled).
- Registration Flow (per camper, per session)
  - Year → Session pathing: `sessions/{year}/{boys|girls}/{sessionId}` → `registrations/{registrationId}`.
  - Stepper: Parent info → Camper info → Health/Medical → Consents → Payment.
  - Grade gating: Camper `gradeCompleted` must be 2–8 before camp; enforced server-side and in UI.
  - Add-ons: `messagePackets` (integer). More add-ons TBD.
  - Payments: Deposit flag + `totalDue` (Adyen integration later).
  - Post-registration: ability to resume incomplete registrations and upload missing docs.
- Camper Management
  - Create/edit camper profiles (name, DOB, gender, grade, emergency contacts, medical info skeleton).
  - Parent-centric terminology (no “guardian” in UI).
- Account
  - View/update parent profile; password reset; sign-in via Google or email/password.

### Staff Panel

- Rosters and Operations
  - View rosters by year → session; camper lists with basic details.
  - Cabin assignment (TBD), arrival/departure status (TBD), check-in/out tooling (TBD).
  - Staff subtypes and permissions: baseline `staff` vs `staff_hired` (hired has roster/report access).
- Photos (TBD)
  - Upload and manage gallery with permission tags.
- Reports (read-only for hired staff)
  - Basic analytics and exports (TBD).

### Admin Panel

- User Management
  - Search users; assign/revoke roles (including `admin`, `staff_hired`, `medic`).
- Sessions Management
  - CRUD sessions with fields: `year`, `name`, `gender` (`boys|girls`), `startDate`, `endDate`, `capacity`, `price`, `waitlistOpen`.
  - Structure: `sessions/{year}/{boys|girls}/{sessionId}`.
  - Hiring workflows and staff subtype assignments (TBD).
- Registrations Oversight
  - Read all registrations; manage waitlists, confirmations, cancellations.
- Payments and Finance (TBD)
  - Reconcile deposits and balances; exports.
- System Config
  - Feature flags/config docs; Sentry, maintenance banners (TBD).

## Summer 2026 Session Plan

Authoritative list of sessions for the 2026 summer (capacity 210 each):

- Boys Camp Week 1 — May 31, 2026 → June 6, 2026 — capacity 210
- Boys Camp Week 2 — June 7, 2026 → June 13, 2026 — capacity 210
- Boys Camp Week 3 — June 14, 2026 → June 20, 2026 — capacity 210
- Boys Camp Week 4 — June 21, 2026 → June 27, 2026 — capacity 210
- Girls Camp Week 1 — June 28, 2026 → July 4, 2026 — capacity 210
- Girls Camp Week 2 — July 5, 2026 → July 11, 2026 — capacity 210
- Girls Camp Week 3 — July 12, 2026 → July 18, 2026 — capacity 210
- Girls Camp Week 4 — July 19, 2026 → July 25, 2026 — capacity 210

Recommended IDs under `sessions/2026/{boys|girls}/{sessionId}`:

- Boys: `boys-w1`, `boys-w2`, `boys-w3`, `boys-w4`
- Girls: `girls-w1`, `girls-w2`, `girls-w3`, `girls-w4`

Open items for sessions:

- Capacity enforcement and waitlist auto-promotion logic (server-side + UI).
- Pricing per session and deposit rules; scholarships/discounts.
- Admin bulk tools for import/export and quick edits.

## Data Model (from `@kateri/shared`)

- UserProfile: `id`, `email`, `firstName`, `lastName`, `role` (legacy), `isActive`, timestamps.
- Camper: `id`, `firstName`, `lastName`, `dateOfBirth`, `parentId`, `gender` (`male|female`), `gradeCompleted` (2–8), `emergencyContacts[]`, `medicalInfo{}`, `registrationStatus`, timestamps.
- Session: `id`, `year`, `name`, `gender` (`boys|girls`), `startDate`, `endDate`, `capacity`, `price`, `waitlistOpen`, timestamps.
- Registration: `id`, `year`, `sessionId`, `parentId`, `camperId`, `status` (`incomplete|pendingPayment|confirmed|waitlisted|cancelled`), `formCompletion{}`, `addOns{messagePackets}`, `depositPaid`, `totalDue`, timestamps.
- MedicalRecord/MedicationLog, Payment, Photo (see shared schemas for details and evolution).

## Firestore Structure

- Users: `users/{uid}` profile with `roles` array.
- Campers: `campers/{camperId}` with `parentId` and metadata.
- Guardianships: `guardianships/{relationshipId}` (legacy name; slated for parent-centric cleanup) – used by rules for parent-of checks (TBD).
- Sessions: `sessions/{year}/{boys|girls}/{sessionId}`.
- Registrations: `sessions/{year}/{boys|girls}/{sessionId}/registrations/{registrationId}`.
- Medical: `medical_records/{recordId}`, `medication_logs/{logId}`.
- Payments: `payments/{paymentId}`.
- Photos: `photos/{photoId}`.

## Security Rules (high level)

- Parents: can read/update own user doc; create campers (if `createdBy == uid`); read/update/delete own campers; create/read their registrations under session path.
- Staff (hired): read all campers, sessions, reports; write restricted.
- Medics: read/write medical records/logs; parents can read medical for their campers.
- Admin: full read/write and config.
- Sessions: public read for listing; writes admin only.
- Open item: Replace `guardianships` with parent-centric relationship checks; ensure rules align with `parentId` on campers and registrations.

## Cloud Functions

Runtimes

- Gen2: Node 22 (https, scheduler, firestore triggers)
- Gen1: Node 18 (tiny shim for Auth onCreate)

Deployed

- Auth Profile Create (Gen1)
  - Trigger: `auth.user().onCreate`
  - Behavior: Create/merge `users/{uid}` with default roles and metadata; admin whitelist supported.
- Registration (Gen2 HTTPS)
  - `createRegistration`: Validates grade (2–8), resolves `gender` path (`boys|girls`), ensures camper exists/creates one, and writes registration to `sessions/{year}/{gender}/{sessionId}/registrations`.
  - Future: payment hooks, waitlist logic, capacity checks.
- Utilities (Gen2)
  - `helloWorld` (private HTTPS) for smoke
  - `dailyHealthCheckV2` (scheduler)
  - `onCamperUpdatedV2` (firestore onUpdate) on `campers/{camperId}` in database `kcm-db`
  - Backups and auth cleanup tasks

## Local Development

- Use `yarn workspace:web dev` against production Firebase (with appropriate test data in a non-sensitive project if needed).
- Helper scripts:
  - `scripts/kill-ports.sh` – free dev ports.
- Devcontainer ensures Corepack/Yarn and installs deps.

## Non-Functional Requirements

- Strict TypeScript, ESLint, and Zod validation on boundaries.
- Unit tests in functions where feasible (Vitest/Jest currently mixed by codebase).
- Observability: Optional Sentry DSN for functions and frontend (TBD rollout).

## Open Questions / TBDs

1. Guardianship model: Replace `guardianships/*` checks with direct `parentId` or a new parent-link collection? Migrate rules accordingly.
2. Session seeding: Admin UX and/or scripts to create sessions per-year; canonical IDs and naming.
3. Capacity and waitlist logic: When to flip to waitlist; policies for auto-promotion.
4. Payments: Adyen integration flow, deposit handling, refunds, and reconciliation.
5. Staff sub-roles: Clarify taxonomy (`staff`, `staff_hired`, cabin leaders, etc.) and permissions matrix.
6. Medical flows: HIPAA-like safeguards, audit trails, emergency access, and redaction policies.
7. Photo permissions: Explicit consent model for albums/tags; parent access controls.
8. Analytics/Reporting: Scope and initial dashboards; export formats.
9. Identity workflows: Future use of blocking functions (GCIP/Identity Platform) for advanced checks; optional migration of Auth trigger to Gen2 blocking `beforeUserCreated`.
10. Gen1 vs Gen2 functions: Decision for now is to maintain a minimal Gen1 function (Auth onCreate) and keep all other functions on Gen2. Revisit if/when moving to Identity Platform or when a suitable non-blocking Gen2 trigger is available.
11. Multi-environment config: Secrets management, production/staging projects, and deployment gates.
12. UI polish: Stepper components, error states, skeletons; accessibility and mobile layouts.

## Next Steps

- Parent
  - Build registration stepper UI backed by `createRegistration`.
  - Camper CRUD and profile forms with validation.
- Staff
  - Read-only rosters per session; design cabin assignment.
- Admin
  - Session CRUD UI and seed helpers; role management page.
- Platform
  - CI/CD: Keep “Deploy Firebase Functions” as the single entrypoint; consider pruning the targeted deploy workflows.
  - Auth: Optionally remove `FIREBASE_TOKEN` secret to enforce WIF-only; document WIF setup and runbook.
  - Observability: Roll out Sentry DSN to frontend and tune sample rate; add a lightweight post-deploy smoke/log step.
  - Rules: Tighten parent-centric checks; add unit/integration tests for critical rules and functions.
  - Backups/Monitoring: Verify daily backups run and wire alerts/dashboards.

---

Document: `docs/blueprint.md` (living). Update as decisions land and features ship.
