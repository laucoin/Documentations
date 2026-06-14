# Functional Documentation

Atlas is a self-hosted platform that runs at home and provides a small handful of services to me, my family and a few friends. Everything is described here from a user's point of view — what the platform does, who interacts with it, and what value each service delivers. The engineering choices behind it live in the [Technical Documentation](../technical/).

## What Atlas is, in one paragraph

Atlas turns a single machine sitting in my home into a small, opinionated cloud. Anyone with an account can sign in once and reach a personal image registry, monitoring dashboards, and a secret vault, all behind real domain names and real TLS certificates. The whole stack is described as code and rebuilt by pushing to a Git repository — there is no manual server administration.

## Scope and non-goals

| In scope                                               | Out of scope                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| Single bare-metal node at home                         | Multi-node HA cluster                                              |
| A small group of trusted users (single-digit count)    | Public SaaS or anonymous users                                     |
| GitOps-driven deployment                               | Click-ops administration                                           |
| Self-hosted identity, registry, secrets, observability | Mail server, file sync, media streaming (later, separate projects) |
| Free / open-source software only                       | Paid managed services for core infra                               |

## Documentation map

| Page                     | Purpose                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| [Personas](./personas)   | Who interacts with Atlas and what they need from it                                              |
| [Services](./services)   | The catalog of user-facing services and what each one is for                                     |
| [Workflows](./workflows) | End-to-end journeys: signing in, pushing an image, viewing a dashboard, recovering from a backup |
