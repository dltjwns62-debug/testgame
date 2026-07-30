import type Phaser from "phaser";
import {
  acknowledgePendingOperations,
  enqueuePendingOperation,
  getOrCreatePendingOperationQueue,
  peekPendingOperationBatch,
  rejectPendingOperation,
  retryPendingOperation,
  setPendingOperationQueue,
  type PendingOperationQueueState,
} from "./onlineQueue";
import { resolveOnlineConflict } from "./onlineConflictResolution";
import { createOnlineSnapshotFromRegistry } from "./onlineSnapshot";
import { getOrCreateOnlineSessionState, setOnlineSessionState, updateOnlineSessionState } from "./onlineRegistry";
import { ONLINE_PROTOCOL_VERSION, type ClientOperationEnvelope, type OnlineGateway, type OnlinePlayerSnapshot, type OnlineResult, type OnlineSessionState } from "./onlineTypes";

export type OnlineCoordinatorOptions = {
  nowMs?: () => number;
  timeoutMs?: number;
};

export type OnlineCoordinatorResult = OnlineResult<{
  state: OnlineSessionState;
  snapshot: OnlinePlayerSnapshot | null;
}>;

type RequestAction<T> = (signal: AbortSignal) => Promise<OnlineResult<T>>;

export class OnlineSyncCoordinator {
  private disposed = false;
  private bootstrapInProgress = false;
  private syncInProgress = false;
  private requestGeneration = 0;
  private activeController: AbortController | null = null;
  private readonly nowMs: () => number;
  private readonly timeoutMs: number;

  public constructor(
    private readonly registry: Phaser.Data.DataManager,
    private readonly gateway: OnlineGateway,
    nowOrOptions: (() => number) | OnlineCoordinatorOptions = () => Date.now(),
  ) {
    this.nowMs = typeof nowOrOptions === "function" ? nowOrOptions : nowOrOptions.nowMs ?? (() => Date.now());
    this.timeoutMs = typeof nowOrOptions === "function" ? 10_000 : Math.max(1, nowOrOptions.timeoutMs ?? 10_000);
  }

  public getState(): OnlineSessionState { return getOrCreateOnlineSessionState(this.registry); }
  public getQueue(): PendingOperationQueueState { return getOrCreatePendingOperationQueue(this.registry); }
  public getGateway(): OnlineGateway { return this.gateway; }
  public isDisposed(): boolean { return this.disposed; }
  public isBusy(): boolean { return this.bootstrapInProgress || this.syncInProgress; }

  public enqueue(operation: ClientOperationEnvelope): OnlineResult<PendingOperationQueueState> {
    const state = this.getState();
    if (this.disposed) return { ok: false, error: { code: "CANCELLED", message: "Online coordinator has been disposed.", retryable: false } };
    if (!state.mockMode && state.status === "DISABLED") return { ok: false, error: { code: "ONLINE_DISABLED", message: "Online queue is disabled in local-only mode.", retryable: false } };
    const result = enqueuePendingOperation(this.getQueue(), operation, this.nowMs());
    if (result.ok) {
      setPendingOperationQueue(this.registry, result.queue);
      this.updateIfCurrent(this.requestGeneration, { pendingOperationCount: result.queue.records.length });
      return { ok: true, value: result.queue };
    }
    return { ok: false, error: result.error };
  }

  private cancellationError(): OnlineResult<never> {
    return { ok: false, error: { code: "CANCELLED", message: "Online request was cancelled.", retryable: false } };
  }

  private async runRequest<T>(generation: number, externalSignal: AbortSignal | undefined, action: RequestAction<T>): Promise<OnlineResult<T>> {
    if (!this.isCurrent(generation) || externalSignal?.aborted) return this.cancellationError();
    const controller = new AbortController();
    this.activeController = controller;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let externalAbort: (() => void) | null = null;
    const cancelled = new Promise<OnlineResult<T>>((resolve) => {
      externalAbort = () => { controller.abort(); resolve(this.cancellationError()); };
      externalSignal?.addEventListener("abort", externalAbort, { once: true });
    });
    const timeout = new Promise<OnlineResult<T>>((resolve) => {
      timeoutHandle = setTimeout(() => { controller.abort(); resolve({ ok: false, error: { code: "TIMEOUT", message: "Online request timed out.", retryable: true } }); }, this.timeoutMs);
    });
    try {
      const request = action(controller.signal).catch((): OnlineResult<T> => ({ ok: false as const, error: { code: "SERVER_ERROR", message: "Online gateway request failed.", retryable: true } }));
      const result = await Promise.race([request, timeout, cancelled]);
      if (!this.isCurrent(generation)) return this.cancellationError();
      return result;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (externalAbort) externalSignal?.removeEventListener("abort", externalAbort);
      if (this.activeController === controller) this.activeController = null;
    }
  }

  private isCurrent(generation: number): boolean {
    return !this.disposed && generation === this.requestGeneration;
  }

  private updateIfCurrent(generation: number, patch: Partial<OnlineSessionState>): OnlineSessionState {
    if (!this.isCurrent(generation)) return this.getState();
    return updateOnlineSessionState(this.registry, patch);
  }

  private revisionGuard(generation: number, revision: number): OnlineResult<true> {
    if (!this.isCurrent(generation)) return this.cancellationError();
    const current = this.getState().serverRevision;
    if (current !== null && revision < current) return { ok: false, error: { code: "SERVER_REJECTED", message: "A stale server revision was ignored.", retryable: false, serverRevision: current } };
    return { ok: true, value: true };
  }

  public async bootstrap(snapshot?: OnlinePlayerSnapshot, signal?: AbortSignal): Promise<OnlineCoordinatorResult> {
    const state = this.getState();
    if (this.disposed) return this.cancellationError();
    if (this.bootstrapInProgress || this.syncInProgress) return { ok: false, error: { code: "SERVER_REJECTED", message: "Another online request is already in progress.", retryable: true } };
    if (!state.mockMode && state.status === "DISABLED") return { ok: false, error: { code: "ONLINE_DISABLED", message: "Online mode is disabled; local gameplay remains active.", retryable: false } };
    this.bootstrapInProgress = true;
    const generation = ++this.requestGeneration;
    this.updateIfCurrent(generation, { status: "CONNECTING", lastErrorCode: null, lastErrorMessage: null });
    try {
      const current = this.getState();
      const result = await this.runRequest(generation, signal, (requestSignal) => this.gateway.bootstrap({
        protocolVersion: ONLINE_PROTOCOL_VERSION,
        deviceId: current.deviceId,
        clientInstanceId: current.clientInstanceId,
        accountId: current.accountId,
        snapshot: snapshot ?? null,
      }, requestSignal));
      if (!result.ok) {
        this.updateIfCurrent(generation, { status: result.error.code === "ONLINE_DISABLED" ? "DISABLED" : result.error.code === "CANCELLED" ? "OFFLINE" : "OFFLINE", lastErrorCode: result.error.code, lastErrorMessage: result.error.message });
        return result;
      }
      const revision = this.revisionGuard(generation, result.value.serverRevision);
      if (!revision.ok) return revision;
      const next = this.updateIfCurrent(generation, { status: "ONLINE", sessionId: result.value.sessionId, accountId: result.value.accountId, serverRevision: result.value.serverRevision, lastSyncedAtMs: this.nowMs(), lastErrorCode: null, lastErrorMessage: null });
      return { ok: true, value: { state: next, snapshot: result.value.snapshot } };
    } finally {
      this.bootstrapInProgress = false;
    }
  }

  public async sync(snapshot?: OnlinePlayerSnapshot, signal?: AbortSignal): Promise<OnlineCoordinatorResult> {
    const initial = this.getState();
    if (this.disposed) return this.cancellationError();
    if (this.bootstrapInProgress || this.syncInProgress) return { ok: false, error: { code: "SERVER_REJECTED", message: "Another online request is already in progress.", retryable: true } };
    if (!initial.mockMode && initial.status === "DISABLED") return { ok: false, error: { code: "ONLINE_DISABLED", message: "Online mode is disabled; local gameplay remains active.", retryable: false } };
    this.syncInProgress = true;
    const generation = ++this.requestGeneration;
    this.updateIfCurrent(generation, { status: "SYNCING", lastErrorCode: null, lastErrorMessage: null });
    try {
      let state = this.getState();
      let serverRevision = state.serverRevision ?? 0;
      const batch = peekPendingOperationBatch(this.getQueue(), 20, this.nowMs());
      if (batch.length > 0) {
        const pushed = await this.runRequest(generation, signal, (requestSignal) => this.gateway.pushOperations({ protocolVersion: ONLINE_PROTOCOL_VERSION, sessionId: state.sessionId, expectedServerRevision: serverRevision, operations: batch.map((record) => record.operation) }, requestSignal));
        if (!pushed.ok) {
          const guarded = pushed.error.serverRevision !== undefined ? this.revisionGuard(generation, pushed.error.serverRevision) : { ok: true as const, value: true as const };
          if (!guarded.ok) return guarded;
          let nextQueue = this.getQueue();
          for (const record of batch) nextQueue = retryPendingOperation(nextQueue, record.operation.operationId, pushed.error, { nowMs: this.nowMs() });
          setPendingOperationQueue(this.registry, nextQueue);
          this.updateIfCurrent(generation, { status: pushed.error.code === "REVISION_CONFLICT" ? "CONFLICT" : "DEGRADED", lastErrorCode: pushed.error.code, lastErrorMessage: pushed.error.message, serverRevision: pushed.error.serverRevision ?? serverRevision, pendingOperationCount: nextQueue.records.length });
          return pushed;
        }
        const revision = this.revisionGuard(generation, pushed.value.serverRevision);
        if (!revision.ok) return revision;
        const acknowledged = [...pushed.value.acknowledgedOperationIds, ...pushed.value.duplicateOperationIds];
        let nextQueue = acknowledgePendingOperations(this.getQueue(), acknowledged, this.nowMs());
        for (const rejectedId of pushed.value.rejectedOperationIds) {
          const reason = pushed.value.rejectedReasons[rejectedId] ?? { code: "SERVER_REJECTED" as const, message: "Server rejected the operation.", retryable: false };
          nextQueue = rejectPendingOperation(nextQueue, rejectedId, reason, this.nowMs());
        }
        setPendingOperationQueue(this.registry, nextQueue);
        serverRevision = pushed.value.serverRevision;
        state = this.updateIfCurrent(generation, { pendingOperationCount: nextQueue.records.length, serverRevision });
      }
      const pulled = await this.runRequest(generation, signal, (requestSignal) => this.gateway.pullSnapshot({ protocolVersion: ONLINE_PROTOCOL_VERSION, sessionId: state.sessionId, expectedServerRevision: serverRevision }, requestSignal));
      if (!pulled.ok) {
        const guarded = pulled.error.serverRevision !== undefined ? this.revisionGuard(generation, pulled.error.serverRevision) : { ok: true as const, value: true as const };
        if (!guarded.ok) return guarded;
        this.updateIfCurrent(generation, { status: pulled.error.code === "REVISION_CONFLICT" ? "CONFLICT" : "DEGRADED", lastErrorCode: pulled.error.code, lastErrorMessage: pulled.error.message, serverRevision: pulled.error.serverRevision ?? serverRevision });
        return pulled;
      }
      const revision = this.revisionGuard(generation, pulled.value.serverRevision);
      if (!revision.ok) return revision;
      if (snapshot && pulled.value.snapshot) {
        const resolved = resolveOnlineConflict(snapshot, pulled.value.snapshot);
        if (resolved.status === "MANUAL_REQUIRED") {
          const conflictState = this.updateIfCurrent(generation, { status: "CONFLICT", serverRevision: pulled.value.serverRevision, lastErrorCode: "REVISION_CONFLICT", lastErrorMessage: "A snapshot conflict requires a manual decision." });
          return { ok: true, value: { state: conflictState, snapshot: pulled.value.snapshot } };
        }
      }
      const next = this.updateIfCurrent(generation, { status: "ONLINE", serverRevision: pulled.value.serverRevision, lastSyncedAtMs: this.nowMs(), lastErrorCode: null, lastErrorMessage: null, pendingOperationCount: this.getQueue().records.length });
      return { ok: true, value: { state: next, snapshot: pulled.value.snapshot } };
    } finally {
      this.syncInProgress = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.disposed) return;
    await this.gateway.disconnect();
    this.updateIfCurrent(this.requestGeneration, { status: this.getState().mockMode ? "OFFLINE" : "DISABLED", sessionId: null });
  }

  public async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.requestGeneration += 1;
    this.activeController?.abort();
    this.activeController = null;
    await this.gateway.disconnect();
  }
}

export function createOnlineCoordinator(registry: Phaser.Data.DataManager, gateway: OnlineGateway, options?: OnlineCoordinatorOptions): OnlineSyncCoordinator {
  return new OnlineSyncCoordinator(registry, gateway, options);
}

export function createRegistrySnapshotForOnlineSync(registry: Phaser.Data.DataManager, state: OnlineSessionState): OnlinePlayerSnapshot {
  return createOnlineSnapshotFromRegistry(registry, { deviceId: state.deviceId, clientInstanceId: state.clientInstanceId, baseServerRevision: state.serverRevision });
}
