# Architecture Decision Records

Atlas records one architectural decision, because one decision determines every other: the choice not to use an orchestrator.

Everything else — which reverse proxy, which identity provider, how storage is divided, how backups are verified — follows from it and is documented directly in the [technical pages](/atlas/technical/) rather than as separate records. This is deliberate. A decision record earns its place when a future reader would otherwise ask *"why on earth was it done this way?"*, and for a single-node personal server there is exactly one question of that kind.

| ADR | Title | Status |
| --- | ----- | ------ |
| [001](/atlas/technical/adr/001-debian-docker-over-talos-kubernetes) | Debian and Docker over Talos and Kubernetes | Accepted |
