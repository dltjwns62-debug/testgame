import { ONLINE_PROTOCOL_VERSION, type BattleResultSubmissionOperation, type BattleResultSubmissionPayload, type ClientOperationEnvelope, type DeviceId, type ClientInstanceId, type OfflineRewardClaimOperation, type OfflineRewardClaimPayload, type OperationId, type OnlineOperationType, type OnlinePlayerSnapshot, type ServerRevision } from "./onlineTypes";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(record[key])).join(",") + "}";
}

export function hashOperationPayload(payload: unknown): string {
  const input = stableStringify(payload);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createOperationId(source: () => string = () => globalThis.crypto?.randomUUID?.() ?? "op-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)): OperationId {
  return source();
}

export function createClientOperation(
  type: OnlineOperationType,
  payload: unknown,
  context: { deviceId: DeviceId; clientInstanceId: ClientInstanceId; baseServerRevision: ServerRevision; createdAtMs?: number; operationId?: OperationId },
): ClientOperationEnvelope {
  return {
    protocolVersion: ONLINE_PROTOCOL_VERSION,
    operationId: context.operationId ?? createOperationId(),
    deviceId: context.deviceId,
    clientInstanceId: context.clientInstanceId,
    createdAtMs: context.createdAtMs ?? Date.now(),
    baseServerRevision: context.baseServerRevision,
    type,
    payloadHash: hashOperationPayload(payload),
    payload,
  };
}

export function createSnapshotCheckpointOperation(snapshot: OnlinePlayerSnapshot, context: Parameters<typeof createClientOperation>[2]): ClientOperationEnvelope {
  return createClientOperation("SNAPSHOT_CHECKPOINT", { snapshot }, context);
}

export function createBattleResultSubmissionOperation(payload: BattleResultSubmissionPayload, context: Parameters<typeof createClientOperation>[2]): BattleResultSubmissionOperation {
  return createClientOperation("BATTLE_RESULT_SUBMISSION", payload, context) as BattleResultSubmissionOperation;
}

export function createOfflineRewardClaimOperation(payload: OfflineRewardClaimPayload, context: Parameters<typeof createClientOperation>[2]): OfflineRewardClaimOperation {
  return createClientOperation("OFFLINE_REWARD_CLAIM", payload, context) as OfflineRewardClaimOperation;
}
