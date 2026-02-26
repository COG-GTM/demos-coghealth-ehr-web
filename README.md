# Singapore ATS - Applicant Tracking System

A full-stack Applicant Tracking System built for tracking candidates in Singapore, with Singapore-specific fields like work pass types, NRIC/FIN, and SGD salary tracking.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM

## Features

- **Dashboard** - Overview with key metrics and pipeline visualization
- **Candidates** - Full CRUD with Singapore-specific fields (work pass type, NRIC/FIN, nationality, SGD salary)
- **Jobs** - Job postings management with salary ranges in SGD
- **Pipeline** - Kanban-style board tracking applications through stages (Applied, Screening, Interview, Offer, Hired, Rejected)

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database (Neon recommended)

### Backend
```bash
cd backend
npm install
# Set DATABASE_URL in .env
npm run db:migrate
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend proxies API requests to `http://localhost:3001` during development.

## API Endpoints

- `GET/POST /api/candidates` - List/create candidates
- `GET/PUT/DELETE /api/candidates/:id` - Get/update/delete candidate
- `GET/POST /api/jobs` - List/create jobs
- `GET/PUT/DELETE /api/jobs/:id` - Get/update/delete job
- `GET/POST /api/applications` - List/create applications
- `PATCH /api/applications/:id/stage` - Update application stage
- `GET /api/dashboard/stats` - Dashboard statistics
