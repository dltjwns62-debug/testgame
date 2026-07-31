import { normalizePersistentControlGroupState } from "../controlGroups";
import { isValidFormationState } from "../formationState";
import type { ConflictResolutionResult, OnlinePlayerSnapshot } from "./onlineTypes";
import { calculateSnapshotHash, validateOnlineSnapshot } from "./onlineSnapshot";

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function resolveOnlineConflict(
  local: OnlinePlayerSnapshot,
  server: OnlinePlayerSnapshot,
): ConflictResolutionResult {
  if (!validateOnlineSnapshot(local).ok || !validateOnlineSnapshot(server).ok) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: ["invalidSnapshot"] };
  }
  if (local.protocolVersion !== server.protocolVersion || local.protocolVersion !== 1) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: ["protocolVersion"] };
  }
  if (same(local.snapshotHash, server.snapshotHash)) {
    return { status: "NO_CONFLICT", snapshot: server };
  }
  const formationChanged = !same(local.formation.slots, server.formation.slots);
  const controlGroupsChanged = !same(local.controlGroups, server.controlGroups);
  const localPreferencesChanged = !same(local.keyBindings, server.keyBindings) ||
    local.battleAutoHuntEnabled !== server.battleAutoHuntEnabled;
  if (local.baseServerRevision !== server.baseServerRevision && (formationChanged || controlGroupsChanged)) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: [formationChanged ? "formation" : "", controlGroupsChanged ? "controlGroups" : ""].filter(Boolean) };
  }
  const serverOwnedIds = new Set(server.formation.ownedUnits.map((unit) => unit.rosterUnitId));
  const mergedFormation = {
    ownedUnits: server.formation.ownedUnits.map((unit) => ({ ...unit })),
    slots: local.formation.slots.map((slot) => ({ ...slot })),
  };
  if (!isValidFormationState(mergedFormation)) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: ["formation"] };
  }
  const selectedMonsterId = local.autoProgress.selectedMonsterId;
  const serverRecognizesRepeatTarget = selectedMonsterId !== null &&
    Object.prototype.hasOwnProperty.call(server.autoProgress.victoryCountsByMonsterId, selectedMonsterId);
  const mergedAutoProgress = {
    ...server.autoProgress,
    autoRepeatEnabled: serverRecognizesRepeatTarget && local.autoProgress.autoRepeatEnabled,
    selectedMonsterId: serverRecognizesRepeatTarget ? selectedMonsterId : null,
  };
  const resolvedWithoutHash: Omit<OnlinePlayerSnapshot, "snapshotHash"> = {
    ...server,
    formation: mergedFormation,
    ownedRoster: server.ownedRoster,
    progression: server.progression,
    controlGroups: normalizePersistentControlGroupState(local.controlGroups, serverOwnedIds),
    keyBindings: local.keyBindings,
    battleAutoHuntEnabled: local.battleAutoHuntEnabled,
    autoProgress: mergedAutoProgress,
  };
  const resolved: OnlinePlayerSnapshot = { ...resolvedWithoutHash, snapshotHash: calculateSnapshotHash(resolvedWithoutHash) };
  if (!validateOnlineSnapshot(resolved).ok) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: ["canonicalSnapshot"] };
  }
  const decisions = ["server authoritative: formation ownedUnits", "server authoritative: ownedRoster", "server authoritative: progression", "server authoritative: playerGold", "server authoritative: inventory", "server authoritative: AutoProgress counters"];
  if (formationChanged) decisions.push("client preference retained: formation slots");
  if (controlGroupsChanged) decisions.push("client preference retained: valid control groups");
  if (localPreferencesChanged) decisions.push("client preference retained: keyBindings and Auto Hunt");
  return { status: "RESOLVED", snapshot: resolved, decisions };
}
