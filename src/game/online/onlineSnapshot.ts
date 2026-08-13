import type Phaser from "phaser";
import {
  AUTO_HUNT_REGISTRY_KEY,
  FORMATION_REGISTRY_KEY,
  INVENTORY_REGISTRY_KEY,
  KEY_BINDINGS_REGISTRY_KEY,
  PLAYER_GOLD_REGISTRY_KEY,
  CONTROL_GROUPS_REGISTRY_KEY,
  AUTO_PROGRESS_REGISTRY_KEY,
} from "../constants";
import { getOrCreateAutoProgressState, normalizeAutoProgressState } from "../autoProgress";
import { getOrCreatePersistentControlGroupState, normalizePersistentControlGroupState } from "../controlGroups";
import { getOrCreateFormationState, isValidFormationState, normalizeFormationState } from "../formationState";
import { getOrCreateInventoryState, isValidInventoryState, normalizeInventoryStateForOwnedUnits } from "../items";
import { getOrCreateKeyBindingState, isValidKeyBindingState, createDefaultKeyBindingState, normalizeKeyBindingState } from "../keyBindings";
import { getOrCreatePlayerGold, isValidPlayerGold } from "../playerEconomy";
import { getPersistenceMeta } from "../persistence";
import { ONLINE_PROTOCOL_VERSION, type DeviceId, type ClientInstanceId, type OnlinePlayerSnapshot, type ServerRevision } from "./onlineTypes";
import { validateOnlineSnapshotShape, type OnlineValidationResult } from "./onlineValidation";

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(record[key])).join(",") + "}";
}

export function calculateSnapshotHash(snapshot: Omit<OnlinePlayerSnapshot, "snapshotHash"> | OnlinePlayerSnapshot): string {
  const withoutHash = { ...snapshot } as Partial<OnlinePlayerSnapshot>;
  delete withoutHash.snapshotHash;
  const input = stableStringify(withoutHash);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createOnlineSnapshotFromRegistry(
  registry: Phaser.Data.DataManager,
  options: { deviceId: DeviceId; clientInstanceId: ClientInstanceId; nowMs?: number; baseServerRevision?: ServerRevision | null } ,
): OnlinePlayerSnapshot {
  const formation = getOrCreateFormationState(registry);
  const ownedIds = new Set(formation.ownedUnits.map((unit) => unit.rosterUnitId));
  const snapshotWithoutHash = {
    protocolVersion: ONLINE_PROTOCOL_VERSION,
    saveId: getPersistenceMeta(registry).saveId,
    deviceId: options.deviceId,
    clientInstanceId: options.clientInstanceId,
    clientGeneratedAtMs: options.nowMs ?? Date.now(),
    baseServerRevision: options.baseServerRevision ?? null,
    formation,
    ownedRoster: formation.ownedUnits,
    playerGold: getOrCreatePlayerGold(registry),
    progression: formation.ownedUnits,
    inventory: normalizeInventoryStateForOwnedUnits(getOrCreateInventoryState(registry), ownedIds),
    controlGroups: getOrCreatePersistentControlGroupState(registry, ownedIds),
    keyBindings: getOrCreateKeyBindingState(registry),
    battleAutoHuntEnabled: registry.get(AUTO_HUNT_REGISTRY_KEY) === true,
    autoProgress: getOrCreateAutoProgressState(registry),
  } satisfies Omit<OnlinePlayerSnapshot, "snapshotHash">;
  return { ...snapshotWithoutHash, snapshotHash: calculateSnapshotHash(snapshotWithoutHash) };
}

export function validateOnlineSnapshot(snapshot: unknown): OnlineValidationResult {
  const shape = validateOnlineSnapshotShape(snapshot);
  if (!shape.ok) return shape;
  const candidate = snapshot as OnlinePlayerSnapshot;
  const ownedIds = new Set(candidate.formation.ownedUnits.map((unit) => unit.rosterUnitId));
  const normalizedInventory = normalizeInventoryStateForOwnedUnits(candidate.inventory, ownedIds);
  const normalizedControlGroups = normalizePersistentControlGroupState(candidate.controlGroups, ownedIds);
  const normalizedAutoProgress = normalizeAutoProgressState(candidate.autoProgress);
  if (!isValidFormationState(candidate.formation) || !isValidInventoryState(candidate.inventory) ||
    !isValidKeyBindingState(candidate.keyBindings) ||
    !sameJson(candidate.ownedRoster, candidate.formation.ownedUnits) ||
    !sameJson(candidate.progression, candidate.formation.ownedUnits) ||
    !sameJson(candidate.inventory, normalizedInventory) ||
    !sameJson(candidate.controlGroups, normalizedControlGroups) ||
    !sameJson(candidate.autoProgress, normalizedAutoProgress)) {
    return { ok: false, error: { code: "VALIDATION_FAILED", message: "Online snapshot canonical projections are inconsistent.", retryable: false } };
  }
  return calculateSnapshotHash(candidate) === candidate.snapshotHash
    ? { ok: true }
    : { ok: false, error: { code: "VALIDATION_FAILED", message: "Online snapshot hash does not match its contents.", retryable: false } };
}

export function normalizeOnlineSnapshot(value: unknown): OnlinePlayerSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<OnlinePlayerSnapshot>;
  const formation = normalizeFormationState(candidate.formation);
  const ownedIds = new Set(formation.ownedUnits.map((unit) => unit.rosterUnitId));
  const normalizedWithoutHash = {
    protocolVersion: ONLINE_PROTOCOL_VERSION,
    saveId: typeof candidate.saveId === "string" && candidate.saveId ? candidate.saveId : "online-save",
    deviceId: typeof candidate.deviceId === "string" && candidate.deviceId ? candidate.deviceId : "unknown-device",
    clientInstanceId: typeof candidate.clientInstanceId === "string" && candidate.clientInstanceId ? candidate.clientInstanceId : "unknown-client",
    clientGeneratedAtMs: Number.isSafeInteger(candidate.clientGeneratedAtMs) && (candidate.clientGeneratedAtMs as number) >= 0 ? candidate.clientGeneratedAtMs as number : 0,
    baseServerRevision: Number.isSafeInteger(candidate.baseServerRevision) && (candidate.baseServerRevision as number) >= 0 ? candidate.baseServerRevision as number : null,
    formation,
    ownedRoster: formation.ownedUnits,
    playerGold: isValidPlayerGold(candidate.playerGold) ? candidate.playerGold : 0,
    progression: formation.ownedUnits,
    inventory: normalizeInventoryStateForOwnedUnits(candidate.inventory, ownedIds),
    controlGroups: normalizePersistentControlGroupState(candidate.controlGroups, ownedIds),
    keyBindings: normalizeKeyBindingState(candidate.keyBindings),
    battleAutoHuntEnabled: candidate.battleAutoHuntEnabled === true,
    autoProgress: normalizeAutoProgressState(candidate.autoProgress),
  } satisfies Omit<OnlinePlayerSnapshot, "snapshotHash">;
  return { ...normalizedWithoutHash, snapshotHash: calculateSnapshotHash(normalizedWithoutHash) };
}

export function snapshotToPublicPayload(snapshot: OnlinePlayerSnapshot): Omit<OnlinePlayerSnapshot, "snapshotHash"> {
  const { snapshotHash: _snapshotHash, ...payload } = snapshot;
  return payload;
}
