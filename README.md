# CogHealth EHR Web

React frontend for the CogHealth EHR system.

> **Full setup instructions:** See the [data repo README](https://github.com/COG-GTM/demos-coghealth-ehr-data#readme) for complete setup with all three repos.
>
> **Architecture:** See [docs/architecture.md](docs/architecture.md) for the pages, services, data flow and an editable diagram.

## Quick Start

**Prerequisites:** Node.js 20.19+ or 22.12+ (required by Vite 7)

```bash
npm install
npm run dev
```

Runs at http://localhost:5173. Requires the [API](https://github.com/COG-GTM/demos-coghealth-ehr-api) to be running first (see its README for Neon DB setup).

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- React Router 7
- lucide-react icons
- Jest + Puppeteer (end-to-end tests)

Page state is plain React state; `zustand` and `@tanstack/react-query` are installed but not used yet.

## Project Structure

```
src/
├── App.tsx          # Router, header, session timeout, status bar
├── components/
│   ├── patient/     # PatientBanner
│   └── ui/          # Modal, print / e-Prescribe / order dialogs
├── pages/           # One component per route
├── services/        # API client, patient/provider/encounter services, audit log
└── types/           # API payload types
tests/
└── e2e.test.ts      # Puppeteer end-to-end suite
```

## Testing

```bash
npm run lint
npm run build
npm run dev &            # e2e tests drive http://localhost:5173
npx jest --testPathPatterns=tests/e2e
```

The e2e suite needs the dev server and the API running. `npm run test:e2e` passes `--testPathPattern`, which Jest 30 no longer accepts, so call Jest directly as above. CI runs lint and build but no tests.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:8080/api |
