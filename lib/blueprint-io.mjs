// Browser variant of the private repo's scripts/lib/blueprint-io.mjs —
// same resolveRef/buildByNameMap/findByTypePath/filterByTypePath logic
// (those are already framework-agnostic), but load/write work on
// ArrayBuffer/Uint8Array instead of fs paths, and takes Parser as a
// parameter instead of importing it directly (this module doesn't pin
// itself to one Parser source, e.g. esm.sh vs. a future bundled copy).

export function loadBlueprintFromBuffers(Parser, sbpBuffer, sbpcfgBuffer, name) {
  return Parser.ParseBlueprintFiles(name, sbpBuffer, sbpcfgBuffer, { throwErrors: true });
}

export function writeBlueprintToBuffers(Parser, blueprint) {
  let mainFileHeader;
  const chunks = [];
  const result = Parser.WriteBlueprintFiles(blueprint, h => { mainFileHeader = h; }, c => chunks.push(c));
  const totalLen = mainFileHeader.byteLength + chunks.reduce((s, c) => s + c.byteLength, 0);
  const sbp = new Uint8Array(totalLen);
  sbp.set(new Uint8Array(mainFileHeader), 0);
  let offset = mainFileHeader.byteLength;
  for (const c of chunks) { sbp.set(new Uint8Array(c), offset); offset += c.byteLength; }
  return { sbp, sbpcfg: new Uint8Array(result.configFileBinary) };
}

export function buildByNameMap(blueprint) {
  return new Map(blueprint.objects.map(o => [o.instanceName, o]));
}

export function findByTypePath(blueprint, typePathOrPredicate) {
  const pred = typeof typePathOrPredicate === 'function'
    ? typePathOrPredicate
    : o => o.typePath === typePathOrPredicate;
  return blueprint.objects.find(pred);
}

export function filterByTypePath(blueprint, typePathOrPredicate) {
  const pred = typeof typePathOrPredicate === 'function'
    ? typePathOrPredicate
    : o => o.typePath === typePathOrPredicate;
  return blueprint.objects.filter(pred);
}

export function resolveRef(blueprint, obj, propName, byNameMap) {
  const ref = obj.properties[propName];
  if (!ref) return undefined;
  const map = byNameMap ?? buildByNameMap(blueprint);
  return map.get(ref.value.pathName);
}
