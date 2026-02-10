# Architecture Documentation: Erasmus Cloud Computing

This document describes the current system architecture and the end-to-end flow between the **React UI**, the **Spring Boot API**, **AWS Cognito (OIDC)**, and the **Data Layer (Processed container)**.

---

## 1. Architecture Overview

The application is split into independently deployed components:

- **Frontend (UI)**: React single-page app (SPA) running in the browser
- **Backend (API)**: Spring Boot REST API
- **Authentication**: AWS Cognito (OIDC Authorization Code flow)
- **Data Layer**: ?Processed? container (the API reads dashboard data from here)

### Components Overview

| Component | Technology | Purpose |
|---|---|---|
| **Frontend (UI)** | React | Renders dashboards, handles authentication redirects, calls the API with JWTs. |
| **Backend (API)** | Spring Boot (Java) | Validates JWT, applies role-based logic, fetches data from the processed container, returns dashboard payload. |
| **Auth (IdP)** | AWS Cognito (OIDC) | Issues tokens used by the UI and validated by the API. |
| **Data Layer** | Processed container | Source of ?latest? and ?historical? processed readings returned by the API. |

> Note: The dashboard flow assumes **no traditional database** is used for dashboard reads; data is retrieved from the **processed container**.

---

## 2. Diagrams

### 2.1 Architecture Diagram

- PlantUML source: `docs/Part_3/arch-diagram.puml`
- Rendered image: `docs/Part_3/arch-diagram.png`

![Architecture Diagram](arch-diagram.png)

### 2.2 Dashboard Sequence Diagram (React + Cognito + API + Processed container)

- PlantUML source: `docs/Part_3/sequence-diagram.puml`
- Rendered image: `docs/Part_3/sequence-diagram.png`

![Dashboard Sequence Diagram](sequence-diagram.png)

---

## 3. Dashboard Flow (UI ? API)

This section documents the full end-to-end flow for the **Dashboard**, aligned with the sequence diagram.

### 3.1 Authentication (OIDC / Cognito)

#### 3.1.1 Login (Authorization Code Flow)
1. The user opens the UI.
2. The UI redirects the user to Cognito to authenticate.
3. Cognito redirects back with an authorization code.
4. The UI exchanges the code for tokens (commonly `id_token` and `access_token`).

#### 3.1.2 Calling the API
The UI calls the API using:
- `Authorization: Bearer <jwt>`

The API validates the JWT and extracts:
- user identity claims
- authorities/roles
- device identifier claim (for standard users), if applicable

---

### 3.2 Dashboard API Endpoint

#### 3.2.1 Request
- **Method**: `GET`
- **Path**: `/api/dashboard-data`
- **Headers**:
  - `Authorization: Bearer <jwt>`

#### 3.2.2 Response (expected structure)
The API returns a consolidated JSON payload:

- `role`: `"admin"` or `"user"`
- `latest`: list (can be empty)
- `historical`: list
- when `role = "user"`:
  - `device_id`


---

### 3.3 Backend Logic (aligned with diagram)

1. **JWT validation**: verify signature/issuer/audience as configured.
2. **Role check**:
  - **Admin**: fetch ?latest? and ?historical? for all devices from the processed container.
  - **Standard user**: extract `device_id` from token claims.
    - If missing ? return **403 Forbidden**
    - If present ? fetch ?latest? and ?historical? filtered by `device_id` from the processed container.
3. Return `200 OK` with the dashboard payload.

---

### 3.4 Data Layer (Processed container)

The API reads dashboard data from the **processed** container:
- **Latest** readings (most recent per device)
- **Historical** readings (time series)

Filtering behavior:
- Admin: unfiltered (all devices)
- User: filtered by `device_id`

---

### 3.5 Frontend Rendering

After receiving the API response, the UI:
1. transforms raw arrays into table/chart-friendly structures
2. renders:
  - latest table
  - line chart (historical trend)
  - bar charts (totals/averages)
3. shows appropriate states:
  - loading (auth or data)
  - error (network/auth/forbidden)
  - ready state

---

## 4. Common Failure Modes (quick)

- **401 Unauthorized**: missing/expired/invalid token, JWT validation mismatch
- **403 Forbidden**: user token missing required `device_id` claim or insufficient role
- **CORS blocked**: origin/headers not allowed (preflight fails)

---