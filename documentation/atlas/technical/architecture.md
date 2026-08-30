# Architecture

## Runtime model

Atlas runs **one container runtime on one host**, owned by a single unprivileged service user. Containers within it run as non-root users, with distinct identities mapped onto the host so each service's data is owned by a different account. They share one bridge for outbound traffic, and each service sits with its own private dependencies on a network only they share.

The **reverse proxy lives there too.** A rootless runtime cannot bind the standard web ports, and the gateway forwards those ports through unchanged — so the proxy binds unprivileged ports instead, and **nftables redirects 80 and 443 to them** before the traffic ever reaches the container. The port translation happens in the host firewall, not in the runtime.

### How it is contained

- The proxy runs as a non-root user, with no elevated capabilities at all — it never needs `CAP_NET_BIND_SERVICE`, because the port it actually binds is unprivileged.
- Read-only root filesystem; no new privileges; no access to any runtime control socket.
- Service ports, including the proxy's own, are published to the loopback interface only, and the firewall refuses them from anywhere else.

Two alternatives were considered for reaching ports 80 and 443 without a privileged container: a firewall redirect from the standard ports to unprivileged ones, and lowering the kernel's privileged-port threshold. The redirect was chosen, once nftables was settled on as the declared firewall — it needed no kernel-wide setting change and kept the proxy identical to every other container. The trade is recorded here and in the [security model](/atlas/technical/security-model).

## Service inventory

| Service | Runtime | Reached via | Private dependencies |
| ------- | ------- | ----------- | -------------------- |
| Reverse proxy | Rootless | Ports 80 and 443, redirected by nftables | — |
| Sign-on gate | Rootless | Proxy, loopback | PostgreSQL, session store |
| Registry / forge | Rootless | Proxy, loopback; Git over SSH on its own port | PostgreSQL |
| Code quality | Rootless | Proxy, loopback | PostgreSQL |
| Home automation | Rootless | Proxy, loopback | — |
| Device bridge | Rootless | Not published | Message broker |
| Message broker | Rootless | Not published | — |
| Object storage | Rootless | Not published | — |
| Metrics store | Rootless | Not published | — |
| Log store | Rootless | Not published | — |
| Collection agent | Rootless | Not published | — |
| Dashboards | Rootless | Proxy, loopback | — |
| Alert router | Rootless | Proxy, loopback | — |
| Hosted applications | Rootless | Proxy, loopback | PostgreSQL, storage, bucket — as declared |

Each service that needs a database gets **its own PostgreSQL instance** rather than sharing one. This preserves network segmentation, lets each service move to a new major version independently, and costs a few tens of megabytes per instance against 32 GB.

## Stack lifecycle

Every service is a **stack**: one rendered Compose file plus one system unit.

1. Ansible renders the Compose file from variables into the service's directory.
2. A system unit for that stack brings it up, and is enabled so it starts at boot.
3. A change to the rendered file — and only a change — triggers a restart of that stack.
4. Stacks are independent: one can be converged, restarted or rolled back without touching the others.

This gives a uniform operational interface: every service is inspected, restarted and logged the same way, whatever it is.

## Images

Images are pinned by **tag and digest**, so a deployment is reproducible byte for byte. A dependency-update service opens a pull request when a new version appears; the maintainer reviews it, merges, and converges.

The original intent was distroless images throughout. Most of this stack publishes only conventional images, and maintaining forks of upstream build definitions is not sustainable for a personal project. The goal was therefore **replaced with an equivalent-value substitute**: official images, preferring minimal variants where the vendor publishes them, combined with hardened runtime constraints — non-root user, read-only root filesystem, no new privileges, capabilities dropped, temporary filesystems for scratch space.

## Resource shape

32 GB is comfortable. The code-quality server is by far the largest consumer — a JVM plus its own database, made heavier by Java and Kotlin analysis — and it is the declared first candidate for removal if memory becomes contended. Nothing else in the stack is individually significant.

The graphics card stays physically installed but is inert: no proprietary drivers, no workloads, and the open-source kernel driver blocked from loading.
