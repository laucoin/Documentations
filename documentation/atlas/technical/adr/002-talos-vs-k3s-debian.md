# ADR 002 — Talos Linux over k3s on Debian

## Status

Accepted

## Context

The Atlas node needs an operating system and a Kubernetes distribution. The two pragmatic options for a single-node homelab were:

1. **Debian (or another general-purpose distro) running k3s.** Familiar Linux, package manager, SSH access, k3s installed via the official script. This is the default homelab choice and what most tutorials assume.
2. **Talos Linux**, a purpose-built, immutable, API-driven OS that ships only what is needed to run Kubernetes. No shell, no SSH, no package manager — configuration is declarative and applied through the `talosctl` API.

The platform serves a small group of trusted users, but it is also where I keep secrets, identities, and container images for personal projects. Its security posture and the cost of administering it matter more than the convenience of "I can SSH into it".

## Decision

Use **Talos Linux** as the operating system, running upstream Kubernetes (the version bundled with the chosen Talos release).

## Consequences

### Positive

- **No shell, no SSH, dramatically reduced attack surface.** A compromised application cannot drop into a shell or install a backdoor because the host has neither. The Talos API is the only way in and is authenticated by mTLS with PKI material that lives outside the node.
- **Immutable, declarative configuration.** The machine is defined by a single YAML file. Rebuilding the node from scratch is reproducible by design; "configuration drift" is structurally impossible.
- **Designed for Kubernetes specifically.** Talos is not a distro that happens to run Kubernetes; it boots into kubelet and nothing else. No conflicting systemd units, no random packages from APT, no cron jobs in `/etc`.
- **Better defaults for security**: SELinux-style sandboxing, read-only root, encrypted etcd, mutual TLS everywhere by default.
- **First-class single-node story.** Talos explicitly supports a node being both control plane and worker; this is not a hack.

### Negative

- **Steeper learning curve at the start.** `talosctl` is a new tool to learn. There is no "SSH in and tweak a file" escape hatch when something is broken; everything must go through the API.
- **No general-purpose system tools on the node.** I cannot run `tcpdump`, `strace`, or a custom binary directly on the host. Debugging requires deploying a debug pod into Kubernetes.
- **Smaller community than Debian + k3s.** Fewer blog posts, more reading of the upstream documentation. Mitigated by Talos' very good official docs and Discord/Slack support.
- **Tied to Talos' release cadence.** Talos and the bundled Kubernetes version are released together; I cannot independently upgrade Kubernetes to a version Talos has not yet shipped.

### Trade-off accepted

The convenience of SSH and APT is given up in exchange for a host that has a much smaller blast radius if a workload is compromised, and that cannot drift from its declared configuration. For a platform that holds secrets and identities, this is the right trade.

### Why not k3s on Debian

k3s on Debian is faster to bootstrap and easier to debug interactively, but it introduces two layers of mutable state (Debian's package set and k3s' install script's modifications), neither of which Atlas needs. The "I can SSH in" affordance is, on this kind of platform, also the risk surface.
