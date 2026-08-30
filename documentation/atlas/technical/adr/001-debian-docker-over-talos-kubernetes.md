# ADR 001 — Debian and Docker over Talos and Kubernetes

## Status

Accepted — supersedes the earlier Atlas decisions to run Kubernetes and Talos Linux, both withdrawn.

## Context

Atlas is a **single-node personal server**: one repurposed desktop at home, a dozen containerised services, one maintainer working on it in spare hours. It has to remain understandable and operable by that same person years from now.

An earlier design specified Talos Linux running Kubernetes. Its reasoning was sound on its own terms — an immutable, API-driven host with no shell and no package manager has a genuinely smaller attack surface, and declarative machine configuration makes drift structurally impossible. That is not disputed here.

What changed is the **ranking of priorities**. Atlas now states plainly that simplicity, readability and long-term maintainability come before automation sophistication. Under that ranking the question is no longer *which architecture is most defensible in isolation*, but **which one will still be correctly maintained in three years by one person**. Those have different answers.

Three things decided it.

**Community.** Debian and Docker are the two most widely documented pieces of infrastructure software in existence. Almost every self-hosted project publishes a Compose file and a Debian install path first; a great many publish nothing else. When something breaks at an awkward hour, the answer is usually already written down by someone who hit it before — and that is worth more to a lone maintainer than any architectural elegance. Talos, by contrast, is a small and specialised community, and every problem is solved by reading upstream documentation rather than by finding someone who has already had it.

**Simplicity.** Kubernetes solves problems created by having many machines: scheduling, rescheduling, service discovery, rolling updates, self-healing. Atlas has one machine. A pod that cannot be scheduled has nowhere to go, and a failed host takes the control plane with it. The machinery is paid for in full and most of the benefit never arrives — while the incidental surface (etcd, a network plugin, a storage driver, an ingress controller, certificate automation, and a chart or manifest for every component) is larger than the workload it exists to run.

**Fit.** Talos exists to run Kubernetes and nothing else, so rejecting Kubernetes rejects Talos as a consequence rather than as a separate decision. It also removes, by design, three things Atlas actually requires: a USB device passed through to home automation, a deliberately managed volume layout, and SSH with a familiar shell for the maintainer. Adopting it would mean either giving those up or fighting the operating system to get them back.

There is one further point, uncomfortable but decisive. An immutable host only delivers its security advantage if the platform above it is kept current. A Kubernetes cluster whose sole operator finds upgrades tedious — and therefore performs them late — is not safer than a Debian host taking unattended security updates and running a dozen pinned, hardened containers. **The likely failure mode for this project is neglect, not compromise.**

## Decision

Run Atlas on **Debian stable**, with services as **Docker containers described by Compose files templated by Ansible** and supervised by system units. **Ansible is the only infrastructure-as-code tool.**

Explicitly excluded:

- **Kubernetes**, in any distribution — upstream, k3s, k0s, MicroK8s, RKE2.
- **Talos Linux** or any other Kubernetes-only immutable operating system.
- **Helm**, Kustomize, manifests, operators, custom resources.
- **Other schedulers** — Nomad and Swarm — for the same single-node reason.

This is a **firm constraint, not a starting point**. Multi-node is an explicit non-goal; if that ever changes it warrants a new record superseding this one, rather than a gradual drift toward orchestration.

## Consequences

### Positive

- **Readable end to end.** A service is a Compose file, a system unit and a role — three plain-text artefacts. No controllers, admission webhooks or chart value inheritance stand between the maintainer and what is running.
- **Direct debugging.** SSH, journal, container logs, unit status. No debug pod deployed into a host that deliberately has no tools.
- **The documentation already exists.** Upstream projects target this exact shape, so adopting a new service usually means reading its Compose example rather than translating a chart.
- **A small, slow-moving dependency surface.** Debian stable, Docker, and the service images. No control plane to upgrade in lockstep, no network plugin to break on a kernel bump.
- **Hardware and storage are unremarkable.** Passing a device to a container is a rule and a mapping; managing volumes is a role. Neither needs a plugin ecosystem.
- **Resources go to workloads.** No control-plane components competing with the code-quality server for memory.

### Negative

- **No reconciliation loop.** Nothing continuously enforces declared state. A manual change on the host persists silently until the next converge. Talos's guarantee that drift is impossible is genuinely lost, and only discipline replaces it.
- **No self-healing beyond restart policies.** A crash-looping container restarts; a wedged one stays wedged until monitoring notices and a person intervenes.
- **No rolling deployments.** Updating a service stops it and starts the new version. Brief downtime per deploy is accepted.
- **The host has a shell, a package manager and SSH** — precisely the surface Talos removes. This is the largest concession in this record and it is deliberate; the compensating controls are in the [security model](/atlas/technical/security-model).
- **No transferable orchestration experience.** If Atlas was partly a learning environment for Kubernetes, that benefit is gone.
- **Some projects ship only Helm charts.** Adopting one later means translating it by hand, or declining it.

### Alternatives rejected

- **Talos Linux with Kubernetes** — the previous decision. Its security argument is acknowledged and consciously traded away. Rejected because its benefits are inseparable from Kubernetes's costs, and because removing shell, SSH and package management conflicts directly with settled requirements.
- **k3s on Debian** — the lighter middle ground, keeping a normal host. Rejected because it retains nearly all of Kubernetes's conceptual surface while, on one node, delivering almost none of the benefits that surface exists to provide.
- **Docker Swarm** — nearly free, given Docker is present. Rejected as effectively unmaintained upstream, and because multi-node scheduling on one node is overhead without payoff.
- **Nomad** — genuinely simpler than Kubernetes. Rejected on the same single-node grounds, plus the cost of learning an unfamiliar scheduler and its ecosystem.
- **Compose without Ansible** — simpler still, and tempting. Rejected because it leaves the *host* undescribed: hardening, volumes, accounts, firewall, backups and secrets would all become undocumented manual steps, which is precisely the failure this project exists to avoid.
- **NixOS** — reproducible and declarative without Kubernetes, and it would answer the drift concern better than Ansible does. Rejected on the community and readability criteria that decided this record: a much smaller ecosystem, far fewer worked examples for the services in this stack, and a language and module system that are a substantial investment to learn and to re-learn after six months away.
