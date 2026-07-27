import type Phaser from "phaser";
import { FORMATION_REGISTRY_KEY, RTS_ALLY_COUNT } from "./constants";
import { createTrialOwnedUnits, getAllyUnitDefinition } from "./rtsBattleDefinitions";
import type { FormationSlot, FormationState, OwnedRosterUnit, RosterEntry } from "./rtsBattleTypes";

function createDefaultSlots(ownedUnits: OwnedRosterUnit[]): FormationSlot[] {
  return Array.from({ length: RTS_ALLY_COUNT }, (_, slotIndex) => ({
    slotIndex,
    rosterUnitId: ownedUnits[slotIndex]?.rosterUnitId ?? null,
  }));
}

export function createDefaultFormationState(): FormationState {
  const ownedUnits = createTrialOwnedUnits();
  return {
    ownedUnits,
    slots: createDefaultSlots(ownedUnits),
  };
}

export function getFormationSlotLabel(slotIndex: number): string {
  return slotIndex === RTS_ALLY_COUNT - 1 ? "0" : String(slotIndex + 1);
}

export function cloneFormationState(state: FormationState): FormationState {
  return {
    ownedUnits: state.ownedUnits.map((unit) => ({ ...unit })),
    slots: state.slots.map((slot) => ({ ...slot })),
  };
}

export function isValidFormationState(value: unknown): value is FormationState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FormationState>;
  if (!Array.isArray(candidate.ownedUnits) || candidate.ownedUnits.length < 1 || candidate.ownedUnits.length > RTS_ALLY_COUNT ||
    !Array.isArray(candidate.slots) || candidate.slots.length !== RTS_ALLY_COUNT) {
    return false;
  }

  const ownedIds = new Set<string>();
  let mainCharacterCount = 0;
  for (const unit of candidate.ownedUnits) {
    if (!unit || typeof unit !== "object" ||
      typeof unit.rosterUnitId !== "string" || unit.rosterUnitId.length === 0 || ownedIds.has(unit.rosterUnitId) ||
      typeof unit.unitDefinitionId !== "string" || typeof unit.displayName !== "string" || unit.displayName.length === 0 ||
      (unit.unitRole !== "MAIN_CHARACTER" && unit.unitRole !== "MERCENARY")) {
      return false;
    }
    const definition = getAllyUnitDefinition(unit.unitDefinitionId);
    if (!definition || definition.unitRole !== unit.unitRole) {
      return false;
    }
    if (unit.unitRole === "MAIN_CHARACTER") {
      mainCharacterCount += 1;
    }
    ownedIds.add(unit.rosterUnitId);
  }

  if (mainCharacterCount !== 1) {
    return false;
  }

  const slotIndexes = new Set<number>();
  const deployedIds = new Set<string>();
  for (const slot of candidate.slots) {
    if (!slot || !Number.isSafeInteger(slot.slotIndex) || slot.slotIndex < 0 || slot.slotIndex >= RTS_ALLY_COUNT ||
      slotIndexes.has(slot.slotIndex) || (slot.rosterUnitId !== null && typeof slot.rosterUnitId !== "string")) {
      return false;
    }
    if (slot.rosterUnitId !== null) {
      if (!ownedIds.has(slot.rosterUnitId) || deployedIds.has(slot.rosterUnitId)) {
        return false;
      }
      deployedIds.add(slot.rosterUnitId);
    }
    slotIndexes.add(slot.slotIndex);
  }

  const mainId = candidate.ownedUnits.find((unit) => unit.unitRole === "MAIN_CHARACTER")?.rosterUnitId;
  return Boolean(mainId && deployedIds.has(mainId));
}

export function getOrCreateFormationState(registry: Phaser.Data.DataManager): FormationState {
  const stored = registry.get(FORMATION_REGISTRY_KEY);
  if (isValidFormationState(stored)) {
    return cloneFormationState(stored);
  }

  const fallback = createDefaultFormationState();
  registry.set(FORMATION_REGISTRY_KEY, cloneFormationState(fallback));
  return fallback;
}

export function setFormationState(registry: Phaser.Data.DataManager, state: FormationState): void {
  if (!isValidFormationState(state)) {
    throw new Error("Invalid formation state");
  }
  registry.set(FORMATION_REGISTRY_KEY, cloneFormationState(state));
}

export function buildBattleRosterFromFormation(state: FormationState): RosterEntry[] {
  if (!isValidFormationState(state)) {
    return [];
  }

  const ownedById = new Map(state.ownedUnits.map((unit) => [unit.rosterUnitId, unit]));
  return state.slots
    .filter((slot) => slot.rosterUnitId !== null)
    .map((slot) => {
      const owned = ownedById.get(slot.rosterUnitId as string);
      if (!owned) {
        return null;
      }
      return {
        rosterUnitId: owned.rosterUnitId,
        unitDefinitionId: owned.unitDefinitionId,
        unitRole: owned.unitRole,
        displayName: owned.displayName,
        slotIndex: slot.slotIndex,
      };
    })
    .filter((entry): entry is RosterEntry => Boolean(entry));
}
