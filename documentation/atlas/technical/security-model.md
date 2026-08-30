# Security Model

Atlas is deliberately exposed to the internet, so the security model is not perimeter-based. It assumes a service will eventually be compromised and limits what that reaches.

## Baseline

| Layer | Control |
| ----- | ------- |
| SSH | Public keys only; passwords and challenge-response refused; root login disabled; a single permitted account; modern key exchange, cipher and integrity algorithms; reduced grace time and attempt count |
| Firewall | nftables, default-deny inbound, one declared ruleset rendered from variables; redirects 80 and 443 to the proxy's unprivileged ports; loopback-published service ports refused from off-host |
| Kernel | Declared network and memory-protection settings; address-space randomisation; restricted kernel pointers, kernel log and process tracing. Unprivileged user namespaces stay enabled, because the rootless runtime requires them |
| Mandatory access control | AppArmor in enforcing mode with the runtime's default profile |
| Intrusion response | fail2ban watching SSH, the sign-on portal and home automation, banning by source address |
| Patching | Unattended security updates; never an automatic reboot; a pending reboot raises a notification |
| Accounts | One human account with password-protected elevation; one system identity per service, owning only that service's data |

## Container constraints

Applied to every container, and the substitute for the original distroless goal:

- Runs as a **non-root user**; identities mapped so each service's data has a distinct owner on the host.
- **Read-only root filesystem**, with temporary filesystems where scratch space is genuinely needed.
- **No new privileges.**
- **All capabilities dropped**, then only what is demonstrably required added back.
- **No runtime control socket** mounted into any container, ever. This is why routing is declared in files rather than discovered from container metadata.
- Images **pinned by tag and digest**, updated through reviewed pull requests.

## Ingress port translation

The gateway forwards ports 80 and 443 unchanged, and a rootless runtime cannot bind below 1024 — so the reverse proxy binds unprivileged ports instead, and **nftables redirects 80 and 443 to them** at the host firewall, before traffic reaches any container.

| Aspect | Detail |
| ------ | ------ |
| Why | The gateway does not translate ports; a rootless runtime cannot bind below 1024 |
| Rejected alternative | Lowering the kernel's privileged-port threshold, which would weaken a host-wide setting for one container's sake |
| Containment | The proxy is a non-root user like every other container: all capabilities dropped, read-only root filesystem, no new privileges |
| Residual risk | Ingress traffic still traverses loopback rather than an isolated network, same as every other proxied service |

The reverse proxy no longer needs an exception to the [container constraints](#container-constraints) above — it meets them like every other service.

## The three exceptions to the gate

| Exception | Compensating control |
| --------- | -------------------- |
| Registry endpoints | Tokens per consumer, independently revocable; public packages readable anonymously; generous but present rate limits; egress monitoring |
| Code-quality analysis API | Analysis tokens only; the human interface still requires the gate with a second factor |
| Home automation | Identity provider integrated inside the application, so there is still one identity and a second factor; tight rate limiting; failure banning; a local recovery account |

No route bypasses the gate except these three. A new route is protected by default.

## Identity

- Accounts declared in the repository; no self-service registration.
- Mandatory second factor for every human session — security key or passkey preferred, time-based code as fallback.
- Where an application supports an external identity provider, it uses one, so the person arrives under their own name with their permissions applied. Otherwise the gate stands in front.
- Access rules are per service, enforced today even with a single administrative user.
- **The gate fails closed.** If it is unreachable, gated requests are refused.

## Secrets

Secrets are encrypted **per value** in the repository using an age key, so changes remain reviewable in a diff rather than appearing as an opaque blob.

| Rule | Detail |
| ---- | ------ |
| Nothing decrypted at rest on the host | Values are rendered into place during a converge |
| The age key never lives on Atlas | It stays on the maintainer's workstation. This is a direct consequence of choosing manual-only runs |
| One credential, one purpose | Machine actors hold a credential scoped to a single job, independently revocable |
| No application holds the backup key | Enforced by separate buckets and separate keys in object storage |

Two secrets govern recovery: the **age key** and the **backup password**. Both live in the maintainer's password manager. An offline copy was offered and declined; losing access to that manager means losing the ability to restore, and that is an accepted risk.

## Execution model

Runs are **manual only**, from the maintainer's workstation over SSH. There is no deploy key on the host, no scheduled self-convergence, and no automation with a path into the machine. A pull-based model was considered and deliberately rolled back in favour of simplicity — and it removed an entire class of automated attack path as a side effect.

## Accepted risks

| Risk | Position |
| ---- | -------- |
| SSH reachable from the internet | Key-only with root disabled; it is the recovery path when the web stack fails |
| The gate is a single point of failure | Recovery over SSH; failing open would be far worse |
| Home automation authenticating through a community integration | Pinned version, local recovery account; the alternative was per-service passwords |
| Backups on the same drive as their source | Temporary, until the peer replica is enabled; the largest open risk |
| No external alerting fallback | Total host failure is silent; an external watchdog was offered and declined |
| Recovery secrets in one password manager | No offline copy; accepted |
| Anonymous public image pulls | Bandwidth abuse is possible; rate-limited and monitored, not prevented |
