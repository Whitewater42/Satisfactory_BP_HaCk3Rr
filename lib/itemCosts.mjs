// Ported verbatim from the private repo's scripts/lib/itemCosts.mjs.
// header.itemCosts is a fixed manifest computed once by the game when a
// blueprint is captured in-game — it is NEVER recalculated from the
// blueprint's actual object/inventory data, which is why these techniques
// work at all. No Node dependency, no changes needed for the browser.
import { itemRef } from './properties.mjs';

export function makeFree(blueprint) {
  blueprint.header.itemCosts = [];
}

export function stripPaths(blueprint, paths) {
  const pathSet = new Set(paths);
  blueprint.header.itemCosts = blueprint.header.itemCosts.filter(([ref]) => !pathSet.has(ref.pathName));
}

export function isolateToEntries(blueprint, entries) {
  blueprint.header.itemCosts = entries.map(([pathName, count]) => [itemRef(pathName), count]);
}

export function summarize(blueprint) {
  return blueprint.header.itemCosts.map(([ref, count]) => [ref.pathName.split('/').pop(), count]);
}
