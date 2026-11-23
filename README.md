# CogHealth EHR Web

React frontend for the CogHealth EHR system.

> **Full setup instructions:** See the [data repo README](https://github.com/COG-GTM/demos-coghealth-ehr-data#readme) for complete setup with all three repos.

## Quick Start

**Prerequisites:** Node.js 20.19+ or 22.12+ (required by Vite 7)

```bash
npm install
npm run dev
```

Runs at http://localhost:5173. Requires the [API](https://github.com/COG-GTM/demos-coghealth-ehr-api) running at http://localhost:8080/api first. Its README covers the shared Neon DB, which needs credentials from your team lead.

Without Neon credentials, run the API against a local PostgreSQL instead (needs Docker, Java 11+ and Maven); Flyway creates the schema and seeds demo patients on first start:

```bash
docker run -d --name ehr-postgres -p 5432:5432 \
  -e POSTGRES_DB=medchart_ehr -e POSTGRES_USER=medchart -e POSTGRES_PASSWORD=medchart_dev \
  postgres:14

# in your demos-coghealth-ehr-api checkout
mvn spring-boot:run
```

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Zustand

## Project Structure

```
src/
├── components/      # UI components
├── pages/           # Page components
├── services/        # API services
├── stores/          # Zustand stores
├── types/           # TypeScript types
└── utils/           # Utilities
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:8080/api |
