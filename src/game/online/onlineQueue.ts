import type Phaser from "phaser";
import { ONLINE_QUEUE_REGISTRY_KEY } from "./onlineRegistry";
import { validateClientOperation } from "./onlineValidation";
import type { ClientOperationEnvelope, OnlineError, OnlineErrorCode, OperationId } from "./onlineTypes";

export const MAX_PENDING_OPERATIONS = 200;
export const MAX_PENDING_OPERATION_BYTES = 512 * 1024;
export const INITIAL_RETRY_DELAY_MS = 1_000;
export const MAX_RETRY_DELAY_MS = 300_000;
export const MAX_RETRY_COUNT = 8;

export type PendingOperationStatus = "PENDING" | "RETRY_WAIT" | "REJECTED";

export type PendingOperationRecord = {
  operation: ClientOperationEnvelope;
  status: PendingOperationStatus;
  retryCount: number;
  nextAttemptAtMs: number;
  lastErrorCode: OnlineErrorCode | null;
  lastErrorMessage: string | null;
};

export type PendingOperationQueueState = {
  records: PendingOperationRecord[];
};

export type QueueResult =
  | { ok: true; queue: PendingOperationQueueState }
  | { ok: false; queue: PendingOperationQueueState; error: OnlineError };

export type QueueLoadResult =
  | { ok: true; queue: PendingOperationQueueState }
  | { ok: false; queue: PendingOperationQueueState; error: OnlineError };

export function createEmptyPendingOperationQueue(): PendingOperationQueueState {
  return { records: [] };
}

function serializedBytes(queue: PendingOperationQueueState): number {
  return new TextEncoder().encode(JSON.stringify(queue)).byteLength;
}

function safeMs(value: unknown, fallback: number): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : fallback;
}

function toRecord(value: unknown, nowMs: number): PendingOperationRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PendingOperationRecord>;
  const operation = candidate.operation as ClientOperationEnvelope | undefined;
  if (!operation || !validateClientOperation(operation).ok) return null;
  const status = candidate.status === "RETRY_WAIT" || candidate.status === "REJECTED" ? candidate.status : "PENDING";
  return {
    operation,
    status,
    retryCount: Number.isSafeInteger(candidate.retryCount) && (candidate.retryCount as number) >= 0 ? Math.min(MAX_RETRY_COUNT, candidate.retryCount as number) : 0,
    nextAttemptAtMs: safeMs(candidate.nextAttemptAtMs, nowMs),
    lastErrorCode: typeof candidate.lastErrorCode === "string" ? candidate.lastErrorCode as OnlineErrorCode : null,
    lastErrorMessage: typeof candidate.lastErrorMessage === "string" ? candidate.lastErrorMessage : null,
  };
}

export function normalizePendingOperationQueue(value: unknown, nowMs = Date.now()): PendingOperationQueueState {
  const candidate = value && typeof value === "object" ? value as { records?: unknown; operations?: unknown } : {};
  const rawRecords = Array.isArray(candidate.records)
    ? candidate.records
    : Array.isArray(candidate.operations)
      ? candidate.operations.map((operation) => ({ operation, status: "PENDING", retryCount: 0, nextAttemptAtMs: nowMs, lastErrorCode: null, lastErrorMessage: null }))
      : [];
  const seen = new Set<string>();
  const records: PendingOperationRecord[] = [];
  for (const raw of rawRecords) {
    const record = toRecord(raw, nowMs);
    if (!record || seen.has(record.operation.operationId)) continue;
    seen.add(record.operation.operationId);
    records.push(record);
  }
  return { records };
}

function queueLimitError(message: string): OnlineError {
  return { code: "QUEUE_LIMIT_EXCEEDED", message, retryable: false };
}

export function validatePendingOperationQueueLimits(queue: PendingOperationQueueState): OnlineError | null {
  if (queue.records.length > MAX_PENDING_OPERATIONS) return queueLimitError("Pending operation count limit reached.");
  if (serializedBytes(queue) > MAX_PENDING_OPERATION_BYTES) return queueLimitError("Pending operation byte limit reached.");
  return null;
}

export function enqueuePendingOperation(queue: PendingOperationQueueState, operation: ClientOperationEnvelope, nowMs = Date.now()): QueueResult {
  const normalized = normalizePendingOperationQueue(queue, nowMs);
  const validation = validateClientOperation(operation);
  if (!validation.ok) return { ok: false, queue: normalized, error: validation.error };
  if (normalized.records.some((entry) => entry.operation.operationId === operation.operationId)) return { ok: true, queue: normalized };
  if (normalized.records.length >= MAX_PENDING_OPERATIONS) return { ok: false, queue: normalized, error: queueLimitError("Pending operation count limit reached.") };
  const next = { records: [...normalized.records, { operation, status: "PENDING" as const, retryCount: 0, nextAttemptAtMs: nowMs, lastErrorCode: null, lastErrorMessage: null }] };
  if (serializedBytes(next) > MAX_PENDING_OPERATION_BYTES) return { ok: false, queue: normalized, error: queueLimitError("Pending operation byte limit reached.") };
  return { ok: true, queue: next };
}

export function peekPendingOperationBatch(queue: PendingOperationQueueState, size = 20, nowMs = Date.now()): PendingOperationRecord[] {
  return normalizePendingOperationQueue(queue, nowMs).records
    .filter((record) => record.status === "PENDING" || (record.status === "RETRY_WAIT" && record.nextAttemptAtMs <= nowMs))
    .slice(0, Math.max(0, size));
}

export function acknowledgePendingOperations(queue: PendingOperationQueueState, operationIds: readonly OperationId[], nowMs = Date.now()): PendingOperationQueueState {
  const ids = new Set(operationIds);
  return { records: normalizePendingOperationQueue(queue, nowMs).records.filter((record) => !ids.has(record.operation.operationId)) };
}

export function rejectPendingOperation(
  queue: PendingOperationQueueState,
  operationId: OperationId,
  rejection: Pick<OnlineError, "code" | "message">,
  nowMs = Date.now(),
): PendingOperationQueueState {
  return {
    records: normalizePendingOperationQueue(queue, nowMs).records.map((record) => record.operation.operationId === operationId
      ? { ...record, status: "REJECTED" as const, lastErrorCode: rejection.code, lastErrorMessage: rejection.message, nextAttemptAtMs: Number.MAX_SAFE_INTEGER }
      : record),
  };
}

export function calculateRetryDelayMs(options: {
  retryCount: number;
  retryAfterMs?: number;
  jitter?: () => number;
}): number {
  const retryAfter = Number.isSafeInteger(options.retryAfterMs) && (options.retryAfterMs as number) >= 0 ? options.retryAfterMs as number : null;
  const exponential = Math.min(MAX_RETRY_DELAY_MS, INITIAL_RETRY_DELAY_MS * (2 ** Math.max(0, options.retryCount)));
  const base = retryAfter ?? exponential;
  const jitter = Math.max(0, Math.floor(options.jitter?.() ?? 0));
  return Math.min(MAX_RETRY_DELAY_MS, base + jitter);
}

export function isRetryableOnlineError(error: Pick<OnlineError, "code">): boolean {
  return error.code === "NETWORK_UNAVAILABLE" || error.code === "TIMEOUT" || error.code === "SERVER_ERROR" || error.code === "RATE_LIMITED";
}

export function retryPendingOperation(
  queue: PendingOperationQueueState,
  operationId: OperationId,
  error: Pick<OnlineError, "code" | "message">,
  options: { nowMs?: number; retryAfterMs?: number; jitter?: () => number } = {},
): PendingOperationQueueState {
  const nowMs = options.nowMs ?? Date.now();
  return {
    records: normalizePendingOperationQueue(queue, nowMs).records.map((record) => {
      if (record.operation.operationId !== operationId || record.status === "REJECTED") return record;
      const nextRetryCount = record.retryCount + 1;
      if (!isRetryableOnlineError(error) || nextRetryCount > MAX_RETRY_COUNT) {
        return { ...record, status: "REJECTED" as const, retryCount: nextRetryCount, lastErrorCode: error.code, lastErrorMessage: error.message, nextAttemptAtMs: Number.MAX_SAFE_INTEGER };
      }
      return { ...record, status: "RETRY_WAIT" as const, retryCount: nextRetryCount, nextAttemptAtMs: nowMs + calculateRetryDelayMs({ retryCount: record.retryCount, retryAfterMs: options.retryAfterMs, jitter: options.jitter }), lastErrorCode: error.code, lastErrorMessage: error.message };
    }),
  };
}

export function serializePendingOperationQueue(queue: PendingOperationQueueState): string {
  return JSON.stringify(normalizePendingOperationQueue(queue));
}

export function loadPendingOperationQueue(raw: string | null, nowMs = Date.now()): QueueLoadResult {
  if (!raw) return { ok: true, queue: createEmptyPendingOperationQueue() };
  try {
    const queue = normalizePendingOperationQueue(JSON.parse(raw), nowMs);
    const limitError = validatePendingOperationQueueLimits(queue);
    return limitError ? { ok: false, queue, error: limitError } : { ok: true, queue };
  } catch {
    return { ok: false, queue: createEmptyPendingOperationQueue(), error: { code: "QUEUE_CORRUPTED", message: "Pending operation queue JSON is corrupted.", retryable: false } };
  }
}

export function deserializePendingOperationQueue(raw: string | null, nowMs = Date.now()): PendingOperationQueueState {
  return loadPendingOperationQueue(raw, nowMs).queue;
}

export function getOrCreatePendingOperationQueue(registry: Phaser.Data.DataManager): PendingOperationQueueState {
  const queue = normalizePendingOperationQueue(registry.get(ONLINE_QUEUE_REGISTRY_KEY));
  registry.set(ONLINE_QUEUE_REGISTRY_KEY, queue);
  return queue;
}

export function setPendingOperationQueue(registry: Phaser.Data.DataManager, queue: PendingOperationQueueState): void {
  registry.set(ONLINE_QUEUE_REGISTRY_KEY, normalizePendingOperationQueue(queue));
}
