# Shell Environment

Atlas carries a trimmed Linux port of [Ponos](/ponos/), the maintainer's macOS workstation setup, so that connecting to the server feels like sitting at their own machine.

## Behaviour rules

1. **Same shell, same prompt, same colours.** The shell, prompt and palette match the workstation, and the palette is the one described in [Unified Theme](/atlas/functional/features/unified-theme).
2. **Only what makes sense on a server.** The workstation's repository-oriented helpers are not carried across, because there are no working repositories here. The port-inspection helpers are, because they are genuinely useful on a server.
3. **Server-specific helpers are added.** Short commands for the things done repeatedly: seeing which stacks are running, tailing one service's logs, restarting a stack, checking the last backup, and showing usage per volume.
4. **It is a role, not a separate project.** Delivered by the Atlas repository, adapted to Debian. Ponos and Atlas keep separate copies, because they have different lifecycles.
5. **It is cosmetic and operational, never privileged.** No helper grants access that the account does not already have.
6. **Both accounts get it**, so that an elevated session is as familiar as an ordinary one.

## Scenarios

```gherkin
Feature: Shell environment

  Scenario: Connecting to the server
    When the maintainer opens a session
    Then the prompt, colours and shell behave as on their workstation

  Scenario: Checking the stacks
    When the maintainer runs the stack-status helper
    Then every service and its state is listed in one view

  Scenario: A helper does not grant privilege
    Given a helper wraps an operation requiring elevation
    When it is run by an account without that right
    Then it fails in the same way the underlying command would

  Scenario: Re-running the converge
    Given the shell environment is already in place
    When the maintainer converges again
    Then nothing changes and no file is rewritten
```

## Permissions

| Action | `admin` | Everyone else |
| ------ | ------- | ------------- |
| Use the shell environment | Yes | No shell access exists |
| Change it | Through the repository only | No |
