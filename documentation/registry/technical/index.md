# Technical Documentation

This section covers the engineering of Registry: the two-service architecture, the reactive backend, the Angular frontend, the data model and API contracts, the security model, and the Architecture Decision Records that justify each choice. It assumes the [Functional Documentation](/registry/functional/) — especially the [Roles & Permissions](/registry/functional/roles-and-permissions) baseline — is understood.

## System at a glance

Registry is delivered as **two independently versioned services** plus two supporting infrastructure components:

```mermaid
flowchart LR
    Browser["Browser (SPA)"]
    subgraph Frontend["Frontend · nginx :8080"]
      SPA["Angular 22 SPA<br/>NGXS · PrimeNG"]
    end
    subgraph Backend["Backend · JVM :8081"]
      API["Spring WebFlux (reactive)<br/>Hexagonal · R2DBC"]
    end
    IdP["OIDC Identity Provider"]
    DB[("PostgreSQL")]

    Browser --> SPA
    SPA -- "REST /api/v1 (Bearer JWT)" --> API
    Browser -. "login redirect" .-> IdP
    SPA -- "code / refresh exchange" --> API
    API -- "validate JWT (JWKS) · code/refresh grants" --> IdP
    API -- "R2DBC (runtime) · JDBC (Flyway)" --> DB
```

The browser loads the SPA from nginx, which calls the backend over REST with a bearer JWT. Authentication is delegated to an external OIDC provider; the backend both validates JWTs (as a resource server) and brokers the code/refresh exchanges (as a confidential client). All state lives in a single PostgreSQL database.

## Documentation map

| Page | Purpose |
| ---- | ------- |
| [Getting Started](/registry/technical/getting-started) | Run the whole stack locally: prerequisites, dependencies, and configuration |
| [Architecture](/registry/technical/architecture) | The hexagonal backend, the Angular frontend, and how a request flows end to end |
| [Security](/registry/technical/security) | Authentication flow, JWT-to-user mapping, and how the project-scoped RBAC is enforced |
| [Data Model](/registry/technical/data-model) | The PostgreSQL schema, entity relationships, auditing, and trigram search |
| [API Reference](/registry/technical/api-reference) | Every `/api/v1` endpoint, grouped by domain, with its required permission |
| [ADR index](/registry/technical/adr/) | All Architecture Decision Records, in causal order |

## Stack summary

Versions are given to the major only; the source repositories hold the exact pins.

| Layer | Backend                                             | Frontend |
| ----- |-----------------------------------------------------| -------- |
| Language | Kotlin 2 (JVM toolchain 25)                         | TypeScript 6 |
| Framework | Spring Boot 4 · WebFlux (reactive)                  | Angular 22 (standalone components) |
| Architecture | Hexagonal (ports & adapters), ArchUnit-enforced     | Domain-driven folders, per-route lazy state |
| State / data | R2DBC (reactive) + Flyway migrations                | NGXS (`selectSignal`) behind per-domain facades |
| UI | —                                                   | PrimeNG + `@primeuix/themes` + Bootstrap grid |
| Auth | OAuth2 resource server + confidential client (OIDC) | Bearer token in session storage, HTTP interceptor, route guards |
| API docs | springdoc OpenAPI (feature-flagged)                 | — |
| i18n | Spring `MessageSource` (en, fr)                     | `@ngx-translate` (en, fr) |
| Observability | Actuator + Micrometer/Prometheus                    | — |
| Build | Gradle (Kotlin DSL)                                 | Angular CLI + pnpm |
| Runtime image | Distroless Java 25, non-root, JVM jar               | Unprivileged nginx serving the static bundle |
| Persistence | PostgreSQL (`pg_trgm` trigram search)               | — |
| Release | semantic-release → GHCR (retain 5)                  | semantic-release → GHCR (retain 5) |
