# ADR 014 — Home Assistant for home automation

## Status

Accepted

## Context

Atlas is the household's always-on node, which makes it the natural home for smart-home automation: lights, sensors, switches, and the routines that connect them. The goal is to keep device state and history local rather than scattered across vendor clouds. The candidates were:

1. **Home Assistant** — the dominant OSS home-automation platform; huge integration catalogue, local-first, active community.
2. **openHAB** — mature Java-based alternative; powerful rules engine, smaller integration set.
3. **Node-RED only** — flow-based automation, but not a device hub on its own.
4. **Vendor apps / clouds** — one app and account per device brand, each an external dependency.

Home Assistant is the obvious fit: it runs anywhere, keeps everything local, and integrates with nearly every device I am likely to own. The one architectural wrinkle is authentication — Home Assistant has no usable OIDC client, and its companion mobile apps and REST API do not tolerate being placed behind a forward-auth proxy.

## Decision

Run **Home Assistant** via the community `pajikos/home-assistant` Helm chart, exposed through Traefik with a cert-manager certificate, using **Home Assistant's own login** rather than Authentik SSO. Metrics are exported through HA's `prometheus` integration and scraped into Grafana ([ADR 011](./011-prometheus-loki-observability)).

## Consequences

### Positive

- **Local-first automation.** Device state, history, and automations live on the node, not in a vendor cloud.
- **Enormous integration catalogue**, so most devices "just work" without bespoke glue.
- **Fits the existing platform patterns**: Helm Application reconciled by Argo CD, TLS via cert-manager, routing via Traefik, metrics via Prometheus/Grafana.
- **Persisted configuration** on a `local-path` volume survives restarts and is captured by the normal backup flow.

### Negative

- **Authentication is a one-off exception.** Home Assistant uses its own login because OIDC and forward-auth do not work for it — so it does not benefit from single sign-on ([ADR 008](./008-authentik-oidc)), and account management is HA-local.
- **Proxy awareness is required.** HA must `use_x_forwarded_for` and trust the in-cluster proxy CIDRs, or it rejects every request routed through Traefik.
- **Metrics need a manual token.** `/api/prometheus` is guarded by a long-lived access token that can only be minted in the HA UI after first boot; until that Secret exists, the Grafana dashboard stays empty.
- **Device discovery protocols (mDNS/Bluetooth/Zigbee) are constrained in Kubernetes.** Anything depending on host-network discovery or USB radios will need extra wiring (host networking, device passthrough) that a containerised HA does not get for free.

### Why not openHAB

openHAB is a credible alternative with a strong rules engine, but its integration catalogue and community momentum are smaller than Home Assistant's, and HA is the platform I already know. If a specific device ever forces the issue, this ADR may be revisited.
