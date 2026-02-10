# Architecture Documentation: Erasmus Cloud Computing

This document provides an overview of the system architecture and the communication flow between the **Frontend (UI)**, **Backend (API)**, and **Database (DB)** services. It also details essential security, deployment, and configuration aspects of the system.

---

## 1. Architecture Overview (Microservices)

The application follows a **microservices architecture**, with the Frontend and Bac<kend deployed independently using **Azure App Services**.

### Components Overview

| Component        | Technology                       | Azure Service           | Purpose                                                                 |
|-----------------|-----------------------------------|--------------------------|-------------------------------------------------------------------------|
| **Frontend (UI)** | Node.js (Static File Server)      | `erasmus-cc2025-ui`      | Serves static assets (HTML/CSS/JS) and sends API requests.             |
| **Backend (API)** | Spring Boot 3.x (Java 21)         | `erasmus-cc2025-api`     | Handles business logic, authentication (JWT), and persistence.         |
| **Database (DB)** | PostgreSQL                         | `erasmus-api-db`         | Stores persistent application data (users, items).                      |

---

## 2. UML Sequence Diagram: User Registration Flow

The diagram below outlines the **User Registration** workflow, including **CORS negotiation** and persistence with **JPA**.


    
## 3.1. Authentication and Database (API)

| Configuration        | Location                           | Purpose                                                                 |
|----------------------|-------------------------------------|-------------------------------------------------------------------------|
| Secure Credentials   | Azure App Settings (SPRING_DATASOURCE_PASSWORD) | Stores DB password securely, removed from application.properties.       |
| DB Connection URL    | application.properties              | Configured with `sslmode=disable` to avoid TLS/SSL certificate issues. |
| Data Mapping         | application.properties              | `spring.jpa.hibernate.ddl-auto=update` auto-creates/updates tables.     |

---

## 3.2. Security and Routing (API)

| Configuration        | File                | Purpose                                                                 |
|----------------------|---------------------|-------------------------------------------------------------------------|
| CORS Policy (Open)   | SecurityConfig.java | Allows both HTTP/HTTPS origins from the UI domain. Ensures CORS preflight success. |
| Controller Mapping   | AuthController.java | Centralizes login and registration with proper `@PostMapping`. Fixes “GET not supported” errors. |
| Public Endpoints     | SecurityConfig.java | `requestMatchers("/api/auth/**").permitAll()` allows unauthenticated registration/login. |
