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
