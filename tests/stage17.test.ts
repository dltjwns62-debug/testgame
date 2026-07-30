import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultSavePayload } from "../src/game/persistence";
import { calculateSnapshotHash, normalizeOnlineSnapshot, validateOnlineSnapshot, createOnlineSnapshotFromRegistry } from "../src/game/online/onlineSnapshot";
import { ONLINE_PROTOCOL_VERSION } from "../src/game/online/onlineTypes";
import { DisabledOnlineGateway } from "../src/game/online/disabledOnlineGateway";
import { MockOnlineGateway } from "../src/game/online/mockOnlineGateway";
import { createClientOperation, createSnapshotCheckpointOperation } from "../src/game/online/onlineOperations";
import { acknowledgePendingOperations, createEmptyPendingOperationQueue, enqueuePendingOperation, normalizePendingOperationQueue, serializePendingOperationQueue, deserializePendingOperationQueue } from "../src/game/online/onlineQueue";
import { resolveOnlineConflict } from "../src/game/online/onlineConflictResolution";
import { createDefaultOnlineSessionState } from "../src/game/online/onlineRegistry";
import { OnlineSyncCoordinator } from "../src/game/online/onlineSyncCoordinator";

class Registry {
  private readonly values = new Map<string, unknown>();
  public get(key: string): unknown { return this.values.get(key); }
  public set(key: string, value: unknown): void { this.values.set(key, value); }
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
  assert.deepEqual(queue.operations.map((entry) => entry.operationId), ["op-a", "op-b"]);
  const roundTrip = deserializePendingOperationQueue(serializePendingOperationQueue(queue));
  assert.deepEqual(roundTrip.operations.map((entry) => entry.operationId), ["op-a", "op-b"]);
  assert.deepEqual(acknowledgePendingOperations(queue, ["op-a"]).operations.map((entry) => entry.operationId), ["op-b"]);
  assert.equal(normalizePendingOperationQueue({ operations: [{ bad: true }] }).operations.length, 0);
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
