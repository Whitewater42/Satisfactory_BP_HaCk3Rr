import { Parser } from 'https://esm.sh/@etothepii/satisfactory-file-parser@4.1.1';

// Bump this on every change so it's obvious (after a hard refresh / server
// restart) whether you're looking at the latest code or a stale cache.
const SITE_VERSION = 'v7';
document.getElementById('site-version').textContent = SITE_VERSION;

const TABS = [
  { id: 'kits', label: 'Kit Generators', mod: './tabs/kitGenerators.mjs' },
  { id: 'editor', label: 'Blueprint Editor', mod: './tabs/blueprintEditor.mjs' },
  { id: 'elevator', label: 'Elevator Designer', mod: './tabs/elevatorDesigner.mjs' },
  { id: 'equipment', label: 'Personal Equipment Kit', mod: './tabs/equipmentKit.mjs' },
];

const nav = document.getElementById('tab-nav');
const panel = document.getElementById('tab-panel');
const moduleCache = new Map();
let activeId = TABS[0].id;

function renderNav() {
  nav.innerHTML = '';
  for (const tab of TABS) {
    const a = document.createElement('a');
    a.href = '#' + tab.id;
    a.textContent = tab.label;
    a.className = 'nav-tab' + (tab.id === activeId ? ' active' : '');
    a.addEventListener('click', (e) => { e.preventDefault(); activateTab(tab.id); });
    nav.appendChild(a);
  }
}

async function activateTab(id) {
  activeId = id;
  renderNav();
  const tab = TABS.find(t => t.id === id);
  panel.innerHTML = '<p class="muted">Loading…</p>';
  try {
    let mod = moduleCache.get(tab.id);
    if (!mod) {
      mod = await import(tab.mod);
      moduleCache.set(tab.id, mod);
    }
    await mod.render(panel, Parser);
  } catch (err) {
    console.error(err);
    panel.innerHTML = `<div class="card"><p class="status err">Failed to load this tab: ${err.message}</p></div>`;
  }
}

renderNav();
activateTab(activeId);
