<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

// Lightbox state
const open = ref(false);
const svgMarkup = ref("");
const scale = ref(1);
const tx = ref(0);
const ty = ref(0);

let dragging = false;
let startX = 0;
let startY = 0;
let observer: MutationObserver | null = null;

const MIN_SCALE = 0.5;
const MAX_SCALE = 8;

function resetView() {
  scale.value = 1;
  tx.value = 0;
  ty.value = 0;
}

function openZoom(svg: SVGElement) {
  // Clone so we don't detach the diagram from the page.
  const clone = svg.cloneNode(true) as SVGElement;
  clone.removeAttribute("style");
  clone.style.maxWidth = "none";
  clone.style.maxHeight = "none";
  clone.style.width = "auto";
  clone.style.height = "auto";
  svgMarkup.value = clone.outerHTML;
  resetView();
  open.value = true;
  document.documentElement.classList.add("mermaid-zoom-lock");
}

function close() {
  open.value = false;
  svgMarkup.value = "";
  document.documentElement.classList.remove("mermaid-zoom-lock");
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value * factor));
}

function onPointerDown(e: PointerEvent) {
  dragging = true;
  startX = e.clientX - tx.value;
  startY = e.clientY - ty.value;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return;
  tx.value = e.clientX - startX;
  ty.value = e.clientY - startY;
}

function onPointerUp() {
  dragging = false;
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return;
  if (e.key === "Escape") close();
  if (e.key === "+" || e.key === "=") scale.value = Math.min(MAX_SCALE, scale.value * 1.15);
  if (e.key === "-") scale.value = Math.max(MIN_SCALE, scale.value / 1.15);
  if (e.key === "0") resetView();
}

// Mark rendered mermaid diagrams as clickable. Mermaid renders asynchronously
// and VitePress swaps page content on navigation, so we watch the DOM.
function wireDiagrams() {
  const nodes = document.querySelectorAll<HTMLElement>(".mermaid");
  nodes.forEach((el) => {
    const svg = el.querySelector("svg");
    if (!svg || el.dataset.zoomWired === "true") return;
    el.dataset.zoomWired = "true";
    el.classList.add("mermaid-zoomable");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("title", "Click to zoom");
    el.addEventListener("click", () => {
      const target = el.querySelector("svg");
      if (target) openZoom(target as unknown as SVGElement);
    });
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        const target = el.querySelector("svg");
        if (target) openZoom(target as unknown as SVGElement);
      }
    });
  });
}

onMounted(() => {
  wireDiagrams();
  observer = new MutationObserver(() => wireDiagrams());
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  observer?.disconnect();
  window.removeEventListener("keydown", onKeydown);
  document.documentElement.classList.remove("mermaid-zoom-lock");
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mermaid-zoom-overlay" @click.self="close">
      <div class="mermaid-zoom-toolbar">
        <button type="button" title="Zoom out" @click="scale = Math.max(MIN_SCALE, scale / 1.15)">−</button>
        <button type="button" title="Reset" @click="resetView">⤢</button>
        <button type="button" title="Zoom in" @click="scale = Math.min(MAX_SCALE, scale * 1.15)">+</button>
        <button type="button" title="Close (Esc)" @click="close">✕</button>
      </div>
      <div
        class="mermaid-zoom-stage"
        @wheel="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div
          class="mermaid-zoom-content"
          :style="{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }"
          v-html="svgMarkup"
        />
      </div>
    </div>
  </Teleport>
</template>
