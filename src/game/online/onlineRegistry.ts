import type Phaser from "phaser";
import { ONLINE_PROTOCOL_VERSION, type OnlineSessionState } from "./onlineTypes";

export const ONLINE_SESSION_REGISTRY_KEY = "testgame.onlineSession";
export const ONLINE_QUEUE_REGISTRY_KEY = "testgame.onlineQueue";

function createId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? prefix + "-" + uuid : prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

export function createDefaultOnlineSessionState(mockMode = false): OnlineSessionState {
  return {
    protocolVersion: ONLINE_PROTOCOL_VERSION,
    status: mockMode ? "OFFLINE" : "DISABLED",
    accountId: null,
    sessionId: null,
    deviceId: createId("device"),
    clientInstanceId: createId("client"),
    serverRevision: null,
    lastSyncedAtMs: null,
    pendingOperationCount: 0,
    lastErrorCode: mockMode ? null : "ONLINE_DISABLED",
    lastErrorMessage: mockMode ? null : "Online mode is disabled; the local game remains active.",
    mockMode,
  };
}

export function normalizeOnlineSessionState(value: unknown): OnlineSessionState {
  const fallback = createDefaultOnlineSessionState();
  const candidate = value && typeof value === "object" ? value as Partial<OnlineSessionState> : {};
  const status = ["DISABLED", "OFFLINE", "CONNECTING", "ONLINE", "SYNCING", "DEGRADED", "CONFLICT", "ERROR"].includes(candidate.status as string)
    ? candidate.status as OnlineSessionState["status"] : fallback.status;
  return {
    protocolVersion: ONLINE_PROTOCOL_VERSION,
    status,
    accountId: typeof candidate.accountId === "string" ? candidate.accountId : null,
    sessionId: typeof candidate.sessionId === "string" ? candidate.sessionId : null,
    deviceId: typeof candidate.deviceId === "string" && candidate.deviceId ? candidate.deviceId : fallback.deviceId,
    clientInstanceId: typeof candidate.clientInstanceId === "string" && candidate.clientInstanceId ? candidate.clientInstanceId : fallback.clientInstanceId,
    serverRevision: Number.isSafeInteger(candidate.serverRevision) && (candidate.serverRevision as number) >= 0 ? candidate.serverRevision as number : null,
    lastSyncedAtMs: Number.isSafeInteger(candidate.lastSyncedAtMs) && (candidate.lastSyncedAtMs as number) >= 0 ? candidate.lastSyncedAtMs as number : null,
    pendingOperationCount: Number.isSafeInteger(candidate.pendingOperationCount) && (candidate.pendingOperationCount as number) >= 0 ? candidate.pendingOperationCount as number : 0,
    lastErrorCode: typeof candidate.lastErrorCode === "string" ? candidate.lastErrorCode as OnlineSessionState["lastErrorCode"] : null,
    lastErrorMessage: typeof candidate.lastErrorMessage === "string" ? candidate.lastErrorMessage : null,
    mockMode: candidate.mockMode === true,
  };
}

export function getOrCreateOnlineSessionState(registry: Phaser.Data.DataManager): OnlineSessionState {
  const state = normalizeOnlineSessionState(registry.get(ONLINE_SESSION_REGISTRY_KEY));
  registry.set(ONLINE_SESSION_REGISTRY_KEY, state);
  return state;
}

export function setOnlineSessionState(registry: Phaser.Data.DataManager, state: OnlineSessionState): void {
  registry.set(ONLINE_SESSION_REGISTRY_KEY, normalizeOnlineSessionState(state));
}

export function updateOnlineSessionState(
  registry: Phaser.Data.DataManager,
  patch: Partial<OnlineSessionState>,
): OnlineSessionState {
  const next = normalizeOnlineSessionState({ ...getOrCreateOnlineSessionState(registry), ...patch });
  setOnlineSessionState(registry, next);
  return next;
}

export function createOnlineDeviceId(): string { return createId("device"); }
export function createClientInstanceId(): string { return createId("client"); }
