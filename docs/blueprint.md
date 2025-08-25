# Kateri Camp Management (KCM) – Product Blueprint

This blueprint captures the current product vision and working agreements for the Parent, Staff, and Admin panels. It reflects decisions made so far and intentionally includes open questions/TBDs for future resolution.

## Overview

- Monorepo: Yarn workspaces (`@kateri/web`, `@kateri/functions`, `@kateri/functions-gen2`, `@kateri/shared`).
- Frontend: React + Vite + React Router + React Query.
- Backend: Firebase (Auth, Firestore, Storage, Functions Gen1/Gen2), Sentry optional.
- Local dev: Production APIs only; emulators are not supported.
- Types: Zod schemas in `@kateri/shared` define data shapes and validation.
- Security: Firestore rules enforce role-based and ownership access; production rules hardened for admin-only writes to system collections.

### Sessions semantics (authoritative)

- No co-ed sessions. Each session is either Boys or Girls; there are gender-specific tracks.
- Parents can register the same camper for multiple sessions; each registration is independent and is always bound to one specific session.
- Sessions are organized under year and gender: `sessions/{year}/{boys|girls}/{sessionId}`.
- Admin/staff teams are associated by session (and effectively by gender/season). Access for staff should be scoped to assigned sessions.

### CI/CD and Ops

- GitHub Actions: Node 22 + Corepack/Yarn 4; primary workflow “Deploy Firebase Functions”.
- Auth: Keyless deploys via Workload Identity Federation (OIDC) only (no long‑lived `FIREBASE_TOKEN`).
- Secrets: `SENTRY_DSN` stored in Google Secret Manager and referenced by Gen2 functions; resolved at deploy time. Deploy/runtime SAs have least‑privilege IAM.
- Supporting workflows: Users Audit (lists Auth + Firestore users), Grant Admin (by email), Hosting live/preview (optional).
- Project/env: `kcm-firebase-b7d6a` (region `us-central1`), Firestore database is the default unless overridden.

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
- Sessions listing
  - A list of all offered sessions, sorted by date, with a Register/Waitlist action per session.
  - Example row: “Boys Camp Week 1 – May 31, 2026 to June 6, 2026 [210 spots left] $450”.
  - When full, show a clear “Sign up for the waitlist” action.
- Manage registrations
  - A section listing all registrations tied to the parent, across campers and sessions.
  - Each registration shows completion status and explicitly what’s missing (paperwork, info, payment).
  - Parents cannot change the session or cancel the registration themselves (admin handles cancellations).
- Camper profiles
  - Parent can view a camper profile with general info and a list of that camper’s registrations.
  - Cabin assignment (once set by admin) is surfaced on each registration.
- Messaging and photos
  - Messaging packets add-on during registration; a “Camper Communication” area to send messages (printed on site).
  - Photo gallery access limited to sessions their campers attend; view and download photos.
- Registration Flow (multi-step)
  - Steps: 1) Session Selection 2) Guardian Info 3) Camper Info (repeatable) 4) Health 5) Consents 6) Payment.
  - Multi-camper: Adding multiple campers to the same session generates separate registrations; after finishing, parent can add another session and reuse prior info to prefill fields.
  - Grade gating: Camper `gradeCompleted` must be 2–8; enforced server-side and in UI.
  - Payments: $100 deposit to hold a spot; total due a month before camp; payment plans and financial assistance options; add-ons like message packets per camper.
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
- Admin navigation IA
  - Left nav sections: Manage, Kateri-Chat, Reports.
  - Under Manage → General: Sessions, Cabin assignments, User Assignments, Statistics.
  - Under Manage → Reservations: Registrations, Check-In, Check-Out.
  - Medical Panel (TBD).
  - Staff: Applications, Employment, Time Off Requests, Schedules.
  - Communications: Emails (automated/scheduled/mass), Parent Communication, Camper Email, Photo Gallery.
- Admin landing dashboard
  - Widgets for: total registered campers, revenue YTD/season, capacity usage by upcoming session.
  - Per-session cards/lists: spots left, incomplete registrations, waiting list counts, cabins and per-cabin headcounts.
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
- Registration: `id`, `year`, `sessionId`, `gender` (`boys|girls`), `parentId`, `camperId`, `status` (`incomplete|pendingPayment|confirmed|waitlisted|cancelled`), `formCompletion{}`, `missing{paperwork?: string[]; info?: string[]; payment?: string[]}`, `addOns{messagePackets: number}`, `depositPaid`, `paymentPlan?: 'none'|'planA'|'planB'`, `totalDue`, `cabinId?`, `cabinmateRequests?: { name: string; parentName: string; parentEmail: string; confirmed: boolean }[]`, timestamps.
- MedicalRecord/MedicationLog, Payment, Photo (see shared schemas for details and evolution).
- Cabin: `id`, `gender` (`boys|girls`), `name`, `capacity`, `notes`.
- Message: `id`, `parentId`, `camperId`, `sessionRef`, `content`, `charCount`, `status` (`queued|sent|printed|failed`), timestamps.

## Firestore Structure

- Users: `users/{uid}` profile with `roles` array.
- Campers: `campers/{camperId}` with `parentId` and metadata.
- Guardianships: `guardianships/{relationshipId}` (legacy name; slated for parent-centric cleanup) – used by rules for parent-of checks (TBD).
- Sessions: `sessions/{year}/{boys|girls}/{sessionId}`.
- Registrations: `sessions/{year}/{boys|girls}/{sessionId}/registrations/{registrationId}`.
- Session staff assignments (planned): `sessions/{year}/{boys|girls}/{sessionId}/staff/{userId}` (role: staff_hired/admin for that session).
- Cabins (global by gender): `cabins/{boys|girls}/{cabinId}` plus per-session assignment: `sessions/{year}/{boys|girls}/{sessionId}/cabinAssignments/{cabinId}` with member lists.
- Messages: `messages/{messageId}` with references to `parentId`, `camperId`, and session.
- Medical: `medical_records/{recordId}`, `medication_logs/{logId}`.
- Payments: `payments/{paymentId}`.
- Photos: `photos/{photoId}`.

## Security Rules (high level)

- Parents: can read/update own user doc; create campers (if `createdBy == uid`); read/update/delete own campers; create/read their registrations under session path.
- Staff (hired): read all campers, sessions, reports; write restricted.
- Medics: read/write medical records/logs; parents can read medical for their campers.
- Admin: full read/write and config.
- Sessions: public read for listing; writes admin only.
- Users: owner can explicitly `create` `users/{uid}` (first‑time profile write) and read/update/delete their own doc; admins can manage other users.
- Open item: Replace `guardianships` with parent-centric relationship checks; ensure rules align with `parentId` on campers and registrations.
- Refinements (planned):
  - Staff read access scoped to assigned sessions (and by gender), not global. Consider session staff membership checks.
  - Cabin assignment writes admin-only; registration includes a `cabinId?` that admins set.

## Cloud Functions

Runtimes

- Gen2: Node 22 (https, scheduler, firestore triggers)
- Gen1: Node 18 (tiny shim for Auth onCreate)

Deployed

- Auth Profile Create (Gen1)
  - Trigger: `auth.user().onCreate`
  - Behavior: Create/merge `users/{uid}` with default roles and metadata; admin whitelist supported.
- Ensure User Profile (Gen2 Callable)
  - Name: `ensureUserProfile`
  - Behavior: Server‑side ensure/merge of `users/{uid}` in the active database for robustness on first login/registration.
- Registration (Gen2 HTTPS)
  - `createRegistration`: Validates grade (2–8), resolves `gender` path (`boys|girls`), ensures camper exists/creates one, and writes registration to `sessions/{year}/{gender}/{sessionId}/registrations`.
  - Future: payment hooks, waitlist logic, capacity checks.
- Utilities (Gen2)
  - `helloWorld` (private HTTPS) for smoke
  - `dailyHealthCheckV2` (scheduler)
  - `onCamperUpdatedV2` (firestore onUpdate) on `campers/{camperId}` in the active database
  - Backups and auth cleanup tasks

## Local Development

- Use `yarn workspace:web dev` against production Firebase; dev server runs on port 3000 and is Codespaces‑friendly (WSS HMR).
- Helper scripts:
  - `scripts/kill-ports.sh` – free dev ports.
- Devcontainer ensures Corepack/Yarn and installs deps.

## Non-Functional Requirements

- Strict TypeScript, ESLint, and Zod validation on boundaries.
- Unit tests in functions where feasible (Vitest/Jest currently mixed by codebase).
- Observability: Optional Sentry DSN for functions and frontend (TBD rollout).

## Registration Bootstrap (current behavior)

- Client creates/merges `users/{uid}` on registration and first login with retry/backoff.
- Rules allow owner `create` on `/users/{uid}`.
- Server fallback via `ensureUserProfile` callable guarantees profile creation if client write fails.

## Registration UX and Validation (detailed)

1. Session Selection

- Display session name, dates, capacity remaining (e.g., “Spots Available: 15/50”), and cost; sorted by date.
- Start registration via Register/Waitlist action.

2. Guardian Information (once per registration transaction)

- Pre-fill from user profile; allow edits.
- Fields and validation:
  - Full Name (required; at least two words)
  - Email Address (required; valid email)
  - Primary Phone (required; valid 10-digit)
  - Mailing Address (required; non-empty)
  - Emergency Contact Name (required; not same as guardian name)
  - Emergency Contact Phone (required; valid 10-digit)

3. Camper Information (repeatable per child)

- Fields: First Name (req), Last Name (req), Date of Birth (req; valid), T-Shirt Size (req; Youth S/M/L, Adult S/M/L/XL/XXL)
- Cabinmate request: up to two friends with fields {camperName, parentName, parentEmail}; requests require confirmation by those parents; store confirmation status on registration.

4. Health (per camper)

- Required radios with conditional textareas:
  - Allergies? (Yes/No) → details required if Yes
  - Dietary restrictions? (Yes/No) → details required if Yes
  - Medications? (Yes/No) → details required if Yes (name, dosage, frequency)
- Primary Physician (req), Physician Phone (req; 10-digit), Insurance Provider (req), Policy Number (req)

5. Consents (per camper)

- Required checkboxes: Medical Release, Liability Waiver, Photo Release.
- Guardian Signature (text, required; cross-check with Guardian Full Name) and Date (auto, read-only).
- Audit: record guardian uid, camperId, full consent text, and a timestamp for each signature.

6. Payment

- Summary: show cost per camper and total.
- Deposit: $100 to hold spot; total due one month before camp.
- Payment plans and financial assistance; add-ons like message packets per camper.
- Fields validation: Luhn check for card, MM/YY expiry not past, CVV 3–4 digits.

Notes

- Parents cannot change session or self-cancel registrations; an admin workflow will handle cancellations and moves.
- For multi-camper in one session, generate separate registration docs for each child.

## UI Theme

- Light theme by default (white background) with dark blue accents for brand and primary actions.

## Kateri-Chat (Admin; planned)

- Natural language queries over operational data using Vertex AI.
- Example queries: “Most popular session last year?”, “Campers with peanut allergy?”, “Age distribution of current campers?”.
- Outputs: concise summaries and/or tables; export to CSV where appropriate.

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
  - Cabin assignments UI (10 cabins boys, 10 cabins girls) with AI-assisted auto-assign based on requests and age/grade proximity; per-session headcounts.
  - Staff/user assignments per session and gender; scope staff access to assigned sessions.
- Platform
  - CI/CD: Keep “Deploy Firebase Functions” as the single entrypoint; consider pruning the targeted deploy workflows.
  - Auth: WIF-only; document WIF setup and runbook.
  - Observability: Roll out Sentry DSN to frontend and tune sample rate; add a lightweight post-deploy smoke/log step.
  - Rules: Tighten parent-centric checks; add unit/integration tests for critical rules and functions.
  - Backups/Monitoring: Verify daily backups run and wire alerts/dashboards.

Conflict handling

- If any of the above conflicts with prior notes, prefer the requirements outlined here; we’ll confirm choices during implementation of each feature.

---

Document: `docs/blueprint.md` (living). Update as decisions land and features ship.
