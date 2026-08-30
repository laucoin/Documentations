# Getting Started

Running Registry locally means three moving parts: a PostgreSQL database, an OIDC provider, and the two applications. The backend repository ships a Compose file that provides the first two.

## Prerequisites

| Tool | Version | For |
| ---- | ------- | --- |
| JDK | **25 or later** | Backend |
| Docker + Compose | recent | PostgreSQL and Authentik |
| Node.js | **≥ 22** | Frontend |
| pnpm | 11 (`corepack enable pnpm`) | Frontend |

Gradle comes with the wrapper; no separate install.

## 1. Dependencies

```bash
git clone git@github.com:laucoin/Registry-Backend.git
cd Registry-Backend

cp local-dev/.example.env local-dev/.env
# Edit local-dev/.env — PG_PASS, AU_SECRET_KEY, AU_EMAIL, AU_PASS, …

docker compose -f local-dev/compose.yml up -d
```

That brings up PostgreSQL 18 on `5432` with two databases (one for Registry, one for the identity provider), plus **Authentik** — server on `9000`, worker alongside — bootstrapped with the credentials from `.env`.

::: info Authentik, in a package called `keycloak`
The OIDC adapter lives in `infrastructure/in/keycloak` and is named after Keycloak, but nothing in it is Keycloak-specific — it speaks plain OAuth2. Local development runs Authentik. Any OIDC provider that issues JWTs with the configured claims will work; see [ADR 004](/registry/technical/adr/004-oidc-resource-server-auth).
:::

In Authentik, create an OAuth2 provider and application for Registry, then note its authorize, token, end-session and JWKS URLs, its client ID and its client secret. The JWT must carry `sub`, `email`, `given_name` and `family_name` — the claim names are configurable, but those are the defaults.

## 2. Backend

Flyway runs at boot, so the schema and the seeded roles and permissions appear on first start. Pass configuration as JVM options:

```bash
./gradlew bootRun --args='' -Dorg.gradle.jvmargs="..."
```

or, more practically, set them in your run configuration:

```
-Dregistry.datasource.base-url=localhost:5432
-Dregistry.datasource.database=registry
-Dregistry.datasource.schemas=public
-Dregistry.datasource.username=postgres
-Dregistry.datasource.password=<from .env>

-Dexternal.oidc.jwks-uri=http://localhost:9000/application/o/registry/jwks
-Dexternal.oidc.authorization-uri=http://localhost:9000/application/o/authorize
-Dexternal.oidc.token-uri=http://localhost:9000/application/o/token
-Dexternal.oidc.end-session-uri=http://localhost:9000/application/o/registry/end-session
-Dexternal.oidc.client-id=registry
-Dexternal.oidc.client-secret=<secret>
-Dexternal.oidc.swagger.client-id=registry

-Dregistry.server.port=8081
-Dregistry.server.logging-level=DEBUG
-Dregistry.feature.documentation.enabled=true
-Dexternal.cors.urls=http://localhost:4200
```

::: warning Secrets are never committed
`registry.datasource.password` and `external.oidc.client-secret` are placeholders in `application.yml` with no default, so a missing value **fails startup loudly**. Pass them as JVM options or environment variables — never in an `application*.yml`.
:::

Two flags matter for development. `registry.feature.documentation.enabled=true` publishes Swagger UI at `http://localhost:8081/swagger-ui.html`, which is the fastest way to explore the API. `external.cors.urls` must contain the frontend's origin or every browser call fails.

The port is 8081 because Compose already uses 9000 for the identity provider.

### Useful commands

```bash
./gradlew build              # compile + test + coverage verify + report
./gradlew test               # tests only
./gradlew bootRun            # run
./gradlew koverHtmlReport    # coverage → build/reports/kover
./gradlew clean
```

`build` finalises with `koverVerify` and `koverHtmlReport`, and runs the ArchUnit suite — an architecture violation fails the build like any other test.

## 3. Frontend

```bash
git clone git@github.com:laucoin/Registry-Frontend.git
cd Registry-Frontend
pnpm install
```

Then create the **two runtime configuration files**, which are not committed:

`public/settings/env.json`

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

`public/settings/config.json` — the default language and supported list, the PrimeNG theme preset (semantic palette plus light and dark colour schemes), logo paths, enabled element actions, and notification durations per severity. The frontend README carries a complete example to copy.

```bash
pnpm start        # ng serve → http://localhost:4200
pnpm run lint
pnpm run build    # add --configuration=production
```

::: warning Both files are required
`env.json` and `config.json` are fetched before Angular bootstraps. Without them the application loads but cannot reach the backend and has no theme. Missing files are logged to the console rather than raising a visible error, so an app that looks broken is usually a missing `settings/` file.
:::

## 4. First sign-in

Open `http://localhost:4200`. You will be redirected to Authentik; sign in with the bootstrap account.

On return, the backend creates your Registry account automatically with the default `USER` role — nobody provisions it. That role lets you **create a project**, which makes you its `PROJECT_ADMINISTRATOR` and drops you inside it.

To exercise the administration screens you need the global `USER_ADMINISTRATOR` role, which no account has on a fresh database. Promote yourself directly:

```sql
UPDATE tb_user SET role = 'USER_ADMINISTRATOR' WHERE email = '<your email>';
```

Then sign out and back in — authorities are rebuilt from the account on each request, but the frontend caches the current user for the session.

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| Backend exits at startup | A secret placeholder is unresolved — check the datasource password and the OIDC client secret |
| Every API call fails in the browser, works in curl | `external.cors.urls` does not contain `http://localhost:4200` |
| Sign-in loops back to the login screen | The OIDC URLs or the client secret are wrong, or the token lacks `sub` / `email` |
| `401 AUTH_BLOCKED_ACCOUNT` | The account's `visible` flag is `false` |
| `409 AUTH_IMPERSONATED_ACCOUNT` | The account was anonymised — it can never sign in again |
| `409 AUTH_EMAIL_ALREADY_USED` | Two rows in `tb_user` share the token's email |
| Frontend loads with no styling and no data | `settings/config.json` or `settings/env.json` is missing |
| A project screen says to select a project | No selected profile — pick one, or create a project |
| Swagger UI returns 404 | `registry.feature.documentation.enabled` is not `true` |

## Contributing

Both repositories share the same rules: `main` holds development code, every change arrives through a pull request from a branch, and **commit messages must follow Conventional Commits** because Semantic Release derives the version from them.

The CI gates a pull request with the build and tests, Dependency Review, and CodeQL. On merge to `main`, a DEV image is published, Semantic Release computes and tags the version, and the release image is built.

## Related

- [Architecture](/registry/technical/architecture) — how the pieces fit
- [Backend](/registry/technical/backend) · [Frontend](/registry/technical/frontend)
- [API Reference](/registry/technical/api-reference) — the endpoint surface
