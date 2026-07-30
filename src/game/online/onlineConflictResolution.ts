import type { ConflictResolutionResult, OnlinePlayerSnapshot } from "./onlineTypes";
import { calculateSnapshotHash, validateOnlineSnapshot } from "./onlineSnapshot";

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function resolveOnlineConflict(
  local: OnlinePlayerSnapshot,
  server: OnlinePlayerSnapshot,
): ConflictResolutionResult {
  if (local.protocolVersion !== server.protocolVersion || local.protocolVersion !== 1) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: ["protocolVersion"] };
  }
  if (same(local.snapshotHash, server.snapshotHash)) {
    return { status: "NO_CONFLICT", snapshot: server };
  }
  const formationChanged = !same(local.formation, server.formation);
  const controlGroupsChanged = !same(local.controlGroups, server.controlGroups);
  const localPreferencesChanged = !same(local.keyBindings, server.keyBindings) ||
    local.battleAutoHuntEnabled !== server.battleAutoHuntEnabled;
  if (local.baseServerRevision !== server.baseServerRevision && (formationChanged || controlGroupsChanged)) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: [formationChanged ? "formation" : "", controlGroupsChanged ? "controlGroups" : ""].filter(Boolean) };
  }
  const resolvedWithoutHash: Omit<OnlinePlayerSnapshot, "snapshotHash"> = {
    ...server,
    ...(local.baseServerRevision === server.baseServerRevision ? {
      formation: local.formation,
      ownedRoster: local.ownedRoster,
      progression: local.progression,
      controlGroups: local.controlGroups,
    } : {}),
    keyBindings: local.keyBindings,
    battleAutoHuntEnabled: local.battleAutoHuntEnabled,
    autoProgress: {
      ...server.autoProgress,
      autoRepeatEnabled: local.autoProgress.autoRepeatEnabled,
      selectedMonsterId: local.autoProgress.selectedMonsterId,
    },
  };
  const resolved: OnlinePlayerSnapshot = { ...resolvedWithoutHash, snapshotHash: calculateSnapshotHash(resolvedWithoutHash) };
  if (!validateOnlineSnapshot(resolved).ok) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: ["canonicalSnapshot"] };
  }
  const decisions = ["server authoritative: playerGold", "server authoritative: progression", "server authoritative: inventory", "server authoritative: ownedRoster"];
  if (localPreferencesChanged) decisions.push("client preference retained: keyBindings and Auto Hunt");
  return { status: "RESOLVED", snapshot: resolved, decisions };
}
