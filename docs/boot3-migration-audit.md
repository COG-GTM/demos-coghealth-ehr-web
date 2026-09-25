# Frontend & Infra Compatibility Audit — Spring Boot 3 / Java 21 Migration (WS4)

Audit date: 2026-09-25
Scope: `COG-GTM/demos-coghealth-ehr-web` (React/Vite SPA), `COG-GTM/demos-coghealth-ehr-api/frontend` (secondary, axios-based SPA), `COG-GTM/demos-coghealth-ehr-data` (docker-compose infra).
Backend revision audited: `demos-coghealth-ehr-api` @ `dfcd98b` (pre-migration, Spring Boot 2.7.18 / Java 11).
This document is documentation-only; no functional code was changed by this workstream.

## Verdict

**The Spring Boot 3 / Java 21 migration poses no frontend-breaking risk.**

- No frontend call site uses a trailing slash, so Spring Framework 6's removal of trailing-slash URL matching changes nothing here.
- The only paginated response the SPA consumes (`/v1/patients/search`) is read via `content`, which `PageImpl` still serializes identically under Boot 3.
- The SPA never parses the error response body, so Boot 3's error-body shape is irrelevant to it; the backend defines no `server.error.*` overrides and no `@ControllerAdvice`, so defaults apply on both sides of the migration.
- Infra images (`postgres:14`, `redis:7`, `keycloak:23`) are all compatible with Boot 3.3 / Hibernate 6 / Spring Data Redis / Spring Security 6.
- The backend permits all requests and the SPA sends no `Authorization` header, so the Security 6 rewrite is invisible to the frontend **as long as WS1 keeps `permitAll()` for `/**` and preserves the existing CORS configuration**.

**Must be fixed before merge:** nothing in the frontend.
**Must be watched during merge (backend, WS1/WS3):** (a) keep `permitAll()` + the CORS bean's allowed origins (`http://localhost:5173`, `:5178`, `:3000`) — Security 6 requires the lambda DSL and `CorsConfigurationSource` is still honoured via `http.cors(withDefaults())`; (b) `spring.redis.*` must be relocated to `spring.data.redis.*` in `application.yml` (Boot 3 removed the old keys) — not frontend-visible but will fail startup under the `default` profile; (c) `springdoc-openapi-ui` 1.7.0 is Boot 2 only and must move to `springdoc-openapi-starter-webmvc-ui` 2.x, otherwise Swagger UI (`/api/swagger-ui/index.html`) breaks.
**After merge:** the pre-existing frontend/backend contract mismatches listed below remain; they are unrelated to the migration and should be tracked separately.

---

## 1. Trailing-slash URL matching

Spring Framework 6 removed `PathMatchConfigurer.setUseTrailingSlashMatch()`; a request to `/foo/` no longer matches a handler mapped to `/foo` and returns 404.

Method used: enumerated every request path in both frontends (template literals, string literals, and concatenations) and inspected the two HTTP clients for path construction.

| Repo | File | Finding |
|---|---|---|
| ehr-web | `src/services/api.ts:9-24` | Builds `${API_BASE_URL}${endpoint}`; `API_BASE_URL` defaults to `http://localhost:8080/api` and endpoints always start with `/v1/...` and never end with `/`. Query params are appended after `?`, so no trailing slash can be produced. **No risk.** |
| ehr-web | `src/services/patientService.ts:13-26` | All 5 paths (`/v1/patients/{id}`, `/v1/patients/mrn/{mrn}`, `/v1/patients/search`, `/v1/patients`) — no trailing slash. **No risk.** |
| ehr-web | `src/services/encounterService.ts:5-45` | All 13 paths — no trailing slash. **No risk.** |
| ehr-web | `src/services/auditService.ts` | Client-side only (localStorage/sessionStorage); issues no HTTP requests. **N/A.** |
| ehr-api | `frontend/src/api/client.ts:3-10` | axios `baseURL` = `http://localhost:8080/api` (no trailing slash) joined with paths that always begin with `/v1/`. axios does not insert a slash. **No risk.** |
| ehr-api | `frontend/src/api/{patients,providers,encounters,notes,orders,results}.ts` | All 53 request paths inspected; none ends in `/`, none is built by concatenating a possibly-empty path segment. **No risk.** |

**Conclusion: there are zero risky call sites.** The only `/`-suffixed strings found in ehr-web are React Router path checks (`src/App.tsx:201`, `tests/e2e.test.ts:101,102,225,226`), which are client-side routes, not backend URLs.

One caveat that is *not* a trailing-slash issue but shares the same failure mode: `VITE_API_URL` is used verbatim (`src/services/api.ts:1`, `frontend/src/api/client.ts:3`). If a deployment sets it with a trailing slash (`https://host/api/`), every request becomes `https://host/api//v1/...`, which 404s under Boot 3 exactly as it would under Boot 2 (double slash was never matched). Documented here as a deployment note, not a code defect.

## 2. `Page<T>` JSON shape and error-response shape

### 2.1 `Page<T>`

Only one backend endpoint returns a page: `PatientController.searchPatients` → `ResponseEntity<Page<PatientDTO>>` (`src/main/java/com/medchart/ehr/controller/PatientController.java:36-42`).

Frontend contract (`src/services/patientService.ts:4-10`) declares:

```ts
interface Page<T> { content: T[]; totalElements: number; totalPages: number; size: number; number: number; }
```

Consumers actually read only `content`:
- `src/pages/DashboardPage.tsx:145-146` — `result.content`
- `src/pages/PatientSearchPage.tsx:157-158` — `result.content.map(...)`

Verification: `PageImpl` serialization is unchanged in Boot 3.x — Jackson still serializes the bean properties, so `content`, `totalElements`, `totalPages`, `number`, `size`, `first`, `last`, `numberOfElements`, `empty`, `sort`, `pageable` are all still emitted. What Boot 3.x adds is a startup/serialization *warning* that `PageImpl`'s JSON structure is unstable, with an opt-in stable DTO via `spring.data.web.pageable.serialization-mode=VIA_DTO` (Spring Data 3.3+) / `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)`.

**Verdict: no frontend change required.** Recommendation for the backend workstreams: do **not** enable `VIA_DTO` during this migration — it renames nothing but does change the emitted structure (wrapping under `page: {size,number,totalElements,totalPages}`), which *would* break `totalElements`/`totalPages`/`number`/`size` readers if the frontend later starts using them. Keeping the default preserves the current contract.

Pagination request params are also unchanged: `patientService.search` sends `q`, `page`, `size`, which `Pageable` resolution still binds the same way in Boot 3.

### 2.2 Error response shape

`src/services/api.ts:32-34`:

```ts
if (!response.ok) { throw new Error(`API Error: ${response.status} ${response.statusText}`); }
```

The response body is **never read** on the error path — only `status` and `statusText`. The axios client in `ehr-api/frontend` (`client.ts:20-28`) likewise only inspects `error.response?.status` (401 → clear token + redirect to `/login`).

Backend side: `application.yml` and `application-dev.yml` define **no** `server.error.*` properties, and the codebase has **no** `@ControllerAdvice`/`@ExceptionHandler`, so Boot's `DefaultErrorAttributes` is fully in effect. Boot 3 keeps the same body shape as Boot 2 — `{timestamp, status, error, path}` plus `message`/`trace`/`errors` gated by `server.error.include-message` (default `never`) and `server.error.include-stacktrace` (default `never`). Boot 3's only behavioural difference of note is that `message` defaults to `never` (as it already did in 2.7) and the `/error` path handling moved packages internally.

**Verdict: unchanged and, in any case, not consumed by either frontend.** One pre-existing UX gap (not migration-related): because the body is discarded, backend validation messages from `@Valid` on `PatientDTO` never surface to the user — `PatientSearchPage.tsx:163-164` shows a generic "Failed to load patients from server."

## 3. Frontend ↔ backend endpoint contract

Backend controllers (all under `server.servlet.context-path: /api`):

- `PatientController` → `/v1/patients`
- `EncounterController` → `/v1/encounters`
- `ProviderController` → `/v1/providers`
- `LegacyExportController` → `/v1/export`
- `AuthController` → `@RequestMapping("/api/auth")` → effective path `/api/api/auth/**` (context path applied twice). Pre-existing defect, unrelated to the migration.

### 3.1 `demos-coghealth-ehr-web` (the real SPA)

| Frontend call | Path | Backend mapping | Status |
|---|---|---|---|
| `patientService.getById` (`patientService.ts:14`) | `GET /v1/patients/{id}` | `PatientController:24` | Match |
| `patientService.getByMrn` (`:17`) | `GET /v1/patients/mrn/{mrn}` | `PatientController:30` | Match |
| `patientService.search` (`:20`) | `GET /v1/patients/search?q&page&size` | `PatientController:36` (`@RequestParam String q`, `Pageable`) | Match |
| `patientService.create` (`:23`) | `POST /v1/patients` | `PatientController:44` | Match |
| `patientService.update` (`:26`) | `PUT /v1/patients/{id}` | `PatientController:51` | Match |
| `encounterService.getById` (`encounterService.ts:6`) | `GET /v1/encounters/{id}` | `EncounterController:25` | Match |
| `encounterService.getByNumber` (`:9`) | `GET /v1/encounters/number/{n}` | `EncounterController:32` | Match |
| `encounterService.getByPatient` (`:12`) | `GET /v1/encounters/patient/{id}` | `EncounterController:39` | Match |
| `encounterService.getByProvider` (`:15`) | `GET /v1/encounters/provider/{id}` | `EncounterController:49` | Match |
| `encounterService.getProviderSchedule` (`:18`) | `GET /v1/encounters/provider/{id}/schedule?date` | `EncounterController:54` | Match |
| `encounterService.getByDateRange` (`:21`) | `GET /v1/encounters/date-range?startDate&endDate` | `EncounterController:61` | Match |
| `encounterService.getByStatus` (`:24`) | `GET /v1/encounters/status/{status}` | `EncounterController:68` | Match |
| `encounterService.create` (`:27`) | `POST /v1/encounters` | `EncounterController:73` | Match |
| `encounterService.update` (`:30`) | `PUT /v1/encounters/{id}` | `EncounterController:78` | Match |
| `encounterService.checkIn` (`:33`) | `POST /v1/encounters/{id}/check-in` | `EncounterController:88` | Match (backend returns 204 `Void`; frontend types it `void` — consistent, but `api.ts:36` calls `response.json()` unconditionally, so an empty 204 body **throws**. Pre-existing; same under Boot 2 and Boot 3.) |
| `encounterService.start` (`:36`) | `POST /v1/encounters/{id}/start` | `EncounterController:94` | Match (same 204/`json()` caveat) |
| `encounterService.complete` (`:39`) | `POST /v1/encounters/{id}/complete` | `EncounterController:100` (`@RequestBody(required=false) String notes`) | Match (frontend sends `JSON.stringify(notes)` with `Content-Type: application/json`; same 204/`json()` caveat) |
| `encounterService.cancel` (`:42`) | `POST /v1/encounters/{id}/cancel` | `EncounterController:106` (no body param) | Match — this SPA correctly sends no body |
| `encounterService.markNoShow` (`:45`) | `POST /v1/encounters/{id}/no-show` | `EncounterController:112` | Match (same 204/`json()` caveat) |

No mismatches. Every path this SPA calls exists on the backend, and none of the above is affected by the Boot 3 migration.

### 3.2 `demos-coghealth-ehr-api/frontend` (secondary axios SPA)

This SPA targets a much larger API surface than the backend implements. All findings below are **pre-existing** — none is caused by the Boot 3 migration.

| Frontend call | Path | Backend mapping | Status |
|---|---|---|---|
| `patientsApi.search` (`patients.ts:6`) | `GET /v1/patients/search?q` | `PatientController:36` | Path match; **response-shape mismatch** — declares `Promise<Patient[]>` but backend returns `Page<PatientDTO>` (pre-existing) |
| `patientsApi.searchByLastName` (`:11`) | `GET /v1/patients/search?lastName` | `PatientController:36` requires `q` | **Mismatch** — 400 Bad Request, `q` is a required param (pre-existing) |
| `patientsApi.getById` (`:16`) | `GET /v1/patients/{id}` | `PatientController:24` | Match |
| `patientsApi.getByMrn` (`:21`) | `GET /v1/patients/mrn/{mrn}` | `PatientController:30` | Match |
| `patientsApi.create` (`:26`) | `POST /v1/patients` | `PatientController:44` | Match |
| `patientsApi.update` (`:31`) | `PUT /v1/patients/{id}` | `PatientController:51` | Match |
| `patientsApi.getProblems` / `addProblem` / `updateProblem` (`:36,:41,:46`) | `/v1/patients/{id}/problems[/{problemId}]` | none | **Missing endpoint** (pre-existing) |
| `patientsApi.getAllergies` / `addAllergy` (`:51,:56`) | `/v1/patients/{id}/allergies` | none | **Missing endpoint** (pre-existing) |
| `patientsApi.getMedications` / `addMedication` (`:61,:66`) | `/v1/patients/{id}/medications` | none | **Missing endpoint** (pre-existing) |
| `patientsApi.getVitals` / `addVitals` (`:71,:76`) | `/v1/patients/{id}/vitals` | none | **Missing endpoint** (pre-existing) |
| `patientsApi.getImmunizations` (`:81`) | `/v1/patients/{id}/immunizations` | none | **Missing endpoint** (pre-existing) |
| `providersApi.getAll` (`providers.ts:7`) | `GET /v1/providers?active` | `ProviderController:20` | Match |
| `providersApi.getById` (`:12`) | `GET /v1/providers/{id}` | `ProviderController:28` | Match |
| `providersApi.getByNpi` (`:17`) | `GET /v1/providers/npi/{npi}` | `ProviderController:35` | Match |
| `providersApi.create` (`:22`) | `POST /v1/providers` | `ProviderController:67` | Match |
| `providersApi.update` (`:27`) | `PUT /v1/providers/{id}` | `ProviderController:72` | Match |
| — (unused by frontend) | `/v1/providers/department/{d}`, `/specialty/{s}`, `/departments`, `/specialties`, `/search`, `DELETE /{id}` | `ProviderController:42,47,52,57,62,82` | Backend-only, no consumer |
| `encountersApi.getById` (`encounters.ts:6`) | `GET /v1/encounters/{id}` | `EncounterController:25` | Match |
| `encountersApi.getByPatient` (`:11`) | `GET /v1/encounters/patient/{id}` | `EncounterController:39` | Match |
| `encountersApi.getSchedule` (`:18`) | `GET /v1/encounters/schedule?date&providerId` | backend exposes `GET /v1/encounters/provider/{providerId}/schedule?date` (`EncounterController:54`) | **Mismatch — 404** (pre-existing; confirmed) |
| `encountersApi.create` (`:23`) | `POST /v1/encounters` | `EncounterController:73` | Match |
| `encountersApi.update` (`:28`) | `PUT /v1/encounters/{id}` | `EncounterController:78` | Match |
| `encountersApi.checkIn` / `startVisit` / `completeVisit` / `markNoShow` (`:33,:38,:43,:53`) | `POST /v1/encounters/{id}/{check-in,start,complete,no-show}` | `EncounterController:88,94,100,112` | Path match; **response-shape mismatch** — typed `Promise<Encounter>` but backend returns 204 with no body (pre-existing) |
| `encountersApi.cancel` (`:48`) | `POST /v1/encounters/{id}/cancel` body `{reason}` | `EncounterController:106` takes no body | **Mismatch — body silently ignored**; the cancellation reason is never persisted (pre-existing; confirmed) |
| `notesApi.*` (`notes.ts:6-42`) | `/v1/patients/{id}/notes`, `/v1/encounters/{id}/notes`, `/v1/notes/{id}`, `POST /v1/notes`, `PUT /v1/notes/{id}`, `/v1/notes/{id}/sign`, `/v1/notes/{id}/addendum`, `/v1/notes/templates` | none | **Missing endpoints — no `NoteController` exists** (pre-existing) |
| `ordersApi.*` (`orders.ts:6-41`) | `/v1/patients/{id}/orders`, `/v1/orders/{id}`, `/v1/orders/{medication,lab,imaging,referral}`, `/v1/orders/{id}/cancel`, `/v1/orders/{id}/sign` | none | **Missing endpoints — no `OrderController` exists** (pre-existing) |
| `resultsApi.*` (`results.ts:6-31`) | `/v1/patients/{id}/results/labs`, `/v1/results/labs/{id}`, `/v1/patients/{id}/results/imaging`, `/v1/results/imaging/{id}`, `/v1/results/{type}/{id}/review`, `/v1/results/pending` | none | **Missing endpoints — no `ResultController` exists** (pre-existing) |
| — (unused by either frontend) | `/v1/export/encounters`, `/v1/export/patient/{id}/encounters`, `/v1/export/reports/{patient-roster,encounter-summary,daily}` | `LegacyExportController:23,36,46,52,61` | Backend-only, no consumer |
| — (unused by either frontend) | `/api/api/auth/login`, `/api/api/auth/register` | `AuthController:22,32,51` | Double context-path prefix; neither frontend calls auth (pre-existing) |
| — (unused by either frontend) | `GET /v1/encounters/patient/{id}/paged` | `EncounterController:44` (`Page<Encounter>`) | Backend-only; if ever consumed, the `PageImpl` note in §2.1 applies |

Summary for this secondary SPA: **19 clean path matches, 3 true path/param mismatches, 32 calls to endpoints that do not exist, and 2 categories of response-shape mismatch** — all pre-existing, none introduced or worsened by the Boot 3 migration. The real SPA (`ehr-web`) matches the backend on all 19 of its call sites and is unaffected by any of them.

## 4. Infrastructure compatibility (`demos-coghealth-ehr-data/docker-compose.yml`)

| Service | Image | Verdict |
|---|---|---|
| PostgreSQL | `postgres:14-alpine` | **Compatible.** Hibernate 6.x `PostgreSQLDialect` (the versionless dialect already configured in `application.yml`) supports PG 10+; PG 14 is well within range. The PostgreSQL JDBC driver pulled by Boot 3.3 (42.7.x) supports server versions 8.4+. Flyway 10 (Boot 3.3's managed version) supports PG 14 but requires the `flyway-database-postgresql` module to be on the classpath — **backend action item for WS1**, not an infra change. |
| Redis | `redis:7-alpine` | **Compatible.** Spring Data Redis 3.x / Lettuce 6.x target Redis 6–7. Note that Boot 3 renamed the config keys: `spring.redis.*` → `spring.data.redis.*`; `application.yml:26-28` still uses the old keys and must be updated (WS3). The `dev` profile excludes Redis autoconfiguration entirely, so this only affects the default profile. |
| Keycloak | `quay.io/keycloak/keycloak:23.0` (`start-dev --import-realm`) | **Compatible, no bump needed.** KC 23 is Quarkus-based and issues standard OIDC discovery at `/realms/coghealth/.well-known/openid-configuration`, which is exactly what Spring Security 6's `oauth2ResourceServer().jwt()` consumes via `spring.security.oauth2.resourceserver.jwt.issuer-uri`. Two things to be aware of if WS1 ever wires the resource server up: (a) with `KC_HOSTNAME: localhost` and `KC_HOSTNAME_STRICT: "false"`, the `iss` claim is `http://localhost:8180/realms/coghealth` — the `issuer-uri` must match that string exactly or validation fails; (b) KC 17+ dropped the `/auth` path prefix, so any legacy `/auth/realms/...` URL is wrong. Neither is a Boot 3 issue. Keycloak's own adapters are not used by this project (it uses a hand-rolled JWT filter), so the removal of the Keycloak Spring adapters is irrelevant. |
| RabbitMQ | `rabbitmq:3-management-alpine` | **Compatible.** Spring AMQP 3.x / amqp-client 5.x speak AMQP 0-9-1 against RabbitMQ 3.x. |
| Elasticsearch / Kibana | `8.11.0` | **Compatible and unused** — the backend has no Spring Data Elasticsearch dependency. |
| HAPI FHIR | commented out | N/A. |

**No compose changes are required.** Nothing in the compose file is genuinely broken by the migration; recommending a Keycloak bump purely for currency is out of scope for this migration.

## 5. Authentication behaviour

Current backend posture (`SecurityConfig.java:34-45`): `csrf().disable()`, `SessionCreationPolicy.STATELESS`, `authorizeRequests().antMatchers("/**").permitAll()` — every request is permitted. A `JwtAuthenticationFilter` and `JwtTokenProvider` exist but the filter is not registered in the chain.

Frontend dependence on auth behaviour:

- `ehr-web` (`src/services/api.ts:26-31`) sends only `Content-Type: application/json`. **No `Authorization` header, no cookies, no CSRF token, no 401 handling anywhere in the repo.** It therefore depends on exactly one property: that unauthenticated requests are permitted.
- `ehr-api/frontend` (`client.ts:12-28`) *does* attach `Authorization: Bearer <localStorage.auth_token>` when present and redirects to `/login` on 401 — but nothing ever populates `auth_token` (no login page calls `AuthController`, which is itself unreachable at the path it declares, see §3.2). In practice it also sends unauthenticated requests.

**Verdict: nothing in either frontend depends on auth behaviour that the Security 6 rewrite would change**, provided WS1's rewrite preserves the permit-all posture. The Security 6 rewrite must:
1. Keep `/**` permitted (lambda DSL: `authorizeHttpRequests(a -> a.anyRequest().permitAll())`) — `authorizeRequests()`/`antMatchers()` are removed in Security 6.
2. Keep CSRF disabled (`csrf(AbstractHttpConfigurer::disable)`) — re-enabling it would break every `POST`/`PUT` from both SPAs, which send no CSRF token.
3. Keep the `CorsConfigurationSource` bean and `http.cors(withDefaults())`. The allowed origins list (`http://localhost:5173`, `:5178`, `:3000`) covers the Vite dev server; `allowCredentials(true)` with an explicit origin list is still valid under Security 6. Dropping or narrowing this would break the browser client immediately.
4. Keep `SessionCreationPolicy.STATELESS` — the SPA holds no session cookie.

If WS1 instead introduces a real OAuth2 resource server, that **is** a frontend-breaking change: `ehr-web` would need an auth flow and an `Authorization` header before it could load any data. That is out of scope for this migration and should be a separate, coordinated change.

---

## Appendix: verification method

- Trailing slashes: exhaustive grep of `'/…/'`, `` `/…/` ``, `"/…/"` patterns across `src/` and `tests/` in both frontends, plus manual inspection of both HTTP clients' URL construction.
- Endpoint table: every export in `ehr-web/src/services/*.ts` and `ehr-api/frontend/src/api/*.ts` matched against every `@RequestMapping`/`@GetMapping`/`@PostMapping`/`@PutMapping`/`@DeleteMapping` in `ehr-api/src/main/java/com/medchart/ehr/controller/` (5 controllers, confirmed exhaustive via a repo-wide `@RestController`/`@RequestMapping` search).
- `Page<T>` / error shape: read the sole paginated controller method and every consumer of its result; confirmed absence of `server.error.*` in `application.yml` / `application-dev.yml` and absence of any `@ControllerAdvice`.
- Infra: read `demos-coghealth-ehr-data/docker-compose.yml` in full and cross-checked each image against the Boot 3.3 managed dependency versions.
