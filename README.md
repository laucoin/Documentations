# Luc's Projects Portal

[![Deploy](https://github.com/laucoin/Documentations/actions/workflows/deploy.yml/badge.svg)](https://github.com/laucoin/Documentations/actions/workflows/deploy.yml)
[![VitePress](https://img.shields.io/badge/VitePress-2.0.0--alpha-646CFF?logo=vite&logoColor=white)](https://vitepress.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

## This repository 📖

Personal documentation portal built with [VitePress](https://vitepress.dev/), centralising documentation for my various personal and professional projects.

It hosts, per project, a **functional** section (business rules, roles & permissions, BDD workflows) and a **technical** section (architecture, ADRs, runbooks) — see [AGENTS.md](./AGENTS.md) for the conventions that keep them consistent.

Documented projects:

- 🖥️ [**Atlas**](https://doc.laucoin.fr/atlas/) — a single hardened Debian server described entirely in Ansible.
- 🍎 [**Ponos**](https://doc.laucoin.fr/ponos/) — a reproducible macOS developer environment as code.
- 🎟️ [**Registry**](https://doc.laucoin.fr/registry/) — a multi-tenant participant & event registry ([live app ↗](https://registry.sgdf.fr)).
- 🧑 [**Résumé**](https://doc.laucoin.fr/resume) — Luc's CV.

## How to install and use it? ⚙️

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 22
- [pnpm](https://pnpm.io/) ≥ 11

### Build and run locally

##### Procedure

1. Clone this repository with:
   ```shell
   git clone https://github.com/laucoin/Documentations.git
   ```
   OR
   ```shell
   git clone git@github.com:laucoin/Documentations.git
   ```
2. Move into the project directory
   ```shell
   cd Documentations/
   ```
3. Install dependencies:
   ```shell
   pnpm install
   ```
4. Start the local dev server:
   ```shell
   pnpm dev
   ```
5. Enjoy 🎉 — open the URL printed in your terminal (VitePress defaults to `http://localhost:5173`); pages hot-reload as you edit them.

> [!TIP]
> `pnpm build` is the review gate for documentation changes — it fails the build on a dead link. Run it after touching any link or moving a page, before opening a PR.

#### Build for production

```shell
pnpm build
```

Static output lands in `.vitepress/dist/`.

#### Preview the production build

```shell
pnpm preview
```

## Project structure

```text
.
├── .vitepress/
│   └── config.mts              # VitePress config (nav, sidebar, footer, search)
├── documentation/
│   ├── index.md                # Portal home page
│   ├── resume/
│   │   └── index.md            # Résumé / CV page
│   └── [project-name]/
│       ├── index.md            # Project landing page (layout: home)
│       ├── functional/         # Business objects, features, workflows
│       │   └── index.md
│       └── technical/          # ADR, architecture diagrams, ops runbooks
│           └── index.md
├── AGENTS.md                   # AI agent conventions for this repository
└── package.json
```

## Adding a new project

See [AGENTS.md](./AGENTS.md) for the full checklist, including the required folder structure, portal card template, and sidebar wiring.

## Contributing 💻

The `main` branch contains the published content — pushing to it triggers the [deploy workflow](.github/workflows/deploy.yml), which builds the site and publishes it to GitHub Pages.

> [!WARNING]
> Any change should go through a pull request rather than a direct push to `main`, even on a personal repository — it keeps the deploy history clean and gives dead links a chance to surface before they go live.

This repository has no automated test suite; **`pnpm build` is the review gate**, since VitePress fails the build on any dead internal link. Run it locally before opening a pull request:

```shell
pnpm install
pnpm build
```

Before contributing, please read the [documentation conventions](./AGENTS.md) and our [code of conduct](CODE_OF_CONDUCT.md).

## Contributors 🧑‍💻

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/en/reference/emoji-key/)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://doc.laucoin.fr/resume"><img src="https://avatars.githubusercontent.com/u/31480129?v=4?s=100" width="100px;" alt="Luc AUCOIN"/><br /><sub><b>Luc AUCOIN</b></sub></a><br /><a href="#projectManagement-laucoin" title="Project Management">📆</a> <a href="#doc-laucoin" title="Documentation">📖</a> <a href="#infra-laucoin" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-laucoin" title="Maintenance">🚧</a> <a href="#design-laucoin" title="Design">🎨</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

To add a contributor, either comment on an issue/PR with
`@all-contributors please add @<username> for <contributions>` (bot), or run:

```shell
npx --yes all-contributors-cli add <username> <contributions>
```

## License

Unless otherwise stated, the content of this repository (text, images, documentation) is licensed under the [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) license. The source code for the technical examples is licensed under the MIT License.
