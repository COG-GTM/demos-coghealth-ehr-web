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

Without Neon credentials, run the API against a throwaway local PostgreSQL instead (needs Docker, Java 11 to 21 and Maven; JDK 24+ fails to compile the API's Lombok version). Flyway creates the schema and seeds demo patients on first start. Run these in a shell without other `SPRING_*`, `SERVER_*` or `DB_*` exports (e.g. `SPRING_FLYWAY_URL`, `SERVER_PORT`, `SERVER_SERVLET_CONTEXT_PATH` from another setup), which Spring Boot would apply instead:

```bash
# host port 55432 avoids clashing with any PostgreSQL already on 5432 (e.g. the data repo's Compose stack)
docker run -d --name ehr-postgres -p 127.0.0.1:55432:5432 \
  -e POSTGRES_DB=medchart_ehr -e POSTGRES_USER=medchart -e POSTGRES_PASSWORD=medchart_dev \
  postgres:14

# in your demos-coghealth-ehr-api checkout; Flyway retries until PostgreSQL finishes starting,
# the API listens on localhost only, and the default profile overrides an exported `dev` (Neon) profile
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:55432/medchart_ehr \
  SPRING_DATASOURCE_USERNAME=medchart SPRING_DATASOURCE_PASSWORD=medchart_dev \
  SPRING_PROFILES_ACTIVE=default SERVER_ADDRESS=127.0.0.1 \
  SPRING_FLYWAY_CONNECT_RETRIES=30 SPRING_FLYWAY_CONNECT_RETRIES_INTERVAL=2s \
  mvn spring-boot:run
```

The credentials are the API's built-in local defaults, set as `SPRING_DATASOURCE_*` so exported `DB_*` or `SPRING_DATASOURCE_*` values don't override them; they only reach this container. Don't point the API at the data repo's Compose PostgreSQL as-is: its `coghealth` database uses different credentials than the API defaults.

Next time, start the existing container with `docker start ehr-postgres`, because `docker run` fails while the name is taken. `docker rm -f -v ehr-postgres` deletes it and its data volume.

Then start the web app with `VITE_API_URL=http://localhost:8080/api npm run dev -- --strictPort` instead of the plain `npm run dev` above (stop that one if it's running). The inline `VITE_API_URL` beats any value from your shell or `.env*` files, and `--strictPort` fails instead of moving to 5174, which the API's CORS rules reject (they allow only 5173, 5178 and 3000).

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
