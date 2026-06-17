# CC2025 — Cloud Computing Project (Energy Analytics Platform)

> Master Program — Cloud Computing
> Technical University of Cluj-Napoca, Computer Science Department
> Prof. Tudor Cioara, Conf. Cristina Pop, Ing. Gabriel Ioan Arcas — 2025/2026

A cloud-native **energy-consumption analytics platform**. Raw IoT meter readings (CSV) are
ingested by an **ETL pipeline**, harmonized into per-device JSON, and surfaced through a
secured **React + Spring Boot** web application. Users authenticate with **AWS Cognito**,
and the API returns role-scoped data (an admin sees every device; a regular user sees only
their own `device_id`).

The repository is the combined deliverable for the **three project assignments** (see
[`requirements/`](requirements/)). Each part adds a layer on top of the previous one:

| Part | Theme | What it adds | Detailed docs |
|------|-------|--------------|---------------|
| **Part 1** | Cloud-deployed data application | React frontend + Spring Boot REST API deployed on **Azure App Service**, automated with **GitHub Actions** CI/CD | [`docs/documentation.md`](docs/documentation.md) |
| **Part 2** | ETL pipeline + serverless function | **Azure Data Factory** data flow transforms raw CSV → per-device JSON in **Blob Storage**; a **Web activity** posts to an **Azure Logic App** webhook that notifies **Microsoft Teams** on each run | [`docs/Part_2/documentation.md`](docs/Part_2/documentation.md) |
| **Part 3** | Security, IAM & Monitoring | **AWS Cognito (OIDC)** login, JWT validation in the API, admin/user **role separation**, `device_id` claim filtering, secrets in environment variables | [`docs/Part_3/documentation.md`](docs/Part_3/documentation.md) |

---

## 1. Project goal (from the assignment briefs)

The three PDFs in [`requirements/`](requirements/) define the objectives. In short, the
coursework asks the student to build, deploy, and secure a small but complete cloud-native
system end to end:

### Part 1 — Cloud-Deployed Data Application (`requirements/p1.pdf`)
Build a minimal **frontend + backend** data app and deploy it on a PaaS provider
(Azure App Service / AWS Amplify / GCP App Engine), wired to **GitHub + GitHub Actions** so
every commit triggers an automatic build and deployment. The backend must expose at least
one REST endpoint; the frontend must consume it dynamically and display the result. Both
must be reachable online.

### Part 2 — ETL Pipeline and Serverless Function (`requirements/p2.pdf`)
Build an **Extract–Transform–Load** pipeline that ingests raw CSV (multiple devices,
identified by `device_id`), harmonizes it, and stores structured JSON in cloud storage.
A **serverless function** is triggered on new data and must send a **Microsoft Teams**
notification reporting success/failure. Each run produces, per device:
- `latest/device-<id>.json` (overwritten each run), and
- `by-timestamp/<timestamp>/device-<id>.json` (kept for history).

The JSON includes the device id, a generation timestamp, a time window, a list of records
(timestamp, kWh, location), and an optional aggregated summary (e.g. total kWh).

### Part 3 — Security, IAM & Monitoring (`requirements/p3.pdf`)
Secure Parts 1 and 2 with a cloud **Identity Provider**:
- **Frontend** implements login and shows the authenticated user's role from the JWT claims.
- **Backend** requires a valid JWT and exposes the role/claims; access to device data is
  restricted by a `device_id` claim.
- Storage is **private** (no public access), reachable only via IAM roles/policies.
- **Credentials live in environment variables / secret stores**, never in source.
- Basic **monitoring/logging** is enabled, and **admin vs user** role separation is demonstrated.

> **How this repo satisfies the goal:** the IdP chosen is **AWS Cognito** (Part 3), while
> the app, pipeline, storage, and CI/CD all run on **Azure** (Parts 1 & 2). This cross-cloud
> setup is why credentials must be configured in **both** AWS and Azure — see
> [Section 5](#5-configuring-credentials).

---

## 2. Architecture

```
                ┌──────────────────────────────────────────────────────────────┐
                │                          AWS                                    │
                │   ┌───────────────────────────────┐                            │
                │   │  Cognito User Pool (OIDC IdP)  │  issues JWT (id/access)    │
                │   │  groups → role, custom:device_id │                          │
                │   └───────────────────────────────┘                            │
                └───────────────▲───────────────────────────┬────────────────────┘
                                │ 1. login (Auth Code flow)  │ 2. JWT
                                │                            ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │                                 AZURE                                          │
   │                                                                                │
   │   ┌──────────────────┐   3. GET /api/dashboard-data    ┌────────────────────┐ │
   │   │  React SPA (UI)  │ ───  Authorization: Bearer JWT ─▶│  Spring Boot API   │ │
   │   │  App Service     │ ◀── role + latest + historical ──│  App Service       │ │
   │   │  (p3-ui)         │                                  │  (p3-api)          │ │
   │   └──────────────────┘                                  └─────────┬──────────┘ │
   │                                                                   │            │
   │                                                          reads ▼  │            │
   │   ┌──────────────┐   raw CSV    ┌───────────────────┐   ┌─────────────────┐   │
   │   │ Blob Storage │ ───────────▶ │ Azure Data Factory │──▶│ PostgreSQL /     │   │
   │   │  raw/        │  (event)     │  (ETL data flow)   │   │ processed JSON   │   │
   │   └──────────────┘              └─────────┬─────────┘   └─────────────────┘   │
   │                                            │ on success/fail                   │
   │                                            ▼                                    │
   │                            ┌──────────────────────────┐                         │
   │                            │ ADF Web activity → Logic  │ ──▶ Microsoft Teams      │
   │                            │ App webhook               │     (notification)       │
   │                            └──────────────────────────┘                         │
   └────────────────────────────────────────────────────────────────────────────────┘
```

Rendered diagrams:
- Architecture: [`docs/Part_3/arch-diagram.puml`](docs/Part_3/arch-diagram.puml)
- Dashboard sequence: [`docs/Part_3/sequence-diagram.puml`](docs/Part_3/sequence-diagram.puml)
- ETL data flow: [`docs/Part_2/Sequence-diagram.puml`](docs/Part_2/Sequence-diagram.puml)

### Component summary

| Component | Technology | Where it runs | Role |
|-----------|------------|---------------|------|
| Frontend (UI) | React 19 SPA (`react-oidc-context`, `recharts`) | Azure App Service `p3-ui` | Login via Cognito, calls API with JWT, renders tables/charts |
| Backend (API) | Spring Boot 3.5.7, Java 21 | Azure App Service `p3-api` | Validates JWT, applies role logic, reads processed data |
| Identity Provider | AWS Cognito User Pool (`eu-central-1`) | AWS | Issues OIDC tokens with `cognito:groups` + `custom:device_id` |
| ETL | Azure Data Factory data flow | Azure | Transforms raw CSV → per-device JSON |
| Storage | Azure Blob Storage (`raw/`, `latest/`, `by-timestamp/`) | Azure | Raw input + processed output |
| Database | PostgreSQL | Azure (`erasmus-api-db`) | Stores `latest_data` / `historical_data` read by the API |
| Notifications | ADF Web activity → Azure Logic App → Microsoft Teams | Azure | Reports pipeline success/failure (separate branches) |
| CI/CD | GitHub Actions | GitHub | Builds + deploys UI and API on every push to `main` |

---

## 3. Repository structure

```
CloudComputingProject/
├── README.md                     ← this file
├── pom.xml                       ← Maven build (Spring Boot, Java 21)
├── requirements/                 ← the three assignment briefs (PDF)
│   ├── p1.pdf  p2.pdf  p3.pdf
├── docs/                         ← documentation + diagrams
│   ├── documentation.md          ← Part 1 (app architecture)
│   ├── CONFIGURATION.md          ← full AWS + Azure credentials guide  ← START HERE for setup
│   ├── Part_2/                   ← ETL pipeline docs + data-flow diagram
│   └── Part_3/                   ← security/IAM docs + arch & sequence diagrams
├── .github/workflows/            ← CI/CD pipelines
│   ├── main_erasmus-cc2025-api.yml   ← builds JAR, deploys API to Azure
│   └── main_erasmus-cc2025-ui.yml    ← builds React, deploys UI to Azure
└── src/
    ├── main/java/com/cloudcomputing/
    │   ├── CloudComputingApplication.java
    │   ├── config/
    │   │   ├── OpenApiConfig.java                ← Swagger / OpenAPI (Bearer JWT)
    │   │   └── security/SecurityConfig.java      ← JWT resource server, CORS, role mapping
    │   ├── controller/
    │   │   ├── UserController.java               ← GET /api/dashboard-data (role-scoped)
    │   │   ├── DataController.java               ← GET/POST /api/data history endpoints
    │   │   └── ItemController.java               ← CRUD /api/items
    │   ├── service/ItemService.java
    │   ├── repository/                           ← Spring Data JPA repositories
    │   ├── model/                                ← LatestData, HistoricalData, Item
    │   └── dto/                                  ← Create/Update DTOs
    └── main/resources/
        ├── application.properties               ← env-var driven config
        └── static/                              ← React UI source
            ├── package.json
            └── src/
                ├── index.js                      ← Cognito OIDC config
                ├── App.js
                ├── context/AuthContext.js
                ├── components/                   ← Login, Dashboard, charts, table
                └── utils/dataProcessor.js
```

---

## 4. API reference

All `/api/**` routes require a valid `Authorization: Bearer <jwt>` header (validated against
the Cognito issuer). Static assets and Swagger are public.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/dashboard-data` | `ROLE_User` or `ROLE_Admin` | Consolidated dashboard payload. **Admin** → all devices; **User** → only `custom:device_id`. Returns `403` if a user token has no `device_id` claim. |
| `GET` | `/api/data/history/all` | `ROLE_Admin` | Full historical data for every device. |
| `POST` | `/api/data/history/by-devices` | `ROLE_User` / `ROLE_Admin` | Body: JSON array of device IDs → historical rows for those devices. |
| `GET` | `/api/items` | authenticated | List items. |
| `GET/POST/PUT/DELETE` | `/api/items[/{id}]` | authenticated | CRUD on items. |
| — | `/swagger-ui/index.html` | public | Interactive API docs (OpenAPI). |

**`GET /api/dashboard-data` response shape:**
```json
{
  "role": "admin" | "user",
  "latest": [ ... ],
  "historical": [ ... ],
  "device_id": "device-001"   // present only when role = "user"
}
```

Role is derived from the Cognito `cognito:groups` claim (mapped to `ROLE_<group>`); the
device filter is read from the `custom:device_id` claim. See
[`SecurityConfig.java`](src/main/java/com/cloudcomputing/config/security/SecurityConfig.java)
and [`UserController.java`](src/main/java/com/cloudcomputing/controller/UserController.java).

---

## 5. Configuring credentials

Because this project spans **two clouds** (AWS for identity, Azure for everything else),
credentials must be configured in both, plus GitHub for CI/CD.

👉 **The full step-by-step guide is in [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).**

At a glance you need to configure:

**AWS (identity provider)**
- A **Cognito User Pool** + **App client** (OIDC, Authorization Code flow).
- Groups (`Admin`, `User`) → drive the `cognito:groups` role claim.
- A custom attribute **`custom:device_id`** on users → drives per-user data filtering.
- Allowed callback / sign-out URLs matching the deployed UI origin.

**Azure (hosting, data, ETL)**
- **App Service** `p3-api` (backend) and `p3-ui` (frontend).
- Backend **Application Settings** (act as environment variables / secrets):
  `AZURE_DB_URL`, `AZURE_DB_USER`, `AZURE_DB_PASSWORD`, `APP_FRONTEND_URL`.
- **PostgreSQL** database.
- **Blob Storage** container (`raw/`, `latest/`, `by-timestamp/`), kept private.
- **Data Factory** pipeline + a **Logic App** webhook for Teams notifications (webhook URL kept out of source).

**GitHub (CI/CD secrets)**
- `AZURE_CREDENTIALS` — service-principal JSON used by the API workflow.
- `AZURE_PUBLISHPROFILE` — publish profile used by the UI workflow.

> ⚠️ Never commit secrets. `application.properties` and `index.js` reference configuration by
> environment variable / public client id only; all sensitive values come from Azure App
> Settings, AWS, or GitHub Secrets.

---

## 6. Running locally

### Prerequisites
- JDK 21
- Maven (or the bundled `./mvnw` wrapper)
- Node.js 20.x
- A reachable Cognito user pool (the one in `index.js` / `application.properties`, or your own)
- A PostgreSQL instance (or rely on the bundled H2 runtime dependency for experiments)

### Backend (Spring Boot API)
The API reads its config from environment variables (see `application.properties`). Export them,
then run from the project root:

```bash
export AZURE_DB_URL="jdbc:postgresql://localhost:5432/energy?sslmode=disable"
export AZURE_DB_USER="postgres"
export AZURE_DB_PASSWORD="postgres"
export APP_FRONTEND_URL="http://localhost:3000"

./mvnw spring-boot:run
# API on http://localhost:8080  — Swagger at http://localhost:8080/swagger-ui/index.html
```

> The JWT issuer is set in `application.properties`
> (`...jwt.issuer-uri=https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_k4a9qUIbH`).
> Point it at your own pool if you are not using the shared one.

### Frontend (React UI)
```bash
cd src/main/resources/static
npm install
npm start          # dev server on http://localhost:3000
```

The UI auto-selects the API base URL: `http://localhost:8080` when running on `localhost`,
otherwise `process.env.REACT_APP_API_URL`. Cognito settings live in
[`src/index.js`](src/main/resources/static/src/index.js).

---

## 7. CI/CD

Two GitHub Actions workflows deploy to Azure on every push to `main` (and via
`workflow_dispatch`):

| Workflow | Builds | Deploys to |
|----------|--------|------------|
| [`main_erasmus-cc2025-api.yml`](.github/workflows/main_erasmus-cc2025-api.yml) | `mvn clean package` → `app.jar` (Java 21) | Azure App Service `p3-api`, using `AZURE_CREDENTIALS` |
| [`main_erasmus-cc2025-ui.yml`](.github/workflows/main_erasmus-cc2025-ui.yml) | `npm run build` (injects `REACT_APP_API_URL`) → zipped `build/` | Azure App Service `p3-ui`, using `AZURE_PUBLISHPROFILE` |

The UI build bakes in `REACT_APP_API_URL=https://p3-api.azurewebsites.net`.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| **401 Unauthorized** | Token missing/expired, or issuer mismatch | Re-login; verify `jwt.issuer-uri` matches the Cognito pool |
| **403 Forbidden** | User token has no `custom:device_id`, or insufficient role | Set the `custom:device_id` attribute and/or add the user to the `Admin`/`User` group in Cognito |
| **CORS error in browser** | UI origin not allowed | Set `APP_FRONTEND_URL` on the API and the callback URLs in Cognito |
| **Wrong API URL in production** | Build-time `REACT_APP_API_URL` incorrect | Update it in the UI workflow / App Service settings and redeploy |
| **DB connection fails** | Missing/incorrect `AZURE_DB_*` settings | Set them in Azure App Service → Configuration |

---

## 9. Evaluation topics (quick reference)

The briefs list concepts you may be asked about during evaluation:
- **Part 1:** cloud service models (IaaS/PaaS/SaaS), REST basics, GitHub Actions, build vs release, env vars, CI/CD.
- **Part 2:** ETL vs ELT, storage buckets + event triggers, serverless (cold start, scaling, limits), data transformation (JSON/CSV/Parquet).
- **Part 3:** IAM (users/roles/policies), authN vs authZ, encryption at rest/in transit, secrets management, logging/monitoring, role separation.
