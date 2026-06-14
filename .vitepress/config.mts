import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "documentation",

  title: "Luc’s projects",
  description: "Here a multi-project documentation about Luc’s personal works.",
  rewrites: {
    "../packages/project-a/docs/:page*": "project-a/:page*",
    "../packages/project-b/docs/:page*": "project-b/:page*",
  },
  themeConfig: {
    footer: {
      copyright: `© ${new Date().getFullYear()} Luc Aucoin. Unless otherwise stated, the content of this site is made available under the terms of the CC BY-NC-ND 4.0 license.`,
    },
    search: {
      provider: "local",
    },
    sidebar: {
      "/project-a/": [
        { text: "Introduction", link: "/project-a/" },
        {
          text: "Functional",
          collapsed: false,
          items: [
            { text: "Overview", link: "/project-a/functional/" },
          ],
        },
        {
          text: "Technical",
          collapsed: false,
          items: [
            { text: "Overview", link: "/project-a/technical/" },
          ],
        },
      ],
      "/project-b/": [
        { text: "Introduction", link: "/project-b/" },
        {
          text: "Functional",
          collapsed: false,
          items: [
            { text: "Overview", link: "/project-b/functional/" },
          ],
        },
        {
          text: "Technical",
          collapsed: false,
          items: [
            { text: "Overview", link: "/project-b/technical/" },
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
