// Shared renderer for "expand a kit -> checklist -> Generate & download"
// tabs. Used by both the Kit Generators tab (MAM/Tier/Space/Vehicle) and the
// Personal Equipment Kit tab (gear + ammo/fuel) — same interaction pattern,
// same underlying technique (pack checked items into a Personal Storage box,
// free via makeFree), just different bundle data.
import { fetchJson } from '../lib/fetchHelpers.mjs';
import { downloadBlueprintPair } from '../lib/download.mjs';
import { countSlotsNeeded } from '../lib/kitStacking.mjs';
import { generatePersonalStorageKit } from '../lib/personalStorageKit.mjs';

export async function renderKitsPanel(container, bundleUrls, Parser) {
  container.innerHTML = '<p class="muted">Loading kit data…</p>';
  const bundles = await Promise.all(bundleUrls.map(url => fetchJson(url)));
  container.innerHTML = '';

  for (const bundle of bundles) {
    container.appendChild(renderKitCard(bundle, Parser));
  }
}

function renderKitCard(bundle, Parser) {
  // Fixed/pre-planned kits (e.g. Vehicle Emergency Kit) skip the item
  // picker entirely - nothing to check/uncheck, always generate everything.
  const pickable = bundle.pickable !== false;
  const checked = new Map(bundle.items.map(it => [it.path, true]));

  const card = document.createElement('div');
  card.className = 'card kit-card';

  const header = document.createElement('div');
  header.className = 'kit-header';
  header.innerHTML = `
    <div>
      <div class="kit-title">${escapeHtml(bundle.displayName)}</div>
      <p class="kit-desc">${escapeHtml(bundle.description)}</p>
    </div>
    ${pickable ? '<button type="button" class="btn btn-ghost kit-expand-btn">Show items</button>' : ''}
  `;
  card.appendChild(header);

  if (pickable) {
    let expanded = false;
    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'kit-items';
    itemsWrap.style.display = 'none';
    card.appendChild(itemsWrap);

    const controlsRow = document.createElement('div');
    controlsRow.className = 'kit-controls';
    controlsRow.innerHTML = `
      <button type="button" class="btn btn-ghost btn-sm kit-select-all">Select all</button>
      <button type="button" class="btn btn-ghost btn-sm kit-select-none">Select none</button>
    `;
    itemsWrap.appendChild(controlsRow);

    const grid = document.createElement('div');
    grid.className = 'kit-grid';
    itemsWrap.appendChild(grid);

    for (const item of bundle.items) {
      const label = document.createElement('label');
      label.className = 'kit-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.addEventListener('change', () => {
        checked.set(item.path, cb.checked);
        updateGenerateLabel();
      });
      label.appendChild(cb);
      const span = document.createElement('span');
      span.textContent = `${item.name} ×${item.count.toLocaleString()}`;
      label.appendChild(span);
      grid.appendChild(label);
    }

    header.querySelector('.kit-expand-btn').addEventListener('click', () => {
      expanded = !expanded;
      itemsWrap.style.display = expanded ? '' : 'none';
      header.querySelector('.kit-expand-btn').textContent = expanded ? 'Hide items' : 'Show items';
    });
    controlsRow.querySelector('.kit-select-all').addEventListener('click', () => {
      grid.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = true; });
      bundle.items.forEach(it => checked.set(it.path, true));
      updateGenerateLabel();
    });
    controlsRow.querySelector('.kit-select-none').addEventListener('click', () => {
      grid.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = false; });
      bundle.items.forEach(it => checked.set(it.path, false));
      updateGenerateLabel();
    });
  }

  const footer = document.createElement('div');
  footer.className = 'kit-footer';
  const genBtn = document.createElement('button');
  genBtn.type = 'button';
  genBtn.className = 'btn btn-primary';
  footer.appendChild(genBtn);
  const status = document.createElement('span');
  status.className = 'status';
  footer.appendChild(status);
  card.appendChild(footer);

  function selectedItems() {
    return bundle.items.filter(it => checked.get(it.path));
  }
  function updateGenerateLabel() {
    const sel = selectedItems();
    const slots = countSlotsNeeded(sel);
    genBtn.textContent = sel.length === 0 ? 'Select at least one item' : `Generate & download (${slots} slot${slots === 1 ? '' : 's'})`;
    genBtn.disabled = sel.length === 0;
  }
  updateGenerateLabel();

  genBtn.addEventListener('click', async () => {
    genBtn.disabled = true;
    status.textContent = 'Building…';
    status.className = 'status busy';
    try {
      const sel = selectedItems();
      const { sbp, sbpcfg, targetSlots } = await generatePersonalStorageKit(Parser, sel, bundle.id);
      downloadBlueprintPair(sbp, sbpcfg, bundle.displayName);

      status.textContent = `Done — ${targetSlots} slots, downloaded both files.`;
      status.className = 'status ok';
    } catch (err) {
      console.error(err);
      status.textContent = 'Failed: ' + err.message;
      status.className = 'status err';
    } finally {
      genBtn.disabled = false;
    }
  });

  return card;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
