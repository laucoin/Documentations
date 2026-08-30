# Code Quality

Continuous analysis of the maintainer's projects, tracking quality and technical debt over time rather than gating individual changes.

## Behaviour rules

1. **Analysis runs from continuous integration**, which lives with the source code on an external provider. Its scanner reaches Atlas over the internet using an analysis token — the second of the three named exceptions to the gate.
2. **People use the gate.** The human interface requires single sign-on with a second factor, and the person arrives under their own identity.
3. **The main line only.** The edition in use analyses one branch. There is no per-change decoration, and this is accepted: the value here is the trend over months, not a comment on a pull request.
4. **Languages are declared.** Analysis covers the languages the maintainer actually writes: TypeScript, JavaScript, Vue, Angular, HTML, CSS, Python, Java, Kotlin, shell and infrastructure definitions.
5. **Sharper tools run elsewhere.** Dedicated linters for shell, infrastructure and container definitions run in continuous integration, where they give faster and more specific feedback.
6. **It is the first thing to go.** This is the heaviest service on the node. If resources become contended, it is the declared candidate for removal.

## Scenarios

```gherkin
Feature: Code quality

  Scenario: Analysis after a change lands
    Given a change is merged to the main line
    When continuous integration runs the scanner
    Then results appear without any human authentication

  Scenario: Someone opens the interface
    When a person opens the code-quality interface
    Then they must pass the gate with a second factor
    And they arrive under their own identity

  Scenario: An expired analysis token
    Given the analysis token has been revoked
    When continuous integration runs the scanner
    Then the analysis is refused
    And the failure is visible in the continuous integration run

  Scenario: A branch other than the main line
    Given a change exists on a side branch
    When continuous integration runs
    Then no per-branch analysis is produced
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Anonymous |
| ------ | ------- | ----------- | -------------- | --------- |
| Submit an analysis | Yes, by token | No | Yes, by token | No |
| View results | Yes | No | Yes | No |
| Administer projects and rules | Yes | No | No | No |
