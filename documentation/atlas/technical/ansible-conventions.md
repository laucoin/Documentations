# Ansible Conventions

Ansible is the only infrastructure tool in Atlas. These conventions exist so that the repository stays readable by one person returning to it after months away.

## Repository

A **private repository** on the maintainer's existing hosted provider. Private deliberately: even with secrets encrypted, a public repository advertises exactly which services run at which addresses on which versions.

```
atlas/
  inventory/            host and group variables, the domain, sizes, image versions
  playbooks/
    site.yml            the everyday converge
    storage.yml         destructive; requires an explicit confirmation variable
  roles/
    base/               packages, time, locale, the admin account
    hardening/          SSH, firewall, kernel settings, access control, ban rules
    storage/            volume reconciliation (assertions only in site.yml)
    docker/             the rootless runtime, the service user, identity mapping
    traefik/            the reverse proxy, routes, shared middleware, certificates
    authelia/           the gate, users, access rules, identity provider clients
    forgejo/            registry and forge
    sonarqube/          code quality
    homeassistant/      home automation, device bridge, broker
    garage/             object storage, buckets, keys, quotas
    observability/      metrics, logs, collection, dashboards, alert routing
    backup/             schedule, dumps, retention, verification
    app/                the generic hosted-application role
    shell/              the trimmed workstation environment
    theme/              palette, portal and error pages, the generated dashboard
```

One role per concern, composed by `site.yml`, each tagged so a single service can be converged alone.

## Execution

Manual only, from the maintainer's workstation:

```bash
ansible-playbook playbooks/site.yml --check --diff      # review first, always
ansible-playbook playbooks/site.yml                     # apply
ansible-playbook playbooks/site.yml --tags forgejo      # one service
```

No deploy key on the host. No scheduled convergence. No automation with a path into the machine. The age key that decrypts secrets stays on the workstation and never reaches Atlas.

## The idempotency rules

There is no automated test harness, by choice. Idempotency is therefore a **discipline enforced in how roles are written**, and these rules are what replace the tests.

1. **Check, then act.** Every task states a desired end state. Nothing runs because it is a step in a sequence.
2. **No bare commands.** A shell or command task must carry a condition that makes it a no-op when the work is already done, and must declare when it counts as having changed something. An unconditional command is a defect.
3. **Render, compare, restart.** Configuration is templated to disk. A service restarts only when its rendered file actually changed — never on every run.
4. **Generate once, persist, reuse.** A generated credential is created if absent and read thereafter. It is never regenerated, because that would invalidate live sessions and stored data.
5. **Never destroy data outside the storage playbook.** No role in `site.yml` may remove a volume, drop a database or delete a data directory.
6. **Assert the machine.** Roles that touch storage first verify the expected volume group and mount table, and stop if reality does not match.
7. **The second run is the proof.** A converge followed immediately by an identical converge must report zero changes. This is checked by hand after every meaningful change, and it is the operative definition of "idempotent" in this project.
8. **Prefer declarative modules** over shelling out. Where a module does not exist, rule 2 applies with extra care.

## Variables

| Where | Holds |
| ----- | ----- |
| `inventory/group_vars/all` | Domain, timezone, palette, volume sizes, retention |
| `inventory/group_vars/all/images.yml` | Every image tag and digest — the single file dependency updates touch |
| `inventory/host_vars/atlas` | Anything genuinely specific to this machine |
| `roles/*/defaults` | Sensible defaults, overridable |
| Encrypted values | Secrets, encrypted per value with an age key |

Inventory is structured for a second host even though there will not be one, so the shape does not have to change if that assumption ever breaks.

## The generic application role

Hosted applications are not special-cased. One role accepts a declaration:

| Field | Effect |
| ----- | ------ |
| `name`, `image`, `digest` | Identity and pinned version |
| `environment` | `production` or `staging`; staging is always gated |
| `database` | Provisions a dedicated PostgreSQL instance on a private network |
| `storage` | A data directory on the application volume |
| `bucket` | An object-storage bucket and its own key |
| `public` | If true and production, no gate; otherwise gated |
| `subdomain` | Its address; defaults to the name |

Everything else — backup inclusion, monitoring, dashboard entry, security headers, rate limits — follows automatically. Adding an application is a declaration, not new code.

## Changes and decisions

Architectural decisions live in [this documentation](/atlas/technical/adr/), not in the code repository. The code repository links to them rather than duplicating them.
