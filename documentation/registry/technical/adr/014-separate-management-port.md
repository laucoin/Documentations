# ADR 014 — Health, metrics and documentation on a separate management port

## Status

<Badge type="warning" text="Proposed" />

## Context

The backend listened on one port and served three unrelated things through it: the API, the Actuator endpoints, and — when documentation was enabled — the Swagger UI and the generated OpenAPI documents.

That is fine until the port is published. Registry's API is meant to be reachable by browsers on the open internet; its health checks, its metrics and its API documentation are not. Sharing one port means the decision is all-or-nothing: whoever puts the API behind an ingress publishes the operational surface with it, and the only remaining defence is a set of feature flags that someone has to remember to leave off.

Feature flags are a weak answer to this. `registry.feature.observability.enabled` defaults to `true`, because the metrics are wanted — just not by the public. A flag that has to stay on for the system to be operable cannot also be the thing that keeps it private.

## Decision

Listen on **two ports**.

| | API port (`8081`) | Management port (`8082`) |
| --- | --- | --- |
| `/api/v1/**` | ✅ | — |
| `/actuator/health`, `/health/liveness`, `/health/readiness` | — | ✅ |
| `/actuator/prometheus` | — | ✅ |
| `/actuator/swagger-ui/index.html` | — | ✅ *(documentation enabled)* |
| `/actuator/openapi/{group}` | — | ✅ *(documentation enabled)* |

`management.server.port` moves the Actuator endpoints; `springdoc.use-management-port` moves the documentation with them, registering the UI and the per-group documents as Actuator endpoints. `/swagger-ui.html` and `/api-docs` therefore **disappear** from the API port rather than merely being switched off there.

Health is split into `liveness` and `readiness` probes, so an orchestrator can tell *still starting* from *broken* instead of restarting a container that is only warming up.

### The management port is unauthenticated, and that is the point

A liveness probe and a Prometheus scraper have no credentials to present. Requiring authentication would mean either handing them a service account — a standing credential in every deployment, for read-only data — or the probes failing and the orchestrator restarting a healthy container.

So the endpoints stay open, and the boundary is the network rather than a password. **This only holds while the management port stays off the public ingress**, which is the entire reason for separating it. Publish the API port; do not publish the management port.

::: warning The application's security chain does govern this port
This is worth knowing before changing it, because the management context is a *child* context and it is reasonable to assume it has its own security. It does not — the `SecurityWebFilterChain` applies to both ports. Turning `registry.feature.observability.enabled` off makes `/actuator/health` answer `401` rather than leaving it open, which is why the permit rule is load-bearing and covers the documentation endpoints too.
:::

## Consequences

### Positive

- **Publishing the API no longer publishes anything else.** The decision is made by the ingress, not by remembering to leave a flag off.
- **Probes and scrapers get a stable address** that does not move when documentation is toggled.
- **Swagger is genuinely gone from the public port**, rather than present-but-disabled.

### Negative

- **Two ports to configure and route.** A deployment that forwards only `8081` gets no health checks and will be reported unhealthy by anything expecting them on the API port; one that forwards both undoes the whole decision.
- **The management port is a new way to get it wrong.** Mapping it in an ingress is a single line, and nothing in the application will complain.
- **The Swagger callback moved with the UI**, so the provider's registered redirect URI has to follow: `/actuator/swagger-ui/oauth2-redirect.html` on the management port.

### Alternatives rejected

- **Keeping one port and relying on the feature flags.** Simplest, and what was there. Rejected because the flag that would have to be off is the one that has to be on for metrics to work.
- **Authenticating the management port.** Correct in principle, but it means a standing service credential in every deployment for read-only data, and probes that fail when the credential rotates. Network isolation is the cheaper boundary for an endpoint whose whole content is already non-sensitive.
- **A sidecar or a separate metrics exporter.** Another artefact to build, deploy and keep in step with the application, for a problem a second listener solves in one configuration key.
