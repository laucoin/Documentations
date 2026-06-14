# ADR 001 — Kubernetes over Docker (Swarm / Compose)

## Status

Accepted

## Context

Atlas could run its workloads on either:

1. **Docker** — either plain `docker compose` files managed by a script, or Docker Swarm for clustering. The classic homelab stack.
2. **Kubernetes**, in the form bundled with Talos Linux ([ADR 002](./002-talos-vs-k3s-debian)).

Both can host the services Atlas needs. The decision is about which orchestrator pays back its complexity in this specific homelab.

## Decision

Use **Kubernetes** as the orchestrator.

## Consequences

### Positive

- **The ecosystem.** Every component Atlas needs (Authentik, Harbor, Infisical, Argo CD, cert-manager, External Secrets Operator, Prometheus, Loki, Grafana, Traefik) ships an upstream-maintained Helm chart or Operator. The Docker Compose files for the same components are second-class citizens, often community-maintained, often out of date.
- **Declarative state + reconciliation.** Argo CD reconciles a Git repo against the live cluster continuously. With Docker Compose there is no equivalent built-in mechanism; "the state of the host" is whatever the last `docker compose up` left behind.
- **First-class abstractions for what the platform actually needs**: `Ingress` / `IngressRoute`, `Secret`, `ConfigMap`, `PersistentVolumeClaim`, `CronJob`, `NetworkPolicy`, RBAC. Docker has equivalents only for some of these, and often only via plugins.
- **Operators.** cert-manager, External Secrets Operator and Prometheus Operator are entire categories of functionality that simply don't exist on Docker Compose.
- **Skill investment is portable.** Kubernetes knowledge is useful at work and in any future deployment. Docker Swarm is in long-term maintenance mode.

### Negative

- **Significantly more moving parts.** etcd, kubelet, kube-apiserver, kube-controller-manager, kube-scheduler, kube-proxy, CNI, CSI. A Docker Compose stack has one moving part: `dockerd`.
- **Higher baseline resource cost.** Even an idle single-node cluster eats ~1.5 GB of RAM before the first workload. Docker Compose's overhead is closer to nothing.
- **YAML and Helm everywhere.** Even trivial deployments require several manifests. Docker Compose can express the same in 20 lines.
- **The "etcd corruption on a single node" risk.** A single-node Kubernetes cluster has the same etcd as a 3-node cluster, but without the safety net of quorum. Backups must include etcd snapshots; recovery procedures matter ([ADR 007](./007-local-path-restic-storage)).

### Trade-off accepted

Atlas pays the Kubernetes complexity tax once, at the start, to unlock an ecosystem where every service I want to deploy is one well-tested manifest away. Compose would be cheaper to start and more expensive to evolve.

### Why not Docker Swarm specifically

Docker Swarm is the closest thing to "Kubernetes-but-simpler", but it has effectively no momentum. There is no Swarm equivalent of cert-manager, of External Secrets Operator, of Argo CD's app-of-apps. Choosing Swarm in 2026 would be choosing to swim against the open-source current of every component Atlas depends on.
