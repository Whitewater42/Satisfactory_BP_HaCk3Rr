// "BP.Pre-Loaded" ingredient picker — reads every production machine's
// assigned recipe and lets the caller pre-load full free stacks of chosen
// ingredient types. Mechanism confirmed in the private repo's
// Fill_Us_Test_FILLED.sbp / AssMan_Test_FILLED.sbp: mCurrentRecipe is a
// plain ObjectProperty holding the RECIPE'S OWN CLASS PATH directly (not an
// in-blueprint instance reference, unlike mStorageInventory/mInputInventory
// which resolve via instanceName) - so it's usable as a recipe-index lookup
// key with no buildByNameMap resolution needed. mInputInventory IS an
// instance reference and does need that resolution. Slot index N = Nth
// ingredient listed in the recipe (confirmed in-game on both single-slot
// Constructors and multi-slot Assembler/Manufacturer).
import { resolveRef, buildByNameMap } from './blueprint-io.mjs';
import { makeStack, inventoryStacksProperty, emptyStack } from './properties.mjs';

export function buildRecipeIndexByPath(recipesTrimmed) {
  return new Map(recipesTrimmed.map(r => [r.recipePath, r]));
}

// Returns [{ machineObj, inputInv, recipe }] for every object in the
// blueprint that has a resolvable mCurrentRecipe + mInputInventory.
export function findRecipeMachines(blueprint, recipeIndexByPath) {
  const byName = buildByNameMap(blueprint);
  const machines = [];
  for (const obj of blueprint.objects) {
    const recipeRef = obj.properties.mCurrentRecipe;
    if (!recipeRef) continue;
    const recipe = recipeIndexByPath.get(recipeRef.value.pathName);
    if (!recipe) continue;
    const inputInv = resolveRef(blueprint, obj, 'mInputInventory', byName);
    if (!inputInv) continue;
    machines.push({ machineObj: obj, inputInv, recipe });
  }
  return machines;
}

// Distinct ingredient types across all found machines, with how many
// machines use each - the checklist data for the UI.
export function collectDistinctIngredients(machines) {
  const byPath = new Map();
  for (const { recipe } of machines) {
    for (const ing of recipe.ingredients) {
      const entry = byPath.get(ing.path) ?? { path: ing.path, name: ing.name, stackSize: ing.stackSize, machineCount: 0 };
      entry.machineCount++;
      byPath.set(ing.path, entry);
    }
  }
  return [...byPath.values()];
}

// Fills every machine's slot(s) for each selected ingredient path to a full
// free stack, leaving slots for unselected ingredient types untouched (per
// the Phase 5 spec: fill regardless of starting state, but only for checked
// types). Creates mInventoryStacks fresh (sized to the recipe's ingredient
// count) if the component has never been touched before.
export function fillSelectedIngredients(machines, selectedPaths) {
  for (const { inputInv, recipe } of machines) {
    if (!inputInv.properties.mInventoryStacks) {
      inputInv.properties.mInventoryStacks = inventoryStacksProperty(
        recipe.ingredients.map(() => emptyStack())
      );
    }
    const slots = inputInv.properties.mInventoryStacks.values;
    recipe.ingredients.forEach((ing, i) => {
      if (!selectedPaths.has(ing.path)) return;
      while (slots.length <= i) slots.push(emptyStack());
      slots[i] = makeStack(ing.path, ing.stackSize);
    });
  }
}
