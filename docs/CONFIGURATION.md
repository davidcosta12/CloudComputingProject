# Credentials & Configuration Guide

This guide explains every credential and configuration value the project needs, and how to
set it up in **AWS** (identity), **Azure** (hosting, data, ETL), and **GitHub** (CI/CD).

> **Design principle (Part 3 requirement):** no secret is stored in source control.
> Source files reference configuration only by **environment variable** (backend) or by
> **public OIDC client id** (frontend). All sensitive values come from AWS, Azure App
> Settings, or GitHub Secrets.

Contents:
1. [Configuration map — what lives where](#1-configuration-map)
2. [AWS — Cognito identity provider](#2-aws--cognito-identity-provider)
3. [Azure — App Service, PostgreSQL, Storage, ETL, Function](#3-azure)
4. [GitHub — CI/CD secrets](#4-github--cicd-secrets)
5. [Local development values](#5-local-development)
6. [Verification checklist](#6-verification-checklist)

---

## 1. Configuration map

| Value | Used by | Configured in | Notes |
|-------|---------|---------------|-------|
| `authority` (Cognito issuer URL) | Frontend `index.js` | source (public) | OIDC discovery endpoint |
| `client_id` | Frontend `index.js` | source (public) | Public SPA client id — safe to expose |
| `redirect_uri` / `post_logout_redirect_uri` | Frontend | source (uses `window.location.origin`) | Must be whitelisted in Cognito |
| `jwt.issuer-uri` | Backend `application.properties` | source (public) | Backend validates JWTs against this issuer |
| `AZURE_DB_URL` | Backend | Azure App Service → Configuration | JDBC URL incl. `sslmode` |
| `AZURE_DB_USER` | Backend | Azure App Service → Configuration | DB username |
| `AZURE_DB_PASSWORD` | Backend | **Azure App Service → Configuration (secret)** | DB password — never in source |
| `APP_FRONTEND_URL` | Backend (CORS) | Azure App Service → Configuration | Deployed UI origin |
| `REACT_APP_API_URL` | Frontend build | UI workflow env / App Service | Baked in at build time |
| `AZURE_CREDENTIALS` | API CI/CD | GitHub Secrets | Service-principal JSON |
| `AZURE_PUBLISHPROFILE` | UI CI/CD | GitHub Secrets | App Service publish profile |
| Teams/Logic App webhook URL | ADF Web activity | Pipeline parameter / linked service | Incoming webhook for notifications |
| Blob storage connection | Data Factory / Function | Azure (managed identity preferred) | Keep storage private |

---

## 2. AWS — Cognito identity provider

The identity provider is an **Amazon Cognito User Pool** in region **`eu-central-1`**. It
issues the OIDC tokens the UI obtains at login and the API validates on every request.

Current values referenced by the code:

| Setting | Value |
|---------|-------|
| Region | `eu-central-1` |
| User Pool ID | `eu-central-1_k4a9qUIbH` |
| Issuer URL | `https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_k4a9qUIbH` |
| App client ID | `2jumpgbb0cn80gqhfg2tth8f8` |
| OIDC flow | Authorization Code (`response_type=code`) |
| Scopes | `email openid profile` |

### 2.1 Create / configure the User Pool

In the **AWS Console → Cognito → User pools**:

1. **Create a user pool** (or open the existing `eu-central-1_k4a9qUIbH`).
2. **Sign-in options:** enable Email (and/or username) as the sign-in identifier.
3. **App client:** create a **public SPA client** (no client secret).
   - Note the **App client ID** → goes into `index.js` (`client_id`).
   - **Allowed callback URLs:** every UI origin, e.g.
     `http://localhost:3000` and `https://p3-ui.azurewebsites.net`.
   - **Allowed sign-out URLs:** the same origins.
   - **OAuth grant type:** *Authorization code grant*.
   - **OpenID Connect scopes:** `openid`, `email`, `profile`.
4. **Hosted UI / domain:** assign a Cognito domain so the Authorization Code flow has a
   login page to redirect to.

### 2.2 Roles — the `cognito:groups` claim (admin vs user)

Role separation (Part 3) is driven by **Cognito groups** mapped to Spring authorities:

1. **Cognito → Groups →** create two groups: **`Admin`** and **`User`**.
2. Assign each user to exactly one group.
3. At login, Cognito adds a `cognito:groups` claim to the token. The backend's
   `JwtAuthenticationConverter` reads that claim and prefixes it with `ROLE_`
   (`Admin` → `ROLE_Admin`, `User` → `ROLE_User`). See `SecurityConfig.java`.

### 2.3 Per-user device filter — the `custom:device_id` attribute

To restrict a regular user to a single device's data (Part 3 requirement):

1. **Cognito → User pool → Sign-up experience → Custom attributes →** add a custom
   attribute named **`device_id`** (string). In tokens it appears as **`custom:device_id`**.
2. For each non-admin user, set their `custom:device_id` to the device they own
   (e.g. `device-001`).
3. The API reads `jwt.getClaimAsString("custom:device_id")`:
   - **Admin** → claim ignored, returns all devices.
   - **User with a `device_id`** → returns only that device's data.
   - **User without a `device_id`** → **HTTP 403** (`UserController.java`).

> Make sure the App client is allowed to **read** the `custom:device_id` attribute
> (App client → *Attribute read and write permissions*), otherwise the claim never reaches
> the token.

### 2.4 What goes where

- `index.js` → `authority`, `client_id`, `redirect_uri`, `scope` (all public, safe in source).
- `application.properties` → `spring.security.oauth2.resourceserver.jwt.issuer-uri`
  (public issuer; the API auto-fetches the JWKS for signature validation).

No AWS secret keys are needed at runtime — the SPA uses the public OIDC flow and the API
validates tokens using the public issuer/JWKS.

---

## 3. Azure

Azure hosts the frontend, backend, database, storage, ETL, and the notification function.

### 3.1 App Service — backend (`p3-api`) and frontend (`p3-ui`)

Two App Services:
- **`p3-api`** — runs the Spring Boot fat JAR (`app.jar`), Java 21.
- **`p3-ui`** — serves the built React app.

#### Backend Application Settings (these become environment variables)

In **App Service `p3-api` → Settings → Configuration → Application settings**, add:

| Name | Example value | Secret? |
|------|---------------|---------|
| `AZURE_DB_URL` | `jdbc:postgresql://erasmus-api-db.postgres.database.azure.com:5432/energy?sslmode=disable` | no |
| `AZURE_DB_USER` | `apiadmin` | no |
| `AZURE_DB_PASSWORD` | `<strong password>` | **yes** |
| `APP_FRONTEND_URL` | `https://p3-ui.azurewebsites.net` | no |

These map 1:1 to the placeholders in `application.properties`:
```properties
spring.datasource.url=${AZURE_DB_URL}
spring.datasource.username=${AZURE_DB_USER}
spring.datasource.password=${AZURE_DB_PASSWORD}
app.frontend.url=${APP_FRONTEND_URL:http://localhost:3000}
```

> **Optional (hardening):** instead of putting `AZURE_DB_PASSWORD` directly in App Settings,
> store it in **Azure Key Vault** and reference it with a Key Vault reference
> (`@Microsoft.KeyVault(SecretUri=...)`). The project already depends on
> `spring-cloud-azure-starter-keyvault`, so this satisfies the "secret service" option of Part 3.

#### Frontend setting
The UI's API base URL is **baked in at build time** by the CI workflow
(`REACT_APP_API_URL=https://p3-api.azurewebsites.net`). If you serve the UI differently, set
`REACT_APP_API_URL` accordingly before `npm run build`.

### 3.2 PostgreSQL database

1. Create an **Azure Database for PostgreSQL** instance (e.g. `erasmus-api-db`).
2. Create a database (e.g. `energy`).
3. Allow the App Service to reach it (firewall rule / VNet / "Allow Azure services").
4. Put the JDBC URL, user, and password into the App Service settings above.
   The current URL uses `sslmode=disable` to avoid TLS certificate friction; for production,
   prefer `sslmode=require` and supply the CA.
5. Schema is created automatically — `spring.jpa.hibernate.ddl-auto=update` builds the
   `latest_data` and `historical_data` tables on first run.

### 3.3 Blob Storage (ETL input/output) — keep it private

1. Create a **Storage Account** with a container holding three logical prefixes:
   - `raw/` — incoming CSV (drop zone, triggers the pipeline)
   - `latest/device-<id>.json` — current state per device (overwritten each run)
   - `by-timestamp/<timestamp>/device-<id>.json` — immutable history
2. **Disable public access** on the account and container (Part 3 requirement).
3. Grant access only to the **Data Factory**, the **Logic App / serverless workflow**, and the
   **API** — preferably via
   **managed identities** + RBAC (`Storage Blob Data Contributor`/`Reader`) rather than
   account keys. If you must use a connection string, store it in App/Function settings or
   Key Vault, never in source.

### 3.4 Data Factory (ETL pipeline)

The pipeline is an ADF **data flow** triggered when a file lands in `raw/`. It groups by
`device_id`, computes `total_kwh` and record counts, nests readings into a `records` array,
and writes both the `latest` and `by-timestamp` sinks. Full transformation steps are in
[`Part_2/documentation.md`](Part_2/documentation.md).

Setup:
1. Create a **Data Factory**.
2. Create **linked services** to the storage account (managed identity recommended).
3. Import / build the data flow and pipeline.
4. Add a **Storage event trigger** on blob-created under `raw/`.

### 3.5 Microsoft Teams notification (Web activity → Logic App)

The orchestration pipeline (`p3ETLFunction`) notifies a Teams channel after the data flow
runs. As shown in the [Part 2 screenshots](Part_2/documentation.md#pipeline-in-azure-data-factory-screenshots),
this is done with **Web activities** (not a Function App): the success branch and the failure
branch each POST a JSON payload to an **Azure Logic App** HTTP-trigger webhook, which relays
the message to Teams.

1. In the **Teams** channel, create an **Incoming Webhook** (or a Logic App with a "When an
   HTTP request is received" trigger that posts to Teams) and copy its URL.
2. Reference that URL from the ADF Web activities. Keep it out of source — pass it as a
   **pipeline parameter** or **linked-service setting**, not a hard-coded value in the repo.
3. Payloads: success → `{"status":"SUCESSO","message":"Processamento concluido"}`,
   failure → `{"status":"FALHA","message":"Falha na Transformação."}`.

---

## 4. GitHub — CI/CD secrets

In the GitHub repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Used by | How to obtain |
|--------|---------|---------------|
| `AZURE_CREDENTIALS` | `main_erasmus-cc2025-api.yml` (API deploy via `azure/login@v2`) | Create a service principal and paste its JSON: `az ad sp create-for-rbac --name p3-api-deployer --role contributor --scopes /subscriptions/<sub>/resourceGroups/<rg> --sdk-auth` |
| `AZURE_PUBLISHPROFILE` | `main_erasmus-cc2025-ui.yml` (UI deploy) | App Service `p3-ui` → **Get publish profile**, paste the downloaded XML |

The `AZURE_CREDENTIALS` JSON looks like:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/"
}
```

> Both workflows trigger on push to `main` and via manual `workflow_dispatch`.

---

## 5. Local development

For running without the cloud, use these values:

**Backend** — export before `./mvnw spring-boot:run`:
```bash
export AZURE_DB_URL="jdbc:postgresql://localhost:5432/energy?sslmode=disable"
export AZURE_DB_USER="postgres"
export AZURE_DB_PASSWORD="postgres"
export APP_FRONTEND_URL="http://localhost:3000"
```
The JWT issuer stays pointed at the Cognito pool (`application.properties`); the API will
fetch the public JWKS automatically. To use a different pool, change `jwt.issuer-uri`.

**Frontend** — no env needed locally; `Dashboard.js` automatically targets
`http://localhost:8080` when the host is `localhost`. To test against the deployed pool,
keep the existing `index.js` Cognito config and add `http://localhost:3000` to the Cognito
callback/sign-out URLs.

---

## 6. Verification checklist

- [ ] Cognito app client has `http://localhost:3000` **and** the deployed UI URL in callback + sign-out URLs.
- [ ] `Admin` and `User` groups exist; test users are assigned.
- [ ] Non-admin test user has `custom:device_id` set; app client can read it.
- [ ] App client OAuth = Authorization Code grant; scopes `openid email profile`.
- [ ] `p3-api` App Settings: `AZURE_DB_URL`, `AZURE_DB_USER`, `AZURE_DB_PASSWORD`, `APP_FRONTEND_URL`.
- [ ] PostgreSQL reachable from `p3-api`; tables auto-created on first boot.
- [ ] Blob storage public access **disabled**; ADF/Function/API access via managed identity.
- [ ] Teams webhook URL stored as a Function setting (not in source).
- [ ] GitHub Secrets `AZURE_CREDENTIALS` and `AZURE_PUBLISHPROFILE` present.
- [ ] Push to `main` triggers both workflows and both deploy successfully.
- [ ] Admin login → sees all devices; user login → sees only their device; user without `device_id` → 403.
