# KCM (Kateri Camp Management)

End-to-end camp management platform: registration, rosters, Adyen payments, medical administration records (MAR), photo galleries, reports, and AI tools—built with React + Firebase and CI/CD from GitHub.

## 🎯 Clean-Slate Build Plan

This repository provides a complete, production-ready foundation for modern camp management with:

- **Monorepo Architecture**: Yarn workspaces with `web`, `functions`, and `shared` packages
- **Modern Tech Stack**: React + Vite + TypeScript (web) and Firebase Cloud Functions (Node 20, TS)
- **Type Safety**: Shared types with Zod validation across frontend and backend
- **Firebase Integration**: Firestore database, Authentication, Cloud Functions, and Storage
- **Payment Processing**: Adyen integration for secure payment handling
- **CI/CD Pipeline**: Automated testing, building, and deployment workflows
- **Development Environment**: Codespaces with pre-configured emulators

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Yarn package manager
- Firebase CLI
- Firebase project (create at [Firebase Console](https://console.firebase.google.com))

### Local Development

```bash
# Clone and install dependencies
git clone https://github.com/rph2odbp/KCM.git
cd KCM/kateri-monorepo
yarn install

# Configure Firebase
cp .firebaserc.example .firebaserc
# Edit .firebaserc with your Firebase project ID

# Start development servers
yarn start:emulators  # Firebase emulators
yarn workspace:web dev  # React app (http://localhost:5173)
yarn workspace:functions serve  # Functions emulator
```

### Environment Setup

1. Copy environment files:

   ```bash
   cp kateri-monorepo/packages/web/.env.example kateri-monorepo/packages/web/.env.local
   cp kateri-monorepo/packages/functions/.env.local.example kateri-monorepo/packages/functions/.env.local
   ```

2. Configure Firebase settings in `.env.local` files
3. Set up Adyen test credentials for payment integration

## 🧭 Operations & Phase 0 Foundations

This project is set up with production-minded operations from day one. Key pieces you’ll use most often are summarized here for quick reference.

### Functions Gen 2 and Firestore

- Runtime: Firebase Functions Gen 2 (Node 22), region `us-central1`.
- Named Firestore DB: `kcm-db` (not the default). All triggers and Admin calls use this DB explicitly.

### Backups (Firestore export)

- Daily export function: `backupFirestoreDaily` at 03:00 America/New_York.
- Target bucket: `gs://kcm-firebase-b7d6a-backups` with a 60‑day lifecycle on `firestore-exports/*`.
- Service account: `kcm-backup@kcm-firebase-b7d6a.iam.gserviceaccount.com` (least privilege: Firestore import/export + Storage object admin on the backups bucket).
- Config for functions-gen2 is stored in `.env` at: `kateri-monorepo/packages/functions-gen2/.env.kcm-firebase-b7d6a` with:
  - `FIRESTORE_BACKUP_BUCKET=kcm-firebase-b7d6a-backups`
  - `FIRESTORE_BACKUP_SERVICE_ACCOUNT=kcm-backup@kcm-firebase-b7d6a.iam.gserviceaccount.com`

### Alerts

- Failure alert (log match): fires on `Export failed` from service `backupfirestoredaily` (rate‑limited to 1/hr).
- Missed run alert (absence): fires if `backupfirestoredaily` receives no HTTP requests for ~23h (Cloud Run `request_count`).
- Email channel: verified `ryanhallford.br@gmail.com`.
- Helper script to (re)attach channel to backup alerts: `scripts/attach_backup_alerts.sh`.

### Restore drill (validate backups)

- Script: `scripts/restore_drill.sh`.
- What it does: finds the latest export in `gs://kcm-firebase-b7d6a-backups/firestore-exports/kcm-db/<timestamp>/`, creates a temporary DB `kcm-restore`, runs an import via the Firestore Admin API, polls until complete, and exits when done.
- Cleanup: the script doesn’t delete the DB; delete protection is enabled on create. To remove later, disable delete protection and delete the DB (see Ops runbook or use the commands shown in prior sessions).

### Phase 0 checklist (foundations)

- [x] Gen 2 migration with named Firestore DB
- [x] Backups: daily export to dedicated bucket with lifecycle and least‑privileged SA
- [x] Alerts: failure + missed run, email channel verified
- [x] Restore drill: automated script and successful dry‑run
- [x] CI/CD deploys via GitHub Actions with OIDC
- [ ] Monitoring dashboard: surface request_count, error logs, and backup signals
- [ ] Monthly restore drill reminder (calendar/task)
- [ ] Error tracking/analytics wiring in the web app (as needed)

Dashboard quick link (Monitoring):

- https://console.cloud.google.com/monitoring/dashboards/builder/ca85d400-f5df-4e6d-999c-8c0c8671dbc5?project=kcm-firebase-b7d6a

## 🧩 UX blueprint (GCP Console–inspired)

- Global context switcher: Season/session selector (like GCP project selector).
- Persistent left nav: Dashboard, Camps, Campers, Registrations, Payments, Communications, Reports, Settings.
- Resource list → detail with tabs: Overview, Details, People, Documents, Activity, Permissions.
- Utility bar: search, date/session filter, export, create.
- Role‑based visibility: only show actions the user can perform.
- Material UI recommended for fast, accessible ergonomics.

## 🗺 Phased delivery plan (rough effort)

Assumes Firebase/Firestore + React stack, solo/small team. Ranges reflect unknowns.

- Phase 0 — Foundations & ops (1–2 weeks) [partially done]
  - CI/CD, environments, feature flags, error tracking, analytics
  - SLOs, dashboards, alerts, runbooks
- Phase 1 — Auth, RBAC, and app shell (2–3 weeks)
- Phase 2 — Data model and core entities (3–4 weeks)
- Phase 3 — Payments and billing (3–5 weeks)
- Phase 4 — Forms and compliance (2–4 weeks)
- Phase 5 — Check‑in/out and operations (2–4 weeks)
- Phase 6 — Communications (2–3 weeks)
- Phase 7 — Reporting and exports (2–3 weeks)
- Phase 8 — Quality, polish, accessibility (2–4 weeks)
- Phase 9 — Hardening and scale (1–2 weeks)

Estimated new work remaining for a “complete” system: ~75–85% (MVP‑plus ~4–7 months depending on scope and parallelism).

For detailed operations notes, see `docs/ops/README.md`.

## 📁 Repository Structure

```
KCM/
├── .github/                    # GitHub workflows and templates
│   ├── workflows/
│   │   ├── ci.yml             # Lint, typecheck, test, build
│   │   ├── deploy-functions.yml # Production deployment
│   │   └── codeql.yml         # Security analysis
│   ├── ISSUE_TEMPLATE/        # Issue forms
│   └── pull_request_template.md
├── .devcontainer/             # Codespaces configuration
├── docs/
│   └── adr/                   # Architecture Decision Records
├── firebase.json              # Firebase configuration
├── .firebaserc               # Firebase project aliases
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Firestore indexes
└── kateri-monorepo/          # Main monorepo
    ├── packages/
    │   ├── shared/           # Shared types and utilities (Zod schemas)
    │   ├── web/              # React frontend (Vite + TypeScript)
    │   └── functions/        # Firebase Cloud Functions (Node 20 + TS)
    └── package.json          # Workspace configuration
```

## 🛠 Development Commands

### Root Level

```bash
# Install all dependencies
yarn install

# Run linting across all packages
yarn lint

# Run type checking across all packages
yarn typecheck

# Run tests across all packages
yarn test

# Build all packages
yarn build

# Format code
yarn format
```

### Web App Commands

```bash
# Development server
yarn workspace:web dev

# Build for production
yarn workspace:web build

# Preview production build
yarn workspace:web preview

# Run tests
yarn workspace:web test

# Storybook (when configured)
yarn workspace:web storybook
```

### Functions Commands

```bash
# Local development with emulators
yarn workspace:functions serve

# Build functions
yarn workspace:functions build

# Deploy to Firebase
yarn workspace:functions deploy

# Run tests
yarn workspace:functions test
```

### Shared Package Commands

```bash
# Build shared types
yarn workspace:shared build

# Run tests
yarn workspace:shared test
```

## 🔧 CI/CD Pipeline

### Automated Checks (PR and Push)

- **Linting**: ESLint across all packages
- **Type Checking**: TypeScript compilation
- **Testing**: Unit and integration tests
- **Building**: Production builds
- **Security**: CodeQL analysis

### Deployment Pipeline

- **Environment Gating**: Deploy only from `main` branch with environment approval
- **Functions Deployment**: Automated deployment to Firebase via GitHub Actions
- **Web Deployment**: Firebase App Hosting (configured separately)

### Branch Protection

- Require PR reviews
- Require status checks to pass
- Squash-only merge strategy

## 🛡 Security & Environments

### GitHub Environments

- **dev**: Development environment with test Firebase project
- **staging**: Staging environment for pre-production testing
- **prod**: Production environment with live Firebase project

### Secret Management

Secrets are managed through GitHub Environment secrets:

- `FIREBASE_SERVICE_ACCOUNT`: Service account for deployment
- `ADYEN_*`: Payment processing credentials
- Environment-specific configuration variables

### Firestore Security

- Role-based access control with custom claims
- Least-privilege security rules
- Separate collections for different user types (guardians, staff, admin, medic)

#### Updating & Deploying Firestore Rules (Automation Ready)

Workflow for safe prod changes:

1. Edit `firestore.rules` locally.
2. (Optional) Run a dry run (lint/compile) — Firestore has limited tooling; for structural diff just use git:

```bash
git diff firestore.rules
```

3. Deploy ONLY rules (avoids touching functions/hosting):

```bash
yarn --cwd kateri-monorepo deploy:rules
```

4. Verify in console (Firestore -> Rules) and exercise a restricted action in the app.
5. Rollback (if needed) via git:

```bash
git checkout HEAD~1 firestore.rules && yarn --cwd kateri-monorepo deploy:rules
```

Emergency temporary bypass (session writes) rollback patch is stored at `scripts/rollback-dev-bypass.patch`:

```bash
git apply scripts/rollback-dev-bypass.patch
yarn --cwd kateri-monorepo deploy:rules
```

Immediately revert the patch after emergency by resetting the file and redeploying.

Seeding (idempotent) for production minimal bootstrap:

```bash
node scripts/seed-production.mjs <adminEmail> 2026
```

Requires the target admin to have already authenticated once so an Auth user exists. The script will ensure `roles` contains `admin` and create a placeholder session skeleton if a year is supplied.

### Keyless Deploys (Workload Identity Federation)

Production deploy workflows use GitHub OIDC + Google Workload Identity Federation—no static JSON keys or firebase login:ci tokens.

Setup (one-time in GCP):

1. gcloud iam workload-identity-pools create kcm-pool --project kcm-firebase-b7d6a --location=global --display-name="GitHub OIDC"
2. gcloud iam workload-identity-pools providers create-oidc github --project kcm-firebase-b7d6a --location=global --workload-identity-pool=kcm-pool --display-name="GitHub" --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" --issuer-uri="https://token.actions.githubusercontent.com"
3. Create service account: deploy-bot@kcm-firebase-b7d6a.iam.gserviceaccount.com
4. Grant minimal roles to the SA (adjust as needed):

- roles/firebase.developAdmin (or narrower: roles/cloudfunctions.developer + roles/run.admin + roles/iam.serviceAccountUser + roles/firebaserules.admin + roles/datastore.indexAdmin)
- roles/iam.serviceAccountTokenCreator (if chaining impersonation)

5. Allow GitHub repo to impersonate:
   gcloud iam service-accounts add-iam-policy-binding deploy-bot@kcm-firebase-b7d6a.iam.gserviceaccount.com \
    --project kcm-firebase-b7d6a \
    --role roles/iam.workloadIdentityUser \
    --member "principalSet://iam.googleapis.com/projects/$(gcloud projects describe kcm-firebase-b7d6a --format=value(projectNumber))/locations/global/workloadIdentityPools/kcm-pool/attribute.repository/rph2odbp/KCM"
6. Save values as GitHub repo secrets:

- GCP_WORKLOAD_IDENTITY_PROVIDER: projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/kcm-pool/providers/github
- GCP_SERVICE_ACCOUNT_EMAIL: deploy-bot@kcm-firebase-b7d6a.iam.gserviceaccount.com

Workflows (`deploy-*.yml`) now call google-github-actions/auth with id-token permissions and deploy using short‑lived federated credentials. No firebase token or JSON key required.

## 🎯 Feature Roadmap

### Phase 1: Core Infrastructure ✅

- [x] Repository scaffolding and configuration
- [x] Monorepo setup with Yarn workspaces
- [x] CI/CD pipeline with GitHub Actions
- [x] Firebase integration and emulators
- [x] Type-safe development environment

### Phase 2: Authentication & User Management

- [ ] Firebase Authentication integration
- [ ] User roles and permissions system
- [ ] Profile management for guardians, staff, and admin
- [ ] Custom claims for role-based access

### Phase 3: Camper Registration System

- [ ] Multi-step registration forms with validation
- [ ] Guardian account creation and management
- [ ] Medical information collection (allergies, medications, conditions)
- [ ] Emergency contact management
- [ ] Document upload (medical forms, insurance cards)

### Phase 4: Medical Administration Records (MAR)

- [ ] Digital medication tracking system
- [ ] Medical professional dashboard
- [ ] Incident reporting and documentation
- [ ] Medical history and health records
- [ ] Integration with registration medical data

### Phase 5: Payment Processing (Adyen)

- [ ] Secure payment integration with Adyen
- [ ] Registration fee processing
- [ ] Payment plans and installments
- [ ] Refund management system
- [ ] Financial reporting and reconciliation

### Phase 6: Photo Gallery & Media Management

- [ ] Secure photo upload and storage
- [ ] Permission-based photo sharing
- [ ] Guardian access to child's photos only
- [ ] Batch photo upload for staff
- [ ] Privacy controls and consent management

### Phase 7: Reporting & Analytics

- [ ] Camper roster generation
- [ ] Medical reports for healthcare staff
- [ ] Financial reports and summaries
- [ ] Attendance tracking and reporting
- [ ] Custom report builder

### Phase 8: AI-Powered Features

- [ ] Intelligent form completion assistance
- [ ] Medical data pattern recognition
- [ ] Automated report generation
- [ ] Smart photo organization and tagging
- [ ] Predictive analytics for camp planning

### Phase 9: Advanced Features

- [ ] Mobile app development (React Native)
- [ ] Real-time notifications and messaging
- [ ] Integration with external health systems
- [ ] Advanced scheduling and resource management
- [ ] Multi-camp support and management

## 🤝 Contributing

This repository supports Discussions and Projects for community collaboration:

- **Discussions**: Enabled for questions, ideas, and community feedback
- **Projects**: Enabled for roadmap tracking and feature planning

### Development Process

1. Check existing issues and discussions before creating new ones
2. Create feature branch from `main`
3. Implement changes with tests and documentation
4. Open PR with comprehensive description and testing details
5. Await review and approval from code owners
6. Squash and merge after approval

### Important Notes

- **Feature builds require owner confirmation** before deployment
- All changes must pass CI checks (lint, typecheck, test, build)
- Security considerations must be documented for user data handling
- Medical data features require additional compliance review

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Note**: This is a comprehensive camp management system handling sensitive data including medical records and payment information. All development should follow security best practices and relevant compliance requirements.
