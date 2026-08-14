// Ported verbatim from the private repo's scripts/lib/elevator.mjs — the
// parametric elevator generator. No Node dependency, no changes needed for
// the browser beyond importing findByTypePath from the browser blueprint-io.
import { strProp, intProp, floatProp, objectProp, structProp, itemRef } from './properties.mjs';
import { findByTypePath } from './blueprint-io.mjs';

export const ELEVATOR_TYPEPATH = '/Game/FactoryGame/Buildable/Factory/Elevator/Build_Elevator.Build_Elevator_C';
export const FLOORSTOP_TYPEPATH = '/Game/FactoryGame/Buildable/Factory/Elevator/Build_ElevatorFloorStop.Build_ElevatorFloorStop_C';

export const BIG_WALL_M = 4;
export const ELEVATOR_HEIGHT_CAP_CM = 400;
export const NATIVE_MIN_SPAN_M = 5;
export const NATIVE_MAX_SPAN_M = 196;

export const HARD_ALTITUDE_CEILING_M = 1997;
export const RECOMMENDED_MAX_HEIGHT_M = 500;
export const RECOMMENDED_MAX_FLOORS = 25;

function cloneJson(x) { return JSON.parse(JSON.stringify(x)); }

function nextObjectId(blueprint) {
  let max = 0;
  for (const o of blueprint.objects) {
    for (const m of o.instanceName.matchAll(/_(\d{6,})/g)) {
      max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return max + 1;
}

function floorStopInfo(floorStopInstanceName, floorName) {
  return {
    type: 'ElevatorFloorStopInfo',
    properties: {
      FloorStop: objectProp('FloorStop', itemRef(floorStopInstanceName, 'Persistent_Level')),
      FloorName: strProp('FloorName', floorName),
      IconID: intProp('IconID', -1),
      IconColor: structProp('IconColor', 'LinearColor', '/Script/CoreUObject', { r: 1, g: 1, b: 1, a: 1 }),
      lastEditedBy: structProp('lastEditedBy', 'PlayerInfoHandle', '/Script/FactoryGame', { serviceProvider: 0, playerInfoTableIndex: -1 }),
    }
  };
}

export function addFloorStop(blueprint, elevator, floorMeters, floorName) {
  const template = findByTypePath(blueprint, FLOORSTOP_TYPEPATH);
  if (!template) throw new Error('addFloorStop: no existing Build_ElevatorFloorStop_C in this blueprint to clone');
  const templatePowerInput = blueprint.objects.find(o => o.parentEntityName === template.instanceName);

  const newId = nextObjectId(blueprint);
  const newInstanceName = `Persistent_Level:PersistentLevel.Build_ElevatorFloorStop_C_${newId}`;

  const newFloorStop = cloneJson(template);
  newFloorStop.instanceName = newInstanceName;
  newFloorStop.transform = cloneJson(elevator.transform);
  newFloorStop.transform.translation.z = elevator.transform.translation.z + floorMeters * 100;
  newFloorStop.components = templatePowerInput
    ? [{ levelName: 'Persistent_Level', pathName: `${newInstanceName}.PowerInput` }]
    : [];
  blueprint.objects.push(newFloorStop);

  if (templatePowerInput) {
    const newPowerInput = cloneJson(templatePowerInput);
    newPowerInput.instanceName = `${newInstanceName}.PowerInput`;
    newPowerInput.parentEntityName = newInstanceName;
    blueprint.objects.push(newPowerInput);
  }

  elevator.properties.mFloorStopInfos.values.push(floorStopInfo(newInstanceName, floorName));
  return newInstanceName;
}

export function repositionFloorStop(blueprint, elevator, floorInfoIndex, floorMeters, floorName) {
  const info = elevator.properties.mFloorStopInfos.values[floorInfoIndex];
  const floorStopObj = blueprint.objects.find(o => o.instanceName === info.properties.FloorStop.value.pathName);
  floorStopObj.transform.translation.z = elevator.transform.translation.z + floorMeters * 100;
  info.properties.FloorName.value = floorName;
}

export function setElevatorHeight(elevator, topFloorMeters) {
  elevator.properties.mHeight = floatProp('mHeight', topFloorMeters * 100 + ELEVATOR_HEIGHT_CAP_CM);
}

export function removeFloorStop(blueprint, elevator, floorInfoIndex) {
  const info = elevator.properties.mFloorStopInfos.values[floorInfoIndex];
  const floorStopName = info.properties.FloorStop.value.pathName;
  const componentNames = new Set(
    (blueprint.objects.find(o => o.instanceName === floorStopName)?.components ?? [])
      .map(c => c.pathName)
  );
  blueprint.objects = blueprint.objects.filter(o =>
    o.instanceName !== floorStopName && !componentNames.has(o.instanceName));
  elevator.properties.mFloorStopInfos.values.splice(floorInfoIndex, 1);
}

function resolveHeightM(floor) {
  if (floor.heightM !== undefined) return floor.heightM;
  if (floor.heightWalls !== undefined) return floor.heightWalls * BIG_WALL_M;
  throw new Error(`setFloors: floor "${floor.name}" needs either heightM or heightWalls`);
}

export function setFloors(blueprint, elevator, floors) {
  if (floors.length === 0) throw new Error('setFloors: need at least one floor');
  const sorted = [...floors].sort((a, b) => resolveHeightM(a) - resolveHeightM(b));

  const existingCount = elevator.properties.mFloorStopInfos.values.length;
  for (let i = existingCount - 1; i >= sorted.length; i--) removeFloorStop(blueprint, elevator, i);

  sorted.forEach((floor, i) => {
    const heightM = resolveHeightM(floor);
    if (i < Math.min(existingCount, sorted.length)) {
      repositionFloorStop(blueprint, elevator, i, heightM, floor.name);
    } else {
      addFloorStop(blueprint, elevator, heightM, floor.name);
    }
  });

  const topM = resolveHeightM(sorted[sorted.length - 1]);
  setElevatorHeight(elevator, topM);

  const warnings = [];
  if (sorted.length > RECOMMENDED_MAX_FLOORS) {
    warnings.push(`${sorted.length} floors exceeds the confirmed-safe ${RECOMMENDED_MAX_FLOORS}-floor ceiling (the native floor-stop picker UI has exactly 25 squares; 26+ has reproducibly crashed the game on placement in testing).`);
  }
  if (topM >= HARD_ALTITUDE_CEILING_M) {
    warnings.push(`Top floor ${topM}m is at/past the HARD altitude damage-over-time ceiling (${HARD_ALTITUDE_CEILING_M}m) - a player standing at the top WILL take lethal damage. This is a real, confirmed game mechanic.`);
  } else if (topM > RECOMMENDED_MAX_HEIGHT_M) {
    warnings.push(`Top floor ${topM}m exceeds the typical/practical default (${RECOMMENDED_MAX_HEIGHT_M}m, covers the tallest normal map terrain) - not a real limit, just an unusually tall request.`);
  }

  return { floorCount: sorted.length, topM, warnings };
}
