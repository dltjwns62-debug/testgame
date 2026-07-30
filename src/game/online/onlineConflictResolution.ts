import type { ConflictResolutionResult, OnlinePlayerSnapshot } from "./onlineTypes";

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function resolveOnlineConflict(
  local: OnlinePlayerSnapshot,
  server: OnlinePlayerSnapshot,
): ConflictResolutionResult {
  if (same(local.snapshotHash, server.snapshotHash) || local.baseServerRevision === server.baseServerRevision) {
    return { status: "NO_CONFLICT", snapshot: server };
  }
  const formationChanged = !same(local.formation, server.formation);
  const localPreferencesChanged = !same(local.keyBindings, server.keyBindings) ||
    local.battleAutoHuntEnabled !== server.battleAutoHuntEnabled;
  if (formationChanged && local.baseServerRevision !== server.baseServerRevision) {
    return { status: "MANUAL_REQUIRED", local, server, conflicts: ["formation", "controlGroups"] };
  }
  const resolved: OnlinePlayerSnapshot = {
    ...server,
    keyBindings: local.keyBindings,
    battleAutoHuntEnabled: local.battleAutoHuntEnabled,
    autoProgress: local.autoProgress,
    snapshotHash: server.snapshotHash,
  };
  const decisions = ["server authoritative: playerGold", "server authoritative: progression", "server authoritative: inventory", "server authoritative: ownedRoster"];
  if (localPreferencesChanged) decisions.push("client preference retained: keyBindings and Auto Hunt");
  return { status: "RESOLVED", snapshot: resolved, decisions };
}
