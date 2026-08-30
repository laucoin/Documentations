# Luc's Projects Portal 📚

[![Deploy](https://github.com/laucoin/Documentations/actions/workflows/deploy.yml/badge.svg)](https://github.com/laucoin/Documentations/actions/workflows/deploy.yml)
[![VitePress](https://img.shields.io/badge/VitePress-2.0.0--alpha-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitepress.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Node](https://img.shields.io/badge/Node-24+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg?style=flat-square)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

## This repository 📖

Personal documentation portal built with [VitePress](https://vitepress.dev/), centralising documentation for my various personal and professional projects.

Each project gets its own space with a **functional** side (business objects, features, workflows) and a **technical** side (ADR, architecture diagrams, ops runbooks), so both product and engineering context live next to each other.

Live at [doc.laucoin.fr](https://doc.laucoin.fr).

## How to install and use it? ⚙️

### Prerequisites

Install [Node.js 24 or later](https://nodejs.org/) and [pnpm 11 or later](https://pnpm.io/installation)

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
3. Install dependencies
    ```shell
    pnpm install
    ```
4. Enjoy the following commands 🎉

#### Running the application in dev mode

You can run the portal in dev mode, which enables live reload:

```shell
pnpm dev
```

#### Packaging and running the application

The site can be built for production using:

```shell
pnpm build
```

It produces the static site in the `.vitepress/dist/` directory.

The application is now servable from any static host using the content of `.vitepress/dist/`.

To preview the production build locally:

```shell
pnpm preview
```

## Project structure 🗂️

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

### Adding a new project

See [AGENTS.md](./AGENTS.md) for the full checklist, including the required folder structure, portal card template, and sidebar wiring.

## Contributing 💻

The `main` branch contains the development code.

> [!WARNING]
> Any development must be done on a separate branch.

The GitHub Actions workflow is the deployment gate:

- **Deploy** ([deploy.yml](.github/workflows/deploy.yml), on push to `main`) — runs `pnpm build` and publishes the
  result to GitHub Pages. `pnpm build` is the authority on correctness: it fails on dead links and broken pages, so
  run it after touching links or moving pages.
- **Dependabot** ([dependabot.yml](.github/dependabot.yml)) — keeps dependencies up to date and flags vulnerable ones.

Before contributing, please read [AGENTS.md](./AGENTS.md) and our [code of conduct](CODE_OF_CONDUCT.md). See
[SECURITY.md](SECURITY.md) to report a vulnerability.

## License 📜

Unless otherwise stated, the content of this repository (text, images, documentation) is licensed under the [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) license. The source code for the technical examples is licensed under the MIT License.

## Contributors 🧑‍💻

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/en/reference/emoji-key/)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://doc.laucoin.fr/resume"><img src="https://avatars.githubusercontent.com/u/31480129?v=4?s=100" width="100px;" alt="Luc AUCOIN"/><br /><sub><b>Luc AUCOIN</b></sub></a><br /><a href="#projectManagement-laucoin" title="Project Management">📆</a> <a href="#ideas-laucoin" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/laucoin/Documentations/commits?author=laucoin" title="Code">💻</a> <a href="https://github.com/laucoin/Documentations/commits?author=laucoin" title="Documentation">📖</a> <a href="#maintenance-laucoin" title="Maintenance">🚧</a> <a href="#infra-laucoin" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification.
Contributions of any kind welcome!

To add a contributor, either comment on an issue/PR with
`@all-contributors please add @<username> for <contributions>` (bot), or run:

```shell script
npx --yes all-contributors-cli add <username> <contributions>
```
