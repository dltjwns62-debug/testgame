import { ONLINE_QUEUE_REGISTRY_KEY } from "./onlineRegistry";
import { validateClientOperation } from "./onlineValidation";
import type Phaser from "phaser";
import type { ClientOperationEnvelope, OnlineError, OperationId } from "./onlineTypes";

export const MAX_PENDING_OPERATIONS = 200;
export const MAX_PENDING_OPERATION_BYTES = 512 * 1024;

export type PendingOperationQueueState = {
  operations: ClientOperationEnvelope[];
};

export type QueueResult =
  | { ok: true; queue: PendingOperationQueueState }
  | { ok: false; queue: PendingOperationQueueState; error: OnlineError };

export function createEmptyPendingOperationQueue(): PendingOperationQueueState {
  return { operations: [] };
}

function serializedBytes(queue: PendingOperationQueueState): number {
  return new TextEncoder().encode(JSON.stringify(queue)).byteLength;
}

export function normalizePendingOperationQueue(value: unknown): PendingOperationQueueState {
  const candidate = value && typeof value === "object" ? value as Partial<PendingOperationQueueState> : {};
  const seen = new Set<string>();
  const operations = Array.isArray(candidate.operations)
    ? candidate.operations.filter((operation): operation is ClientOperationEnvelope => {
      const valid = validateClientOperation(operation).ok;
      if (!valid || seen.has(operation.operationId)) return false;
      seen.add(operation.operationId);
      return true;
    }).slice(0, MAX_PENDING_OPERATIONS)
    : [];
  const queue = { operations };
  while (serializedBytes(queue) > MAX_PENDING_OPERATION_BYTES && queue.operations.length > 0) queue.operations.pop();
  return queue;
}

export function enqueuePendingOperation(queue: PendingOperationQueueState, operation: ClientOperationEnvelope): QueueResult {
  const normalized = normalizePendingOperationQueue(queue);
  if (!validateClientOperation(operation).ok) {
    return { ok: false, queue: normalized, error: { code: "VALIDATION_FAILED", message: "Operation was rejected by queue validation.", retryable: false } };
  }
  if (normalized.operations.some((entry) => entry.operationId === operation.operationId)) return { ok: true, queue: normalized };
  if (normalized.operations.length >= MAX_PENDING_OPERATIONS) {
    return { ok: false, queue: normalized, error: { code: "QUEUE_LIMIT_EXCEEDED", message: "Pending operation count limit reached.", retryable: false } };
  }
  const next = { operations: [...normalized.operations, operation] };
  if (serializedBytes(next) > MAX_PENDING_OPERATION_BYTES) {
    return { ok: false, queue: normalized, error: { code: "QUEUE_LIMIT_EXCEEDED", message: "Pending operation byte limit reached.", retryable: false } };
  }
  return { ok: true, queue: next };
}

export function peekPendingOperationBatch(queue: PendingOperationQueueState, size = 20): ClientOperationEnvelope[] {
  return normalizePendingOperationQueue(queue).operations.slice(0, Math.max(0, size));
}

export function acknowledgePendingOperations(queue: PendingOperationQueueState, operationIds: readonly OperationId[]): PendingOperationQueueState {
  const ids = new Set(operationIds);
  return { operations: normalizePendingOperationQueue(queue).operations.filter((operation) => !ids.has(operation.operationId)) };
}

export function rejectPendingOperation(queue: PendingOperationQueueState, operationId: OperationId): PendingOperationQueueState {
  return acknowledgePendingOperations(queue, [operationId]);
}

export function serializePendingOperationQueue(queue: PendingOperationQueueState): string {
  return JSON.stringify(normalizePendingOperationQueue(queue));
}

export function deserializePendingOperationQueue(raw: string | null): PendingOperationQueueState {
  if (!raw) return createEmptyPendingOperationQueue();
  try { return normalizePendingOperationQueue(JSON.parse(raw)); } catch { return createEmptyPendingOperationQueue(); }
}

export function getOrCreatePendingOperationQueue(registry: Phaser.Data.DataManager): PendingOperationQueueState {
  const queue = normalizePendingOperationQueue(registry.get(ONLINE_QUEUE_REGISTRY_KEY));
  registry.set(ONLINE_QUEUE_REGISTRY_KEY, queue);
  return queue;
}

export function setPendingOperationQueue(registry: Phaser.Data.DataManager, queue: PendingOperationQueueState): void {
  registry.set(ONLINE_QUEUE_REGISTRY_KEY, normalizePendingOperationQueue(queue));
}
