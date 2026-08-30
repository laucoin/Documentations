# Implementation Plan

Five phases in dependency order. Each phase has acceptance criteria that are either met or not; nothing is "mostly done".

A note on the ordering: backup lands in phase five, after the services that produce data. This was chosen deliberately, and it means **data exists unprotected for the duration of phases three and four**. Two mitigations apply — nothing irreplaceable should be committed to Atlas until phase five completes, and phase five can be pulled forward at any point if that becomes uncomfortable.

## Phase 1 — Foundation

The host, made safe and ready.

| Deliverable | Detail |
| ----------- | ------ |
| `base` | Packages, time, locale, the administrative account |
| `hardening` | SSH lockdown, firewall, kernel settings, access control, ban rules, unattended security updates |
| `storage` | Volume reconciliation, plus the separate destructive playbook |
| `docker` | The rootless runtime, the service user, identity mapping |
| `shell` | The trimmed workstation environment |

**Accepted when:**

- Password and root SSH are refused; key authentication works.
- The firewall denies by default; only the intended ports answer.
- Every declared volume exists, is mounted and is sized as declared.
- Re-declaring an existing volume changes nothing; a smaller declared size fails the run explicitly.
- A rootless container runs and survives a reboot.
- A second immediate converge reports **zero changes**.
- Connecting over SSH presents the expected prompt and shortcuts.

## Phase 2 — Ingress and identity

The front door, before anything is behind it.

| Deliverable | Detail |
| ----------- | ------ |
| `traefik` | Rootless, ports 80/443 reached via nftables redirect, wildcard certificate, HTTP redirect, shared security headers, per-route rate limits |
| `authelia` | The gate, its database and session store, mandatory second factor, per-service rules, relay email |
| `theme` | Palette, portal styling, error pages |

**Accepted when:**

- The proxy runs rootless with no elevated capabilities, and a request to 80 or 443 reaches it only through nftables' redirect.
- A valid wildcard certificate is served and renews unattended.
- An unauthenticated request to a gated route reaches the portal, and after password plus second factor reaches the service.
- Stopping the gate makes gated routes **refuse**, not pass through.
- Rate limits behave differently on a sign-in path and a bulk path.
- The portal and error pages carry the palette in both light and dark.
- A second immediate converge reports **zero changes**.

## Phase 3 — Services

The reason the platform exists.

| Deliverable | Detail |
| ----------- | ------ |
| `forgejo` | Registry, its database, token scopes, public and private packages, retention |
| `sonarqube` | Code quality, its database, analysis tokens, identity provider sign-in |
| `homeassistant` | Home automation, device bridge, broker, device passthrough, identity integration, local recovery account |
| `garage` | Object storage, buckets, keys, quotas, two-node layout with one node present |
| `app` | The generic application role, proven with one real application |

**Accepted when:**

- Continuous integration pushes an image with a token and no browser login.
- A public package pulls anonymously; a private one does not.
- Retention keeps ten tags and never removes a deployed one.
- Analysis submits by token; the human interface requires the gate.
- A household member signs in to home automation with their single identity and second factor; the local recovery account also works.
- Devices survive a restart of the automation application.
- Object storage is unreachable from the internet; an application cannot read the backup bucket; a quota is enforced.
- One real application is deployed with a database, storage, a route and gate protection, and a version bump redeploys only it.
- A second immediate converge reports **zero changes**.

## Phase 4 — Observability

| Deliverable | Detail |
| ----------- | ------ |
| `observability` | Metrics with a year of retention, logs with thirty days, collection agent, provisioned dashboards, alert rules, routing to the phone |

**Accepted when:**

- Host, container, log and endpoint coverage are all live.
- Endpoint checks traverse the full path, so a healthy process behind a broken route reads as failing.
- Per-volume usage is visible, and crossing eighty-five percent notifies immediately.
- A certificate within seven days of expiry notifies immediately.
- A single container restart produces no immediate notification, only a digest entry.
- Dashboards and rules are restored from the repository after being edited in the interface.
- A second immediate converge reports **zero changes**.

## Phase 5 — Backup

| Deliverable | Detail |
| ----------- | ------ |
| `backup` | Nightly job, database dumps, retention, exclusions, integrity checks, failure alerting |

**Accepted when:**

- A nightly run captures every protected dataset and excludes image layers.
- Databases are captured as consistent dumps.
- A forced failure notifies immediately, as does forty-eight hours without success.
- The weekly integrity check runs and reports.
- **A real restore drill succeeds**: one database restored to a scratch location, opened, and verified.
- A second immediate converge reports **zero changes**.

## After phase 5

| Work | Why |
| ---- | --- |
| **Enable the peer replica** | The single most valuable remaining change. Until it exists, backups share a drive with their source and no disaster involving that drive is survivable. |
| Migrate remaining projects to hosted applications | The platform's purpose, once the platform is proven |
| Revisit code quality's footprint | The declared first candidate for removal if memory becomes contended |

## Standing definition of done

Applies to every phase without exception:

1. The role is written to the [idempotency rules](/atlas/technical/ansible-conventions).
2. A converge immediately after a converge reports zero changes.
3. Behaviour matches the scenarios in the [functional workflows](/atlas/functional/workflows).
4. Anything that deviates from the documented design is either corrected or written down as an accepted risk.
