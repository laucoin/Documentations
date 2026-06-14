# Personas

Atlas is small. There are three personas, and one of them is me wearing two hats.

## Platform Operator (me)

The person who provisions the cluster, manages domain names, holds the Talos secrets, and merges to the main branch of the IaC repository.

- **Goals**: keep the platform online, recoverable, and cheap to run; never have to log into a server interactively.
- **Pain points**: cluster drift, expired certificates, surprise upgrades, lost secrets.
- **What Atlas owes them**: a clear bootstrap procedure, observable health, encrypted backups they can restore from cold.

## Power User (me again, and a couple of close collaborators)

The person who pushes container images, writes Grafana dashboards, and consumes secrets from Infisical for personal projects.

- **Goals**: push and pull images privately; observe their own apps; share credentials across machines without leaking them.
- **Pain points**: anonymous registries, copy-pasted `.env` files, dashboards that disappear after a laptop reboot.
- **What Atlas owes them**: stable URLs, single sign-on, durable storage of their projects' artifacts and metrics.

## Guest User (family and friends)

Someone I trust enough to give an account, but who is not necessarily technical.

- **Goals**: log in once and reach whichever service I invited them to (typically a Grafana dashboard or a Harbor project) without juggling credentials.
- **Pain points**: too many logins, broken passwords, expired links.
- **What Atlas owes them**: a single login screen (Authentik), clear app names, and TLS that "just works" in the browser.
