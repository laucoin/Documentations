import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { h } from "vue";
import MermaidZoom from "./MermaidZoom.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  // Render the zoom lightbox alongside the default layout so it's available
  // on every page. The component itself teleports its overlay to <body>.
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "layout-bottom": () => h(MermaidZoom),
    });
  },
} satisfies Theme;
