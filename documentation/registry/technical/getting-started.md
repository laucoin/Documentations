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

The backend repository ships `local-dev/compose.yml`, which brings up everything the backend needs: **PostgreSQL** (initializing a `registry` database and an `authentik` one) and **Authentik** as the local OIDC provider (`http://localhost:9000`) — the backend itself is provider-agnostic, see [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth).

```shell
cd Registry-Backend/local-dev
cp .example.env .env
docker compose up -d
```

Before starting the containers, fill in the `FIXME`s in `.env`: `PG_PASS`, `AU_SECRET_KEY` (`openssl rand -base64 60 | tr -d '\n'`), `AU_EMAIL`, `AU_PASS`, and `IDP_PRIVATE_CLIENT_SECRET` (`openssl rand -hex 32`).

On startup, Authentik **auto-applies the bundled blueprint** (`local-dev/authentik/blueprints/registry.yaml`) — no manual setup in the Authentik admin console is needed. It provisions:

- the backend's two OAuth2 clients, from the `.env` values above: a **confidential** one (`IDP_PRIVATE_CLIENT_ID` / `_SECRET`, default `registry`) for the backend's own code/refresh exchange, and a **public** one (`IDP_PUBLIC_CLIENT_ID`, default `registry-swagger`) for Swagger UI's implicit-flow "Authorize" button;
- **six test accounts**, all `*@sgdf.fr` sharing the `AU_PASS` password: `administrator`, `coordinator`, `participant`, `blocked-user`, `blocked-profile`, and `unverified`. The first five have a matching row already seeded in the backend's own database (next step) and get **linked to it by email on first login** ([Security → JWT to application user](/registry/technical/security#jwt-→-application-user)); `unverified` has no matching row, so signing in as it exercises the plain auto-provisioning (JIT) path instead.

The blueprint points the confidential client's redirect URI at `http://localhost:4200/auth/callback` and Swagger's at `http://localhost:8082/swagger-ui/oauth2-redirect.html` — override with `IDP_FRONTEND_REDIRECT_URI` / `IDP_SWAGGER_REDIRECT_URI` in `.env` if your frontend uses a different callback route.

## 2 — Run the backend

The backend reads its configuration from **environment variables**; a variable with no default is *required* — `application.yml` declares it as a placeholder with no fallback, so a missing one fails startup loudly instead of booting on something unintended. Run it with the **`local` Spring profile active**, so its own database gets the seed rows the Authentik test accounts above link to — without it, those accounts find nothing to link to and get auto-provisioned as brand-new `USER`s instead:

```shell
cd Registry-Backend
DATASOURCE_BASE_URL=localhost:5432 \
DATASOURCE_PASSWORD=<PG_PASS from .env> \
IDP_JWKS_URI=http://localhost:9000/application/o/registry/jwks \
IDP_AUTHORIZATION_URI=http://localhost:9000/application/o/authorize \
IDP_TOKEN_URI=http://localhost:9000/application/o/token \
IDP_END_SESSION_URI=http://localhost:9000/application/o/registry/end-session \
IDP_REVOCATION_URI=http://localhost:9000/application/o/revoke \
IDP_PRIVATE_CLIENT_SECRET=<same value as .env> \
EXTERNAL_CORS_URLS=http://localhost:4200,http://localhost:8082 \
REGISTRY_DOCUMENTATION_ENABLED=true \
COOKIE_SECURE=false \
SPRING_PROFILES_ACTIVE=local \
./gradlew bootRun
```

A few notes on that list:

- `IDP_PRIVATE_CLIENT_ID` and `IDP_PUBLIC_CLIENT_ID` default to `registry` / `registry-swagger`, matching the blueprint, so they don't need repeating unless you changed them in `.env`.
- `EXTERNAL_CORS_URLS` needs **both** origins: the frontend (`:4200`) and the management port (`:8082`) — Swagger UI is served from the management port but calls the API on `:8081` for "try it out", which is itself a cross-origin request.
- `COOKIE_SECURE=false` is required on plain HTTP — the auth cookies are `Secure` by default and the browser silently drops them otherwise; never set this outside local development.

The full variable reference — datasource, IdP timeouts, server ports, rate limiting, feature flags — lives in the [backend README](https://github.com/laucoin/Registry-Backend#configuration); the essentials above are enough to get running.

On boot, **Flyway applies the migrations** (and, under the `local` profile, the seed dataset) to the `registry` database automatically. The API is then available at `http://localhost:8081/api/v1`; with documentation enabled, Swagger UI is on the **management port**, at `http://localhost:8082/swagger-ui.html`. Authentication sets `HttpOnly` cookies scoped to `http://localhost:8081`, so keep the frontend's `backend.url` on that same host and port — cookies won't reach a different one.

To produce a runnable artifact instead:

```shell
./gradlew build          # → build/libs/*.jar
java -jar build/libs/<jar-name>.jar   # with the same environment variables
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

1. Open `http://localhost:4200`. Being unauthenticated, the app redirects you to Authentik.
2. Sign in as one of the seeded accounts — e.g. `administrator@sgdf.fr`, password the `AU_PASS` value from `.env` (the `.example.env` default is `dev123`). First login **links** it to the matching seeded row, so you're immediately a platform administrator with the Users directory reachable, no manual database edit needed.
3. To see the other path instead, sign in as `unverified@sgdf.fr`: the backend finds no OIDC id and no matching email, and **auto-provisions** a brand-new account with the default `USER` role ([Security → JWT to application user](/registry/technical/security#jwt-→-application-user)).

`administrator`, `coordinator`, and `participant` land in a project list already populated by the seed dataset. The other two personas exercise the two different flavours of "disabled" ([Security](/registry/technical/security#visibility-gating)): `blocked-user` is blocked at the **account** level and is rejected at sign-in (`423 LOCKED`); `blocked-profile` signs in fine, but its **project profile** is disabled — as its project's administrator, it keeps only read/re-enable/delete on that one project, nothing else. A brand-new account (like `unverified`) lands on an empty project list — click **Create project** to become its administrator.

## Build outputs & images

| Service | Local build | Container image |
| ------- | ----------- | --------------- |
| Backend | `./gradlew build` → JVM jar | Distroless Java 25, non-root, `:8081` |
| Frontend | `pnpm build` → `dist/browser` | Unprivileged nginx serving the static bundle, `:8080` |

Both images are produced and published by CI via semantic-release ([ADR 009](/registry/technical/adr/009-container-delivery-semantic-release)); you rarely build them by hand.
