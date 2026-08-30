# ADR 008 — Frontend configuration fetched at runtime

## Status

Accepted

## Context

The delivery pipeline builds **one immutable image per version** and promotes that exact image through environments
([ADR 010](/registry/technical/adr/010-container-delivery-semantic-release)). The whole point is that what was tested is
what runs.

Angular's default configuration model works the other way: `environment.ts` files are selected at **build** time, so
each environment needs its own build. That produces one artefact per environment per version, and the thing running in
production is not bit-for-bit the thing that was tested.

Registry also needs more than a backend URL to be environment-specific. It is deployed under different brandings: a full
PrimeNG theme preset with light and dark palettes, logo assets per theme and size, the enabled language set, which
element actions are available, and notification durations.

## Decision

Ship **no environment-specific values in the bundle**. Fetch two JSON files from `settings/` before Angular bootstraps,
with cache-busting:

- **`env.json`** — the production flag, the backend URL, and the paths that need no authentication.
- **`config.json`** — the default and supported languages, the complete PrimeNG theme preset, logo paths per theme and
  size, enabled element actions, and per-severity notification durations.

Both are mounted into the nginx container per environment. `AppConfig.load()` fetches them in parallel and exposes them
as statics that the providers read during bootstrap.

## Rationale & best practices

- **Immutability:** one image per version, promoted unchanged. Configuration is a deployment concern, not a build
  concern.
- **Theming as data:** re-skinning a deployment means replacing a JSON file, not rebuilding. The whole PrimeNG preset —
  semantic palette, light and dark colour schemes, component overrides — lives in `config.json`.
- **No secrets:** both files are served to the browser, so neither may contain anything confidential. This is fine
  because the SPA is not a confidential OAuth2 client — the secret stays on the backend
  ([ADR 004](/registry/technical/adr/004-oidc-resource-server-auth)).

## Consequences

- **Pros:** the tested artefact is the deployed artefact. Branding, languages and behaviour are per-environment without
  a rebuild. Rollback is an image tag change.
- **Cons / trade-offs:** two extra network round-trips before the application starts, on the critical path of first
  paint. A **missing or malformed file is logged to the console and the application continues** — so a misconfigured
  deployment presents as an unstyled app that cannot reach the backend, rather than as a loud failure. There is no
  schema validation. Configuration is now split between the image and the deployment, so a version bump that adds a
  config key needs a coordinated file update.
- **Alternatives rejected:** Angular's build-time `environment.ts` (idiomatic and zero-runtime-cost, but one build per
  environment defeats the immutable-image model); server-side placeholder substitution at container start, `envsubst`
  -style (keeps one image and avoids the round-trips, but mutates the artefact at boot and does not suit a nested theme
  object).
