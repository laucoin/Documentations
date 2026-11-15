---
title: 'Getting started'
description: 'Run the whole Registry stack locally: dependencies, backend, frontend and verification.'
---

# Getting started

This is the guided procedure to run the whole Registry stack locally: PostgreSQL, an OIDC provider, the backend and the frontend. The two application repositories are `Registry-Backend` (Kotlin/Spring) and `Registry-Frontend` (Angular).

## Prerequisites

| Tool                 | Version                                                    | For                                              |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| **JDK**              | The one in `jvmToolchain` in `build.gradle.kts`            | Compiling and running the backend                |
| **Docker + Compose** | Recent                                                     | Running PostgreSQL and the OIDC provider locally |
| **Node.js**          | The one in `.nvmrc` and in the `engines` of `package.json` | Compiling and running the frontend               |
| **pnpm**             | The one in `packageManager` in `package.json`              | Frontend package management                      |

The backend builds with the provided Gradle wrapper (`./gradlew`), so a system-wide Gradle is not needed.

## 1 — Start the dependencies

The backend repository provides `local-dev/compose.yml`, which starts everything the backend needs: **PostgreSQL** (which initializes a `registry` database and an `authentik` database) and **Authentik** as the local OIDC provider (`http://localhost:9000`) — the backend itself is provider-agnostic, see [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth).

```shell
cd Registry-Backend/local-dev
cp .example.env .env
docker compose up -d
```

Before starting the containers, fill in the `FIXME`s of the `.env` file: `PG_PASS`, `AU_SECRET_KEY` (`openssl rand -base64 60 | tr -d '\n'`, without any `%` character), `AU_EMAIL`, `AU_PASS` and `IDP_PRIVATE_CLIENT_SECRET` (`openssl rand -hex 32`).

On startup, Authentik **automatically applies the provided blueprint** (`local-dev/authentik/blueprints/registry.yaml`) — no manual configuration in the Authentik admin console is needed. It provisions:

- the backend's two OAuth2 clients, from the `.env` values above: a **confidential** client (`IDP_PRIVATE_CLIENT_ID` / `_SECRET`, `registry` by default) for the backend's code/refresh exchanges, and a **public** client (`IDP_PUBLIC_CLIENT_ID`, `registry-swagger` by default) for Swagger UI's "Authorize" button using authorization code + PKCE;
- **five test accounts** sharing the `AU_PASS` password: `administrator`, `coordinator`, `participant`, `blocked-user` and `blocked-profile`, all `*@sgdf.fr` except `participant`. Each has a matching row already injected into the backend's own database (next step) and is **linked to it by email on first sign-in** ([Security → JWT to application user](/registry/technical/security#jwt-→-application-user)). The `participant` account deliberately has a very long name and email to stress the layout and input bounds. To exercise the automatic creation (JIT) path, create an extra user in Authentik with no injected counterpart.

The blueprint points the confidential client's redirect URI to `http://localhost:4200/auth/callback` and Swagger's to `http://localhost:8082/swagger-ui/oauth2-redirect.html` — override them with `IDP_FRONTEND_REDIRECT_URI` / `IDP_SWAGGER_REDIRECT_URI` in `.env` if your frontend uses another callback route.

## 2 — Run the backend

The backend reads its configuration from **environment variables**; a variable without a default value is _required_ — `application.yml` declares it as a placeholder with no fallback, so a missing variable makes startup fail loudly rather than start on something unintended. Run it with the **`local` Spring profile active**, so that its own database receives the seed rows the Authentik test accounts above link to — without it, those accounts find nothing to link to and are automatically created as new `USER`s:

```shell
cd Registry-Backend
DATASOURCE_BASE_URL=localhost:5432 \
DATASOURCE_PASSWORD=<PG_PASS from .env> \
IDP_JWKS_URI=http://localhost:9000/application/o/registry/jwks \
IDP_AUTHORIZATION_URI=http://localhost:9000/application/o/authorize \
IDP_TOKEN_URI=http://localhost:9000/application/o/token \
IDP_END_SESSION_URI=http://localhost:9000/application/o/registry/end-session \
IDP_REVOCATION_URI=http://localhost:9000/application/o/revoke \
IDP_ALLOWED_REDIRECT_URIS=http://localhost:4200/auth/callback \
IDP_ALLOWED_LOGOUT_REDIRECT_URIS=http://localhost:4200 \
IDP_PRIVATE_CLIENT_SECRET=<same value as .env> \
EXTERNAL_CORS_URLS=http://localhost:4200,http://localhost:8082 \
REGISTRY_DOCUMENTATION_ENABLED=true \
COOKIE_SECURE=false \
SPRING_PROFILES_ACTIVE=local \
./gradlew bootRun
```

A few notes on this list:

- `IDP_ALLOWED_REDIRECT_URIS` and `IDP_ALLOWED_LOGOUT_REDIRECT_URIS` are **required** comma-separated allowlists of exact URIs (no wildcard; a trailing `/` counts). The backend refuses to start with an empty list and answers `400` to any other `redirectUri`.
- `IDP_PRIVATE_CLIENT_ID` and `IDP_PUBLIC_CLIENT_ID` default to `registry` / `registry-swagger`, as in the blueprint; no need to repeat them unless you changed them in `.env`.
- `EXTERNAL_CORS_URLS` needs **both** origins: the frontend (`:4200`) and the management port (`:8082`) — Swagger UI is served from the management port but calls the API on `:8081` for "try it out", which is itself a cross-origin request.
- Behind a reverse proxy (not locally), set `REGISTRY_TRUSTED_PROXIES`: without it, rate limiting and the audit see the proxy's address instead of the client's ([Security → Rate limiting](/registry/technical/security#rate-limiting)).
- `COOKIE_SECURE=false` is needed over plain HTTP — authentication cookies are `Secure` by default and the browser silently ignores them otherwise. The `local` profile already sets it (`application-local.yml`); the variable is only useful if you run without that profile. Never enable it outside local development.

The full variable reference — datasource, IdP timeouts, server ports, rate limits, audit, purges, feature flags — is in the [backend README](https://github.com/laucoin/Registry-Backend#configuration); the essentials above are enough to get started.

On startup, **Flyway applies the migrations** (and, under the `local` profile, the seed data set) to the `registry` database automatically. The API is then available at `http://localhost:8081/api/v2`; with documentation enabled, Swagger UI is on the **management port**, at `http://localhost:8082/swagger-ui.html`. Authentication sets `HttpOnly` cookies scoped to `http://localhost:8081`; so keep the frontend's `backend.url` on that same host and port — the cookies would not reach another one.

::: warning The seed resets the database
The seed (`db/seed/R__seed_dev_dataset.sql`) is a **repeatable** Flyway migration that starts by emptying the tables (`TRUNCATE … CASCADE`). It is replayed every time the file changes: all local data is then erased, including automatically created accounts.
:::

To produce a runnable artifact instead:

```shell
./gradlew build                             # → build/libs/registry-backend.jar
java -jar build/libs/registry-backend.jar   # with the same environment variables
```

## 3 — Configure and run the frontend

The frontend is **environment-agnostic**: it loads its configuration at runtime from two JSON files under `public/settings/` ([ADR 007](/registry/technical/adr/007-frontend-runtime-config)). `config.json` is versioned; `env.json` is not and must be created before starting.

`public/settings/env.json` — to create: where the backend is, on which paths a 401 does not trigger a refresh (`noRefreshPaths`) and which paths are sent without cookies (`credentialFreePaths`):

```json
{
  "production": false,
  "backend": {
    "url": "http://localhost:8081",
    "noRefreshPaths": [
      "/api/v2/authentication/login/uri",
      "/api/v2/authentication/logout/uri",
      "/api/v2/authentication/token",
      "/api/v2/authentication/token/refresh"
    ],
    "credentialFreePaths": ["/api/v2/metadata/", "/api/v2/authentication/login/uri"]
  },
  "hosting": { "providerName": null, "providerAddress": null }
}
```

`public/settings/config.json` — already in the repository: application identity, languages, notification durations and list search (`list.searchDebounce`, `list.searchMinLength`). Adjust `defaultLanguage` and `languages` (`fr`, `en`) if needed. The theme belongs to `@sgdf/ui` and is not configured here.

Then install and run:

```shell
cd Registry-Frontend
pnpm install
pnpm start          # ng serve, on http://localhost:4200
```

## 4 — Verify

1. Open `http://localhost:4200`. Unauthenticated, the application redirects you to Authentik.
2. Sign in with one of the injected accounts — for example `administrator@sgdf.fr`, with the `AU_PASS` value from `.env` as the password. The first sign-in **links** it to the matching injected row: you are immediately a platform administrator with the user directory available, without any manual database change.
3. To see the other path, sign in with an Authentik user with no injected counterpart: the backend finds neither a matching OIDC identifier nor email, and **automatically creates** a new account with the default `USER` role ([Security → JWT to application user](/registry/technical/security#jwt-→-application-user)).

`administrator` is the administrator of every project in the seed data set; `coordinator` and `participant` have an **invited** profile there, which grants no authority until it is accepted. The other two accounts illustrate the two kinds of "disabled": `blocked-user` is blocked at the **account** level and rejected on sign-in (`423 LOCKED`); `blocked-profile` signs in without any problem, but their **project profiles** are disabled on all the seed projects — a disabled profile grants no authority, so they have access to none of those projects. A brand-new account lands on an empty project list — click **Create a project** to become its administrator.

## Build outputs and images

| Service  | Local build                   | Container image                                       |
| -------- | ----------------------------- | ----------------------------------------------------- |
| Backend  | `./gradlew build` → JVM jar   | Distroless Java, non-root, `:8081`                    |
| Frontend | `pnpm build` → `dist/browser` | Unprivileged nginx serving the static bundle, `:8080` |

Both images are produced and published by CI via semantic-release ([ADR 009](/registry/technical/adr/009-container-delivery-semantic-release)); you rarely build them by hand.
