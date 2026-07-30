import { normalizeOnlineSnapshot, validateOnlineSnapshot } from "./onlineSnapshot";
import { ONLINE_PROTOCOL_VERSION, type BootstrapRequest, type BootstrapResponse, type OnlineGateway, type OnlineResult, type PullSnapshotRequest, type PullSnapshotResponse, type PushOperationsRequest, type PushOperationsResponse, type OnlinePlayerSnapshot } from "./onlineTypes";

function error(code: "VALIDATION_FAILED" | "REVISION_CONFLICT" | "DUPLICATE_OPERATION", message: string, serverRevision?: number) {
  return { code, message, retryable: code === "REVISION_CONFLICT", serverRevision } as const;
}

export class MockOnlineGateway implements OnlineGateway {
  private serverRevision = 0;
  private serverSnapshot: OnlinePlayerSnapshot | null = null;
  private readonly acknowledgedOperationIds = new Set<string>();
  private sessionId = "mock-session-1";
  private accountId: string | null = null;

  public reset(): void {
    this.serverRevision = 0;
    this.serverSnapshot = null;
    this.acknowledgedOperationIds.clear();
  }

  public simulateConflict(): void {
    this.serverRevision += 1;
  }

  public getServerRevision(): number { return this.serverRevision; }
  public getServerSnapshot(): OnlinePlayerSnapshot | null { return this.serverSnapshot; }

  public async bootstrap(request: BootstrapRequest, signal?: AbortSignal): Promise<OnlineResult<BootstrapResponse>> {
    if (signal?.aborted) return { ok: false, error: { code: "CANCELLED", message: "Mock bootstrap was cancelled.", retryable: false } };
    if (request.protocolVersion !== ONLINE_PROTOCOL_VERSION) {
      return { ok: false, error: error("VALIDATION_FAILED", "Mock protocol version is invalid.") };
    }
    this.accountId = request.accountId ?? null;
    if (!this.serverSnapshot && request.snapshot) {
      const valid = validateOnlineSnapshot(request.snapshot);
      if (!valid.ok) return valid;
      this.serverSnapshot = normalizeOnlineSnapshot(request.snapshot);
      this.serverRevision = 1;
    }
    return { ok: true, value: { sessionId: this.sessionId, accountId: this.accountId, serverRevision: this.serverRevision, snapshot: this.serverSnapshot } };
  }

  public async pullSnapshot(request: PullSnapshotRequest, signal?: AbortSignal): Promise<OnlineResult<PullSnapshotResponse>> {
    if (signal?.aborted) return { ok: false, error: { code: "CANCELLED", message: "Mock pull was cancelled.", retryable: false } };
    if (request.protocolVersion !== ONLINE_PROTOCOL_VERSION) return { ok: false, error: error("VALIDATION_FAILED", "Mock protocol version is invalid.") };
    return { ok: true, value: { serverRevision: this.serverRevision, snapshot: this.serverSnapshot } };
  }

  public async pushOperations(request: PushOperationsRequest, signal?: AbortSignal): Promise<OnlineResult<PushOperationsResponse>> {
    if (signal?.aborted) return { ok: false, error: { code: "CANCELLED", message: "Mock push was cancelled.", retryable: false } };
    if (request.protocolVersion !== ONLINE_PROTOCOL_VERSION) return { ok: false, error: error("VALIDATION_FAILED", "Mock protocol version is invalid.") };
    if (request.expectedServerRevision !== this.serverRevision) {
      return { ok: false, error: error("REVISION_CONFLICT", "Mock server revision is newer than the client.", this.serverRevision) };
    }
    const acknowledgedOperationIds: string[] = [];
    const duplicateOperationIds: string[] = [];
    const rejectedOperationIds: string[] = [];
    for (const operation of request.operations) {
      if (this.acknowledgedOperationIds.has(operation.operationId)) {
        duplicateOperationIds.push(operation.operationId);
        continue;
      }
      if (operation.type === "SNAPSHOT_CHECKPOINT") {
        const payload = operation.payload as { snapshot?: unknown };
        const snapshot = payload?.snapshot;
        const valid = validateOnlineSnapshot(snapshot);
        if (!valid.ok) {
          rejectedOperationIds.push(operation.operationId);
          continue;
        }
        this.serverSnapshot = normalizeOnlineSnapshot(snapshot);
      }
      this.acknowledgedOperationIds.add(operation.operationId);
      acknowledgedOperationIds.push(operation.operationId);
      this.serverRevision += 1;
    }
    return { ok: true, value: { serverRevision: this.serverRevision, acknowledgedOperationIds, duplicateOperationIds, rejectedOperationIds, snapshot: this.serverSnapshot } };
  }

  public async disconnect(): Promise<void> {
    return Promise.resolve();
  }
}
