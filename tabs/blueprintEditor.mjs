// Blueprint Editor tab: upload a blueprint, choose what's free (by category
// or the whole thing) and which machine ingredients to pre-load, download
// the edited pair. "Free by default" per docs/Phase5_WebUI_Spec.md's
// standing convention - everything starts checked, not opt-in.
import { fetchJson } from '../lib/fetchHelpers.mjs';
import { loadBlueprintFromBuffers, writeBlueprintToBuffers } from '../lib/blueprint-io.mjs';
import { makeFree, isolateToEntries } from '../lib/itemCosts.mjs';
import { computeRemainingCostEntries, computeFilteredCostEntries } from '../lib/buildCost.mjs';
import { buildRecipeIndexByPath, findRecipeMachines, collectDistinctIngredients, fillSelectedIngredients } from '../lib/ingredientPicker.mjs';
import { downloadBlueprintPair } from '../lib/download.mjs';

const CATALOG_URL = new URL('../data/catalog.json', import.meta.url);
const RECIPES_URL = new URL('../data/recipes_trimmed.json', import.meta.url);
const FALLBACK_SBPCFG_URL = new URL('../templates/Personal Storage 1x Template.sbpcfg', import.meta.url);

// "Basic materials only" mode - user-specified list, cross-checked against
// data/recipes_trimmed.json this session.
const BASIC_MATERIALS = [
  { name: 'Iron Plate', path: '/Game/FactoryGame/Resource/Parts/IronPlate/Desc_IronPlate.Desc_IronPlate_C' },
  { name: 'Iron Rod', path: '/Game/FactoryGame/Resource/Parts/IronRod/Desc_IronRod.Desc_IronRod_C' },
  { name: 'Reinforced Iron Plate', path: '/Game/FactoryGame/Resource/Parts/IronPlateReinforced/Desc_IronPlateReinforced.Desc_IronPlateReinforced_C' },
  { name: 'Wire', path: '/Game/FactoryGame/Resource/Parts/Wire/Desc_Wire.Desc_Wire_C' },
  { name: 'Cable', path: '/Game/FactoryGame/Resource/Parts/Cable/Desc_Cable.Desc_Cable_C' },
  { name: 'Screws', path: '/Game/FactoryGame/Resource/Parts/IronScrew/Desc_IronScrew.Desc_IronScrew_C' },
  { name: 'Concrete', path: '/Game/FactoryGame/Resource/Parts/Cement/Desc_Cement.Desc_Cement_C' },
];
const REINFORCED_IRON_PLATE_PATH = '/Game/FactoryGame/Resource/Parts/IronPlateReinforced/Desc_IronPlateReinforced.Desc_IronPlateReinforced_C';

let catalog, recipeIndexByPath;

async function ensureData() {
  if (!catalog) catalog = await fetchJson(CATALOG_URL);
  if (!recipeIndexByPath) {
    const recipes = await fetchJson(RECIPES_URL);
    recipeIndexByPath = buildRecipeIndexByPath(recipes);
  }
}

export async function render(container, Parser) {
  container.innerHTML = '<p class="muted">Loading…</p>';
  await ensureData();
  container.innerHTML = '';

  const state = {
    blueprint: null,
    baseName: '',
    categoryChecked: new Set(Object.keys(catalog.categories)), // free by default
    freeBlueprint: true, // free by default
    basicMaterialsOnly: false,
    excludeReinforcedIronPlate: false,
    machines: [],
    ingredientChecked: new Set(),
  };

  const uploadCard = document.createElement('div');
  uploadCard.className = 'card upload-card';
  uploadCard.innerHTML = `
    <p class="muted">Select a blueprint's <code>.sbp</code> file. Nothing is uploaded anywhere - this all runs locally in your browser. (Its <code>.sbpcfg</code> partner is metadata-only - description/icon/color, nothing that affects placement or cost - so it isn't needed here; the output's cosmetic info won't match your original blueprint's.)</p>
    <input type="file" class="bp-file-input" accept=".sbp">
  `;
  container.appendChild(uploadCard);

  const editArea = document.createElement('div');
  editArea.className = 'editor-area';
  editArea.style.display = 'none';
  container.appendChild(editArea);

  const status = document.createElement('div');
  status.className = 'status';
  container.appendChild(status);

  const fileInput = uploadCard.querySelector('.bp-file-input');
  fileInput.addEventListener('change', async () => {
    const sbpFile = fileInput.files?.[0];
    if (!sbpFile) { setStatus(status, 'Select a .sbp file.', 'err'); return; }

    setStatus(status, 'Reading…', 'busy');
    try {
      const sbpBuffer = await sbpFile.arrayBuffer();
      const sbpcfgBuffer = await (await fetch(FALLBACK_SBPCFG_URL)).arrayBuffer();

      state.baseName = sbpFile.name.replace(/\.sbp$/i, '');
      state.blueprint = loadBlueprintFromBuffers(Parser, sbpBuffer, sbpcfgBuffer, state.baseName);
      state.machines = findRecipeMachines(state.blueprint, recipeIndexByPath);
      state.ingredientChecked = new Set(collectDistinctIngredients(state.machines).map(i => i.path)); // free by default

      renderEditArea(editArea, state, Parser, status);
      editArea.style.display = '';
      setStatus(status, `Loaded ${sbpFile.name}.`, 'ok');
    } catch (err) {
      console.error(err);
      setStatus(status, 'Failed to read blueprint: ' + err.message, 'err');
    }
  });
}

function renderEditArea(editArea, state, Parser, status) {
  editArea.innerHTML = '';

  // Free Blueprint / Basic materials only are mutually exclusive whole-
  // blueprint cost modes (checking one unchecks the other); category
  // checkboxes are a third alternative, enabled only when neither is on.
  const freeCard = document.createElement('div');
  freeCard.className = 'card';
  freeCard.innerHTML = `
    <label class="toggle-row">
      <input type="checkbox" class="free-all-toggle" ${state.freeBlueprint ? 'checked' : ''}>
      <span><strong>Free Blueprint</strong> - make the entire blueprint free to place, regardless of category</span>
    </label>
    <label class="toggle-row">
      <input type="checkbox" class="basic-materials-toggle" ${state.basicMaterialsOnly ? 'checked' : ''}>
      <span><strong>Basic materials only</strong> - keep real quantities of Iron Plate, Iron Rod, Reinforced Iron Plate, Wire, Cable, Screws, and Concrete; everything else is free</span>
    </label>
    <label class="toggle-row toggle-row-nested">
      <input type="checkbox" class="exclude-rip-toggle" ${state.excludeReinforcedIronPlate ? 'checked' : ''} ${state.basicMaterialsOnly ? '' : 'disabled'}>
      <span>Also free Reinforced Iron Plate</span>
    </label>
  `;
  editArea.appendChild(freeCard);

  const freeAllCb = freeCard.querySelector('.free-all-toggle');
  const basicMaterialsCb = freeCard.querySelector('.basic-materials-toggle');
  const excludeRipCb = freeCard.querySelector('.exclude-rip-toggle');

  function updateCategoryDisabledState() {
    catGrid.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.disabled = state.freeBlueprint || state.basicMaterialsOnly;
    });
  }
  freeAllCb.addEventListener('change', (e) => {
    state.freeBlueprint = e.target.checked;
    if (state.freeBlueprint && state.basicMaterialsOnly) {
      state.basicMaterialsOnly = false;
      basicMaterialsCb.checked = false;
      excludeRipCb.disabled = true;
    }
    updateCategoryDisabledState();
  });
  basicMaterialsCb.addEventListener('change', (e) => {
    state.basicMaterialsOnly = e.target.checked;
    if (state.basicMaterialsOnly && state.freeBlueprint) {
      state.freeBlueprint = false;
      freeAllCb.checked = false;
    }
    excludeRipCb.disabled = !state.basicMaterialsOnly;
    updateCategoryDisabledState();
  });
  excludeRipCb.addEventListener('change', (e) => {
    state.excludeReinforcedIronPlate = e.target.checked;
  });

  // Category checkboxes
  const catCard = document.createElement('div');
  catCard.className = 'card';
  catCard.innerHTML = `
    <div class="kit-title">Free categories</div>
    <div class="kit-controls">
      <button type="button" class="btn btn-ghost btn-sm cat-select-all">Select all</button>
      <button type="button" class="btn btn-ghost btn-sm cat-select-none">Select none</button>
    </div>
  `;
  const catGrid = document.createElement('div');
  catGrid.className = 'kit-grid';
  catCard.appendChild(catGrid);
  editArea.appendChild(catCard);

  for (const [key, cat] of Object.entries(catalog.categories)) {
    const label = document.createElement('label');
    label.className = 'kit-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.categoryChecked.has(key);
    cb.disabled = state.freeBlueprint || state.basicMaterialsOnly;
    cb.addEventListener('change', () => {
      if (cb.checked) state.categoryChecked.add(key); else state.categoryChecked.delete(key);
    });
    label.appendChild(cb);
    const span = document.createElement('span');
    span.textContent = cat.displayName;
    label.appendChild(span);
    catGrid.appendChild(label);
  }

  catCard.querySelector('.cat-select-all').addEventListener('click', () => {
    catGrid.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = true; });
    Object.keys(catalog.categories).forEach(key => state.categoryChecked.add(key));
  });
  catCard.querySelector('.cat-select-none').addEventListener('click', () => {
    catGrid.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = false; });
    state.categoryChecked.clear();
  });

  freeCard.querySelector('.free-all-toggle').addEventListener('change', (e) => {
    state.freeBlueprint = e.target.checked;
    catGrid.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.disabled = state.freeBlueprint; });
    basicMaterialsCb.disabled = !state.freeBlueprint;
    excludeRipCb.disabled = !(state.freeBlueprint && state.basicMaterialsOnly);
  });

  // Ingredient picker
  const ingredients = collectDistinctIngredients(state.machines);
  const ingCard = document.createElement('div');
  ingCard.className = 'card';
  if (ingredients.length === 0) {
    ingCard.innerHTML = '<div class="kit-title">Ingredient Picker</div><p class="muted">No production machines with a recognized recipe were found in this blueprint.</p>';
  } else {
    ingCard.innerHTML = `
      <div class="kit-title">Ingredient Picker</div>
      <p class="muted">Pre-load a full free stack of each checked ingredient type into every machine that needs it (${state.machines.length} machine${state.machines.length === 1 ? '' : 's'} found).</p>
      <div class="kit-controls">
        <button type="button" class="btn btn-ghost btn-sm ing-select-all">Select all</button>
        <button type="button" class="btn btn-ghost btn-sm ing-select-none">Select none</button>
      </div>
    `;
    const ingGrid = document.createElement('div');
    ingGrid.className = 'kit-grid';
    ingCard.appendChild(ingGrid);
    for (const ing of ingredients) {
      const label = document.createElement('label');
      label.className = 'kit-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.ingredientChecked.has(ing.path);
      cb.addEventListener('change', () => {
        if (cb.checked) state.ingredientChecked.add(ing.path); else state.ingredientChecked.delete(ing.path);
      });
      label.appendChild(cb);
      const span = document.createElement('span');
      span.textContent = `${ing.name} (${ing.machineCount} machine${ing.machineCount === 1 ? '' : 's'})`;
      label.appendChild(span);
      ingGrid.appendChild(label);
    }
    ingCard.querySelector('.ing-select-all').addEventListener('click', () => {
      ingGrid.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = true; });
      ingredients.forEach(i => state.ingredientChecked.add(i.path));
    });
    ingCard.querySelector('.ing-select-none').addEventListener('click', () => {
      ingGrid.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = false; });
      ingredients.forEach(i => state.ingredientChecked.delete(i.path));
    });
  }
  editArea.appendChild(ingCard);

  // Apply & download
  const applyRow = document.createElement('div');
  applyRow.className = 'kit-footer';
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'btn btn-primary';
  applyBtn.textContent = 'Apply & download';
  applyRow.appendChild(applyBtn);
  editArea.appendChild(applyRow);

  applyBtn.addEventListener('click', () => {
    applyBtn.disabled = true;
    setStatus(status, 'Applying…', 'busy');
    try {
      if (state.ingredientChecked.size > 0) {
        fillSelectedIngredients(state.machines, state.ingredientChecked);
      }

      if (state.basicMaterialsOnly) {
        const keepPaths = new Set(
          BASIC_MATERIALS
            .filter(m => !(state.excludeReinforcedIronPlate && m.path === REINFORCED_IRON_PLATE_PATH))
            .map(m => m.path)
        );
        const { entries } = computeFilteredCostEntries(recipeIndexByPath, state.blueprint, keepPaths);
        isolateToEntries(state.blueprint, entries);
      } else if (state.freeBlueprint) {
        makeFree(state.blueprint);
      } else {
        const freeTypePaths = categoriesToTypePaths(state.categoryChecked);
        const { entries, unresolvedTypePaths } = computeRemainingCostEntries(recipeIndexByPath, state.blueprint, freeTypePaths);
        isolateToEntries(state.blueprint, entries);
        if (unresolvedTypePaths.length > 0) {
          console.warn('Could not resolve construction cost for these present typePaths (left out of the recomputed cost):', unresolvedTypePaths);
        }
      }

      const { sbp, sbpcfg } = writeBlueprintToBuffers(Parser, state.blueprint);
      downloadBlueprintPair(sbp, sbpcfg, `${state.baseName} (edited)`);
      setStatus(status, 'Done — downloaded both files.', 'ok');
    } catch (err) {
      console.error(err);
      setStatus(status, 'Failed: ' + err.message, 'err');
    } finally {
      applyBtn.disabled = false;
    }
  });
}

function categoriesToTypePaths(checkedCategoryKeys) {
  const set = new Set();
  for (const key of checkedCategoryKeys) {
    const cat = catalog.categories[key];
    if (!cat) continue;
    for (const b of cat.buildables) set.add(b.typePath);
  }
  return set;
}

function setStatus(el, text, kind) {
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}
