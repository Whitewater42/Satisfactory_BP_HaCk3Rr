// Personal Equipment Kit tab: gear + a wide variety of ammo/fuel, all free.
// Distinct from the Kit Generators tab's rendering (kitPanel.mjs) because
// this one needs category quick-select buttons (Mobility/Offence/Boom Boom,
// driven by each item's `tags` in data/bundles/equipment_kit.json) and a
// one-way Chainsaw -> Packaged Liquid Biofuel auto-check nudge, neither of
// which the generic multi-kit-card panel needs.
import { fetchJson } from '../lib/fetchHelpers.mjs';
import { downloadBlueprintPair } from '../lib/download.mjs';
import { countSlotsNeeded } from '../lib/kitStacking.mjs';
import { generatePersonalStorageKit } from '../lib/personalStorageKit.mjs';

const BUNDLE_URL = '../data/bundles/equipment_kit.json';
const CHAINSAW_NAME = 'Chainsaw';
const CHAINSAW_FUEL_NAME = 'Packaged Liquid Biofuel';

const CATEGORY_BUTTONS = [
  { tag: 'mobility', label: 'Select Mobility' },
  { tag: 'offence', label: 'Select Offence' },
  { tag: 'boomboom', label: 'Select Boom Boom' },
];

export async function render(container, Parser) {
  container.innerHTML = '<p class="muted">Loading…</p>';
  const bundle = await fetchJson(BUNDLE_URL);
  container.innerHTML = '';

  const checked = new Map(bundle.items.map(it => [it.path, true]));
  const checkboxByPath = new Map();

  const card = document.createElement('div');
  card.className = 'card kit-card';
  card.innerHTML = `
    <div class="kit-title">${escapeHtml(bundle.displayName)}</div>
    <p class="kit-desc">${escapeHtml(bundle.description)}</p>
  `;
  container.appendChild(card);

  const controlsRow = document.createElement('div');
  controlsRow.className = 'kit-controls';
  card.appendChild(controlsRow);

  const selectAllBtn = makeButton('Select all', () => setChecked(() => true));
  const selectNoneBtn = makeButton('Select none', () => setChecked(() => false));
  controlsRow.append(selectAllBtn, selectNoneBtn);
  for (const { tag, label } of CATEGORY_BUTTONS) {
    controlsRow.appendChild(makeButton(label, () => setChecked(it => (it.tags || []).includes(tag))));
  }

  const grid = document.createElement('div');
  grid.className = 'kit-grid';
  card.appendChild(grid);

  for (const item of bundle.items) {
    const label = document.createElement('label');
    label.className = 'kit-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', () => {
      checked.set(item.path, cb.checked);
      if (cb.checked && item.name === CHAINSAW_NAME) {
        // One-way nudge: turning Chainsaw on also turns the fuel on, but
        // doesn't lock it - the user can still uncheck the fuel afterward.
        const fuelCb = checkboxByPath.get(bundle.items.find(i => i.name === CHAINSAW_FUEL_NAME)?.path);
        if (fuelCb && !fuelCb.checked) {
          fuelCb.checked = true;
          checked.set(fuelCb.dataset.path, true);
        }
      }
      updateGenerateLabel();
    });
    cb.dataset.path = item.path;
    checkboxByPath.set(item.path, cb);
    label.appendChild(cb);
    const span = document.createElement('span');
    span.textContent = item.count > 1 ? `${item.name} ×${item.count.toLocaleString()}` : item.name;
    label.appendChild(span);
    grid.appendChild(label);
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

  function setChecked(predicate) {
    for (const item of bundle.items) {
      const value = predicate(item);
      checked.set(item.path, value);
      const cb = checkboxByPath.get(item.path);
      if (cb) cb.checked = value;
    }
    updateGenerateLabel();
  }

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
}

function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-ghost btn-sm';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
