# ADR 006 — cert-manager for TLS certificates

## Status

Accepted

## Context

Every public-facing Atlas hostname must serve a valid TLS certificate. Browsers will not accept self-signed certificates without warnings, and guests will not accept warnings. The options were:

1. **cert-manager**, the de-facto standard Kubernetes ACME client, automating Let's Encrypt issuance and renewal.
2. **Manual ACME with `certbot`** on the host, copying certificates into Secrets — incompatible with a Talos host that has no shell.
3. **A paid wildcard certificate** purchased annually and rotated manually.
4. **Caddy as ingress** — would bundle ACME into the ingress controller, but conflicts with the Traefik decision ([ADR 005](./005-traefik-ingress)).

The home router does not always have a stable public IP, and the domain registrar is not Cloudflare. This means HTTP-01 ACME challenges (which require reachable port 80 and stable DNS) are fragile; DNS-01 challenges (which only require API access to the registrar) are robust.

## Decision

Use **cert-manager**, with a **ClusterIssuer** configured for **Let's Encrypt** production using the **DNS-01 challenge** against the registrar's API.

## Consequences

### Positive

- **Automatic issuance and renewal.** A new `IngressRoute` for `foo.<my-domain>` triggers automatic certificate issuance; certificates renew 30 days before expiry without intervention.
- **DNS-01 challenges work even when port 80 is blocked or the WAN IP is changing.** The challenge is a TXT record at the registrar; cert-manager creates and removes it via the registrar's API.
- **Wildcard certificates are possible.** A single `*.<my-domain>` certificate could front every service, reducing the number of certificate orders. Atlas issues per-host certificates by default, but the option is there.
- **Standard Kubernetes integration.** `IngressRoute` → `Secret` → `Certificate` → cert-manager. No bespoke scripts.
- **Mature CNCF project** with very wide adoption; failure modes are well-documented.

### Negative

- **The registrar API token is sensitive.** It must be stored in Infisical ([ADR 009](./009-infisical-secrets)) and synced into the cluster via ESO. Loss of that token means no new certificates.
- **DNS-01 propagation can be slow** at some registrars (a few minutes). Atlas accepts the delay; certificates are not issued often.
- **Let's Encrypt rate limits** apply (50 certificates per registered domain per week). Atlas is nowhere near the limit, but a misconfigured `Certificate` reconciliation loop could burn through it.
- **cert-manager has occasional CRD breaking changes between major versions.** GitOps repo pins the chart version; upgrades are read-the-release-notes events.

### Why not buy a wildcard certificate

A one-year paid wildcard certificate would work for almost every Atlas hostname. It would also require an annual manual rotation that I will eventually forget. Automation is the whole point of the platform.

### Why DNS-01 over HTTP-01

HTTP-01 requires the registrar's `A` record to point at a publicly-reachable port 80, and requires that port to not be intercepted by the ISP. Many residential ISPs block or hijack port 80, and some IPv6 setups complicate it further. DNS-01 sidesteps all of that and works even when port 80 is unreachable.
