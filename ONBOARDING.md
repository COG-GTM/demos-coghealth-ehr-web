# CogHealth EHR Web - Developer Onboarding

This document covers the frontend web application repository in detail. For the full cross-repo system overview, see the [ONBOARDING.md in demos-coghealth-ehr-data](https://github.com/COG-GTM/demos-coghealth-ehr-data/blob/main/ONBOARDING.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Routing & Pages](#routing--pages)
6. [Components](#components)
7. [Services (API Layer)](#services-api-layer)
8. [Type Definitions](#type-definitions)
9. [State Management](#state-management)
10. [Client-Side Audit Logging](#client-side-audit-logging)
11. [Session Security](#session-security)
12. [Styling & Theming](#styling--theming)
13. [Environment Variables](#environment-variables)
14. [Build & Test](#build--test)
15. [CI Pipeline](#ci-pipeline)
16. [HIPAA Compliance (Frontend)](#hipaa-compliance-frontend)
17. [Related Repositories](#related-repositories)

---

## Overview

`demos-coghealth-ehr-web` is the React frontend for the CogHealth EHR demo application. It provides a clinical workstation UI where healthcare professionals can manage patients, encounters, medications, lab results, and more.

**Key facts:**
- React 19 with TypeScript
- Vite 7 for development and builds
- Tailwind CSS 4 for styling (with a custom Windows XP-inspired EHR theme)
- TanStack Query for server state / API data fetching
- Zustand for client state management
- Client-side HIPAA audit logging (localStorage-based for demo)
- 15-minute session timeout with activity tracking

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type-safe JavaScript |
| Vite | 7.2.4 | Build tool & dev server |
| Tailwind CSS | 4.1.4 | Utility-first CSS framework |
| TanStack Query | 5.90.19 | Server state management & caching |
| Zustand | 5.0.10 | Client state management |
| React Router | 7.12.0 | Client-side routing |
| React Hook Form | 7.56.4 | Form handling |
| Zod | 4.0.0-beta.20250512 | Schema validation |
| Lucide React | 0.562.0 | Icon library |
| Recharts | 2.15.3 | Charts & data visualization |
| ESLint | 9.28.0 | Linting |
| Jest | 30.0.4 | Unit testing |
| Puppeteer | 24.9.0 | E2E testing |
| @testing-library/react | 16.3.0 | React component testing |

---

## Project Structure

```
src/
├── main.tsx                        # Entry point - renders App in StrictMode
├── App.tsx                         # Root component
│                                   # - BrowserRouter with all routes
│                                   # - Navigation bar (header + toolbar)
│                                   # - Global patient search
│                                   # - Session timeout management
│                                   # - Logout confirmation dialogs
├── App.css                         # Global styles (EHR theme, Windows XP look)
├── index.css                       # Tailwind CSS imports
│
├── pages/                          # Route-level page components
│   ├── DashboardPage.tsx           # Overview: metrics, alerts, recent patients, tasks
│   ├── PatientSearchPage.tsx       # Patient search with results table
│   ├── PatientChartPage.tsx        # Full patient chart with tabbed sections:
│   │                               #   Demographics, Encounters, Problems,
│   │                               #   Medications, Labs, Vitals, Notes, Insurance
│   ├── SchedulePage.tsx            # Provider scheduling calendar
│   ├── LabResultsPage.tsx          # Lab results viewer with panels
│   ├── VitalsPage.tsx              # Vitals flowsheet with trending
│   ├── MedicationsPage.tsx         # Medication orders and administration
│   ├── ReportsPage.tsx             # Report generation and viewing
│   └── SettingsPage.tsx            # System settings and configuration
│
├── components/
│   ├── patient/                    # Patient-specific components
│   │   ├── PatientBanner.tsx       # Patient identity bar (name, MRN, DOB, allergies)
│   │   ├── PatientSearch.tsx       # Search input + results dropdown
│   │   └── index.ts               # Barrel exports
│   └── ui/                         # Reusable UI components
│       ├── Badge.tsx               # Color-coded status badges
│       ├── Button.tsx              # Styled button variants
│       ├── Card.tsx                # Card container with header
│       ├── Input.tsx               # Form input with label and validation
│       ├── LoadingOverlay.tsx      # Full-screen loading spinner
│       ├── Modal.tsx               # AlertDialog & ConfirmDialog
│       ├── OrderDialog.tsx         # Lab/radiology order entry form
│       ├── PrescriptionDialog.tsx  # Prescription writing form
│       ├── PrintDialog.tsx         # Print preview with audit logging
│       └── index.ts               # Barrel exports
│
├── services/                       # API communication layer
│   ├── api.ts                      # Base HTTP client (fetch wrapper)
│   │                               # - Configurable base URL via VITE_API_URL
│   │                               # - JSON Content-Type headers
│   │                               # - Query parameter serialization
│   │                               # - Typed get/post/put/delete methods
│   ├── patientService.ts           # Patient API: getById, getByMrn, search, create, update
│   ├── encounterService.ts         # Encounter API: CRUD + lifecycle + queries
│   ├── auditService.ts             # Client-side audit logging (localStorage)
│   └── index.ts                    # Barrel exports
│
├── types/                          # TypeScript type definitions
│   ├── patient.ts                  # Patient, Address, EmergencyContact, Gender,
│   │                               # MaritalStatus, IdentifierType, PatientSearchResult
│   ├── encounter.ts                # Encounter, EncounterType, EncounterStatus,
│   │                               # EncounterPriority
│   ├── medication.ts               # Medication, MedicationOrder, DrugSchedule,
│   │                               # MedicationOrderStatus
│   ├── lab.ts                      # LabResult, LabPanel
│   ├── vitals.ts                   # VitalReading, VitalSign
│   └── index.ts                    # Barrel exports
│
└── assets/                         # Static assets (images, icons)
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (20 recommended)
- npm

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Frontend available at http://localhost:5173
```

### Running with the Backend

For full functionality, start the backend services first:

```bash
# Terminal 1: Infrastructure (from data repo)
cd ../demos-coghealth-ehr-data
docker-compose up -d
docker exec -i coghealth-postgres psql -U coghealth coghealth < seed.sql

# Terminal 2: API (from API repo)
cd ../demos-coghealth-ehr-api
mvn spring-boot:run

# Terminal 3: Frontend (this repo)
npm run dev
```

### Running Frontend Only (Mock Data)

The frontend can run standalone with limited functionality. Patient search in the navigation bar uses hardcoded mock data. API-dependent features will show errors or empty states.

---

## Routing & Pages

Routes are defined in `App.tsx`:

| Path | Component | Description |
|---|---|---|
| `/` | `DashboardPage` | Overview dashboard with metrics, alerts, recent patients |
| `/patients` | `PatientSearchPage` | Patient search with results table |
| `/patients/:id` | `PatientChartPage` | Full patient chart (tabbed) |
| `/schedule` | `SchedulePage` | Provider scheduling calendar |
| `/labs` | `LabResultsPage` | Lab results viewer |
| `/vitals` | `VitalsPage` | Vitals flowsheet with trending |
| `/medications` | `MedicationsPage` | Medication management |
| `/reports` | `ReportsPage` | Report generation |
| `/settings` | `SettingsPage` | System settings |

### Navigation

The app has a two-tier navigation:

1. **Header bar** (dark blue) - App branding, global patient search, session timer, user info, logout
2. **Toolbar** (light gray) - Page navigation tabs with icons, current date/time

Navigation items with icons:
- Dashboard (LayoutDashboard)
- Patients (Users)
- Schedule (Calendar)
- Lab Results (FlaskConical)
- Vitals (Activity)
- Medications (Pill)
- Reports (FileText)
- Settings (Settings)

---

## Components

### Patient Components (`components/patient/`)

**PatientBanner** - Displays patient identity bar at top of chart:
- Name, MRN, DOB, age, gender
- Allergy alerts
- Active encounter status

**PatientSearch** - Search form with typeahead:
- Minimum 2 characters to trigger search
- Displays results in dropdown with name, MRN, DOB
- Navigates to patient chart on selection

### UI Components (`components/ui/`)

All UI components follow the Windows XP-inspired EHR theme with:
- Small font sizes (10-12px)
- Gray gradient backgrounds
- Raised/sunken border effects
- Blue accent colors

**Modal** exports two variants:
- `AlertDialog` - Information display with single "OK" button
- `ConfirmDialog` - Confirm/cancel with customizable button text and type (warning/info)

**OrderDialog** - Full order entry form for labs/radiology with:
- Test selection, priority, clinical indication
- Ordering provider, specimen requirements
- Audit logging on order creation

**PrescriptionDialog** - Prescription writing with:
- Medication search, dose, route, frequency
- Quantity, refills, days supply
- DAW (Dispense As Written) flag
- Pharmacy selection
- Controlled substance warnings
- Audit logging on prescription creation

**PrintDialog** - Print preview with:
- Document type selection
- Audit logging of all print events (HIPAA requirement)

---

## Services (API Layer)

### Base HTTP Client (`api.ts`)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = {
  get: <T>(endpoint: string, params?) => request<T>(endpoint, { method: 'GET', params }),
  post: <T>(endpoint: string, data?) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data?) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
```

Features:
- Automatic `Content-Type: application/json` header
- Query parameter serialization (filters out `undefined` values)
- Typed responses via generics
- Error handling with status code and message

### Patient Service (`patientService.ts`)

| Method | Endpoint | Description |
|---|---|---|
| `getById(id)` | `GET /v1/patients/{id}` | Fetch patient by ID |
| `getByMrn(mrn)` | `GET /v1/patients/mrn/{mrn}` | Fetch patient by MRN |
| `search(query, page, size)` | `GET /v1/patients/search` | Search with pagination |
| `create(patient)` | `POST /v1/patients` | Create new patient |
| `update(id, patient)` | `PUT /v1/patients/{id}` | Update patient |

### Encounter Service (`encounterService.ts`)

| Method | Endpoint | Description |
|---|---|---|
| `getById(id)` | `GET /v1/encounters/{id}` | Fetch encounter |
| `getByNumber(num)` | `GET /v1/encounters/number/{num}` | Fetch by encounter number |
| `getByPatient(patientId)` | `GET /v1/encounters/patient/{id}` | Patient's encounters |
| `getByProvider(providerId)` | `GET /v1/encounters/provider/{id}` | Provider's encounters |
| `getProviderSchedule(id, date)` | `GET /v1/encounters/provider/{id}/schedule` | Daily schedule |
| `getByDateRange(start, end)` | `GET /v1/encounters/date-range` | Date range query |
| `getByStatus(status)` | `GET /v1/encounters/status/{status}` | Filter by status |
| `create(encounter)` | `POST /v1/encounters` | Create encounter |
| `update(id, encounter)` | `PUT /v1/encounters/{id}` | Update encounter |
| `checkIn(id)` | `POST /v1/encounters/{id}/check-in` | Check in patient |
| `start(id)` | `POST /v1/encounters/{id}/start` | Start encounter |
| `complete(id, notes?)` | `POST /v1/encounters/{id}/complete` | Complete encounter |
| `cancel(id)` | `POST /v1/encounters/{id}/cancel` | Cancel encounter |
| `markNoShow(id)` | `POST /v1/encounters/{id}/no-show` | Mark as no-show |

---

## Type Definitions

### Patient Types (`types/patient.ts`)

```typescript
interface Patient {
  id?: number;
  mrn?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: Gender;                    // 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN'
  maritalStatus?: MaritalStatus;
  email?: string;
  phoneHome?: string;
  phoneMobile?: string;
  address?: Address;
  identifiers?: PatientIdentifier[];  // MRN, SSN, insurance IDs, etc.
  emergencyContacts?: EmergencyContact[];
  active?: boolean;
  deceased?: boolean;
}
```

### Encounter Types (`types/encounter.ts`)

```typescript
interface Encounter {
  id?: number;
  encounterNumber?: string;
  patientId: number;
  attendingProviderId?: number;
  encounterType: EncounterType;       // OUTPATIENT, INPATIENT, EMERGENCY, TELEHEALTH, etc.
  status: EncounterStatus;            // PLANNED, ARRIVED, IN_PROGRESS, FINISHED, etc.
  encounterDateTime: string;
  chiefComplaint?: string;
  priority?: EncounterPriority;       // STAT, URGENT, ROUTINE, ELECTIVE
}
```

### Medication Types (`types/medication.ts`)

```typescript
interface Medication {
  id?: number;
  ndcCode?: string;
  rxnormCode?: string;
  genericName: string;
  brandName?: string;
  strength?: string;
  schedule?: DrugSchedule;            // SCHEDULE_I through SCHEDULE_V, NON_CONTROLLED
  controlled?: boolean;
}

interface MedicationOrder {
  // Full prescription details including dose, frequency,
  // route, quantity, refills, pharmacy info, etc.
  status: MedicationOrderStatus;      // DRAFT, PENDING, ACTIVE, COMPLETED, etc.
}
```

### Lab Types (`types/lab.ts`)

```typescript
interface LabResult {
  id: number;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
}

interface LabPanel {
  panelName: string;
  status: 'final' | 'preliminary' | 'pending';
  results: LabResult[];
}
```

### Vitals Types (`types/vitals.ts`)

```typescript
interface VitalReading {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  painLevel?: number;
}
```

---

## State Management

### Server State (TanStack Query)

TanStack Query handles all API data:
- Automatic caching and refetching
- Loading/error states
- Pagination support
- Background data synchronization

### Client State (Zustand)

Zustand stores manage local UI state:
- Selected patient context
- UI preferences
- Form state

---

## Client-Side Audit Logging

The `auditService.ts` provides HIPAA-compliant event logging on the frontend:

### Event Types

```typescript
type AuditEventType =
  | 'LOGIN' | 'LOGOUT' | 'SESSION_TIMEOUT'
  | 'PATIENT_ACCESS' | 'PATIENT_SEARCH'
  | 'PHI_VIEW' | 'PHI_PRINT' | 'PHI_EXPORT'
  | 'ORDER_CREATE' | 'ORDER_SIGN'
  | 'NOTE_CREATE' | 'NOTE_SIGN'
  | 'PRESCRIPTION_CREATE'
  | 'SETTINGS_CHANGE' | 'FAILED_LOGIN';
```

### Convenience Functions

| Function | Event Type | When Used |
|---|---|---|
| `logPatientAccess(id, mrn, name)` | `PATIENT_ACCESS` | Opening a patient chart |
| `logPatientSearch(query, count)` | `PATIENT_SEARCH` | Performing patient search |
| `logPHIView(patientId, type, id)` | `PHI_VIEW` | Viewing PHI (notes, results) |
| `logPrint(patientId?, docType?)` | `PHI_PRINT` | Printing any document |
| `logPrescription(patientId, med)` | `PRESCRIPTION_CREATE` | Creating a prescription |
| `logOrder(patientId, type, details)` | `ORDER_CREATE` | Creating an order |
| `logLogout(reason)` | `LOGOUT`/`SESSION_TIMEOUT` | Manual or timeout logout |

### Storage

- Events stored in `localStorage` under key `coghealth_audit_log`
- Maximum 1,000 entries (oldest are purged)
- Each event includes: timestamp, userId, userName, userRole, sessionId, ipAddress

> **Note:** This is a demo implementation. A production system would send audit events to the backend API for server-side persistence.

---

## Session Security

Defined in `App.tsx`:

| Setting | Value | Description |
|---|---|---|
| Session timeout | 15 minutes | Total inactivity before forced logout |
| Warning threshold | 2 minutes | Time before expiry when warning appears |
| Activity events | click, keypress | Events that reset the timer |

### Session Flow

1. Timer counts down from 15 minutes
2. Any click or keypress resets the timer
3. At 2 minutes remaining: `ConfirmDialog` warns user
4. User can click "Continue Session" to reset or "Logout Now"
5. At 0 minutes: `AlertDialog` forces logout
6. Logout calls `logLogout()` audit event and reloads the page

---

## Styling & Theming

The app uses a **Windows XP-inspired EHR theme** designed to look like a traditional healthcare application:

### Theme Characteristics
- Small, dense UI (10-12px fonts)
- Tahoma font family
- Gray gradients (`#ece9d8` to `#d4d0c8`) mimicking Windows XP
- Blue header bar with gradient
- Raised/sunken borders on interactive elements
- Status bar at bottom showing HIPAA status, encryption, and sync info

### CSS Structure
- `index.css` - Tailwind CSS imports and base styles
- `App.css` - Custom EHR theme classes:
  - `.ehr-header` - Dark blue gradient header
  - `.ehr-toolbar` - Gray gradient toolbar
  - `.ehr-toolbar-button` - Navigation tab buttons
  - `.ehr-toolbar-button-active` - Active tab state

### Tailwind Usage
- Utility classes for layout, spacing, typography
- Custom color values inline (e.g., `bg-[#ece9d8]`)
- Responsive: mobile menu toggles visibility at `md:` breakpoint

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api` | Backend API base URL |

Set in `.env` or `.env.local`:
```bash
VITE_API_URL=http://localhost:8080/api
```

---

## Build & Test

```bash
# Development server (hot reload)
npm run dev                    # http://localhost:5173

# Lint
npm run lint

# Build for production
npm run build                  # Output in dist/

# Preview production build
npm run preview

# Run unit tests
npm test

# Run tests (CI mode, skip E2E)
npm test -- --testPathIgnorePatterns=e2e --passWithNoTests

# Run E2E tests
npm run test:e2e
```

---

## CI Pipeline

Defined in `.github/workflows/ci.yml`. Runs on push/PR to `main`.

| Step | Command |
|---|---|
| Setup Node.js 20 | `actions/setup-node@v4` with npm cache |
| Install | `npm ci` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Test | `npm test -- --testPathIgnorePatterns=e2e --passWithNoTests` |

---

## HIPAA Compliance (Frontend)

A detailed HIPAA compliance checklist is maintained in `HIPAA_COMPLIANCE.md`. Key frontend compliance features:

### Implemented
- Session timeout (15 min inactivity)
- Audit logging of all PHI access events
- Print audit trail
- Encrypted connection indicators (TLS 1.3 shown in status bar)
- Role-based UI elements (planned)
- Patient search audit logging

### Recommended for Production
- Server-side session management (replace localStorage audit)
- Content Security Policy headers
- Automatic screen lock
- Watermarking on printed documents
- Screen capture prevention
- Granular field-level access controls

See `HIPAA_COMPLIANCE.md` for the complete checklist with status indicators.

---

## Related Repositories

| Repo | Description | Link |
|---|---|---|
| `demos-coghealth-ehr-data` | Infrastructure, database schema, seed data, main onboarding doc | [GitHub](https://github.com/COG-GTM/demos-coghealth-ehr-data) |
| `demos-coghealth-ehr-api` | Spring Boot backend API | [GitHub](https://github.com/COG-GTM/demos-coghealth-ehr-api) |

---

*See the [full cross-repo onboarding guide](https://github.com/COG-GTM/demos-coghealth-ehr-data/blob/main/ONBOARDING.md) for the complete system overview.*
