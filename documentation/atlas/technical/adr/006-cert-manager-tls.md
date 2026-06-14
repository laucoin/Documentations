# ADR 006 — cert-manager for TLS certificates

## Status

Accepted

## Context

Every public-facing Atlas hostname must serve a valid TLS certificate. Browsers will not accept self-signed certificates without warnings, and guests will not accept warnings. The options were:

1. **cert-manager**, the de-facto standard Kubernetes ACME client, automating Let's Encrypt issuance and renewal.
2. **Manual ACME with `certbot`** on the host, copying certificates into Secrets — incompatible with a Talos host that has no shell.
3. **A paid wildcard certificate** purchased annually and rotated manually.
4. **Caddy as ingress** — would bundle ACME into the ingress controller, but conflicts with the Traefik decision ([ADR 005](./005-traefik-ingress)).

Atlas already forwards ports 80 and 443 from the router to the node so its services are reachable from the internet. That same port-80 path is exactly what the HTTP-01 ACME challenge needs, so HTTP-01 works with no extra dependency. DNS-01 would instead require storing a registrar API token in the cluster and depending on registrar-specific TXT-record propagation — extra moving parts Atlas does not need as long as port 80 is reachable.

## Decision

Use **cert-manager**, with **ClusterIssuer**s for Let's Encrypt (`letsencrypt-staging` and `letsencrypt-prod`) using the **HTTP-01 challenge** solved over the Traefik ingress class. DNS-01 against a registrar API remains available as a documented opt-out (a commented block on the `letsencrypt_prod` resource in `bootstrap/baseline/main.tf`) for setups that cannot keep port 80 open.

## Consequences

### Positive

- **Automatic issuance and renewal.** A new `IngressRoute` for `foo.<my-domain>` triggers automatic certificate issuance; certificates renew 30 days before expiry without intervention.
- **No extra credentials or external dependency.** HTTP-01 reuses the port-80 forward Atlas already has; there is no registrar API token to store, rotate, or lose.
- **Per-host certificates.** HTTP-01 issues a certificate per hostname (it cannot do wildcards). Atlas exposes a handful of hosts, so per-host issuance is fine; if a wildcard ever becomes necessary, switch that issuer to DNS-01.
- **Standard Kubernetes integration.** `IngressRoute` → `Secret` → `Certificate` → cert-manager. No bespoke scripts.
- **Mature CNCF project** with very wide adoption; failure modes are well-documented.

### Negative

- **Port 80 must stay reachable.** HTTP-01 needs Let's Encrypt to reach `http://<host>/.well-known/...` through the router forward. If the ISP blocks or hijacks port 80, issuance fails and you must switch the issuer to DNS-01.
- **First issuance waits on Traefik.** The HTTP-01 solver routes through the Traefik ingress class, so the issuers can only complete orders once Traefik is up. The `ClusterIssuer`s themselves report `Ready=True` immediately regardless.
- **Let's Encrypt rate limits** apply (50 certificates per registered domain per week). Atlas is nowhere near the limit, but a misconfigured `Certificate` reconciliation loop could burn through it.
- **cert-manager has occasional CRD breaking changes between major versions.** GitOps repo pins the chart version; upgrades are read-the-release-notes events.

### Why not buy a wildcard certificate

A one-year paid wildcard certificate would work for almost every Atlas hostname. It would also require an annual manual rotation that I will eventually forget. Automation is the whole point of the platform.

### Why HTTP-01 over DNS-01

Atlas's home-self-hosted pattern already forwards port 80 to the node, so HTTP-01 validates over infrastructure that has to exist anyway and needs no registrar API access. DNS-01 sidesteps a blocked or hijacked port 80 and can issue wildcards, but it costs a registrar API token stored in the cluster plus registrar-specific propagation handling. Atlas keeps HTTP-01 as the default and documents the DNS-01 switch (the commented block on the `letsencrypt_prod` resource in `bootstrap/baseline/main.tf`) for setups where port 80 is not usable.
