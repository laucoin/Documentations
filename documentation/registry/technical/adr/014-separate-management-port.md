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
| `/health`, `/health/liveness`, `/health/readiness` | — | ✅ |
| `/prometheus` | — | ✅ |
| `/swagger-ui/index.html` | — | ✅ *(documentation enabled)* |
| `/openapi/{group}` | — | ✅ *(documentation enabled)* |
| `/` — the Actuator index listing the above | — | ✅ |

`management.server.port` moves the Actuator endpoints; `springdoc.use-management-port` moves the documentation with them, registering the UI and the per-group documents as Actuator endpoints. `/swagger-ui.html` and `/api-docs` therefore **disappear** from the API port rather than merely being switched off there.

`management.endpoints.web.base-path` is `/`, so the endpoints sit at the root of the port instead of under `/actuator`. That prefix exists to keep Actuator out of the way of an application sharing the port; here nothing else is on the port, so it bought nothing and made every URL longer than it needed to be.

::: warning Three springdoc properties are inert in this mode
`springdoc.use-management-port` is what registers the UI as an Actuator endpoint, and springdoc's ordinary WebFlux configuration is `@ConditionalOnProperty(name = "springdoc.use-management-port", havingValue = "false")`. Turning the management port on therefore switches off the configuration that `api-docs.path`, `swagger-ui.path` and `use-root-path` belong to. They are accepted in silence and do nothing — `use-root-path` in particular does **not** make the port's root redirect to the UI — so they are not declared. The endpoints take their address from their endpoint ids instead.
:::

Health is split into `liveness` and `readiness` probes, so an orchestrator can tell *still starting* from *broken* instead of restarting a container that is only warming up.

### The management port is unauthenticated, and that is the point

A liveness probe and a Prometheus scraper have no credentials to present. Requiring authentication would mean either handing them a service account — a standing credential in every deployment, for read-only data — or the probes failing and the orchestrator restarting a healthy container.

So the endpoints stay open, and the boundary is the network rather than a password. **This only holds while the management port stays off the public ingress**, which is the entire reason for separating it. Publish the API port; do not publish the management port.

::: warning The application's security chain does govern this port
This is worth knowing before changing it, because the management context is a *child* context and it is reasonable to assume it has its own security. It does not — the `SecurityWebFilterChain` applies to both ports. Turning `registry.feature.observability.enabled` off makes `/health` answer `401` rather than leaving it open, which is why the permit rule is load-bearing and covers the documentation endpoints too.

The rule matches on **the port a request arrived on**, not on a path prefix. That is what the decision is actually about: everything reachable on that port is meant to be open, and nothing reachable there is meant to be public. A prefix expressed the same thing only for as long as the endpoints happened to live under `/actuator`.
:::

## Consequences

### Positive

- **Publishing the API no longer publishes anything else.** The decision is made by the ingress, not by remembering to leave a flag off.
- **Probes and scrapers get a stable address** that does not move when documentation is toggled.
- **Swagger is genuinely gone from the public port**, rather than present-but-disabled.

### Negative

- **Two ports to configure and route.** A deployment that forwards only `8081` gets no health checks and will be reported unhealthy by anything expecting them on the API port; one that forwards both undoes the whole decision.
- **The management port is a new way to get it wrong.** Mapping it in an ingress is a single line, and nothing in the application will complain.
- **The Swagger callback moved with the UI**, so the provider's registered redirect URI has to follow: `/swagger-ui/oauth2-redirect.html` on the management port.
- **Swagger's calls to the API became cross-origin.** The UI now sits on a different port from the API it exercises, so *try it out* is refused by CORS unless that origin is allowed. The backend adds `external.documentation.url` to the allowlist while documentation is enabled, defaulting to `http://localhost:<management-port>`.

  ::: warning Not an entry in `external.cors.urls`
  That list is also the allowlist the OAuth `redirectUri` is validated against, so adding the documentation origin to it would silently turn a permission to *call* the API into a permission to *receive an authorization code*. The two are kept apart deliberately, and a test in `KeycloakAuthenticationAdapterTest` fails if they are merged.
  :::

### Alternatives rejected

- **Keeping one port and relying on the feature flags.** Simplest, and what was there. Rejected because the flag that would have to be off is the one that has to be on for metrics to work.
- **Authenticating the management port.** Correct in principle, but it means a standing service credential in every deployment for read-only data, and probes that fail when the credential rotates. Network isolation is the cheaper boundary for an endpoint whose whole content is already non-sensitive.
- **A sidecar or a separate metrics exporter.** Another artefact to build, deploy and keep in step with the application, for a problem a second listener solves in one configuration key.
