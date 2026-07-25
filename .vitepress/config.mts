import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
  srcDir: "documentation",

  // Pre-bundle mermaid so esbuild resolves its transitive UMD deps (dayjs)
  // through mermaid itself and fixes the CJS→ESM interop. Including "dayjs"
  // directly fails under pnpm since it isn't hoisted to the project root.
  vite: {
    optimizeDeps: {
      include: ["mermaid"],
    },
    ssr: {
      noExternal: ["mermaid"],
    },
    build: {
      // The only chunks over the default 500 kB limit are third-party/generated
      // assets that are already lazily loaded and cannot be meaningfully split:
      // the local search index (grows with content) and the Mermaid bundle
      // (d3 + cytoscape + katex, loaded on demand for diagram pages). Raise the
      // threshold so the build only warns on a genuinely oversized chunk.
      chunkSizeWarningLimit: 800,
    },
  },

  title: "Luc’s projects",
  description: "Here a multi-project documentation about Luc’s personal works.",
  // Dev/example URLs and non-doc references that are not resolvable pages.
  ignoreDeadLinks: [/^https?:\/\/localhost/, /\/AGENTS$/],
  rewrites: {
    "../packages/atlas/docs/:page*": "atlas/:page*",
  },
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    footer: {
      copyright: `© ${new Date().getFullYear()} Luc Aucoin. Unless otherwise stated, the content of this site is made available under the terms of the CC BY-NC-ND 4.0 license.`,
    },
    search: {
      provider: "local",
    },
    sidebar: {
      "/ponos/": [
        { text: "Introduction", link: "/ponos/" },
        {
          text: "Functional",
          collapsed: false,
          items: [
            { text: "Overview", link: "/ponos/functional/" },
            { text: "Personas", link: "/ponos/functional/personas" },
            {
              text: "Actors & Trust Boundary",
              link: "/ponos/functional/roles-and-permissions",
            },
            { text: "Workflows", link: "/ponos/functional/workflows" },
            {
              text: "Features",
              collapsed: false,
              items: [
                {
                  text: "Bootstrap Orchestration",
                  link: "/ponos/functional/features/bootstrap",
                },
                {
                  text: "Packages & Interactive Choices",
                  link: "/ponos/functional/features/package-management",
                },
                {
                  text: "Dotfiles & Shell Environment",
                  link: "/ponos/functional/features/dotfiles",
                },
                {
                  text: "Language Toolchains & Fonts",
                  link: "/ponos/functional/features/toolchains",
                },
                {
                  text: "Developer CLI Extensions",
                  link: "/ponos/functional/features/cli-extensions",
                },
                {
                  text: "Git Configuration & Hooks",
                  link: "/ponos/functional/features/git-governance",
                },
              ],
            },
          ],
        },
        {
          text: "Technical",
          collapsed: false,
          items: [
            { text: "Overview", link: "/ponos/technical/" },
            {
              text: "Getting Started",
              link: "/ponos/technical/getting-started",
            },
            { text: "Architecture", link: "/ponos/technical/architecture" },
            { text: "CLI Reference", link: "/ponos/technical/cli-reference" },
            { text: "Configuration", link: "/ponos/technical/configuration" },
            {
              text: "ADRs",
              collapsed: true,
              items: [
                { text: "Index", link: "/ponos/technical/adr/" },
                {
                  text: "001 — Idempotent Bash Orchestrator",
                  link: "/ponos/technical/adr/001-idempotent-bash-orchestrator",
                },
                {
                  text: "002 — Homebrew Bundle",
                  link: "/ponos/technical/adr/002-homebrew-bundle",
                },
                {
                  text: "003 — Symlinked Dotfiles",
                  link: "/ponos/technical/adr/003-symlinked-dotfiles",
                },
                {
                  text: "004 — Per-language Version Managers",
                  link: "/ponos/technical/adr/004-per-language-version-managers",
                },
                {
                  text: "005 — Python + Click CLIs",
                  link: "/ponos/technical/adr/005-python-click-cli",
                },
                {
                  text: "006 — Git Template Hooks",
                  link: "/ponos/technical/adr/006-git-template-hooks",
                },
                {
                  text: "007 — Persisted Interactive Choices",
                  link: "/ponos/technical/adr/007-persisted-interactive-choices",
                },
              ],
            },
          ],
        },
      ],
      "/atlas/": [
        { text: "Introduction", link: "/atlas/" },
        {
          text: "Functional",
          collapsed: false,
          items: [
            { text: "Overview", link: "/atlas/functional/" },
            { text: "Personas", link: "/atlas/functional/personas" },
            { text: "Services", link: "/atlas/functional/services" },
            { text: "Workflows", link: "/atlas/functional/workflows" },
          ],
        },
        {
          text: "Technical",
          collapsed: false,
          items: [
            { text: "Overview", link: "/atlas/technical/" },
            {
              text: "Getting Started",
              link: "/atlas/technical/getting-started",
            },
            { text: "Architecture", link: "/atlas/technical/architecture" },
            {
              text: "Bootstrap Orchestration",
              link: "/atlas/technical/bootstrap",
            },
            {
              text: "ADRs",
              collapsed: false,
              items: [
                { text: "Index", link: "/atlas/technical/adr/" },
                {
                  text: "001 — Kubernetes vs Docker",
                  link: "/atlas/technical/adr/001-kubernetes-vs-docker",
                },
                {
                  text: "002 — Talos vs k3s/Debian",
                  link: "/atlas/technical/adr/002-talos-vs-k3s-debian",
                },
                {
                  text: "003 — OpenTofu vs Terraform vs Pulumi",
                  link: "/atlas/technical/adr/003-opentofu-vs-terraform-vs-pulumi",
                },
                {
                  text: "004 — Argo CD vs Flux",
                  link: "/atlas/technical/adr/004-argocd-vs-flux",
                },
                {
                  text: "005 — Traefik",
                  link: "/atlas/technical/adr/005-traefik-ingress",
                },
                {
                  text: "006 — cert-manager",
                  link: "/atlas/technical/adr/006-cert-manager-tls",
                },
                {
                  text: "007 — local-path + Restic",
                  link: "/atlas/technical/adr/007-local-path-restic-storage",
                },
                {
                  text: "008 — Authentik",
                  link: "/atlas/technical/adr/008-authentik-oidc",
                },
                {
                  text: "009 — Infisical",
                  link: "/atlas/technical/adr/009-infisical-secrets",
                },
                {
                  text: "010 — Harbor",
                  link: "/atlas/technical/adr/010-harbor-registry",
                },
                {
                  text: "011 — Prometheus + Loki",
                  link: "/atlas/technical/adr/011-prometheus-loki-observability",
                },
                {
                  text: "012 — OpenTofu owns L3 handshake",
                  link: "/atlas/technical/adr/012-opentofu-owns-identity-secret-bootstrap",
                },
                {
                  text: "013 — SonarQube",
                  link: "/atlas/technical/adr/013-sonarqube-code-quality",
                },
                {
                  text: "014 — Home Assistant",
                  link: "/atlas/technical/adr/014-home-assistant",
                },
              ],
            },
          ],
        },
      ],
      "/registry/": [
        { text: "Introduction", link: "/registry/" },
        {
          text: "Functional",
          collapsed: false,
          items: [
            { text: "Overview", link: "/registry/functional/" },
            { text: "Personas", link: "/registry/functional/personas" },
            {
              text: "Roles & Permissions",
              link: "/registry/functional/roles-and-permissions",
            },
            { text: "Domain Model", link: "/registry/functional/domain-model" },
            { text: "Workflows", link: "/registry/functional/workflows" },
            {
              text: "Features",
              collapsed: false,
              items: [
                {
                  text: "Projects",
                  link: "/registry/functional/features/projects",
                },
                {
                  text: "Members & Profiles",
                  link: "/registry/functional/features/project-profiles",
                },
                {
                  text: "Participants",
                  link: "/registry/functional/features/participants",
                },
                {
                  text: "Groups",
                  link: "/registry/functional/features/groups",
                },
                {
                  text: "Movements",
                  link: "/registry/functional/features/movements",
                },
                {
                  text: "Vehicles",
                  link: "/registry/functional/features/vehicles",
                },
                {
                  text: "Activities",
                  link: "/registry/functional/features/activities",
                },
                {
                  text: "Communications",
                  link: "/registry/functional/features/communications",
                },
                {
                  text: "Alerts",
                  link: "/registry/functional/features/alerts",
                },
                {
                  text: "Users",
                  link: "/registry/functional/features/users",
                },
                {
                  text: "Preferences",
                  link: "/registry/functional/features/preferences",
                },
              ],
            },
          ],
        },
        {
          text: "Technical",
          collapsed: false,
          items: [
            { text: "Overview", link: "/registry/technical/" },
            {
              text: "Migration Plan",
              collapsed: true,
              items: [
                {
                  text: "2026-07-25 - Plan",
                  link: "/registry/technical/migration-plan/2026-07-25-plan",
                },
              ],
            },
            {
              text: "Getting Started",
              link: "/registry/technical/getting-started",
            },
            { text: "Architecture", link: "/registry/technical/architecture" },
            { text: "Security", link: "/registry/technical/security" },
            { text: "Data Model", link: "/registry/technical/data-model" },
            { text: "API Reference", link: "/registry/technical/api-reference" },
            {
              text: "ADRs",
              collapsed: true,
              items: [
                { text: "Index", link: "/registry/technical/adr/" },
                {
                  text: "001 — Hexagonal Architecture",
                  link: "/registry/technical/adr/001-hexagonal-architecture",
                },
                {
                  text: "002 — Reactive WebFlux + R2DBC",
                  link: "/registry/technical/adr/002-reactive-webflux-r2dbc",
                },
                {
                  text: "003 — Kotlin + Java 25",
                  link: "/registry/technical/adr/003-kotlin-java25",
                },
                {
                  text: "004 — OIDC Resource Server",
                  link: "/registry/technical/adr/004-oidc-resource-server-auth",
                },
                {
                  text: "005 — DB-driven Project RBAC",
                  link: "/registry/technical/adr/005-db-driven-project-rbac",
                },
                {
                  text: "006 — Flyway + Trigram Search",
                  link: "/registry/technical/adr/006-flyway-trigram-search",
                },
                {
                  text: "007 — Inverted Adapter Naming",
                  link: "/registry/technical/adr/007-inverted-adapter-naming",
                },
                {
                  text: "008 — Frontend Runtime Config",
                  link: "/registry/technical/adr/008-frontend-runtime-config",
                },
                {
                  text: "009 — NGXS State Management",
                  link: "/registry/technical/adr/009-ngxs-state-management",
                },
                {
                  text: "010 — Container Delivery",
                  link: "/registry/technical/adr/010-container-delivery-semantic-release",
                },
                {
                  text: "011 — Vue 3 on Nuxt",
                  link: "/registry/technical/adr/011-vue-nuxt-frontend",
                },
                {
                  text: "012 — SSR Rendering",
                  link: "/registry/technical/adr/012-ssr-rendering",
                },
                {
                  text: "013 — Ant Design Vue",
                  link: "/registry/technical/adr/013-ant-design-vue",
                },
                {
                  text: "014 — Pinia State Management",
                  link: "/registry/technical/adr/014-pinia-state-management",
                },
                {
                  text: "015 — Accessibility (WCAG 2.2 AA)",
                  link: "/registry/technical/adr/015-accessibility",
                },
                {
                  text: "017 — API v2 Conventions",
                  link: "/registry/technical/adr/017-api-v2-conventions",
                },
                {
                  text: "018 — Backend Caching & DB",
                  link: "/registry/technical/adr/018-backend-caching-db",
                },
                {
                  text: "019 — Backend Security Hardening",
                  link: "/registry/technical/adr/019-backend-security-hardening",
                },
                {
                  text: "020 — Frontend Observability",
                  link: "/registry/technical/adr/020-frontend-observability",
                },
                {
                  text: "021 — Test Strategy & Parity",
                  link: "/registry/technical/adr/021-test-strategy-parity",
                },
                {
                  text: "022 — SSR Auth (Full BFF)",
                  link: "/registry/technical/adr/022-ssr-auth-bff",
                },
                {
                  text: "023 — Nuxt Runtime Config",
                  link: "/registry/technical/adr/023-nuxt-runtime-config",
                },
                {
                  text: "024 — Frontend Security Headers",
                  link: "/registry/technical/adr/024-frontend-security-headers",
                },
              ],
            },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "linkedin", link: "https://www.linkedin.com/in/luc-aucoin/" },
      { icon: "gitlab", link: "https://gitlab.com/laucoin" },
      { icon: "github", link: "https://github.com/laucoin" },
    ],
  },
  }),
);
