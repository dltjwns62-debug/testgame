import type { RTSBattleUnit } from "./rtsBattleTypes";
import type { ControlGroupIndex } from "./keyBindings";

export type { ControlGroupIndex } from "./keyBindings";

export type ControlGroupMap = Map<ControlGroupIndex, string[]>;

const CONTROL_GROUP_INDICES: readonly ControlGroupIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function createEmptyControlGroups(): ControlGroupMap {
  return new Map(CONTROL_GROUP_INDICES.map((index) => [index, []]));
}

export function cloneControlGroups(groups: ControlGroupMap): ControlGroupMap {
  return new Map(CONTROL_GROUP_INDICES.map((index) => [index, [...(groups.get(index) ?? [])]]));
}

export function getControlGroupDisplayNumber(groupIndex: ControlGroupIndex): string {
  return groupIndex === 9 ? "0" : String(groupIndex + 1);
}

export function saveControlGroup(
  groups: ControlGroupMap,
  groupIndex: ControlGroupIndex,
  selectedUnitIds: Iterable<string>,
  units: Iterable<RTSBattleUnit>,
): string[] {
  const selectedIds = new Set(selectedUnitIds);
  const selectedAllies = [...units].filter((unit) =>
    selectedIds.has(unit.battleUnitId) && unit.team === "ALLY" && unit.isAlive,
  );
  selectedAllies.sort((left, right) => {
    const leftSlot = left.slotIndex ?? Number.MAX_SAFE_INTEGER;
    const rightSlot = right.slotIndex ?? Number.MAX_SAFE_INTEGER;
    return leftSlot - rightSlot || left.battleUnitId.localeCompare(right.battleUnitId);
  });

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const unit of selectedAllies) {
    if (!seen.has(unit.battleUnitId)) {
      seen.add(unit.battleUnitId);
      ids.push(unit.battleUnitId);
    }
  }
  groups.set(groupIndex, ids);
  return [...ids];
}

export function recallControlGroup(
  groups: ControlGroupMap,
  groupIndex: ControlGroupIndex,
  units: ReadonlyMap<string, RTSBattleUnit>,
): string[] {
  const livingIds: string[] = [];
  const seen = new Set<string>();
  for (const unitId of groups.get(groupIndex) ?? []) {
    const unit = units.get(unitId);
    if (unit?.isAlive && unit.team === "ALLY" && !seen.has(unitId)) {
      seen.add(unitId);
      livingIds.push(unitId);
    }
  }
  groups.set(groupIndex, [...livingIds]);
  return livingIds;
}

export function removeUnitFromAllControlGroups(groups: ControlGroupMap, unitId: string): void {
  for (const groupIndex of CONTROL_GROUP_INDICES) {
    const existing = groups.get(groupIndex) ?? [];
    groups.set(groupIndex, existing.filter((candidateId) => candidateId !== unitId));
  }
}

export function getLivingControlGroupCount(
  groups: ControlGroupMap,
  groupIndex: ControlGroupIndex,
  units: ReadonlyMap<string, RTSBattleUnit>,
): number {
  return recallControlGroup(groups, groupIndex, units).length;
}
