// Raw SaveGame property builders — ported verbatim from the private repo's
// scripts/lib/properties.mjs (already framework/Node-agnostic, no changes
// needed for the browser).

export function floatProp(name, value) {
  return { type: 'FloatProperty', name, propertyTagType: { name: 'FloatProperty', children: [] }, value };
}

export function intProp(name, value) {
  return { type: 'IntProperty', name, propertyTagType: { name: 'IntProperty', children: [] }, value };
}

export function emptyStack() {
  return {
    type: 'InventoryStack',
    properties: {
      Item: {
        type: 'StructProperty',
        name: 'Item',
        propertyTagType: {
          name: 'StructProperty',
          children: [{ name: 'InventoryItem', children: [{ name: '/Script/FactoryGame', children: [] }] }]
        },
        flags: 8,
        value: { itemReference: { levelName: '', pathName: '' }, itemState: { hasValidStruct: false } }
      },
      NumItems: {
        type: 'IntProperty',
        name: 'NumItems',
        propertyTagType: { name: 'IntProperty', children: [] },
        value: 0
      }
    }
  };
}

export function makeStack(pathName, count) {
  const s = emptyStack();
  s.properties.Item.value.itemReference.pathName = pathName;
  s.properties.NumItems.value = count;
  return s;
}

export function inventoryStacksProperty(stacks) {
  return {
    type: 'ArrayProperty',
    name: 'mInventoryStacks',
    propertyTagType: {
      name: 'ArrayProperty',
      children: [{ name: 'StructProperty', children: [{ name: 'InventoryStack', children: [{ name: '/Script/FactoryGame', children: [] }] }] }]
    },
    values: stacks
  };
}

export function itemRef(pathName, levelName = '') {
  return { levelName, pathName };
}

export function strProp(name, value) {
  return { type: 'StrProperty', name, propertyTagType: { name: 'StrProperty', children: [] }, value };
}

export function objectProp(name, ref) {
  return { type: 'ObjectProperty', name, propertyTagType: { name: 'ObjectProperty', children: [] }, value: ref };
}

export function structProp(name, structName, namespace, value) {
  return {
    type: 'StructProperty',
    name,
    propertyTagType: {
      name: 'StructProperty',
      children: [{ name: structName, children: [{ name: namespace, children: [] }] }]
    },
    flags: 8,
    value
  };
}
