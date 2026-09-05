# Getting Started

This is the guided procedure to run the whole Registry stack locally: PostgreSQL, an OIDC provider, the backend, and the frontend. The two application repositories are `Registry-Backend` (Kotlin/Spring) and `Registry-Frontend` (Angular).

## Prerequisites

| Tool | Version | For |
| ---- | ------- | --- |
| **JDK** | 25 | Building and running the backend (Gradle toolchain) |
| **Docker + Compose** | recent | Running PostgreSQL and the OIDC provider locally |
| **Node.js** | 24 LTS (`^24.15`) | Building and running the frontend; Angular 22's engine range, and CI builds on Node 24 |
| **pnpm** | 11 | Frontend package management (`packageManager` pins the exact version) |

The backend builds with the bundled Gradle wrapper (`./gradlew`), so a system Gradle is not required.

## 1 — Start the dependencies

The backend repository ships `local-dev/compose.yml`, which brings up everything the backend needs: **PostgreSQL** (initializing a `registry` database and an `authentik` one) and an **OIDC provider** — the local setup uses **Authentik** (default `http://localhost:9000`); the backend is provider-agnostic, see [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth).

```shell
cd Registry-Backend/local-dev
cp .example.env .env      # then fill in PG_PASS, AU_SECRET_KEY, AU_EMAIL, AU_PASS
docker compose up -d
```

Once Authentik is up, create an **OAuth2/OIDC provider + application** for Registry (confidential, with a client secret), and note its **issuer / JWKS / authorization / token / end-session URLs**, the **client id**, and the **client secret** — the backend needs them below.

## 2 — Run the backend

The backend reads all infrastructure settings from JVM system properties (`-D…`). Point it at the database and the OIDC provider, then start it in dev mode:

```shell
cd Registry-Backend
./gradlew bootRun
```

Pass the settings as VM options. The essentials:

```
-Dregistry.datasource.base-url=localhost:5432                        # host:port, no scheme
-Dregistry.datasource.database=registry
-Dregistry.datasource.schemas=public
-Dregistry.datasource.username=postgres
-Dregistry.datasource.password=<password>
-Dexternal.oidc.jwks-uri=http://localhost:9000/application/o/registry/jwks/
-Dexternal.oidc.authorization-uri=http://localhost:9000/application/o/authorize/
-Dexternal.oidc.token-uri=http://localhost:9000/application/o/token/
-Dexternal.oidc.end-session-uri=http://localhost:9000/application/o/registry/end-session/
-Dexternal.oidc.client-id=<client-id>
-Dexternal.oidc.client-secret=<client-secret>
-Dexternal.cors.urls=http://localhost:4200                           # frontend origin(s), comma-separated
-Dregistry.server.port=8081
-Dregistry.server.logging-level=INFO
-Dregistry.feature.documentation.enabled=true                        # enable Swagger locally
```

The OIDC URLs above are the Authentik defaults for an application slug `registry`; take the exact values from the provider you configured. On boot, **Flyway applies the migrations** to the `registry` database automatically. The API is then available at `http://localhost:8081/api/v1`, and — with documentation enabled — Swagger UI at `/swagger-ui.html` (also served at the root).

To produce a runnable artifact instead:

```shell
./gradlew build          # → build/libs/*.jar
java -jar build/libs/<jar-name>.jar   # with the same -D options
```

## 3 — Configure and run the frontend

The frontend is **environment-agnostic**: it loads its configuration at runtime from two JSON files under `public/settings/`, which are not committed ([ADR 007](/registry/technical/adr/007-frontend-runtime-config)). Create them before starting.

`public/settings/env.json` — where the backend is and which paths skip auth:

```json
{
  "production": false,
  "backend": {
    "url": "http://localhost:8081",
    "noAuthPaths": [
      "/api/v1/authentication/login/uri",
      "/api/v1/authentication/logout/uri",
      "/api/v1/authentication/token",
      "/api/v1/authentication/token/refresh"
    ]
  }
}
```

`public/settings/config.json` — languages, theme tokens, logos, enabled UI actions and notification durations. Start from the sample in the frontend README and adjust `defaultLanguage`, `languages` (`fr`, `en`), and the PrimeNG theme.

Then install and run:

```shell
cd Registry-Frontend
pnpm install
pnpm start          # ng serve, on http://localhost:4200
```

## 4 — Verify

1. Open `http://localhost:4200`. Being unauthenticated, the app redirects you to the OIDC provider.
2. Sign in. On first login the backend **auto-provisions** your account with the default `USER` role ([Security](/registry/technical/security#jwt--application-user)).
3. You land on an empty project list. Click **Create project** to make yourself its administrator, and you are inside the app.

To make yourself a **platform administrator** (to reach the Users directory), change your user's global role directly in the `registry` database (`tb_user.role = 'USER_ADMINISTRATOR'`) and sign in again so a fresh token picks up the new authorities.

## Build outputs & images

| Service | Local build | Container image |
| ------- | ----------- | --------------- |
| Backend | `./gradlew build` → JVM jar | Distroless Java 25, non-root, `:8081` |
| Frontend | `pnpm build` → `dist/browser` | Unprivileged nginx serving the static bundle, `:8080` |

Both images are produced and published by CI via semantic-release ([ADR 009](/registry/technical/adr/009-container-delivery-semantic-release)); you rarely build them by hand.
