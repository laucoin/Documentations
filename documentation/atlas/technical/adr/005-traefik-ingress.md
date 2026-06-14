# ADR 005 — Traefik as ingress controller

## Status

Accepted

## Context

Atlas needs an ingress controller to terminate TLS, route HTTPS traffic from the home router to the right Kubernetes Service, and (for the Traefik dashboard and Argo CD) gate access behind OIDC. The candidates were:

1. **Traefik** — Go-based, dynamic configuration, native CRDs (`IngressRoute`, `Middleware`), built-in forward-auth middleware.
2. **Nginx Ingress Controller** — the most widely deployed, but configuration is heavier (Snippet annotations, ConfigMap soup).
3. **HAProxy Ingress** — performant but with smaller ecosystem traction.
4. **Cilium Ingress** — appealing for an integrated CNI + ingress, but Talos' default CNI is already there and replacing it is its own ADR.

Atlas is small but evolves often; ergonomics matter more than the last drop of throughput.

## Decision

Use **Traefik** as the ingress controller, with its CRDs (`IngressRoute`, `Middleware`) instead of stock Kubernetes `Ingress` resources.

## Consequences

### Positive

- **`IngressRoute` CRD is more expressive than stock `Ingress`** for forward-auth, header rewriting, and middleware chains. Configuration of "this hostname goes through Authentik forward-auth, then to this service" is a few-line CRD; on Nginx it would be controller-specific annotations.
- **Built-in forward-auth middleware** integrates cleanly with Authentik to gate the Traefik dashboard, Argo CD UI, and any future internal tool that does not speak OIDC natively.
- **First-class Helm chart** with sane defaults for a single-node cluster.
- **Built-in dashboard** showing live routes, services, middlewares, and TLS status — useful for the operator persona ([Functional → Services](../../functional/services#traefik-dashboard--ingress-overview)).
- **Native Kubernetes Service Type=LoadBalancer behaviour on bare metal** when combined with a small `LoadBalancer` implementation, or via `hostNetwork` for a single-node setup.
- **Cert-manager integration is trivial**: the `IngressRoute` references a `Secret` issued by cert-manager ([ADR 006](./006-cert-manager-tls)).

### Negative

- **CRDs lock the ingress configuration to Traefik.** Migrating to Nginx later means rewriting every `IngressRoute`. Mitigated by the fact that Atlas does not plan to migrate; if it does, the rewrite is mechanical.
- **The Traefik dashboard is sensitive.** Exposing it publicly without authentication would leak internal routing topology. Atlas exposes it but always behind Authentik forward-auth.
- **Configuration "magic"**. Traefik discovers services dynamically via the Kubernetes API; when something fails silently, the dashboard and logs are the only source of truth.
- **The 80→443 redirect must be configured explicitly.** Not on by default in all chart versions.

### Why not Nginx Ingress

Nginx is the safer default in larger organizations because of its operational maturity. For Atlas, the deciding factor is forward-auth ergonomics. Authentik + Nginx forward-auth works but requires `auth_request` snippets and a ConfigMap-wide opt-in; with Traefik it is one `Middleware` resource per route. Multiplied across half a dozen services, that is a meaningful difference.
