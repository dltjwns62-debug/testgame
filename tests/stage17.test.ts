import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultSavePayload } from "../src/game/persistence";
import { calculateSnapshotHash, normalizeOnlineSnapshot, validateOnlineSnapshot, createOnlineSnapshotFromRegistry } from "../src/game/online/onlineSnapshot";
import { ONLINE_PROTOCOL_VERSION, type BootstrapResponse, type OnlineGateway, type OnlineResult, type PullSnapshotResponse, type PushOperationsResponse } from "../src/game/online/onlineTypes";
import { DisabledOnlineGateway } from "../src/game/online/disabledOnlineGateway";
import { MockOnlineGateway } from "../src/game/online/mockOnlineGateway";
import { createBattleResultSubmissionOperation, createClientOperation, createOfflineRewardClaimOperation, createSnapshotCheckpointOperation, hashOperationPayload } from "../src/game/online/onlineOperations";
import { MAX_PENDING_OPERATION_BYTES, MAX_RETRY_COUNT, acknowledgePendingOperations, calculateRetryDelayMs, createEmptyPendingOperationQueue, enqueuePendingOperation, loadPendingOperationQueue, normalizePendingOperationQueue, peekPendingOperationBatch, rejectPendingOperation, retryPendingOperation, serializePendingOperationQueue, deserializePendingOperationQueue } from "../src/game/online/onlineQueue";
import { MAX_OPERATION_PAYLOAD_BYTES, containsSensitiveOnlineValue, validateClientOperation, validateOnlineProtocolVersion } from "../src/game/online/onlineValidation";
import { resolveOnlineConflict } from "../src/game/online/onlineConflictResolution";
import { createDefaultOnlineSessionState } from "../src/game/online/onlineRegistry";
import { OnlineSyncCoordinator } from "../src/game/online/onlineSyncCoordinator";

class Registry {
  private readonly values = new Map<string, unknown>();
  public setCallCount = 0;
  public get(key: string): unknown { return this.values.get(key); }
  public set(key: string, value: unknown): void { this.setCallCount += 1; this.values.set(key, value); }
}

class DeferredGateway implements OnlineGateway {
  public bootstrapCalls = 0;
  public pullCalls = 0;
  public pushCalls = 0;
  public bootstrapResolve: ((result: OnlineResult<BootstrapResponse>) => void) | null = null;
  public pullResolve: ((result: OnlineResult<PullSnapshotResponse>) => void) | null = null;
  public pushResolve: ((result: OnlineResult<PushOperationsResponse>) => void) | null = null;
  public async bootstrap(): Promise<OnlineResult<BootstrapResponse>> { this.bootstrapCalls += 1; return new Promise((resolve) => { this.bootstrapResolve = resolve; }); }
  public async pullSnapshot(): Promise<OnlineResult<PullSnapshotResponse>> { this.pullCalls += 1; return new Promise((resolve) => { this.pullResolve = resolve; }); }
  public async pushOperations(): Promise<OnlineResult<PushOperationsResponse>> { this.pushCalls += 1; return new Promise((resolve) => { this.pushResolve = resolve; }); }
  public async disconnect(): Promise<void> { return Promise.resolve(); }
}

function snapshot() {
  const registry = new Registry();
  const state = createDefaultOnlineSessionState();
  return createOnlineSnapshotFromRegistry(registry as never, { deviceId: state.deviceId, clientInstanceId: state.clientInstanceId, nowMs: 1000 });
}

test("online snapshot has protocol version, stable hash, and no sensitive fields", () => {
  const value = snapshot();
  assert.equal(value.protocolVersion, ONLINE_PROTOCOL_VERSION);
  assert.equal(validateOnlineSnapshot(value).ok, true);
  assert.equal(calculateSnapshotHash(value), value.snapshotHash);
  assert.equal(JSON.stringify(value).includes("token"), false);
  assert.equal(JSON.stringify(value).includes("password"), false);
});

test("snapshot normalization rejects transient and malformed data without changing SaveEnvelope schema", () => {
  const value = snapshot();
  const normalized = normalizeOnlineSnapshot({ ...value, snapshotHash: "bad", token: "secret", battleState: { hp: 1 } });
  assert.ok(normalized);
  assert.equal(validateOnlineSnapshot(normalized).ok, true);
  assert.equal("token" in normalized!, false);
  assert.deepEqual(createDefaultSavePayload().battleAutoHuntEnabled, false);
});

test("disabled gateway never performs a network request and returns ONLINE_DISABLED", async () => {
  const gateway = new DisabledOnlineGateway();
  const result = await gateway.bootstrap({ protocolVersion: 1, deviceId: "device", clientInstanceId: "client" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "ONLINE_DISABLED");
});

test("mock gateway bootstrap, push, pull, and duplicate operation acknowledgement are deterministic", async () => {
  const gateway = new MockOnlineGateway();
  const value = snapshot();
  const boot = await gateway.bootstrap({ protocolVersion: 1, deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, snapshot: value });
  assert.equal(boot.ok, true);
  const operation = createSnapshotCheckpointOperation(value, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 1, operationId: "op-1" });
  const first = await gateway.pushOperations({ protocolVersion: 1, sessionId: "mock-session-1", expectedServerRevision: 1, operations: [operation] });
  assert.equal(first.ok, true);
  if (first.ok) assert.deepEqual(first.value.acknowledgedOperationIds, ["op-1"]);
  const duplicate = await gateway.pushOperations({ protocolVersion: 1, sessionId: "mock-session-1", expectedServerRevision: 2, operations: [operation] });
  assert.equal(duplicate.ok, true);
  if (duplicate.ok) assert.deepEqual(duplicate.value.duplicateOperationIds, ["op-1"]);
  const pull = await gateway.pullSnapshot({ protocolVersion: 1, sessionId: "mock-session-1", expectedServerRevision: 2 });
  assert.equal(pull.ok, true);
});

test("operation queue is FIFO, idempotent, serialized, and removes acknowledgements", () => {
  const value = snapshot();
  const first = createClientOperation("CLIENT_PREFERENCE_UPDATE", { key: "x" }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "op-a" });
  const second = createClientOperation("FORMATION_UPDATE", { slot: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "op-b" });
  let queue = createEmptyPendingOperationQueue();
  const one = enqueuePendingOperation(queue, first); assert.equal(one.ok, true); if (one.ok) queue = one.queue;
  const two = enqueuePendingOperation(queue, second); assert.equal(two.ok, true); if (two.ok) queue = two.queue;
  const duplicate = enqueuePendingOperation(queue, first); assert.equal(duplicate.ok, true);
  assert.deepEqual(queue.records.map((entry) => entry.operation.operationId), ["op-a", "op-b"]);
  const roundTrip = deserializePendingOperationQueue(serializePendingOperationQueue(queue));
  assert.deepEqual(roundTrip.records.map((entry) => entry.operation.operationId), ["op-a", "op-b"]);
  assert.deepEqual(acknowledgePendingOperations(queue, ["op-a"]).records.map((entry) => entry.operation.operationId), ["op-b"]);
  assert.equal(normalizePendingOperationQueue({ operations: [{ bad: true }] }).records.length, 0);
});

test("queue records preserve rejection reasons, retry backoff, retry eligibility, and retry due ordering", () => {
  const value = snapshot();
  const operation = createClientOperation("CLIENT_PREFERENCE_UPDATE", { key: "x" }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "retry-op" });
  const queued = enqueuePendingOperation(createEmptyPendingOperationQueue(), operation, 1000);
  assert.equal(queued.ok, true);
  if (!queued.ok) return;
  const rejected = rejectPendingOperation(queued.queue, "retry-op", { code: "VALIDATION_FAILED", message: "bad payload" }, 1000);
  assert.equal(rejected.records[0].status, "REJECTED");
  assert.equal(rejected.records[0].lastErrorMessage, "bad payload");
  const retried = retryPendingOperation(queued.queue, "retry-op", { code: "NETWORK_UNAVAILABLE", message: "offline" }, { nowMs: 1000, jitter: () => 0 });
  assert.equal(retried.records[0].status, "RETRY_WAIT");
  assert.equal(retried.records[0].retryCount, 1);
  assert.equal(retried.records[0].nextAttemptAtMs, 2000);
  assert.equal(peekPendingOperationBatch(retried, 1, 1999).length, 0);
  assert.equal(peekPendingOperationBatch(retried, 1, 2000).length, 1);
  assert.equal(calculateRetryDelayMs({ retryCount: 99, retryAfterMs: 7, jitter: () => 0 }), 7);
  assert.equal(retryPendingOperation(queued.queue, "retry-op", { code: "VALIDATION_FAILED", message: "terminal" }, { nowMs: 1000 }).records[0].status, "REJECTED");
});

test("corrupt and over-limit queues return errors without silently truncating records", () => {
  const loaded = loadPendingOperationQueue("not-json");
  assert.equal(loaded.ok, false);
  if (!loaded.ok) assert.equal(loaded.error.code, "QUEUE_CORRUPTED");
  const value = snapshot();
  const records = Array.from({ length: 201 }, (_, index) => ({ operation: createClientOperation("CLIENT_PREFERENCE_UPDATE", { index }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "cap-" + index }), status: "PENDING", retryCount: 0, nextAttemptAtMs: 0, lastErrorCode: null, lastErrorMessage: null }));
  const over = loadPendingOperationQueue(JSON.stringify({ records }));
  assert.equal(over.ok, false);
  assert.equal(over.queue.records.length, 201);
});

test("online validation rejects future protocol, unknown operation, bad payload hash, sensitive payload, oversized payload, and client final rewards", () => {
  assert.equal(validateOnlineProtocolVersion(2).ok, false);
  const base = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "valid" });
  assert.equal(validateClientOperation(base).ok, true);
  assert.equal(validateClientOperation({ ...base, type: "UNKNOWN" }).ok, false);
  assert.equal(validateClientOperation({ ...base, payloadHash: "wrong" }).ok, false);
  const sensitive = createClientOperation("CLIENT_PREFERENCE_UPDATE", { token: "secret" }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "secret" });
  assert.equal(validateClientOperation(sensitive).ok, false);
  const oversized = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: "x".repeat(MAX_OPERATION_PAYLOAD_BYTES) }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "oversized" });
  assert.equal(validateClientOperation(oversized).ok, false);
  const reward = createClientOperation("BATTLE_RESULT_SUBMISSION", { finalGold: 999 }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "reward" });
  assert.equal(validateClientOperation(reward).ok, false);
  assert.equal(hashOperationPayload({ value: 1 }), base.payloadHash);
});

test("conflict resolution keeps server economy and local preferences while exposing formation conflicts", () => {
  const local = snapshot();
  const server = normalizeOnlineSnapshot({ ...local, playerGold: 50, baseServerRevision: 2 })!;
  const resolved = resolveOnlineConflict(local, server);
  assert.equal(resolved.status, "RESOLVED");
  if (resolved.status === "RESOLVED") assert.equal(resolved.snapshot.playerGold, 50);
  const changedServer = normalizeOnlineSnapshot({ ...server, formation: { ...server.formation, slots: server.formation.slots.map((slot, index) => index === 1 ? { ...slot, rosterUnitId: null } : slot) }, baseServerRevision: 3 })!;
  const manual = resolveOnlineConflict(local, changedServer);
  assert.equal(manual.status, "MANUAL_REQUIRED");
  const sameBase = normalizeOnlineSnapshot({ ...server, baseServerRevision: local.baseServerRevision, playerGold: 70 })!;
  const resolvedSameBase = resolveOnlineConflict(local, sameBase);
  assert.equal(resolvedSameBase.status, "RESOLVED");
  if (resolvedSameBase.status === "RESOLVED") assert.equal(validateOnlineSnapshot(resolvedSameBase.snapshot).ok, true);
});

test("sync coordinator keeps disabled mode local and mock mode transitions without fetch", async () => {
  const registry = new Registry();
  const disabled = new OnlineSyncCoordinator(registry as never, new DisabledOnlineGateway());
  const disabledResult = await disabled.bootstrap(snapshot());
  assert.equal(disabledResult.ok, false);
  assert.equal(disabled.getState().status, "DISABLED");
  const mockRegistry = new Registry();
  const mock = new MockOnlineGateway();
  const coordinator = new OnlineSyncCoordinator(mockRegistry as never, mock, () => 2000);
  mockRegistry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "OFFLINE" });
  const result = await coordinator.bootstrap(snapshot());
  assert.equal(result.ok, true);
  assert.equal(coordinator.getState().status, "ONLINE");
  await coordinator.disconnect();
  assert.equal(coordinator.getState().status, "OFFLINE");
});

test("coordinator blocks concurrent bootstrap/sync and dispose aborts stale callbacks without registry writes", async () => {
  const registry = new Registry();
  registry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "OFFLINE" });
  const gateway = new DeferredGateway();
  const coordinator = new OnlineSyncCoordinator(registry as never, gateway, { timeoutMs: 5000 });
  const first = coordinator.bootstrap(snapshot());
  await Promise.resolve();
  const second = await coordinator.bootstrap(snapshot());
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.error.code, "SERVER_REJECTED");
  registry.setCallCount = 0;
  const beforeDispose = JSON.stringify(registry.get("testgame.onlineSession"));
  const disposeStartedAt = Date.now();
  await coordinator.dispose();
  gateway.bootstrapResolve?.({ ok: true, value: { protocolVersion: 1, sessionId: "late", accountId: null, serverRevision: 1, snapshot: null } });
  const result = await Promise.race([first, new Promise<null>((resolve) => setTimeout(() => resolve(null), 100))]);
  assert.notEqual(result, null);
  assert.ok(Date.now() - disposeStartedAt < 1000);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "CANCELLED");
  assert.equal(JSON.stringify(registry.get("testgame.onlineSession")), beforeDispose);
  assert.equal(registry.setCallCount, 0);
  assert.equal(gateway.bootstrapCalls, 1);
});

test("coordinator ignores a lower server revision and disabled mode does not call its gateway", async () => {
  const disabledRegistry = new Registry();
  let disabledCalls = 0;
  const disabledGateway = new DisabledOnlineGateway();
  const originalBootstrap = disabledGateway.bootstrap.bind(disabledGateway);
  disabledGateway.bootstrap = async (...args) => { disabledCalls += 1; return originalBootstrap(...args); };
  const disabled = new OnlineSyncCoordinator(disabledRegistry as never, disabledGateway);
  const disabledResult = await disabled.sync(snapshot());
  assert.equal(disabledResult.ok, false);
  assert.equal(disabledCalls, 0);

  const registry = new Registry();
  registry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "ONLINE", serverRevision: 2 });
  const gateway: OnlineGateway = {
    bootstrap: async () => ({ ok: true, value: { protocolVersion: 1, sessionId: "s", accountId: null, serverRevision: 2, snapshot: null } }),
    pushOperations: async () => ({ ok: true, value: { protocolVersion: 1, serverRevision: 2, acknowledgedOperationIds: [], duplicateOperationIds: [], rejectedOperationIds: [], rejectedReasons: {}, snapshot: null } }),
    pullSnapshot: async () => ({ ok: true, value: { protocolVersion: 1, serverRevision: 1, snapshot: null } }),
    disconnect: async () => Promise.resolve(),
  };
  const coordinator = new OnlineSyncCoordinator(registry as never, gateway);
  const result = await coordinator.sync(snapshot());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "SERVER_REJECTED");
  assert.equal(coordinator.getState().serverRevision, 2);
});

test("snapshot rejects a hash mutation", () => {
  const value = snapshot();
  assert.equal(validateOnlineSnapshot({ ...value, playerGold: value.playerGold + 1 }).ok, false);
});

test("snapshot rejects owned roster projection drift", () => {
  const value = snapshot();
  assert.equal(validateOnlineSnapshot({ ...value, ownedRoster: [] }).ok, false);
});

test("snapshot rejects progression projection drift", () => {
  const value = snapshot();
  assert.equal(validateOnlineSnapshot({ ...value, progression: [] }).ok, false);
});

test("snapshot rejects malformed formation data", () => {
  const value = snapshot();
  assert.equal(validateOnlineSnapshot({ ...value, formation: { ...value.formation, slots: [] } }).ok, false);
});

test("snapshot rejects a future protocol version", () => {
  assert.equal(validateOnlineSnapshot({ ...snapshot(), protocolVersion: 2 }).ok, false);
});

test("snapshot sensitive field detection handles nested values", () => {
  assert.equal(containsSensitiveOnlineValue({ nested: [{ authorization: "secret" }] }), true);
});

test("sensitive value detection handles circular objects without throwing", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.equal(containsSensitiveOnlineValue(circular), false);
});

test("resolved conflict recomputes its snapshot hash", () => {
  const local = snapshot();
  const server = normalizeOnlineSnapshot({ ...local, playerGold: 99, baseServerRevision: 4 })!;
  const result = resolveOnlineConflict(local, server);
  assert.equal(result.status, "RESOLVED");
  if (result.status === "RESOLVED") assert.equal(result.snapshot.snapshotHash, calculateSnapshotHash(result.snapshot));
});

test("same snapshot hash is a no-conflict result", () => {
  const value = snapshot();
  const result = resolveOnlineConflict(value, value);
  assert.equal(result.status, "NO_CONFLICT");
});

test("future protocol conflict requires manual resolution", () => {
  const local = snapshot();
  const server = { ...local, protocolVersion: 2 } as typeof local;
  const result = resolveOnlineConflict(local, server);
  assert.equal(result.status, "MANUAL_REQUIRED");
});

test("operation rejects oversized identifiers", () => {
  const operation = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "valid" });
  assert.equal(validateClientOperation({ ...operation, operationId: "x".repeat(129) }).ok, false);
  assert.equal(validateClientOperation({ ...operation, deviceId: "x".repeat(129) }).ok, false);
  assert.equal(validateClientOperation({ ...operation, clientInstanceId: "x".repeat(129) }).ok, false);
});

test("operation rejects invalid timestamps and revisions", () => {
  const operation = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "time" });
  assert.equal(validateClientOperation({ ...operation, createdAtMs: -1 }).ok, false);
  assert.equal(validateClientOperation({ ...operation, baseServerRevision: -1 }).ok, false);
});

test("operation rejects final experience and item reward authority fields", () => {
  const experience = createClientOperation("OFFLINE_REWARD_CLAIM", { finalExperience: 10 }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "exp" });
  const items = createClientOperation("BATTLE_RESULT_SUBMISSION", { finalItemIds: ["item"] }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "items" });
  assert.equal(validateClientOperation(experience).ok, false);
  assert.equal(validateClientOperation(items).ok, false);
});

test("retry-after takes priority and jitter is injected", () => {
  assert.equal(calculateRetryDelayMs({ retryCount: 1, retryAfterMs: 2000, jitter: () => 25 }), 2025);
});

test("retry delay is capped at the maximum", () => {
  assert.equal(calculateRetryDelayMs({ retryCount: 99, jitter: () => 999999 }), 300000);
});

test("terminal auth errors remain rejected", () => {
  const value = snapshot();
  const operation = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "auth" });
  const queued = enqueuePendingOperation(createEmptyPendingOperationQueue(), operation, 0);
  assert.equal(queued.ok, true);
  if (queued.ok) assert.equal(retryPendingOperation(queued.queue, operation.operationId, { code: "AUTH_REQUIRED", message: "login" }, { nowMs: 0 }).records[0].status, "REJECTED");
});

test("retry count over the cap becomes rejected", () => {
  const value = snapshot();
  const operation = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "retry-cap" });
  let queue = enqueuePendingOperation(createEmptyPendingOperationQueue(), operation, 0);
  assert.equal(queue.ok, true);
  if (!queue.ok) return;
  for (let count = 0; count < MAX_RETRY_COUNT; count += 1) queue = { ok: true, queue: retryPendingOperation(queue.queue, operation.operationId, { code: "NETWORK_UNAVAILABLE", message: "offline" }, { nowMs: count, jitter: () => 0 }) };
  assert.equal(retryPendingOperation(queue.queue, operation.operationId, { code: "NETWORK_UNAVAILABLE", message: "offline" }, { nowMs: 100 }).records[0].status, "REJECTED");
});

test("rejected records are not eligible for a batch", () => {
  const value = snapshot();
  const operation = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "rejected" });
  const queued = enqueuePendingOperation(createEmptyPendingOperationQueue(), operation, 0);
  assert.equal(queued.ok, true);
  if (queued.ok) {
    const rejected = rejectPendingOperation(queued.queue, operation.operationId, { code: "VALIDATION_FAILED", message: "bad" }, 0);
    assert.equal(peekPendingOperationBatch(rejected, 1, Number.MAX_SAFE_INTEGER).length, 0);
  }
});

test("acknowledging an unknown operation preserves queued records", () => {
  const value = snapshot();
  const operation = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "keep" });
  const queued = enqueuePendingOperation(createEmptyPendingOperationQueue(), operation, 0);
  assert.equal(queued.ok, true);
  if (queued.ok) assert.equal(acknowledgePendingOperations(queued.queue, ["unknown"], 0).records.length, 1);
});

test("legacy operation arrays migrate to pending records", () => {
  const operation = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, operationId: "legacy" });
  const migrated = normalizePendingOperationQueue({ operations: [operation] }, 123);
  assert.equal(migrated.records[0].status, "PENDING");
  assert.equal(migrated.records[0].nextAttemptAtMs, 123);
});

test("queue byte cap rejects a new operation without changing the queue", () => {
  const value = snapshot();
  const large = "x".repeat(60000);
  let queue = createEmptyPendingOperationQueue();
  for (let index = 0; index < 8; index += 1) {
    const result = enqueuePendingOperation(queue, createClientOperation("CLIENT_PREFERENCE_UPDATE", { large }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "bytes-" + index }), 0);
    if (!result.ok) break;
    queue = result.queue;
  }
  assert.ok(JSON.stringify(queue).length < MAX_PENDING_OPERATION_BYTES * 2);
  const result = enqueuePendingOperation(queue, createClientOperation("CLIENT_PREFERENCE_UPDATE", { large }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "bytes-final" }), 0);
  assert.equal(result.ok, false);
});

test("mock gateway rejects invalid operations without advancing revision", async () => {
  const gateway = new MockOnlineGateway();
  const invalid = { operationId: "bad", protocolVersion: 1, deviceId: "device", clientInstanceId: "client", createdAtMs: 0, baseServerRevision: 0, type: "CLIENT_PREFERENCE_UPDATE", payloadHash: "wrong", payload: {} } as never;
  const result = await gateway.pushOperations({ protocolVersion: 1, sessionId: "mock-session-1", expectedServerRevision: 0, operations: [invalid] });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.rejectedOperationIds, ["bad"]);
    assert.equal(gateway.getServerRevision(), 0);
  }
});

test("mock gateway returns cancelled for an aborted request", async () => {
  const gateway = new MockOnlineGateway();
  const controller = new AbortController();
  controller.abort();
  const result = await gateway.pullSnapshot({ protocolVersion: 1, sessionId: null, expectedServerRevision: null }, controller.signal);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "CANCELLED");
});

test("coordinator dispose is idempotent and leaves the registry stable", async () => {
  const registry = new Registry();
  const coordinator = new OnlineSyncCoordinator(registry as never, new DisabledOnlineGateway());
  await coordinator.dispose();
  await coordinator.dispose();
  assert.equal(registry.get("testgame.onlineSession"), undefined);
});

test("coordinator does not enqueue operations in disabled mode", async () => {
  const registry = new Registry();
  registry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(false), status: "DISABLED", mockMode: false });
  const coordinator = new OnlineSyncCoordinator(registry as never, new DisabledOnlineGateway());
  const before = registry.get("testgame.onlineSession");
  const result = await coordinator.sync(snapshot());
  assert.equal(result.ok, false);
  assert.deepEqual(registry.get("testgame.onlineSession"), before);
});

test("different-base formation conflict remains manual", () => {
  const local = snapshot();
  const occupiedIndex = local.formation.slots.findIndex((slot, index) => index > 0 && slot.rosterUnitId !== null);
  const server = normalizeOnlineSnapshot({ ...local, baseServerRevision: 5, formation: { ...local.formation, slots: local.formation.slots.map((slot, index) => index === occupiedIndex ? { ...slot, rosterUnitId: null } : slot) } })!;
  const result = resolveOnlineConflict(local, server);
  assert.equal(result.status, "MANUAL_REQUIRED");
});

test("OpenAPI contract exposes six versioned paths without a server URL", async () => {
  const contract = JSON.parse(await (await import("node:fs/promises")).readFile("docs/online-api.openapi.json", "utf8")) as { openapi: string; servers: unknown[]; paths: Record<string, unknown> };
  assert.equal(contract.openapi, "3.0.3");
  assert.deepEqual(contract.servers, []);
  assert.deepEqual(Object.keys(contract.paths).sort(), ["/v1/battles/submit", "/v1/health", "/v1/offline/claim", "/v1/session/bootstrap", "/v1/sync/pull", "/v1/sync/push"]);
});

test("conflict resolution keeps server-owned units, progression, gold, and inventory", () => {
  const base = snapshot();
  const server = normalizeOnlineSnapshot({ ...base, baseServerRevision: 3, playerGold: 50 })!;
  const shopUnit = { rosterUnitId: "owned-swordsman", unitDefinitionId: "mercenary-swordsman", unitRole: "MERCENARY" as const, displayName: "Swordsman", level: 1, experience: 0 };
  const localOwnedUnits = base.formation.ownedUnits.map((unit, index) => index === 0 ? { ...unit, level: 5, experience: 100 } : unit).concat(shopUnit);
  const local = normalizeOnlineSnapshot({
    ...base,
    baseServerRevision: 3,
    playerGold: 999,
    formation: { ownedUnits: localOwnedUnits, slots: base.formation.slots.map((slot, index) => index === 1 ? { ...slot, rosterUnitId: null } : slot) },
    inventory: { ...base.inventory, nextItemInstanceSequence: 99 },
    controlGroups: { groups: base.controlGroups.groups.map((group, index) => index === 0 ? [shopUnit.rosterUnitId] : group) as typeof base.controlGroups.groups },
  })!;
  const result = resolveOnlineConflict(local, server);
  assert.equal(result.status, "RESOLVED");
  if (result.status === "RESOLVED") {
    assert.deepEqual(result.snapshot.ownedRoster, server.ownedRoster);
    assert.deepEqual(result.snapshot.progression, server.progression);
    assert.equal(result.snapshot.playerGold, server.playerGold);
    assert.deepEqual(result.snapshot.inventory, server.inventory);
    assert.equal(result.snapshot.formation.slots[1].rosterUnitId, null);
    assert.equal(result.snapshot.controlGroups.groups[0].includes(shopUnit.rosterUnitId), false);
    assert.equal(validateOnlineSnapshot(result.snapshot).ok, true);
  }
});

test("coordinator sync returns the resolved snapshot instead of the raw server snapshot", async () => {
  const base = snapshot();
  const server = normalizeOnlineSnapshot({ ...base, baseServerRevision: 1, playerGold: 50 })!;
  const local = normalizeOnlineSnapshot({
    ...base,
    baseServerRevision: 1,
    playerGold: 999,
    formation: { ...base.formation, slots: base.formation.slots.map((slot, index) => index === 1 ? { ...slot, rosterUnitId: null } : slot) },
    keyBindings: { ...base.keyBindings, whirlwindCode: "KeyE" },
  })!;
  const registry = new Registry();
  registry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "ONLINE", sessionId: "mock", serverRevision: 1 });
  const gateway: OnlineGateway = {
    bootstrap: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pullSnapshot: async () => ({ ok: true, value: { protocolVersion: 1, serverRevision: 1, snapshot: server } }),
    pushOperations: async () => ({ ok: true, value: { protocolVersion: 1, serverRevision: 1, acknowledgedOperationIds: [], duplicateOperationIds: [], rejectedOperationIds: [], rejectedReasons: {}, snapshot: server } }),
    disconnect: async () => Promise.resolve(),
  };
  const coordinator = new OnlineSyncCoordinator(registry as never, gateway);
  const result = await coordinator.sync(local);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.value.snapshot);
    assert.equal(result.value.snapshot.playerGold, 50);
    assert.equal(result.value.snapshot.formation.slots[1].rosterUnitId, null);
    assert.equal(result.value.snapshot.keyBindings.whirlwindCode, "KeyE");
    assert.deepEqual(result.value.snapshot.ownedRoster, server.ownedRoster);
    assert.deepEqual(result.value.snapshot.progression, server.progression);
    assert.deepEqual(result.value.snapshot.inventory, server.inventory);
    assert.equal(validateOnlineSnapshot(result.value.snapshot).ok, true);
    assert.equal(calculateSnapshotHash(result.value.snapshot), result.value.snapshot.snapshotHash);
    assert.notDeepEqual(result.value.snapshot, server);
  }
  await coordinator.dispose();
});

test("revision conflict preserves pending records and does not increment retry count", async () => {
  const registry = new Registry();
  registry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "ONLINE", sessionId: "mock", serverRevision: 1 });
  const gateway: OnlineGateway = {
    bootstrap: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pullSnapshot: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pushOperations: async () => ({ ok: false, error: { code: "REVISION_CONFLICT", message: "stale", retryable: false, serverRevision: 4 } }),
    disconnect: async () => Promise.resolve(),
  };
  const coordinator = new OnlineSyncCoordinator(registry as never, gateway, { nowMs: () => 1000 });
  const value = snapshot();
  const first = coordinator.enqueue(createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 1, operationId: "conflict-1" }));
  const second = coordinator.enqueue(createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 2 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 1, operationId: "conflict-2" }));
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  const result = await coordinator.sync(value);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "REVISION_CONFLICT");
  assert.equal(coordinator.getState().status, "CONFLICT");
  assert.equal(coordinator.getState().serverRevision, 4);
  assert.deepEqual(coordinator.getQueue().records.map((record) => [record.operation.operationId, record.status, record.retryCount]), [["conflict-1", "PENDING", 0], ["conflict-2", "PENDING", 0]]);
});

test("disconnect aborts an active request and prevents a late ONLINE state", async () => {
  const registry = new Registry();
  registry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "OFFLINE" });
  const gateway = new DeferredGateway();
  const coordinator = new OnlineSyncCoordinator(registry as never, gateway, { timeoutMs: 5000 });
  const pending = coordinator.bootstrap(snapshot());
  await Promise.resolve();
  await coordinator.disconnect();
  gateway.bootstrapResolve?.({ ok: true, value: { protocolVersion: 1, sessionId: "late", accountId: null, serverRevision: 1, snapshot: null } });
  const result = await Promise.race([pending, new Promise<null>((resolve) => setTimeout(() => resolve(null), 100))]);
  assert.notEqual(result, null);
  assert.equal(result.ok, false);
  assert.equal(coordinator.getState().status, "OFFLINE");
});

test("rate limit retry-after reaches the queue next attempt time", async () => {
  const registry = new Registry();
  registry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "ONLINE", sessionId: "mock", serverRevision: 1 });
  const gateway: OnlineGateway = {
    bootstrap: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pullSnapshot: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pushOperations: async () => ({ ok: false, error: { code: "RATE_LIMITED", message: "slow down", retryable: true, retryAfterMs: 45000 } }),
    disconnect: async () => Promise.resolve(),
  };
  const coordinator = new OnlineSyncCoordinator(registry as never, gateway, { nowMs: () => 1000 });
  const value = snapshot();
  coordinator.enqueue(createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 1, operationId: "rate-limit" }));
  await coordinator.sync(value);
  const record = coordinator.getQueue().records[0];
  assert.equal(record.status, "RETRY_WAIT");
  assert.equal(record.nextAttemptAtMs, 46000);
});

test("nested and array reward authority fields are rejected", () => {
  const context = { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0 };
  assert.equal(validateClientOperation(createClientOperation("BATTLE_RESULT_SUBMISSION", { result: { finalGold: 1 } }, { ...context, operationId: "nested-gold" })).ok, false);
  assert.equal(validateClientOperation(createClientOperation("OFFLINE_REWARD_CLAIM", [{ rewardExperience: 1 }], { ...context, operationId: "array-exp" })).ok, false);
});

test("valid battle and offline DTO payloads are accepted", () => {
  const context = { deviceId: "device", clientInstanceId: "client", baseServerRevision: 0, createdAtMs: 1 };
  const battle = createBattleResultSubmissionOperation({ battleId: "battle-1", sourceWorldMonsterId: "slime-1", rosterUnitIds: ["ally-main-character"], startedAtMs: 1, endedAtMs: 2, victory: true, resultDigest: "digest", clientBuildId: "dev" }, { ...context, operationId: "battle-dto" });
  const offline = createOfflineRewardClaimOperation({ claimSequence: 1, previousServerRevision: 0, elapsedFromMs: 1, elapsedToMs: 2, selectedMonsterId: "slime-1", deployedRosterUnitIds: ["ally-main-character"] }, { ...context, operationId: "offline-dto" });
  assert.equal(validateClientOperation(battle).ok, true);
  assert.equal(validateClientOperation(offline).ok, true);
  assert.equal(validateClientOperation(createClientOperation("BATTLE_RESULT_SUBMISSION", { ...battle.payload, rosterUnitIds: [] }, { ...context, operationId: "empty-battle-roster" })).ok, false);
  assert.equal(validateClientOperation(createClientOperation("OFFLINE_REWARD_CLAIM", { ...offline.payload, deployedRosterUnitIds: ["ally-main-character", "ally-main-character"] }, { ...context, operationId: "duplicate-offline-roster" })).ok, false);
});

test("unknown snapshot fields are rejected and invalid conflict inputs remain manual", () => {
  const local = snapshot();
  const server = snapshot();
  assert.equal(validateOnlineSnapshot({ ...local, futureField: true }).ok, false);
  const result = resolveOnlineConflict({ ...local, futureField: true } as typeof local, server);
  assert.equal(result.status, "MANUAL_REQUIRED");
});

test("malformed and duplicate queue records return corruption without dropping valid neighbors", () => {
  const value = snapshot();
  const first = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "malformed-first" });
  const second = createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 2 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "malformed-second" });
  const record = (operation: typeof first) => ({ operation, status: "PENDING", retryCount: 0, nextAttemptAtMs: 0, lastErrorCode: null, lastErrorMessage: null });
  const malformed = loadPendingOperationQueue(JSON.stringify({ records: [record(first), { bad: true }, record(second)] }), 0);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.queue.records.length, 1);
  const duplicate = loadPendingOperationQueue(JSON.stringify({ records: [record(first), record(first)] }), 0);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.queue.records.length, 1);
});

test("OpenAPI response schemas match protocol fields and forbid type null", async () => {
  const contract = JSON.parse(await (await import("node:fs/promises")).readFile("docs/online-api.openapi.json", "utf8")) as {
    components: { schemas: Record<string, { required?: string[]; properties?: Record<string, unknown> }>; parameters: Record<string, unknown>; responses: Record<string, unknown> };
    paths: Record<string, Record<string, { parameters?: unknown[]; responses?: Record<string, unknown> }> >;
  };
  const schemas = contract.components.schemas;
  assert.equal(JSON.stringify(contract).includes('"type":"null"'), false);
  for (const name of ["BootstrapResponse", "PullSnapshotResponse", "PushOperationsResponse"]) assert.ok(schemas[name].required?.includes("protocolVersion"));
  assert.ok(schemas.PushOperationsResponse.required?.includes("rejectedReasons"));
  assert.ok(schemas.PushOperationsResponse.required?.includes("snapshot"));
  const refs: string[] = [];
  const collectRefs = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if ("$ref" in value && typeof (value as { $ref?: unknown }).$ref === "string") refs.push((value as { $ref: string }).$ref);
    Object.values(value).forEach(collectRefs);
  };
  collectRefs(contract);
  for (const ref of refs) {
    const parts = ref.replace(/^#\//, "").split("/");
    const section = parts[0];
    const name = parts[2];
    const component = contract.components as unknown as Record<string, Record<string, unknown>>;
    assert.ok(section === "components" && name && component[parts[1]]?.[name]);
  }
  for (const path of ["/v1/sync/push", "/v1/battles/submit", "/v1/offline/claim"]) {
    const operation = contract.paths[path].post;
    assert.ok(JSON.stringify(operation.parameters).includes("IdempotencyKey"));
    for (const code of ["400", "401", "409", "413", "429", "500"]) assert.ok(operation.responses?.[code]);
  }
  assert.deepEqual(schemas.PullRequest.required, ["protocolVersion", "sessionId", "expectedServerRevision"]);
  assert.deepEqual(schemas.PushRequest.required, ["protocolVersion", "sessionId", "expectedServerRevision", "operations"]);
  assert.equal((schemas.Operation.properties?.type as { enum?: string[] }).enum?.length, 7);
  assert.equal(JSON.stringify(contract).includes("secret"), false);
  assert.equal(JSON.stringify(contract).includes("token"), false);
});

test("gateway response protocol mismatches fail before applying response data", async () => {
  const value = snapshot();
  const bootstrapRegistry = new Registry();
  bootstrapRegistry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "OFFLINE" });
  const bootstrapGateway: OnlineGateway = {
    bootstrap: async () => ({ ok: true, value: { protocolVersion: 2, sessionId: "future", accountId: null, serverRevision: 9, snapshot: value } }),
    pullSnapshot: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pushOperations: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    disconnect: async () => Promise.resolve(),
  };
  const bootstrapCoordinator = new OnlineSyncCoordinator(bootstrapRegistry as never, bootstrapGateway);
  const bootstrapResult = await bootstrapCoordinator.bootstrap(value);
  assert.equal(bootstrapResult.ok, false);
  if (!bootstrapResult.ok) assert.equal(bootstrapResult.error.code, "FUTURE_PROTOCOL_VERSION");
  assert.equal(bootstrapCoordinator.getState().status, "ERROR");
  assert.equal(bootstrapCoordinator.getState().serverRevision, null);

  const response = { protocolVersion: 2, serverRevision: 1, acknowledgedOperationIds: ["ack"], duplicateOperationIds: [], rejectedOperationIds: [], rejectedReasons: {}, snapshot: value };
  const pushRegistry = new Registry();
  pushRegistry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "ONLINE", sessionId: "mock", serverRevision: 0 });
  const pushGateway: OnlineGateway = {
    bootstrap: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pullSnapshot: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pushOperations: async () => ({ ok: true, value: response }),
    disconnect: async () => Promise.resolve(),
  };
  const pushCoordinator = new OnlineSyncCoordinator(pushRegistry as never, pushGateway);
  pushCoordinator.enqueue(createClientOperation("CLIENT_PREFERENCE_UPDATE", { value: 1 }, { deviceId: value.deviceId, clientInstanceId: value.clientInstanceId, baseServerRevision: 0, operationId: "protocol-push" }));
  const pushResult = await pushCoordinator.sync(value);
  assert.equal(pushResult.ok, false);
  if (!pushResult.ok) assert.equal(pushResult.error.code, "FUTURE_PROTOCOL_VERSION");
  assert.equal(pushCoordinator.getState().serverRevision, 0);
  assert.equal(pushCoordinator.getQueue().records[0].status, "PENDING");

  const pullRegistry = new Registry();
  pullRegistry.set("testgame.onlineSession", { ...createDefaultOnlineSessionState(true), mockMode: true, status: "ONLINE", sessionId: "mock", serverRevision: 0 });
  const pullGateway: OnlineGateway = {
    bootstrap: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    pullSnapshot: async () => ({ ok: true, value: { protocolVersion: 2, serverRevision: 4, snapshot: value } }),
    pushOperations: async () => ({ ok: false, error: { code: "SERVER_ERROR", message: "unused", retryable: true } }),
    disconnect: async () => Promise.resolve(),
  };
  const pullCoordinator = new OnlineSyncCoordinator(pullRegistry as never, pullGateway);
  const pullResult = await pullCoordinator.sync(value);
  assert.equal(pullResult.ok, false);
  if (!pullResult.ok) assert.equal(pullResult.error.code, "FUTURE_PROTOCOL_VERSION");
  assert.equal(pullCoordinator.getState().serverRevision, 0);
});
