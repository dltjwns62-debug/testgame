import type { AutoProgressState } from "../autoProgress";
import type { PersistentControlGroupState } from "../controlGroups";
import type { FormationState } from "../rtsBattleTypes";
import type { InventoryState } from "../items";
import type { KeyBindingState } from "../keyBindings";

export const ONLINE_PROTOCOL_VERSION = 1;

export type AccountId = string;
export type SessionId = string;
export type DeviceId = string;
export type ClientInstanceId = string;
export type OperationId = string;
export type ServerRevision = number;
export type SnapshotHash = string;

export type OnlineConnectionStatus =
  | "DISABLED"
  | "OFFLINE"
  | "CONNECTING"
  | "ONLINE"
  | "SYNCING"
  | "DEGRADED"
  | "CONFLICT"
  | "ERROR";

export type OnlineErrorCode =
  | "ONLINE_DISABLED"
  | "NETWORK_UNAVAILABLE"
  | "AUTH_REQUIRED"
  | "AUTH_EXPIRED"
  | "PROTOCOL_MISMATCH"
  | "FUTURE_PROTOCOL_VERSION"
  | "VALIDATION_FAILED"
  | "REVISION_CONFLICT"
  | "DUPLICATE_OPERATION"
  | "RATE_LIMITED"
  | "SERVER_REJECTED"
  | "SERVER_ERROR"
  | "QUEUE_CORRUPTED"
  | "QUEUE_LIMIT_EXCEEDED"
  | "CANCELLED"
  | "TIMEOUT";

export type OnlineError = {
  code: OnlineErrorCode;
  message: string;
  retryable: boolean;
  serverRevision?: ServerRevision;
  retryAfterMs?: number;
};

export type OnlineSessionState = {
  protocolVersion: number;
  status: OnlineConnectionStatus;
  accountId: AccountId | null;
  sessionId: SessionId | null;
  deviceId: DeviceId;
  clientInstanceId: ClientInstanceId;
  serverRevision: ServerRevision | null;
  lastSyncedAtMs: number | null;
  pendingOperationCount: number;
  lastErrorCode: OnlineErrorCode | null;
  lastErrorMessage: string | null;
  mockMode: boolean;
};

export type OnlinePlayerSnapshot = {
  protocolVersion: number;
  saveId: string;
  deviceId: DeviceId;
  clientInstanceId: ClientInstanceId;
  clientGeneratedAtMs: number;
  baseServerRevision: ServerRevision | null;
  formation: FormationState;
  ownedRoster: FormationState["ownedUnits"];
  playerGold: number;
  progression: FormationState["ownedUnits"];
  inventory: InventoryState;
  controlGroups: PersistentControlGroupState;
  keyBindings: KeyBindingState;
  battleAutoHuntEnabled: boolean;
  autoProgress: AutoProgressState;
  snapshotHash: SnapshotHash;
};

export type OnlineOperationType =
  | "SNAPSHOT_CHECKPOINT"
  | "BATTLE_RESULT_SUBMISSION"
  | "OFFLINE_REWARD_CLAIM"
  | "SHOP_PURCHASE_REQUEST"
  | "EQUIPMENT_CHANGE"
  | "FORMATION_UPDATE"
  | "CLIENT_PREFERENCE_UPDATE";

export type BattleResultSubmissionPayload = {
  battleId: string;
  sourceWorldMonsterId: string;
  rosterUnitIds: string[];
  startedAtMs: number;
  endedAtMs: number;
  victory: boolean;
  resultDigest: string;
  clientBuildId: string;
};

export type OfflineRewardClaimPayload = {
  claimSequence: number;
  previousServerRevision: number;
  elapsedFromMs: number;
  elapsedToMs: number;
  selectedMonsterId: string | null;
  deployedRosterUnitIds: string[];
};

export type ClientOperationEnvelope<TPayload = unknown> = {
  protocolVersion: number;
  operationId: OperationId;
  deviceId: DeviceId;
  clientInstanceId: ClientInstanceId;
  createdAtMs: number;
  baseServerRevision: ServerRevision;
  type: OnlineOperationType;
  payloadHash: string;
  payload: TPayload;
};

export type BattleResultSubmissionOperation = ClientOperationEnvelope<BattleResultSubmissionPayload> & {
  type: "BATTLE_RESULT_SUBMISSION";
};

export type OfflineRewardClaimOperation = ClientOperationEnvelope<OfflineRewardClaimPayload> & {
  type: "OFFLINE_REWARD_CLAIM";
};

export type OnlineResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: OnlineError };

export type BootstrapRequest = {
  protocolVersion: number;
  deviceId: DeviceId;
  clientInstanceId: ClientInstanceId;
  accountId?: AccountId | null;
  snapshot?: OnlinePlayerSnapshot | null;
};

export type BootstrapResponse = {
  protocolVersion: number;
  sessionId: SessionId;
  accountId: AccountId | null;
  serverRevision: ServerRevision;
  snapshot: OnlinePlayerSnapshot | null;
};

export type PullSnapshotRequest = {
  protocolVersion: number;
  sessionId: SessionId | null;
  expectedServerRevision: ServerRevision | null;
};

export type PullSnapshotResponse = {
  protocolVersion: number;
  serverRevision: ServerRevision;
  snapshot: OnlinePlayerSnapshot | null;
};

export type PushOperationsRequest = {
  protocolVersion: number;
  sessionId: SessionId | null;
  expectedServerRevision: ServerRevision;
  operations: ClientOperationEnvelope[];
};

export type PushOperationsResponse = {
  protocolVersion: number;
  serverRevision: ServerRevision;
  acknowledgedOperationIds: OperationId[];
  duplicateOperationIds: OperationId[];
  rejectedOperationIds: OperationId[];
  rejectedReasons: Record<OperationId, OnlineError>;
  snapshot: OnlinePlayerSnapshot | null;
};

export interface OnlineGateway {
  bootstrap(request: BootstrapRequest, signal?: AbortSignal): Promise<OnlineResult<BootstrapResponse>>;
  pullSnapshot(request: PullSnapshotRequest, signal?: AbortSignal): Promise<OnlineResult<PullSnapshotResponse>>;
  pushOperations(request: PushOperationsRequest, signal?: AbortSignal): Promise<OnlineResult<PushOperationsResponse>>;
  disconnect(): Promise<void>;
}

export interface AuthTokenProvider {
  getToken(): Promise<string | null>;
  clearToken(): Promise<void>;
}

export type ConflictResolutionResult =
  | { status: "NO_CONFLICT"; snapshot: OnlinePlayerSnapshot }
  | { status: "RESOLVED"; snapshot: OnlinePlayerSnapshot; decisions: string[] }
  | { status: "MANUAL_REQUIRED"; local: OnlinePlayerSnapshot; server: OnlinePlayerSnapshot; conflicts: string[] };
