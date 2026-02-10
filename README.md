# Erasmus Cloud Computing — Energy Analytics Dashboard

Energy consumption analytics platform built with a **React** frontend and a **Spring Boot** backend, authenticated via **AWS Cognito (OIDC)**. The Dashboard consumes data from a **Data Layer “processed” container** and renders tables and charts (trend, totals, averages).

---

## Architecture (at a glance)

- **React UI (SPA)**: authentication (OIDC), calls the API, renders dashboards.
- **Spring Boot API**: validates JWT, role-based responses (admin vs user), reads from the processed container.
- **AWS Cognito**: identity provider issuing tokens.
- **Data Layer**: processed container containing latest + historical processed readings.

## Diagrams & Documentation

All documentation lives under `docs/`.

- Main documentation:
  - `docs/documentation.md`
- Architecture diagram:
  - `docs/Part_3/arch-diagram.png` (rendered image)
  - `docs/Part_3/arch-diagram.puml` (PlantUML source)
- Dashboard sequence diagram:
  - `docs/Part_3/sequence-diagram.png` (rendered image)
  - `docs/Part_3/sequence-diagram.puml` (PlantUML source)

---

## Repository structure

- `src/main/java/...` — Spring Boot API source
- `src/main/resources/static/src/...` — React UI source (bundled in resources/static)
- `docs/` — project documentation + diagrams
- `.github/workflows/` — CI/CD pipelines

---

## Key API endpoint

### Dashboard data
- `GET /api/dashboard-data`
- Header: `Authorization: Bearer <jwt>`

Response includes:
- `role`: `"admin"` or `"user"`
- `latest`: list
- `historical`: list
- `device_id` (only for `"user"` role)

---

## Authentication (AWS Cognito OIDC)

The UI uses OIDC Authorization Code flow:
1. redirect to Cognito login
2. exchange code for tokens
3. call API with Bearer JWT

Important:
- Configure valid redirect URIs and logout URIs in Cognito to match your deployed UI URL.
- Ensure the API is configured as a JWT resource server and CORS allows the UI origin.

---

## Running locally

### Prerequisites
- Java SDK (project uses Spring Boot; ensure your local JDK is compatible)
- Maven
- Node.js (only if you develop/build UI separately)

### 1) Run the API (Spring Boot)
From project root:

Default:
- API on `http://localhost:8080`

### 2) Run the UI
This project stores UI code under:
- `src/main/resources/static/src`

Depending on your setup, you can:
- build UI and serve via Spring Boot static resources, or
- run the React dev server from the `static` folder.

If the UI is run separately, set:
- `REACT_APP_API_URL` to the API base URL (e.g., `http://localhost:8080`)

Example:bash export REACT_APP_API_URL="[http://localhost:8080](http://localhost:8080)"

---

## Configuration (high level)

### Frontend
- `REACT_APP_API_URL` — API base URL for production/non-local runs

### Backend
- `FRONTEND_URL` — allowed origin for CORS (production UI domain)
- Cognito/JWT validation settings — issuer/JWKS/audience as required

> Avoid committing secrets. Use environment variables / App Settings.

---

## Roles & data access

The API applies role-based logic:
- **Admin**: receives data for all devices
- **User**: requires a device identifier claim (e.g., `device_id`) and receives only their device data

If the device claim is missing:
- API responds `403 Forbidden`

---

## CI/CD

GitHub Actions workflows live in:
- `.github/workflows/main_erasmus-cc2025-api.yml`
- `.github/workflows/main_erasmus-cc2025-ui.yml`

They automate build and deployment for the API and UI.

---

## Troubleshooting

- **CORS error in browser**: check `FRONTEND_URL` and allowed headers (Authorization)
- **401 Unauthorized**: token missing/expired or JWT validation mismatch
- **403 Forbidden**: missing required device claim or insufficient role
- **Wrong API URL in production**: verify `REACT_APP_API_URL` (or your reverse proxy routing)

---

