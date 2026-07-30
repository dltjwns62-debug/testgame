import type Phaser from "phaser";
import {
  AUTO_HUNT_REGISTRY_KEY,
  AUTO_PROGRESS_REGISTRY_KEY,
  CONTROL_GROUPS_REGISTRY_KEY,
  FORMATION_REGISTRY_KEY,
  INVENTORY_REGISTRY_KEY,
  KEY_BINDINGS_REGISTRY_KEY,
  PERSISTENCE_META_REGISTRY_KEY,
  PLAYER_GOLD_REGISTRY_KEY,
  RUNTIME_STATE_ISSUES_REGISTRY_KEY,
} from "./constants";
import {
  createEmptyPersistentControlGroupState,
  normalizePersistentControlGroupState,
  setPersistentControlGroupState,
} from "./controlGroups";
import {
  createDefaultFormationState,
  isValidFormationState,
  setFormationState,
} from "./formationState";
import {
  isValidInventoryState,
  normalizeInventoryStateForOwnedUnits,
  setInventoryState,
} from "./items";
import { createDefaultKeyBindingState, isValidKeyBindingState, setKeyBindingState } from "./keyBindings";
import { isValidPlayerGold, setPlayerGold } from "./playerEconomy";
import { normalizeAutoProgressState, setAutoProgressState } from "./autoProgress";

export type RuntimeIssueSeverity = "WARNING" | "RECOVERABLE" | "FATAL";

export type RuntimeStateIssue = {
  id: string;
  severity: RuntimeIssueSeverity;
  path: string;
  message: string;
  recoverable: boolean;
};

function issue(
  id: string,
  severity: RuntimeIssueSeverity,
  path: string,
  message: string,
  recoverable = severity !== "FATAL",
): RuntimeStateIssue {
  return { id, severity, path, message, recoverable };
}

function sameJson(left: unknown, right: unknown): boolean {
  try { return JSON.stringify(left) === JSON.stringify(right); } catch { return false; }
}

export function inspectRuntimeState(registry: Phaser.Data.DataManager): RuntimeStateIssue[] {
  const issues: RuntimeStateIssue[] = [];
  const formation = registry.get(FORMATION_REGISTRY_KEY);
  const formationValid = isValidFormationState(formation);
  if (!formationValid) {
    issues.push(issue("formation.invalid", "RECOVERABLE", "formation", "Formation state is invalid and will be restored to defaults."));
  }
  const ownedIds = formationValid
    ? new Set(formation.ownedUnits.map((unit) => unit.rosterUnitId))
    : new Set(createDefaultFormationState().ownedUnits.map((unit) => unit.rosterUnitId));

  if (!isValidPlayerGold(registry.get(PLAYER_GOLD_REGISTRY_KEY))) {
    issues.push(issue("economy.gold.invalid", "RECOVERABLE", "playerGold", "Player Gold is not a safe non-negative integer."));
  }
  if (!isValidKeyBindingState(registry.get(KEY_BINDINGS_REGISTRY_KEY))) {
    issues.push(issue("input.bindings.invalid", "RECOVERABLE", "keyBindings", "Key bindings are invalid and will use defaults."));
  }
  const groups = registry.get(CONTROL_GROUPS_REGISTRY_KEY);
  const normalizedGroups = normalizePersistentControlGroupState(groups, ownedIds);
  if (!sameJson(groups, normalizedGroups)) {
    issues.push(issue("controlGroups.invalid", "RECOVERABLE", "controlGroups", "Control groups contain invalid roster references or duplicates."));
  }
  const inventory = registry.get(INVENTORY_REGISTRY_KEY);
  const normalizedInventory = normalizeInventoryStateForOwnedUnits(inventory, ownedIds);
  if (!isValidInventoryState(inventory) || !sameJson(inventory, normalizedInventory)) {
    issues.push(issue("inventory.invalid", "RECOVERABLE", "inventory", "Inventory or equipment references are invalid."));
  }
  if (typeof registry.get(AUTO_HUNT_REGISTRY_KEY) !== "boolean") {
    issues.push(issue("battle.autoHunt.invalid", "WARNING", "autoHuntEnabled", "Auto Hunt state is not boolean and will be disabled."));
  }
  const autoProgress = registry.get(AUTO_PROGRESS_REGISTRY_KEY);
  const normalizedProgress = normalizeAutoProgressState(autoProgress);
  if (!sameJson(autoProgress, normalizedProgress)) {
    issues.push(issue("progress.auto.invalid", "RECOVERABLE", "autoProgress", "Repeat Hunt progress contains invalid values."));
  }
  const meta = registry.get(PERSISTENCE_META_REGISTRY_KEY) as { savedAtMs?: unknown; lastActiveAtMs?: unknown } | undefined;
  if (meta && (!Number.isSafeInteger(meta.savedAtMs) || (meta.savedAtMs as number) < 0 ||
    !Number.isSafeInteger(meta.lastActiveAtMs) || (meta.lastActiveAtMs as number) < 0)) {
    issues.push(issue("persistence.timestamps.invalid", "RECOVERABLE", "persistenceMeta", "Persistence timestamps are invalid."));
  }
  return issues;
}

export function repairRuntimeStateAtBoundary(registry: Phaser.Data.DataManager): RuntimeStateIssue[] {
  const issues = inspectRuntimeState(registry);
  const formation = registry.get(FORMATION_REGISTRY_KEY);
  const repairedFormation = isValidFormationState(formation) ? formation : createDefaultFormationState();
  if (!isValidFormationState(formation)) setFormationState(registry, repairedFormation);
  const ownedIds = new Set(repairedFormation.ownedUnits.map((unit) => unit.rosterUnitId));
  if (!isValidPlayerGold(registry.get(PLAYER_GOLD_REGISTRY_KEY))) setPlayerGold(registry, 0);
  if (!isValidKeyBindingState(registry.get(KEY_BINDINGS_REGISTRY_KEY))) {
    setKeyBindingState(registry, createDefaultKeyBindingState());
  }
  const rawGroups = registry.get(CONTROL_GROUPS_REGISTRY_KEY) ?? createEmptyPersistentControlGroupState();
  const normalizedGroups = normalizePersistentControlGroupState(rawGroups, ownedIds);
  if (!sameJson(rawGroups, normalizedGroups)) setPersistentControlGroupState(registry, normalizedGroups);
  const rawInventory = registry.get(INVENTORY_REGISTRY_KEY);
  const normalizedInventory = normalizeInventoryStateForOwnedUnits(rawInventory, ownedIds);
  if (!sameJson(rawInventory, normalizedInventory)) setInventoryState(registry, normalizedInventory);
  if (typeof registry.get(AUTO_HUNT_REGISTRY_KEY) !== "boolean") registry.set(AUTO_HUNT_REGISTRY_KEY, false);
  const rawProgress = registry.get(AUTO_PROGRESS_REGISTRY_KEY);
  const normalizedProgress = normalizeAutoProgressState(rawProgress);
  if (!sameJson(rawProgress, normalizedProgress)) setAutoProgressState(registry, normalizedProgress);
  registry.set(RUNTIME_STATE_ISSUES_REGISTRY_KEY, issues.map((entry) => ({ ...entry })));
  return issues;
}
