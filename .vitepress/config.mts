import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "documentation",

  title: "Luc’s projects",
  description: "Here a multi-project documentation about Luc’s personal works.",
  rewrites: {
    "../packages/atlas/docs/:page*": "atlas/:page*",
  },
  themeConfig: {
    footer: {
      copyright: `© ${new Date().getFullYear()} Luc Aucoin. Unless otherwise stated, the content of this site is made available under the terms of the CC BY-NC-ND 4.0 license.`,
    },
    search: {
      provider: "local",
    },
    sidebar: {
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
    },
    socialLinks: [
      { icon: "linkedin", link: "https://www.linkedin.com/in/luc-aucoin/" },
      { icon: "gitlab", link: "https://gitlab.com/laucoin" },
      { icon: "github", link: "https://github.com/laucoin" },
    ],
  },
});
