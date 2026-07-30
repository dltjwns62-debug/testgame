import { ONLINE_PROTOCOL_VERSION, type ClientOperationEnvelope, type OnlineError, type OnlinePlayerSnapshot } from "./onlineTypes";

export type OnlineValidationResult =
  | { ok: true }
  | { ok: false; error: OnlineError };

function validationError(message: string): OnlineValidationResult {
  return { ok: false, error: { code: "VALIDATION_FAILED", message, retryable: false } };
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function validateOnlineProtocolVersion(version: unknown): OnlineValidationResult {
  if (version === ONLINE_PROTOCOL_VERSION) return { ok: true };
  if (typeof version === "number" && version > ONLINE_PROTOCOL_VERSION) {
    return { ok: false, error: { code: "FUTURE_PROTOCOL_VERSION", message: "The online protocol is newer than this client.", retryable: false } };
  }
  return { ok: false, error: { code: "PROTOCOL_MISMATCH", message: "The online protocol version is unsupported.", retryable: false } };
}

export function validateOnlineSnapshotShape(value: unknown): OnlineValidationResult {
  if (!value || typeof value !== "object") return validationError("Online snapshot must be an object.");
  const snapshot = value as Partial<OnlinePlayerSnapshot>;
  const protocol = validateOnlineProtocolVersion(snapshot.protocolVersion);
  if (!protocol.ok) return protocol;
  if (typeof snapshot.saveId !== "string" || snapshot.saveId.length === 0 ||
    typeof snapshot.deviceId !== "string" || snapshot.deviceId.length === 0 ||
    typeof snapshot.clientInstanceId !== "string" || snapshot.clientInstanceId.length === 0 ||
    !isSafeNonNegativeInteger(snapshot.clientGeneratedAtMs) ||
    (snapshot.baseServerRevision !== null && !isSafeNonNegativeInteger(snapshot.baseServerRevision)) ||
    !isSafeNonNegativeInteger(snapshot.playerGold) ||
    typeof snapshot.battleAutoHuntEnabled !== "boolean" ||
    !snapshot.formation || !Array.isArray(snapshot.ownedRoster) || !snapshot.inventory ||
    !snapshot.controlGroups || !snapshot.keyBindings || !snapshot.autoProgress ||
    typeof snapshot.snapshotHash !== "string" || snapshot.snapshotHash.length === 0) {
    return validationError("Online snapshot contains invalid fields.");
  }
  if (snapshot.ownedRoster.length !== snapshot.formation.ownedUnits.length) {
    return validationError("Online snapshot owned roster does not match formation.");
  }
  return { ok: true };
}

export function validateClientOperation(value: unknown): OnlineValidationResult {
  if (!value || typeof value !== "object") return validationError("Operation must be an object.");
  const operation = value as Partial<ClientOperationEnvelope>;
  const protocol = validateOnlineProtocolVersion(operation.protocolVersion);
  if (!protocol.ok) return protocol;
  if (typeof operation.operationId !== "string" || operation.operationId.length === 0 ||
    typeof operation.deviceId !== "string" || operation.deviceId.length === 0 ||
    typeof operation.clientInstanceId !== "string" || operation.clientInstanceId.length === 0 ||
    !isSafeNonNegativeInteger(operation.createdAtMs) ||
    !isSafeNonNegativeInteger(operation.baseServerRevision) ||
    typeof operation.type !== "string" || typeof operation.payloadHash !== "string" ||
    operation.payload === undefined) {
    return validationError("Operation envelope contains invalid fields.");
  }
  return { ok: true };
}

export function containsSensitiveOnlineValue(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const text = JSON.stringify(value).toLowerCase();
  return text.includes("authorization") || text.includes("bearer") || text.includes("password") || text.includes("oauth");
}
