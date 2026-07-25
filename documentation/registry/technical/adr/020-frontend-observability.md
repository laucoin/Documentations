# ADR 020 — Frontend observability (OpenTelemetry → existing Prometheus/Grafana)

## Status

Accepted — Track B of the [Migration Plan](/registry/technical/migration-plan/2026-07-25-plan). The **frontend RUM/error instrumentation lands with the new Nuxt app**; the collector wiring and optional backend tracing can start earlier.

## Context

The backend already exposes metrics through **Actuator + Micrometer/Prometheus**; the **frontend has no observability at all**. The migration wants **web-vitals / RUM and error tracking** so the performance work ([ADR 018](/registry/technical/adr/018-backend-caching-db)) is measurable rather than guessed. Because Registry handles **personal data (GDPR)**, *where* telemetry is sent — and PII handling — matters as much as the tooling: a third-party processor implies a DPA and data-residency questions.

## Decision

Instrument the frontend with the **OpenTelemetry web SDK** and export to the **observability stack the backend already uses** (Prometheus/Grafana), keeping all telemetry **in-house** and vendor-neutral.

- **Web-vitals / RUM.** Capture Core Web Vitals (LCP, INP, CLS, FCP, TTFB) and key interaction timings as OTel metrics → **OTel Collector** → **Prometheus**, dashboarded in **Grafana** alongside the backend metrics.
- **Errors.** Unhandled exceptions, the Vue `errorHandler`, and promise rejections are captured and exported as OTel events. Because Prometheus is metrics-only, **error events and traces need a logs/traces backend** — **Loki** (logs) and/or **Tempo** (traces) in the Grafana stack — with Prometheus holding error-rate counters. This is the main ergonomic gap versus a dedicated error tracker and is accepted deliberately.
- **End-to-end tracing (the unification payoff).** OTel trace context propagates **browser → Nuxt BFF → Spring** ([ADR 022](/registry/technical/adr/022-ssr-auth-bff)); if the backend adds OTel tracing (it already speaks Micrometer), a slow user action can be followed across all tiers into the database. Trace/correlation ids line up with the backend audit correlation id ([ADR 019](/registry/technical/adr/019-backend-security-hardening)).
- **SSR.** Both client-side (browser) and server-side (Nuxt SSR) signals are exported; client telemetry is sent through a **protected collector endpoint** (via the BFF or a dedicated ingress) with **sampling and rate limiting** so it cannot be abused.
- **PII discipline.** A **scrubbing processor** (in the SDK `beforeSend` and/or the collector) strips personal data and sensitive ids from URLs, attributes, and error payloads before storage — the reason in-house export was chosen is undercut if raw PII lands in telemetry.

## Consequences

### Positive

- **One observability platform for the whole system.** Frontend web-vitals sit next to backend metrics in the same Prometheus/Grafana, so a regression is diagnosed in one place.
- **In-house and GDPR-friendly.** No third-party processor; telemetry stays in your infrastructure, and PII is scrubbed in the pipeline.
- **Vendor-neutral (OTel).** No SDK lock-in; the collector can fan out to other backends later without touching app code.
- **End-to-end traces** across browser → BFF → Spring → DB become possible, which no frontend-only error SaaS would give.

### Negative

- **Weaker error-triage DX.** There is no automatic error grouping, source-map symbolication UI, or session replay out of the box — those must be assembled from Loki/Tempo + Grafana, which is more work and less polished than a dedicated error tracker.
- **More to run and wire.** An OTel Collector (and likely Loki/Tempo added to the stack) to operate, plus frontend instrumentation to build.
- **Discipline required.** PII scrubbing and client-telemetry rate limiting/sampling must be got right, or the in-house/GDPR benefit and the collector's stability are at risk.

### Why not Sentry (SaaS or self-hosted)

Sentry offers markedly better error ergonomics (grouping, symbolication, replay) via a first-class Vue/Nuxt SDK. SaaS was rejected as a third-party processor of personal data (DPA + residency); self-hosted Sentry would be **another system to operate** beside the Prometheus/Grafana already in place. Unifying on the existing stack via OTel was preferred, accepting the error-triage ergonomics gap as the trade.
