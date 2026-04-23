# CogHealth EHR Web

React frontend for the CogHealth EHR system.

> **Full setup instructions:** See the [main README](https://github.com/cogdeasy/demos-coghealth-ehr-data#readme) for complete setup with all three repos.

## Quick Start

**Prerequisites:** Node.js 20.19+ or 22.12+ (required by Vite 7)

```bash
npm install
npm run dev
```

Runs at http://localhost:5173. Requires the [API](https://github.com/COG-GTM/demos-coghealth-ehr-api) to be running first (see its README for Neon DB setup).

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

