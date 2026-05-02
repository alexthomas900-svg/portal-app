# FCC Faculty Promotion Portal

Faculty Promotion Portal for Forman Christian College (A Chartered University), aligned with HEC Pakistan criteria for Associate Professor and Full Professor promotions.

## Tech Stack

- **React 19** + TypeScript
- **Vite** build tooling
- **Tailwind CSS v4** for styling
- **Firebase** (Auth, Firestore, Storage, Hosting)
- **Render** (Node/Express backend API)
- **GitHub Actions** CI/CD with PR preview deploys

## Features

- 🔐 **Role-Based Access Control** — Faculty, Internal Reviewer, External Reviewer, Admin
- 📝 **11-Step Application Form** — Personal info, qualifications, experience, publications, teaching, efforts to improve, scholarship, research statement, services, documents, declaration
- 📊 **Eligibility Engine** — Auto-evaluates VET, PhD, experience, publications against HEC criteria
- 📄 **APA 7 Generator** — Automatic citation formatting for publications
- 📎 **Document Management** — PDF uploads for all required documents (cover letter, degrees, CV, etc.)
- ⭐ **Scoring System** — Teaching (45), Efforts (20), Scholarship (25), Services (20) = 110 total
- 👥 **Internal Review** — Section-wise comments + recommendation per application
- 🌐 **External Review** — CV-only access + structured narrative evaluation
- 🛡️ **Admin Dashboard** — Full system control, user management, status tracking
- 🚀 **Automated CI/CD** — PR preview URLs + auto-deploy to production

## Getting Started

### 1. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password + Google provider)
3. Enable **Cloud Firestore**
4. Enable **Firebase Storage**
5. Enable **Firebase Hosting**

### 2. Render Backend Setup

Create a Render Web Service from the `backend/` folder:

You can use the included `render.yaml` blueprint for one-click setup, or create the service manually.

1. Runtime: **Node**
2. Build command: `npm ci && npm run build`
3. Start command: `npm run start`
4. Set environment variables from `backend/.env.example`
5. Copy your Render URL (example: `https://your-api.onrender.com`)

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cp .env.example .env
```

Set the backend API URL in `.env`:

```bash
VITE_API_URL=https://your-api.onrender.com
```

### 4. Install & Run

```bash
npm install
npm run dev
```

### 5. Deploy

```bash
npm run hosting:deploy
```

## CI/CD Workflow

The project uses the same CI/CD pattern as your notes-app:

1. **Create a GitHub issue** describing the change
2. **Create a branch** and open a PR
3. GitHub Actions automatically builds and deploys a **preview URL** (commented on the PR)
4. **Review and merge** — push to `main` auto-deploys to production
5. Optional: production workflow can trigger Render deploy via webhook

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project id used for deploy target |
| `VITE_FB_API_KEY` | Firebase API key |
| `VITE_FB_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FB_PROJECT_ID` | Firebase project ID |
| `VITE_FB_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FB_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FB_APP_ID` | Firebase app ID |
| `VITE_API_URL` | Render backend URL used by frontend builds |
| `FIREBASE_TOKEN` | Firebase CLI token (`npx firebase-tools login:ci`) |
| `RENDER_DEPLOY_HOOK_URL` | Optional Render deploy hook for auto backend redeploy on `main` |

## Recommended Deployment Model

- Frontend: Firebase Hosting (preview channels + production)
- Backend/API: Render Web Service
- Data/Auth/Files: Firebase (Firestore/Auth/Storage)

This keeps branch preview URLs and automatic production deploys in GitHub Actions while avoiding frontend runtime failures caused by missing API base URLs.

## Project Structure

```
src/
├── App.tsx                          # Router with role-based guards
├── firebase.ts                      # Firebase initialization
├── types.ts                         # All TypeScript types & scoring constants
├── contexts/AuthContext.tsx          # Auth state management
├── services/
│   ├── auth.ts                      # Authentication (email + Google)
│   ├── applications.ts              # CRUD for promotion applications
│   ├── reviews.ts                   # Internal + external review operations
│   └── storage.ts                   # PDF document uploads
├── utils/
│   ├── eligibility.ts               # Eligibility engine (HEC criteria)
│   └── apa.ts                       # APA 7 citation generator
├── components/
│   ├── auth/                        # SignIn, Register
│   ├── layout/                      # Sidebar, Header, DashboardLayout
│   ├── shared/                      # ProgressBar, FileUpload, StatusBadge
│   ├── faculty/                     # Dashboard, ApplicationForm, ApplicationView
│   │   └── steps/                   # 11 form step components
│   ├── reviewer/                    # Internal + External dashboards & forms
│   └── admin/                       # AdminDashboard, UserManagement
```

## Firestore Security

Security rules enforce strict RBAC:
- Faculty can only read/write their own draft applications
- Internal reviewers can read all submitted applications
- External reviewers can only access updated CVs
- Admin has full access

## License

Proprietary — Forman Christian College (A Chartered University)
