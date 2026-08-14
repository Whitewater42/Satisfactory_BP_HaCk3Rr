// Elevator Designer tab: parametric floor list -> a custom elevator
// blueprint. Floor-list controls port the existing private-repo mockup's
// design. The graphical side panel (wall/foundation/floor-stop tiles from
// user-supplied screenshots) is a placeholder here until those image files
// are actually supplied - see CHATBCK/notes.md / the build plan for why.
import { fetchArrayBuffer } from '../lib/fetchHelpers.mjs';
import { loadBlueprintFromBuffers, writeBlueprintToBuffers, findByTypePath } from '../lib/blueprint-io.mjs';
import { makeFree } from '../lib/itemCosts.mjs';
import { downloadBlueprintPair } from '../lib/download.mjs';
import {
  ELEVATOR_TYPEPATH, setFloors, BIG_WALL_M,
  RECOMMENDED_MAX_FLOORS, RECOMMENDED_MAX_HEIGHT_M, HARD_ALTITUDE_CEILING_M,
} from '../lib/elevator.mjs';

const TEMPLATE_SBP_URL = '../templates/Elevator Smallest.sbp';
const TEMPLATE_SBPCFG_URL = '../templates/Elevator Smallest.sbpcfg';

export function render(container, Parser) {
  container.innerHTML = '';

  const state = {
    groundFloorName: 'Ground Floor',
    floors: [
      { id: 1, name: 'Floor 2', value: 3, unit: 'wall' },
    ],
    nextId: 2,
  };

  const layout = document.createElement('div');
  layout.className = 'elevator-layout';
  container.appendChild(layout);

  const controlsCol = document.createElement('div');
  controlsCol.className = 'elevator-controls';
  layout.appendChild(controlsCol);

  const graphicCol = document.createElement('div');
  graphicCol.className = 'elevator-graphic card';
  graphicCol.innerHTML = `
    <div class="kit-title">Shaft preview</div>
    <p class="muted">A graphical side view (walls stacked between floor stops, matching real building tiles) is coming soon - it's blocked on reference screenshots being added to this site's assets, not on anything else in this tab.</p>
  `;
  layout.appendChild(graphicCol);

  const floorsCard = document.createElement('div');
  floorsCard.className = 'card';
  controlsCol.appendChild(floorsCard);

  const warningsWrap = document.createElement('div');
  controlsCol.appendChild(warningsWrap);

  const footer = document.createElement('div');
  footer.className = 'kit-footer';
  const genBtn = document.createElement('button');
  genBtn.type = 'button';
  genBtn.className = 'btn btn-primary';
  genBtn.textContent = 'Generate & download';
  footer.appendChild(genBtn);
  const status = document.createElement('span');
  status.className = 'status';
  footer.appendChild(status);
  controlsCol.appendChild(footer);

  function heightMOf(floor) {
    return floor.unit === 'wall' ? floor.value * BIG_WALL_M : floor.value;
  }

  function renderFloorsCard() {
    floorsCard.innerHTML = '<div class="kit-title">Floors</div>';

    const header = document.createElement('div');
    header.className = 'floor-row floor-row-header';
    header.innerHTML = '<span>Name</span><span>Height</span><span>Unit</span><span>= meters</span><span></span>';
    floorsCard.appendChild(header);

    const groundRow = document.createElement('div');
    groundRow.className = 'floor-row';
    groundRow.innerHTML = `
      <input class="input" value="${escapeAttr(state.groundFloorName)}">
      <input class="input" type="number" value="0" disabled>
      <span class="muted">m</span>
      <span class="muted">0 m</span>
      <span></span>
    `;
    groundRow.querySelector('input:not([disabled])').addEventListener('change', e => { state.groundFloorName = e.target.value; });
    floorsCard.appendChild(groundRow);

    for (const floor of state.floors) {
      const row = document.createElement('div');
      row.className = 'floor-row';
      const heightM = heightMOf(floor);
      let heightColor = 'var(--color-text)';
      if (heightM >= HARD_ALTITUDE_CEILING_M) heightColor = 'var(--color-danger)';
      else if (heightM > RECOMMENDED_MAX_HEIGHT_M) heightColor = 'var(--color-accent)';

      row.innerHTML = `
        <input class="input floor-name" value="${escapeAttr(floor.name)}">
        <input class="input floor-value" type="number" min="0" value="${floor.value}">
        <select class="input floor-unit">
          <option value="m" ${floor.unit === 'm' ? 'selected' : ''}>m</option>
          <option value="wall" ${floor.unit === 'wall' ? 'selected' : ''}>wall</option>
        </select>
        <span style="color:${heightColor}; font-variant-numeric: tabular-nums;">${heightM} m</span>
        <button type="button" class="btn btn-ghost btn-sm floor-remove" aria-label="Remove floor">×</button>
      `;
      row.querySelector('.floor-name').addEventListener('change', e => { floor.name = e.target.value; });
      row.querySelector('.floor-value').addEventListener('change', e => {
        floor.value = Math.max(0, Number(e.target.value) || 0);
        renderFloorsCard();
        renderWarnings();
      });
      row.querySelector('.floor-unit').addEventListener('change', e => {
        floor.unit = e.target.value;
        renderFloorsCard();
        renderWarnings();
      });
      row.querySelector('.floor-remove').addEventListener('click', () => {
        state.floors = state.floors.filter(f => f.id !== floor.id);
        renderFloorsCard();
        renderWarnings();
      });
      floorsCard.appendChild(row);
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-secondary';
    addBtn.textContent = '+ Add floor';
    addBtn.addEventListener('click', () => {
      state.floors.push({ id: state.nextId++, name: `Floor ${state.floors.length + 2}`, value: 3, unit: 'wall' });
      renderFloorsCard();
      renderWarnings();
    });
    floorsCard.appendChild(addBtn);

    const totalRow = document.createElement('div');
    totalRow.className = 'elevator-total';
    const topM = state.floors.length ? Math.max(...state.floors.map(heightMOf)) : 0;
    totalRow.innerHTML = `<span>Total elevator height</span><span class="elevator-total-value">${topM} m</span>`;
    floorsCard.appendChild(totalRow);
  }

  function renderWarnings() {
    warningsWrap.innerHTML = '';
    if (state.floors.length === 0) return;
    const topM = Math.max(...state.floors.map(heightMOf));
    const count = state.floors.length + 1; // + ground floor

    if (count > RECOMMENDED_MAX_FLOORS) {
      warningsWrap.appendChild(warningCard(
        `${count} floors exceeds the confirmed-safe ${RECOMMENDED_MAX_FLOORS}-floor ceiling — the native floor-stop picker UI has exactly 25 squares; 26+ has reproducibly crashed the game on placement in testing.`,
        'warn'
      ));
    }
    if (topM >= HARD_ALTITUDE_CEILING_M) {
      warningsWrap.appendChild(warningCard(
        `Top floor ${topM}m is at/past the HARD altitude damage-over-time ceiling (${HARD_ALTITUDE_CEILING_M}m) — a player standing at the top WILL take lethal damage. This is a real, confirmed game mechanic.`,
        'danger'
      ));
    } else if (topM > RECOMMENDED_MAX_HEIGHT_M) {
      warningsWrap.appendChild(warningCard(
        `Top floor ${topM}m exceeds the typical/practical default (${RECOMMENDED_MAX_HEIGHT_M}m, covers the tallest normal map terrain) — not a real limit, just an unusually tall request.`,
        'warn'
      ));
    }
  }

  function warningCard(text, kind) {
    const el = document.createElement('div');
    el.className = 'card warning-card ' + kind;
    el.textContent = text;
    return el;
  }

  renderFloorsCard();
  renderWarnings();

  genBtn.addEventListener('click', async () => {
    if (state.floors.length === 0) { setStatus(status, 'Add at least one floor.', 'err'); return; }
    genBtn.disabled = true;
    setStatus(status, 'Building shaft…', 'busy');
    try {
      const [sbpBuf, sbpcfgBuf] = await Promise.all([
        fetchArrayBuffer(TEMPLATE_SBP_URL),
        fetchArrayBuffer(TEMPLATE_SBPCFG_URL),
      ]);
      const blueprint = loadBlueprintFromBuffers(Parser, sbpBuf, sbpcfgBuf, 'Elevator');
      const elevator = findByTypePath(blueprint, ELEVATOR_TYPEPATH);

      const floorSpecs = [
        { name: state.groundFloorName, heightM: 0 },
        ...state.floors.map(f => ({ name: f.name, heightM: heightMOf(f) })),
      ];
      const { floorCount, topM, warnings } = setFloors(blueprint, elevator, floorSpecs);
      makeFree(blueprint);

      const { sbp, sbpcfg } = writeBlueprintToBuffers(Parser, blueprint);
      downloadBlueprintPair(sbp, sbpcfg, 'Elevator');

      setStatus(status, `Done — ${floorCount} floors, top ${topM}m, downloaded both files.${warnings.length ? ' (see warnings above)' : ''}`, 'ok');
    } catch (err) {
      console.error(err);
      setStatus(status, 'Failed: ' + err.message, 'err');
    } finally {
      genBtn.disabled = false;
    }
  });
}

function escapeAttr(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setStatus(el, text, kind) {
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}
