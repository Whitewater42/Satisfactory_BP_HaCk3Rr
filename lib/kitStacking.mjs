// Converts a bundle item's total individual-item `count` into the
// [pathName, stackSize, numStacks] triples packStacks() expects: full
// stacks of `stackSize`, plus one partial remainder stack if count isn't an
// exact multiple — same "full stacks + 1 partial remainder per item"
// convention already established for the private repo's kit builds
// (MAM_Kit.sbp / Tier_Unlock_Kit.sbp / Space_Elevator_Kit.sbp).
export function itemToStackSpecs(item) {
  const fullStacks = Math.floor(item.count / item.stackSize);
  const remainder = item.count % item.stackSize;
  const specs = [];
  if (fullStacks > 0) specs.push([item.path, item.stackSize, fullStacks]);
  if (remainder > 0) specs.push([item.path, remainder, 1]);
  return specs;
}

export function countSlotsNeeded(items) {
  return items.reduce((sum, item) => sum + itemToStackSpecs(item).length, 0);
}
