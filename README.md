# Luc's Projects Portal

Personal documentation portal built with [VitePress](https://vitepress.dev/), centralising documentation for my various personal and professional projects.

## Tech stack

- [VitePress](https://vitepress.dev/) — static site generator
- [pnpm](https://pnpm.io/) — package manager

## Prerequisites

- Node.js ≥ 24
- pnpm ≥ 11

## Local development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm preview   # preview the production build locally
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

## License

Unless otherwise stated, the content of this repository (text, images, documentation) is licensed under the [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) license. The source code for the technical examples is licensed under the MIT License.
