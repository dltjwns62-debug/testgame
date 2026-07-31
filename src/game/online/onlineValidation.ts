import { ONLINE_PROTOCOL_VERSION, type BattleResultSubmissionPayload, type ClientOperationEnvelope, type OfflineRewardClaimPayload, type OnlineError, type OnlinePlayerSnapshot } from "./onlineTypes";
import { hashOperationPayload } from "./onlineOperations";

export const MAX_OPERATION_PAYLOAD_BYTES = 64 * 1024;

export type OnlineValidationResult =
  | { ok: true }
  | { ok: false; error: OnlineError };

function validationError(message: string): OnlineValidationResult {
  return { ok: false, error: { code: "VALIDATION_FAILED", message, retryable: false } };
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

const ONLINE_OPERATION_TYPES = new Set([
  "SNAPSHOT_CHECKPOINT",
  "BATTLE_RESULT_SUBMISSION",
  "OFFLINE_REWARD_CLAIM",
  "SHOP_PURCHASE_REQUEST",
  "EQUIPMENT_CHANGE",
  "FORMATION_UPDATE",
  "CLIENT_PREFERENCE_UPDATE",
]);

const ONLINE_SNAPSHOT_KEYS = new Set([
  "protocolVersion", "saveId", "deviceId", "clientInstanceId", "clientGeneratedAtMs", "baseServerRevision",
  "formation", "ownedRoster", "playerGold", "progression", "inventory", "controlGroups", "keyBindings",
  "battleAutoHuntEnabled", "autoProgress", "snapshotHash",
]);

const FORBIDDEN_KEYS = new Set([
  "token", "authorization", "bearer", "password", "oauth", "oauthcode", "refreshtoken", "accesstoken",
  "battlestate", "runtimeerrors", "diagnostics", "diagnosticsdata", "persistencemeta", "scenestate", "pendingevents",
]);

const FORBIDDEN_REWARD_KEY_PARTS = [
  "finalgold", "finalexperience", "finalexp", "finalitems", "finalitemids", "itemrewards",
  "rewardgold", "rewardexperience", "rewardexp", "rewarditems", "authoritativereward",
];

function hasForbiddenKey(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((entry) => hasForbiddenKey(entry, seen));
  return Object.entries(value).some(([key, child]) => FORBIDDEN_KEYS.has(key.toLowerCase()) || hasForbiddenKey(child, seen));
}

function hasForbiddenRewardKey(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((entry) => hasForbiddenRewardKey(entry, seen));
  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return FORBIDDEN_REWARD_KEY_PARTS.some((part) => normalized.includes(part)) || hasForbiddenRewardKey(child, seen);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const expected = new Set(keys);
  const actual = Object.keys(value);
  return actual.length === expected.size && actual.every((key) => expected.has(key));
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) return false;
  const ids = value as unknown[];
  const seen = new Set<string>();
  return ids.every((entry) => {
    if (typeof entry !== "string" || entry.length === 0 || seen.has(entry)) return false;
    seen.add(entry);
    return true;
  });
}

function isBattleResultSubmissionPayload(value: unknown): value is BattleResultSubmissionPayload {
  if (!hasExactKeys(value, ["battleId", "sourceWorldMonsterId", "rosterUnitIds", "startedAtMs", "endedAtMs", "victory", "resultDigest", "clientBuildId"])) return false;
  return typeof value.battleId === "string" && value.battleId.length > 0 &&
    typeof value.sourceWorldMonsterId === "string" && value.sourceWorldMonsterId.length > 0 &&
    isNonEmptyStringArray(value.rosterUnitIds) && isSafeNonNegativeInteger(value.startedAtMs) &&
    isSafeNonNegativeInteger(value.endedAtMs) && value.endedAtMs >= value.startedAtMs &&
    typeof value.victory === "boolean" && typeof value.resultDigest === "string" && value.resultDigest.length > 0 &&
    typeof value.clientBuildId === "string" && value.clientBuildId.length > 0;
}

function isOfflineRewardClaimPayload(value: unknown): value is OfflineRewardClaimPayload {
  if (!hasExactKeys(value, ["claimSequence", "previousServerRevision", "elapsedFromMs", "elapsedToMs", "selectedMonsterId", "deployedRosterUnitIds"])) return false;
  return isSafeNonNegativeInteger(value.claimSequence) && isSafeNonNegativeInteger(value.previousServerRevision) &&
    isSafeNonNegativeInteger(value.elapsedFromMs) && isSafeNonNegativeInteger(value.elapsedToMs) &&
    value.elapsedToMs >= value.elapsedFromMs &&
    (value.selectedMonsterId === null || (typeof value.selectedMonsterId === "string" && value.selectedMonsterId.length > 0)) &&
    isNonEmptyStringArray(value.deployedRosterUnitIds);
}

function isValidOperationPayload(type: unknown, payload: unknown): boolean {
  if (type === "BATTLE_RESULT_SUBMISSION") return isBattleResultSubmissionPayload(payload);
  if (type === "OFFLINE_REWARD_CLAIM") return isOfflineRewardClaimPayload(payload);
  return true;
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
    typeof snapshot.snapshotHash !== "string" || snapshot.snapshotHash.length === 0 ||
    hasForbiddenKey(value) || Object.keys(value).some((key) => !ONLINE_SNAPSHOT_KEYS.has(key))) {
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
  let payloadJson: string | undefined;
  let payloadHashMatches = false;
  try {
    payloadJson = JSON.stringify(operation.payload);
    payloadHashMatches = hashOperationPayload(operation.payload) === operation.payloadHash;
  } catch {
    return validationError("Operation payload must be serializable.");
  }
  if (!ONLINE_OPERATION_TYPES.has(operation.type as string) ||
    typeof operation.operationId !== "string" || operation.operationId.length === 0 || operation.operationId.length > 128 ||
    typeof operation.deviceId !== "string" || operation.deviceId.length === 0 || operation.deviceId.length > 128 ||
    typeof operation.clientInstanceId !== "string" || operation.clientInstanceId.length === 0 || operation.clientInstanceId.length > 128 ||
    !isSafeNonNegativeInteger(operation.createdAtMs) ||
    !isSafeNonNegativeInteger(operation.baseServerRevision) ||
    typeof operation.payloadHash !== "string" || operation.payloadHash.length === 0 ||
    operation.payload === undefined || hasForbiddenKey(operation.payload) || hasForbiddenRewardKey(operation.payload) ||
    payloadJson === undefined ||
    new TextEncoder().encode(payloadJson).byteLength > MAX_OPERATION_PAYLOAD_BYTES ||
    !payloadHashMatches || !isValidOperationPayload(operation.type, operation.payload)) {
    return validationError("Operation envelope contains invalid fields.");
  }
  return { ok: true };
}

export function containsSensitiveOnlineValue(value: unknown): boolean {
  return hasForbiddenKey(value);
}
