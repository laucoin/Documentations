# Host Hardening

The baseline every other capability rests on. Atlas is exposed to the internet by design, so the host is treated as a target from the first converge rather than hardened later.

## Behaviour rules

1. **Access is by key only.** SSH accepts public keys and nothing else. Passwords and challenge-response are refused, root login is disabled, and only the maintainer's account may connect.
2. **SSH is the recovery path.** It stays reachable from the internet precisely because it must work when the web stack does not. It is hardened, not hidden.
3. **The firewall denies by default.** Inbound traffic is dropped unless it is HTTP, HTTPS or SSH. The rule set is one declared file, so what it says is what is enforced.
4. **Every service account is unprivileged.** One human account with password-protected elevation; one system identity per containerised service, owning only that service's data.
5. **Containers hold no privileges.** Non-root inside, no new privileges, capabilities dropped, read-only root filesystem, and no host paths beyond declared data volumes. This applies without exception, including the reverse proxy — the firewall redirects the standard web ports to it rather than letting it bind them directly; see [Ingress & TLS](/atlas/functional/features/ingress).
6. **Security patches apply themselves.** Debian security updates install unattended. Reboots never happen automatically; when one is required the maintainer is told and chooses the moment.
7. **Repeated failures are banned.** Authentication failures against SSH, the sign-on portal and home automation lead to a temporary block of the source address.
8. **Mandatory access control is enforced, not merely enabled.** The kernel's access-control framework runs in enforcing mode, alongside a declared set of kernel network and memory-protection settings.
9. **Unused hardware is inert.** The machine's graphics card remains physically installed but has no drivers loaded and no workload.

## Scenarios

```gherkin
Feature: Host access

  Scenario: Attempting a password login
    Given an attacker knows the maintainer's username
    When they attempt to authenticate with any password
    Then the attempt is refused before a password is even considered

  Scenario: Attempting to log in as root
    When anyone attempts an SSH session as root
    Then the attempt is refused

  Scenario: Repeated failures
    Given an address has failed authentication several times in a short window
    When it tries again
    Then it is blocked for a defined period
    And the block is recorded in the logs

  Scenario: A reboot becomes necessary
    Given an unattended security update requires a restart
    When the update completes
    Then the node does not restart on its own
    And the maintainer is notified that a restart is pending
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Anonymous |
| ------ | ------- | ----------- | -------------- | --------- |
| Open a shell on the host | Yes | No | No | No |
| Elevate to administrative rights | Yes, with a password | No | No | No |
| Change firewall or hardening settings | Through the repository only | No | No | No |

## Accepted risks

- **SSH is publicly reachable.** Judged safer than removing the only recovery path that works when the web stack is broken.
- **The host runs a general-purpose operating system**, with a shell and a package manager. This is a deliberate trade discussed in [ADR 001](/atlas/technical/adr/001-debian-docker-over-talos-kubernetes).
