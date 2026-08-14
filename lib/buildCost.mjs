// Resolves a placed buildable's REAL construction cost directly from its own
// `mBuiltWithRecipe` reference - every real buildable object carries this
// (confirmed present and matching header.itemCosts exactly across several
// real blueprints in the private repo's scripts/spikes/verify_buildcost_
// resolver.mjs, including catching the exact case this project already
// flagged as a risk: Build_PowerPoleWall_Mk3_C's placed class doesn't match
// its recipe's naive Desc_ product name via the old Build_->Desc_ transform
// - reading the recipe straight off the object sidesteps that guess
// entirely). Known gap (also present in the private-repo version): variable-
// length buildables (conveyor belts/pipes/power lines) whose real cost
// scales with length aren't fully captured this way on complex blueprints -
// not a concern for this tab's actual category list (signs, lighting, power
// poles, storage, etc., none of which are length-variable).
export function resolveBuildCost(recipeIndexByPath, obj) {
  const recipeRef = obj.properties?.mBuiltWithRecipe?.value?.pathName;
  if (!recipeRef) return { ingredients: [], resolved: false };
  const recipe = recipeIndexByPath.get(recipeRef);
  if (!recipe) return { ingredients: [], resolved: false };
  return { ingredients: recipe.ingredients.map(i => ({ path: i.path, amount: i.amount })), resolved: true };
}

// Computes the itemCosts entries needed to keep every buildable NOT in
// `freeTypePaths` costed at its real construction price - the "isolated
// cost of everything not freed" technique from itemCosts.mjs's
// isolateToEntries, computed per-instance from each object's own recipe.
export function computeRemainingCostEntries(recipeIndexByPath, blueprint, freeTypePaths) {
  const totals = new Map();
  const unresolvedTypePaths = [];
  for (const obj of blueprint.objects) {
    if (!obj.typePath || !obj.typePath.startsWith('/Game/')) continue;
    if (freeTypePaths.has(obj.typePath)) continue;
    const { ingredients, resolved } = resolveBuildCost(recipeIndexByPath, obj);
    if (!resolved) { unresolvedTypePaths.push(obj.typePath); continue; }
    for (const ing of ingredients) {
      totals.set(ing.path, (totals.get(ing.path) ?? 0) + ing.amount);
    }
  }
  return { entries: [...totals.entries()], unresolvedTypePaths };
}

// Computes real itemCosts entries but filtered down to only the ingredient
// item paths in `keepItemPaths` - the "Basic materials only" mode: instead
// of freeing/costing whole buildables, every buildable's real cost is
// summed as usual but only the matching ingredient TYPES survive into the
// output (e.g. keep Iron Plate/Wire/Concrete/etc. real, everything else -
// every other ingredient of every buildable - free).
export function computeFilteredCostEntries(recipeIndexByPath, blueprint, keepItemPaths) {
  const totals = new Map();
  const unresolvedTypePaths = [];
  for (const obj of blueprint.objects) {
    if (!obj.typePath || !obj.typePath.startsWith('/Game/')) continue;
    const { ingredients, resolved } = resolveBuildCost(recipeIndexByPath, obj);
    if (!resolved) { unresolvedTypePaths.push(obj.typePath); continue; }
    for (const ing of ingredients) {
      if (!keepItemPaths.has(ing.path)) continue;
      totals.set(ing.path, (totals.get(ing.path) ?? 0) + ing.amount);
    }
  }
  return { entries: [...totals.entries()], unresolvedTypePaths };
}
