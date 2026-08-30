# Functional Documentation

Atlas is a personal Linux server that hosts a small set of internet-facing services for one developer and their household. Everything on this page is described from the point of view of the people who use it — what the server does, who it serves, and the rules each capability must obey. The engineering behind it lives in the [Technical Documentation](/atlas/technical/).

## What Atlas is, in one paragraph

Atlas turns a single repurposed desktop machine into a **maintainable, hardened, self-hosted platform**. One Ansible repository describes the whole thing: the Debian host and its hardening, an isolated LVM storage layout, a rootless Docker runtime, and roughly a dozen containerised services. A reverse proxy publishes every service under one domain with automatic TLS, and a single sign-on portal with mandatory two-factor authentication stands in front of almost all of them. Behind that gate sit a **container registry** (the reason Atlas exists — escaping a hosted registry's storage limits), **home automation** driving lighting, climate, presence and energy monitoring, **object storage** that holds the server's own encrypted backups and will one day mirror a friend's, a **code-quality server**, a full **observability stack**, and the maintainer's own **hosted applications**. The playbook is run by hand, always by a person who is watching, and re-running it never destroys data.

> The name comes from **Atlas**, the Titan condemned to hold up the sky — one node carrying everything, and a set of maps describing exactly how.

## Core concepts

| Concept | What it means to the user |
| ------- | ------------------------- |
| **The node** | The single physical machine. There is no cluster, no failover and no second server. If the node is down, Atlas is down — this is accepted, not a defect. |
| **Converge** | One deliberate run of the Ansible playbook that brings the node to its declared state. Always manual, always watched, always safe to repeat. |
| **The gate** | The single sign-on portal every browser-facing service sits behind. One identity, one login, mandatory two-factor. |
| **Exception** | A service that cannot sit behind the gate for technical reasons. There are exactly three, each named and individually protected. |
| **Stack** | One service and its private dependencies (a database, a broker) described by one Compose file and supervised by one system unit. |
| **Declared volume** | A storage volume named in the repository. Declared volumes are never destroyed by a converge; only undeclared ones may be reclaimed. |
| **Peer** | A friend's server that will hold a replica of Atlas's backups, and whose backups Atlas holds in return. Designed for now, enabled later. |

## Scope and non-goals

| In scope | Out of scope |
| -------- | ------------ |
| One single-node personal server | Clustering, multi-node, high availability |
| Ansible as the only infrastructure tool | Kubernetes, Talos, Helm, Nomad, Swarm |
| Internet-exposed services behind single sign-on | Anything reachable only from the local network |
| A container registry for the maintainer's images | A public registry for strangers |
| Home automation for one household | A commercial or multi-household deployment |
| Encrypted backups, with mutual offsite replication planned | Cloud backup providers |
| Hosting the maintainer's own applications | Shared hosting or public multi-tenancy |
| Outbound notification email through a relay | Receiving mail, mailboxes, spam filtering |
| A consistent visual identity across entry points | Theming the internals of third-party applications |

## The three exceptions

Almost everything sits behind the gate. Three endpoints cannot, and each is called out wherever it appears in this documentation:

| Exception | Why it cannot use the gate | How it is protected instead |
| --------- | ------------------------- | --------------------------- |
| **Registry pull/push** | The Docker CLI cannot complete an interactive browser login | Registry tokens per consumer; public packages readable anonymously, everything else authenticated |
| **Code-quality scanner API** | Continuous integration runs unattended and cannot answer a login prompt | Analysis tokens; the human-facing interface still uses the gate |
| **Home automation** | Its companion app and inbound webhooks cannot traverse a portal redirect | Single sign-on *inside* the application via an OpenID Connect integration, plus rate limiting and failure banning |

## Documentation map

| Page | Purpose |
| ---- | ------- |
| [Personas](/atlas/functional/personas) | Who Atlas serves and what each of them needs from it |
| [Actors, Roles & Trust Boundary](/atlas/functional/roles-and-permissions) | The security baseline: who may reach what, and where trust begins and ends |
| [Workflows](/atlas/functional/workflows) | End-to-end journeys, from a converge to a disaster recovery |
| [Host Hardening](/atlas/functional/features/hardening) | The baseline every other capability rests on |
| [Storage Isolation](/atlas/functional/features/storage) | Why a log burst or a runaway registry can never take the host down |
| [Ingress & TLS](/atlas/functional/features/ingress) | How requests from the internet reach a service |
| [Identity & Single Sign-On](/atlas/functional/features/identity) | The gate, its users, and its two-factor rules |
| [Container Registry](/atlas/functional/features/registry) | Publishing and consuming container images |
| [Code Quality](/atlas/functional/features/code-quality) | Continuous analysis of the maintainer's projects |
| [Home Automation](/atlas/functional/features/home-automation) | Lighting, climate, presence and energy for the household |
| [Object Storage](/atlas/functional/features/object-storage) | The S3 layer, its tenants, and the mutual peer replica |
| [Observability](/atlas/functional/features/observability) | Knowing what the node is doing, and being told when it stops |
| [Backup & Recovery](/atlas/functional/features/backup) | What is protected, how often, and how it comes back |
| [Application Hosting](/atlas/functional/features/app-hosting) | Running the maintainer's own projects on Atlas |
| [Shell Environment](/atlas/functional/features/shell-environment) | The server-side terminal, matching the maintainer's workstation |
| [Unified Theme](/atlas/functional/features/unified-theme) | One visual identity across every entry point |
