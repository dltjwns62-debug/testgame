import type Phaser from "phaser";
import { CONTROL_GROUPS_REGISTRY_KEY } from "./constants";
import type { RTSBattleUnit } from "./rtsBattleTypes";
import type { ControlGroupIndex } from "./keyBindings";

export type { ControlGroupIndex } from "./keyBindings";

export type ControlGroupMap = Map<ControlGroupIndex, string[]>;

export type PersistentControlGroupState = {
  groups: [
    string[], string[], string[], string[], string[],
    string[], string[], string[], string[], string[],
  ];
};

const CONTROL_GROUP_INDICES: readonly ControlGroupIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function asPersistentState(groups: string[][]): PersistentControlGroupState {
  return { groups: groups as PersistentControlGroupState["groups"] };
}

function dedupeIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

export function createEmptyControlGroups(): ControlGroupMap {
  return new Map(CONTROL_GROUP_INDICES.map((index) => [index, []]));
}

export function cloneControlGroups(groups: ControlGroupMap): ControlGroupMap {
  return new Map(CONTROL_GROUP_INDICES.map((index) => [index, [...(groups.get(index) ?? [])]]));
}

export function createEmptyPersistentControlGroupState(): PersistentControlGroupState {
  return asPersistentState(CONTROL_GROUP_INDICES.map(() => []));
}

export function clonePersistentControlGroupState(
  state: PersistentControlGroupState,
): PersistentControlGroupState {
  return asPersistentState(state.groups.map((group) => [...group]));
}

export function isValidPersistentControlGroupState(
  value: unknown,
  ownedRosterUnitIds: ReadonlySet<string>,
): value is PersistentControlGroupState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const groups = (value as { groups?: unknown }).groups;
  if (!Array.isArray(groups) || groups.length !== CONTROL_GROUP_INDICES.length) {
    return false;
  }

  return groups.every((group) => {
    if (!Array.isArray(group)) {
      return false;
    }
    const seen = new Set<string>();
    return (group as unknown[]).every((id: unknown) => {
      if (typeof id !== "string" || id.length === 0 || seen.has(id) || !ownedRosterUnitIds.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  });
}

function isValidPersistentStructure(value: unknown): value is PersistentControlGroupState {
  if (!hasPersistentShape(value)) {
    return false;
  }
  return value.groups.every((group) => {
    if (!Array.isArray(group)) {
      return false;
    }
    const seen = new Set<string>();
    return (group as unknown[]).every((id: unknown) => {
      if (typeof id !== "string" || id.length === 0 || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  });
}

function hasPersistentShape(value: unknown): value is { groups: unknown[] } {
  if (!value || typeof value !== "object" || !Array.isArray((value as { groups?: unknown }).groups)) {
    return false;
  }
  const groups = (value as { groups: unknown[] }).groups;
  return groups.length === CONTROL_GROUP_INDICES.length && groups.every((group) => Array.isArray(group));
}

function sanitizePersistentControlGroupState(
  value: { groups: unknown[] },
  ownedRosterUnitIds: ReadonlySet<string>,
): PersistentControlGroupState {
  return asPersistentState(value.groups.map((group) => {
    const validIds = (group as unknown[]).filter((id): id is string =>
      typeof id === "string" && id.length > 0 && ownedRosterUnitIds.has(id),
    );
    return dedupeIds(validIds);
  }));
}

export function normalizePersistentControlGroupState(
  value: unknown,
  ownedRosterUnitIds: ReadonlySet<string>,
): PersistentControlGroupState {
  if (hasPersistentShape(value)) {
    return sanitizePersistentControlGroupState(value, ownedRosterUnitIds);
  }
  return createEmptyPersistentControlGroupState();
}

export function getOrCreatePersistentControlGroupState(
  registry: Phaser.Data.DataManager,
  ownedRosterUnitIds: ReadonlySet<string>,
): PersistentControlGroupState {
  const stored = registry.get(CONTROL_GROUPS_REGISTRY_KEY);
  if (isValidPersistentControlGroupState(stored, ownedRosterUnitIds)) {
    return clonePersistentControlGroupState(stored);
  }

  if (!hasPersistentShape(stored)) {
    const fallback = createEmptyPersistentControlGroupState();
    setPersistentControlGroupState(registry, fallback);
    return fallback;
  }

  const sanitized = sanitizePersistentControlGroupState(stored, ownedRosterUnitIds);
  setPersistentControlGroupState(registry, sanitized);
  return clonePersistentControlGroupState(sanitized);
}

export function setPersistentControlGroupState(
  registry: Phaser.Data.DataManager,
  state: PersistentControlGroupState,
): void {
  if (!isValidPersistentStructure(state)) {
    throw new Error("Invalid persistent control group state");
  }
  registry.set(CONTROL_GROUPS_REGISTRY_KEY, clonePersistentControlGroupState(state));
}

export function persistentStateToControlGroupMap(state: PersistentControlGroupState): ControlGroupMap {
  return new Map(CONTROL_GROUP_INDICES.map((index) => [index, [...state.groups[index]]]));
}

export function controlGroupMapToPersistentState(groups: ControlGroupMap): PersistentControlGroupState {
  return asPersistentState(CONTROL_GROUP_INDICES.map((index) => dedupeIds(groups.get(index) ?? [])));
}

export function getControlGroupDisplayNumber(groupIndex: ControlGroupIndex): string {
  return groupIndex === 9 ? "0" : String(groupIndex + 1);
}

export function getControlGroupOrdinalLabel(groupIndex: ControlGroupIndex): string {
  return String(groupIndex + 1);
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

  const ids = dedupeIds(selectedAllies.map((unit) => unit.battleUnitId));
  groups.set(groupIndex, ids);
  return [...ids];
}

export function getAvailableControlGroupMemberIds(
  groups: ControlGroupMap,
  groupIndex: ControlGroupIndex,
  units: ReadonlyMap<string, RTSBattleUnit>,
): string[] {
  const seen = new Set<string>();
  return (groups.get(groupIndex) ?? []).filter((unitId) => {
    const unit = units.get(unitId);
    if (!unit?.isAlive || unit.team !== "ALLY" || seen.has(unitId)) {
      return false;
    }
    seen.add(unitId);
    return true;
  });
}

export function recallControlGroup(
  groups: ControlGroupMap,
  groupIndex: ControlGroupIndex,
  units: ReadonlyMap<string, RTSBattleUnit>,
): string[] {
  return getAvailableControlGroupMemberIds(groups, groupIndex, units);
}

export function getLivingControlGroupCount(
  groups: ControlGroupMap,
  groupIndex: ControlGroupIndex,
  units: ReadonlyMap<string, RTSBattleUnit>,
): number {
  return getAvailableControlGroupMemberIds(groups, groupIndex, units).length;
}

export function replaceControlGroupMember(
  state: PersistentControlGroupState,
  previousRosterUnitId: string,
  nextRosterUnitId: string,
): PersistentControlGroupState {
  return asPersistentState(state.groups.map((group) => {
    const replaced = group.map((id) => id === previousRosterUnitId ? nextRosterUnitId : id);
    return dedupeIds(replaced);
  }));
}

export function removeUnitFromAllControlGroups(groups: ControlGroupMap, unitId: string): void {
  for (const groupIndex of CONTROL_GROUP_INDICES) {
    const existing = groups.get(groupIndex) ?? [];
    groups.set(groupIndex, existing.filter((candidateId) => candidateId !== unitId));
  }
}
