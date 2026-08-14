// Ported verbatim from the private repo's scripts/lib/inventory.mjs — the
// CONFIRMED WORKING IN-GAME container-resize technique (all three arrays +
// mAdjustedSizeDiff move in lockstep) and stack-packing/slot-fill helpers.
// No Node dependency, no changes needed for the browser.
import { emptyStack, makeStack, intProp, inventoryStacksProperty, itemRef } from './properties.mjs';

export function resizeInventory(component, targetSlots, fill) {
  const baseSlotCount = component.properties.mInventoryStacks?.values?.length ?? 0;

  const stackAt = (i) => {
    if (fill === undefined) return emptyStack();
    const spec = typeof fill === 'function' ? fill(i) : fill;
    return spec ? makeStack(spec[0], spec[1]) : emptyStack();
  };

  component.properties.mInventoryStacks = inventoryStacksProperty(
    Array.from({ length: targetSlots }, (_, i) => stackAt(i))
  );
  component.properties.mArbitrarySlotSizes = {
    type: 'ArrayProperty',
    name: 'mArbitrarySlotSizes',
    propertyTagType: { name: 'ArrayProperty', children: [{ name: 'IntProperty', children: [] }] },
    values: new Array(targetSlots).fill(0)
  };
  component.properties.mAllowedItemDescriptors = {
    type: 'ArrayProperty',
    name: 'mAllowedItemDescriptors',
    propertyTagType: { name: 'ArrayProperty', children: [{ name: 'ObjectProperty', children: [] }] },
    values: new Array(targetSlots).fill(null).map(() => itemRef(''))
  };

  const sizeDiff = targetSlots - baseSlotCount;
  component.properties.mAdjustedSizeDiff = intProp('mAdjustedSizeDiff', sizeDiff);

  return { baseSlotCount, targetSlots, sizeDiff };
}

export function packStacks(itemSpecs, totalSlots) {
  const stacks = [];
  for (const [path, stackSize, numStacks] of itemSpecs) {
    for (let i = 0; i < numStacks; i++) stacks.push(makeStack(path, stackSize));
  }
  if (stacks.length > totalSlots) {
    throw new Error(`packStacks: ${stacks.length} stacks don't fit in ${totalSlots} slots`);
  }
  while (stacks.length < totalSlots) stacks.push(emptyStack());
  return stacks;
}

export function fillSlots(component, itemsByIndex) {
  const stacks = itemsByIndex.map(spec => spec ? makeStack(spec[0], spec[1]) : emptyStack());
  component.properties.mInventoryStacks = inventoryStacksProperty(stacks);
}
