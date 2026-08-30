# Security Policy

## Scope

This repository is a static [VitePress](https://vitepress.dev/) documentation site with no backend, no user accounts,
and no user-submitted data. There is no versioned release train, so there is no "supported versions" table: the `main`
branch, as deployed to [doc.laucoin.fr](https://doc.laucoin.fr), is always the only supported version.

Relevant concerns are limited to the build tooling (Node/pnpm dependencies, VitePress, the deploy workflow) and to any
markdown/Vue content that could introduce XSS into the published site.

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately through GitHub's **"Report a vulnerability"** button under the repository's **Security** tab (Private
Vulnerability Reporting). If that is unavailable, email **luc.aucoin1998@gmail.com** instead.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept if possible)
- Affected file(s) / dependency and version
- Any suggested remediation

## What to Expect

- **Acknowledgement** within **3 business days**.
- An initial assessment within **7 business days**.
- Coordinated disclosure: we'll agree on a timeline before any public disclosure, and credit you if you wish.

Thank you for helping keep this project and its readers safe.
