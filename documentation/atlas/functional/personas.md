# Personas

Atlas serves very few people, and that is a design constraint rather than a limitation. Every capability is shaped by which of these four it exists for.

## The Maintainer

**Who:** The developer who owns the machine, writes the Ansible repository and is the only person with shell access. One individual, working on Atlas in spare hours.

**What they need:**

- To understand the whole system months after last touching it, without re-deriving it from scratch.
- To make a change, review its diff, apply it and see the result — in one sitting, without a deployment pipeline.
- To be certain a converge cannot destroy data, so that running the playbook is never a decision requiring courage.
- To reach the machine over SSH with a familiar shell, prompt and set of shortcuts identical to their workstation.
- To be told, on their phone, when something is broken — and not to be told anything else.

**What they explicitly do not want:** an orchestrator, a control plane, a chart repository, or any component whose upgrade is an event.

## The Household

**Who:** The maintainer's partner and family. Non-technical, and uninterested in how any of it works.

**What they need:**

- One login that works everywhere, with a second factor they can actually use.
- Home automation that responds instantly and keeps working when the internet does not.
- A page they can open that lists what is available, without needing to remember addresses.
- Never to be asked to read a log, hold a password per service, or understand why something is down.

**Consequence for the design:** authentication has to be genuinely single sign-on rather than a portal that then asks for a second password, and the local behaviour of home automation must not depend on any Atlas service being healthy.

## The Consumer

**Who:** Anyone or anything pulling a container image — the maintainer's continuous integration, their workstation, another machine, or a stranger pulling a public package.

**What they need:**

- A registry endpoint that behaves like any other: standard tooling, standard authentication, no special cases.
- Public packages that pull without credentials.
- Private packages that pull with a token which can be revoked on its own.

**Consequence for the design:** this persona cannot use a browser login, which is why the registry is one of the three named exceptions to the gate.

## The Peer

**Who:** A friend running their own server, with whom Atlas exchanges backup storage — each holding an encrypted replica of the other's data, at no cost to either.

**What they need:**

- A defined, capped allowance of storage that Atlas guarantees and enforces.
- Replication that travels over a private link, never the open internet.
- No access whatsoever to anything else on Atlas, including its backups.

**Consequence for the design:** object storage is built as a two-node cluster from the first day, with per-tenant quotas and separate credentials, even though only one node exists today.

## Explicit non-personas

| Not served | Why it matters |
| ---------- | -------------- |
| **Collaborators with write access** | No one but the maintainer pushes code or images. Group structures exist so this could change, but nothing is built for it today. |
| **The public, as users** | Strangers may pull a public image or view a published application. They never receive an account. |
| **A future team** | Atlas is not a shared platform in waiting. Growing it into one would be a different project. |
