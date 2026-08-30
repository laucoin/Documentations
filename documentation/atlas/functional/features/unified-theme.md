# Unified Theme

Atlas has one visual identity, applied everywhere it can be applied honestly — and deliberately not applied where it would break.

## The identity

Clean and minimal, in the manner of a well-made desktop operating system: neutral surfaces, generous spacing, restrained borders, and a single **system blue** accent. Light and dark are both first-class and follow the viewer's system preference, rather than one being an afterthought.

System blue is chosen partly because it stays out of the way: red, amber and green remain free to mean error, warning and success in dashboards, where those meanings matter more than decoration.

## Behaviour rules

1. **One palette, defined once**, in the repository, and rendered everywhere it is needed — including the terminal prompt described in [Shell Environment](/atlas/functional/features/shell-environment).
2. **The entry points carry it fully, within what the software in front of them allows.** The sign-on portal, error pages and the service dashboard are the surfaces the household and any stranger actually see — but rule 3 governs how far theming actually reaches on each. Error pages and the dashboard are Atlas's own, so they carry the palette completely. The sign-on portal is Authelia, which exposes no colour or stylesheet customisation — only a favicon, a logo, and locale text — so "carries it fully" there means matching through Authelia's own supported surface, not full colour parity. See the accepted risk below.
3. **Applications are themed only where they support it.** Where an application offers real theming, the palette is applied through it. Where it does not, it is left alone.
4. **No stylesheet injection, ever.** Forcing a theme onto an application that does not support it means maintaining selectors against software the maintainer does not control. It looks finished for two months and then rots silently.
5. **The dashboard is generated, not maintained.** It is rendered from the same declarations that define the services, so a service added to the repository appears on it automatically and cannot drift.
6. **Both themes are complete.** Neither is a filter applied to the other.

## Scenarios

```gherkin
Feature: Unified theme

  Scenario: A household member opens the dashboard
    When they open the root address
    Then they see a themed page listing the services they are permitted to use

  Scenario: The system prefers dark
    Given the visitor's device is set to dark
    When they open any Atlas entry point
    Then it renders in dark without a manual switch

  Scenario: A service is added
    Given a new service is declared in the repository
    When the maintainer converges
    Then it appears on the dashboard without the page being edited

  Scenario: An application cannot be themed
    Given an application offers no theming support
    Then it keeps its own appearance
    And no stylesheet is injected into it

  Scenario: Something goes wrong
    When a request fails at the proxy
    Then a themed error page is returned rather than a default one
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Anonymous |
| ------ | ------- | ----------- | -------------- | --------- |
| See the dashboard | Yes | Yes | Yes | No |
| See themed sign-on and error pages | Yes | Yes | Yes | Yes |
| Change the palette | Through the repository only | No | No | No |

## Accepted risks

- **The sign-on portal doesn't carry the system-blue accent.** Authelia's server asset overrides support only a favicon, a logo, and locale text — no CSS or colour customisation exists to apply the palette through, and rule 4 forbids injecting one that isn't there. The portal keeps Authelia's own appearance (which already follows system light/dark preference natively, satisfying rule 6 on its own), with only the favicon and logo swapped for Atlas's identity. If Authelia ever adds real theming support, this is revisited.
