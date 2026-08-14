// Shared "pack a shopping list into a free Personal Storage box" operation -
// used by both the Kit Generators tab (MAM/Tier/Space/Vehicle cards) and the
// Personal Equipment Kit tab, which need the same underlying mechanism but
// different UI shapes around it.
import { fetchArrayBuffer } from './fetchHelpers.mjs';
import { loadBlueprintFromBuffers, writeBlueprintToBuffers, findByTypePath, resolveRef, buildByNameMap } from './blueprint-io.mjs';
import { resizeInventory, packStacks } from './inventory.mjs';
import { makeFree } from './itemCosts.mjs';
import { itemToStackSpecs } from './kitStacking.mjs';

const TEMPLATE_SBP_URL = new URL('../templates/Personal Storage 1x Template.sbp', import.meta.url);
const TEMPLATE_SBPCFG_URL = new URL('../templates/Personal Storage 1x Template.sbpcfg', import.meta.url);

// items: [{ path, stackSize, count }]
export async function generatePersonalStorageKit(Parser, items, blueprintName) {
  const itemSpecs = items.flatMap(itemToStackSpecs);
  const targetSlots = itemSpecs.reduce((s, [, , n]) => s + n, 0);

  const [sbpBuf, sbpcfgBuf] = await Promise.all([
    fetchArrayBuffer(TEMPLATE_SBP_URL),
    fetchArrayBuffer(TEMPLATE_SBPCFG_URL),
  ]);
  const blueprint = loadBlueprintFromBuffers(Parser, sbpBuf, sbpcfgBuf, blueprintName);
  const storage = findByTypePath(blueprint, o => o.typePath?.includes('StoragePlayer'));
  const storageInv = resolveRef(blueprint, storage, 'mStorageInventory', buildByNameMap(blueprint));

  resizeInventory(storageInv, targetSlots);
  storageInv.properties.mInventoryStacks.values = packStacks(itemSpecs, targetSlots);
  makeFree(blueprint);

  const { sbp, sbpcfg } = writeBlueprintToBuffers(Parser, blueprint);
  return { sbp, sbpcfg, targetSlots };
}
