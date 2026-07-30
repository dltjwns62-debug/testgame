import type Phaser from "phaser";
import { acknowledgePendingOperations, enqueuePendingOperation, getOrCreatePendingOperationQueue, setPendingOperationQueue, type PendingOperationQueueState } from "./onlineQueue";
import { resolveOnlineConflict } from "./onlineConflictResolution";
import { createOnlineSnapshotFromRegistry } from "./onlineSnapshot";
import { getOrCreateOnlineSessionState, setOnlineSessionState, updateOnlineSessionState } from "./onlineRegistry";
import { ONLINE_PROTOCOL_VERSION, type ClientOperationEnvelope, type OnlineGateway, type OnlinePlayerSnapshot, type OnlineResult, type OnlineSessionState } from "./onlineTypes";

export type OnlineCoordinatorResult = OnlineResult<{
  state: OnlineSessionState;
  snapshot: OnlinePlayerSnapshot | null;
}>;

export class OnlineSyncCoordinator {
  private disposed = false;
  private syncInProgress = false;

  public constructor(
    private readonly registry: Phaser.Data.DataManager,
    private readonly gateway: OnlineGateway,
    private readonly nowMs: () => number = () => Date.now(),
  ) {}

  public getState(): OnlineSessionState { return getOrCreateOnlineSessionState(this.registry); }
  public getQueue(): PendingOperationQueueState { return getOrCreatePendingOperationQueue(this.registry); }
  public getGateway(): OnlineGateway { return this.gateway; }

  public enqueue(operation: ClientOperationEnvelope): OnlineResult<PendingOperationQueueState> {
    if (this.disposed) return { ok: false, error: { code: "CANCELLED", message: "Online coordinator has been disposed.", retryable: false } };
    const result = enqueuePendingOperation(this.getQueue(), operation);
    if (result.ok) {
      setPendingOperationQueue(this.registry, result.queue);
      updateOnlineSessionState(this.registry, { pendingOperationCount: result.queue.operations.length });
      return { ok: true, value: result.queue };
    }
    return { ok: false, error: result.error };
  }

  public async bootstrap(snapshot?: OnlinePlayerSnapshot, signal?: AbortSignal): Promise<OnlineCoordinatorResult> {
    if (this.disposed) return { ok: false, error: { code: "CANCELLED", message: "Online coordinator has been disposed.", retryable: false } };
    const current = getOrCreateOnlineSessionState(this.registry);
    setOnlineSessionState(this.registry, { ...current, status: current.mockMode ? "CONNECTING" : current.status === "DISABLED" ? "DISABLED" : "CONNECTING", lastErrorCode: null, lastErrorMessage: null });
    const state = getOrCreateOnlineSessionState(this.registry);
    const result = await this.gateway.bootstrap({
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      deviceId: state.deviceId,
      clientInstanceId: state.clientInstanceId,
      accountId: state.accountId,
      snapshot: snapshot ?? null,
    }, signal);
    if (!result.ok) {
      const next = updateOnlineSessionState(this.registry, { status: result.error.code === "ONLINE_DISABLED" ? "DISABLED" : "OFFLINE", lastErrorCode: result.error.code, lastErrorMessage: result.error.message });
      return { ok: false, error: result.error };
    }
    const next = updateOnlineSessionState(this.registry, {
      status: "ONLINE",
      sessionId: result.value.sessionId,
      accountId: result.value.accountId,
      serverRevision: result.value.serverRevision,
      lastSyncedAtMs: this.nowMs(),
      lastErrorCode: null,
      lastErrorMessage: null,
    });
    return { ok: true, value: { state: next, snapshot: result.value.snapshot } };
  }

  public async sync(snapshot?: OnlinePlayerSnapshot, signal?: AbortSignal): Promise<OnlineCoordinatorResult> {
    if (this.disposed) return { ok: false, error: { code: "CANCELLED", message: "Online coordinator has been disposed.", retryable: false } };
    if (this.syncInProgress) return { ok: false, error: { code: "SERVER_REJECTED", message: "A sync is already in progress.", retryable: true } };
    this.syncInProgress = true;
    try {
      const state = getOrCreateOnlineSessionState(this.registry);
      updateOnlineSessionState(this.registry, { status: state.mockMode ? "SYNCING" : state.status === "DISABLED" ? "DISABLED" : "SYNCING", lastErrorCode: null, lastErrorMessage: null });
      if (state.status === "DISABLED" && !state.mockMode) {
        const disabled = await this.gateway.bootstrap({ protocolVersion: ONLINE_PROTOCOL_VERSION, deviceId: state.deviceId, clientInstanceId: state.clientInstanceId, snapshot: snapshot ?? null }, signal);
        if (!disabled.ok) {
          updateOnlineSessionState(this.registry, { status: "DISABLED", lastErrorCode: disabled.error.code, lastErrorMessage: disabled.error.message });
          return { ok: false, error: disabled.error };
        }
      }
      const current = getOrCreateOnlineSessionState(this.registry);
      let serverRevision = current.serverRevision ?? 0;
      const queue = this.getQueue();
      if (queue.operations.length > 0) {
        const pushed = await this.gateway.pushOperations({ protocolVersion: ONLINE_PROTOCOL_VERSION, sessionId: current.sessionId, expectedServerRevision: serverRevision, operations: queue.operations.slice(0, 20) }, signal);
        if (!pushed.ok) {
          updateOnlineSessionState(this.registry, { status: pushed.error.code === "REVISION_CONFLICT" ? "CONFLICT" : "DEGRADED", lastErrorCode: pushed.error.code, lastErrorMessage: pushed.error.message, serverRevision: pushed.error.serverRevision ?? serverRevision });
          return { ok: false, error: pushed.error };
        }
        const acknowledged = [...pushed.value.acknowledgedOperationIds, ...pushed.value.duplicateOperationIds, ...pushed.value.rejectedOperationIds];
        setPendingOperationQueue(this.registry, acknowledgePendingOperations(queue, acknowledged));
        serverRevision = pushed.value.serverRevision;
        updateOnlineSessionState(this.registry, { pendingOperationCount: this.getQueue().operations.length, serverRevision });
      }
      const pulled = await this.gateway.pullSnapshot({ protocolVersion: ONLINE_PROTOCOL_VERSION, sessionId: getOrCreateOnlineSessionState(this.registry).sessionId, expectedServerRevision: serverRevision }, signal);
      if (!pulled.ok) {
        updateOnlineSessionState(this.registry, { status: pulled.error.code === "REVISION_CONFLICT" ? "CONFLICT" : "DEGRADED", lastErrorCode: pulled.error.code, lastErrorMessage: pulled.error.message, serverRevision: pulled.error.serverRevision ?? serverRevision });
        return { ok: false, error: pulled.error };
      }
      let status: OnlineSessionState["status"] = "ONLINE";
      if (snapshot && pulled.value.snapshot) {
        const resolved = resolveOnlineConflict(snapshot, pulled.value.snapshot);
        if (resolved.status === "MANUAL_REQUIRED") {
          updateOnlineSessionState(this.registry, { status: "CONFLICT", serverRevision: pulled.value.serverRevision, lastErrorCode: "REVISION_CONFLICT", lastErrorMessage: "A snapshot conflict requires a manual decision." });
          return { ok: true, value: { state: getOrCreateOnlineSessionState(this.registry), snapshot: pulled.value.snapshot } };
        }
      }
      const next = updateOnlineSessionState(this.registry, { status, serverRevision: pulled.value.serverRevision, lastSyncedAtMs: this.nowMs(), lastErrorCode: null, lastErrorMessage: null, pendingOperationCount: this.getQueue().operations.length });
      return { ok: true, value: { state: next, snapshot: pulled.value.snapshot } };
    } finally {
      this.syncInProgress = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.disposed) return;
    await this.gateway.disconnect();
    updateOnlineSessionState(this.registry, { status: getOrCreateOnlineSessionState(this.registry).mockMode ? "OFFLINE" : "DISABLED", sessionId: null });
  }

  public async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.gateway.disconnect();
  }
}

export function createOnlineCoordinator(
  registry: Phaser.Data.DataManager,
  gateway: OnlineGateway,
  nowMs?: () => number,
): OnlineSyncCoordinator {
  return new OnlineSyncCoordinator(registry, gateway, nowMs);
}

export function createRegistrySnapshotForOnlineSync(
  registry: Phaser.Data.DataManager,
  state: OnlineSessionState,
): OnlinePlayerSnapshot {
  return createOnlineSnapshotFromRegistry(registry, { deviceId: state.deviceId, clientInstanceId: state.clientInstanceId, baseServerRevision: state.serverRevision });
}
