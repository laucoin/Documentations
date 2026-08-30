---
layout: page
editLink: false
lastUpdated: false
---

<div class="portal-container">

  <header class="portal-header">
    <h1 class="portal-title">Luc's Projects Portal</h1>
    <p class="portal-subtitle">Select a project's ecosystem below to view its documentation. You can also view my resume by clicking below ⬇️.</p>
    <a class="link-brand" href="/resume">Luc Aucoin Resume</a>
  </header>

  <div class="portal-grid">
    <!-- Ponos -->
    <div class="card card--portal">
      <div class="card-icon">🛠️</div>
      <div class="card-body">
        <h3 class="card-title">Ponos (Mac Bootstrap)</h3>
        <p class="card-description">Reproducible macOS developer environment as code: one idempotent script for Homebrew packages, symlinked dotfiles, language toolchains, Git governance, and a set of developer CLI helpers.</p>
        <div class="card-actions">
          <a href="/ponos/" class="btn btn--primary">Documentation →</a>
        </div>
      </div>
    </div>
    <!-- Atlas -->
    <div class="card card--portal">
      <div class="card-icon">🛰️</div>
      <div class="card-body">
        <h3 class="card-title">Atlas (Personal Server)</h3>
        <p class="card-description">A single hardened Debian server described entirely in Ansible: ingress and single sign-on, a container registry, home automation, object storage, observability and backups — deliberately built without an orchestrator.</p>
        <div class="card-actions">
          <a href="/atlas/" class="btn btn--primary">Documentation →</a>
        </div>
      </div>
    </div>
    <!-- Registry -->
    <div class="card card--portal">
      <div class="card-icon">📋</div>
      <div class="card-body">
        <h3 class="card-title">Registry (Presence Platform)</h3>
        <p class="card-description">Multi-tenant participant &amp; event registry: register people, organize groups, record check-in/out movements, and track live presence — behind SSO with fine-grained, per-event permissions.</p>
        <div class="card-actions">
          <a href="https://registry.sgdf.fr" target="_blank" class="btn btn--alt">Explore</a>
          <a href="/registry/" class="btn btn--primary">Documentation →</a>
        </div>
      </div>
    </div>
  </div>

  <footer class="portal-footer">
    <p class="portal-footer-text">This portal was built with <a class="link-brand" target="_blank" href="https://vitepress.dev/">VitePress</a>. You can checkout the repository <a class="link-brand" target="_blank" href="https://github.com/laucoin/Documentations">here</a>.</p>
  </footer>

</div>

<style scoped>
/* =============================================
   OBJECTS — structure (layout, shape, spacing)
   ============================================= */

.portal-container {
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px;
}

.portal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  margin-bottom: 48px;
}

.portal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* Card: structural base object */
.card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  padding: 28px;
}

.card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  padding-top: 20px;
}

/* Button: structural base object */
.btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none !important;
  transition: all 0.2s ease;
  cursor: pointer;
}

.portal-footer {
  margin-top: 48px;
  text-align: center;
}

/* =============================================
   SKINS — visual decoration (colors, borders)
   ============================================= */

.portal-title {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.portal-subtitle {
  font-size: 1.2rem;
  color: var(--vp-c-text-2);
  margin-top: 12px;
  max-width: 600px;
}

/* Portal card skin */
.card--portal {
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-bg-alt);
  height: 100%;
  transition: border-color 0.3s ease;
}

.card--portal:hover {
  border-color: var(--vp-c-brand-soft);
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 16px;
}

.card-title {
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
}

.card-description {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* Primary button skin */
.btn--primary {
  background-color: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
  border: 1px solid var(--vp-button-brand-border);
}

.btn--primary:hover {
  background-color: var(--vp-button-brand-hover-bg);
  color: var(--vp-button-brand-hover-text);
  border-color: var(--vp-button-brand-hover-border);
}

/* Alt button skin */
.btn--alt {
  background-color: var(--vp-button-alt-bg);
  color: var(--vp-button-alt-text);
  border: 1px solid var(--vp-button-alt-border);
}

.btn--alt:hover {
  background-color: var(--vp-button-alt-hover-bg);
  color: var(--vp-button-alt-hover-text);
  border-color: var(--vp-button-alt-hover-border);
}

/* Brand link */
.link-brand {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: color 0.2s ease;
}

.link-brand:hover {
  color: var(--vp-c-brand-2);
}

.portal-footer-text {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  max-width: 600px;
  margin: 0 auto;
}
</style>
