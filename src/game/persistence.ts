import type Phaser from "phaser";
import {
  AUTO_HUNT_REGISTRY_KEY,
  AUTO_PROGRESS_REGISTRY_KEY,
  AUTO_SAVE_DEBOUNCE_MS,
  AUTO_SAVE_INTERVAL_MS,
  FORMATION_REGISTRY_KEY,
  INVENTORY_REGISTRY_KEY,
  KEY_BINDINGS_REGISTRY_KEY,
  PERSISTENCE_META_REGISTRY_KEY,
  PERSISTENCE_SUMMARY_REGISTRY_KEY,
  PLAYER_GOLD_REGISTRY_KEY,
  SAVE_BACKUP_KEY,
  SAVE_PRIMARY_KEY,
  SAVE_RECOVERY_KEY,
  SAVE_SCHEMA_VERSION,
  SAVE_TEMP_KEY,
  CONTROL_GROUPS_REGISTRY_KEY,
} from "./constants";
import {
  clonePersistentControlGroupState,
  createEmptyPersistentControlGroupState,
  getOrCreatePersistentControlGroupState,
  normalizePersistentControlGroupState,
  setPersistentControlGroupState,
  type PersistentControlGroupState,
} from "./controlGroups";
import {
  createDefaultFormationState,
  getOrCreateFormationState,
  isValidFormationState,
  normalizeFormationState,
  setFormationState,
} from "./formationState";
import {
  cloneInventoryState,
  getOrCreateInventoryState,
  normalizeInventoryState,
  normalizeInventoryStateForOwnedUnits,
  setInventoryState,
  type InventoryState,
} from "./items";
import {
  cloneKeyBindingState,
  createDefaultKeyBindingState,
  getOrCreateKeyBindingState,
  isValidKeyBindingState,
  setKeyBindingState,
  type KeyBindingState,
} from "./keyBindings";
import { getOrCreatePlayerGold, isValidPlayerGold, setPlayerGold } from "./playerEconomy";
import { getOrCreateAutoProgressState, normalizeAutoProgressState, setAutoProgressState, type AutoProgressState } from "./autoProgress";
import { calculateOfflineRewardPlan, type OfflineRewardSummary } from "./offlineProgress";
import type { FormationState } from "./rtsBattleTypes";
import { clearRuntimeStateIssues, repairRuntimeStateAtBoundary } from "./runtimeStateValidation";

export type SavePayload = {
  formation: FormationState;
  playerGold: number;
  keyBindings: KeyBindingState;
  controlGroups: PersistentControlGroupState;
  inventory: InventoryState;
  battleAutoHuntEnabled: boolean;
  autoProgress: AutoProgressState;
};

export type SaveEnvelope = {
  schemaVersion: number;
  saveId: string;
  savedAtMs: number;
  lastActiveAtMs: number;
  payload: SavePayload;
  checksum: string;
};

export type PersistenceStatus =
  | "READY"
  | "SAVING"
  | "SAVED"
  | "RECOVERED_BACKUP"
  | "RECOVERED_TEMP"
  | "RESET_TO_DEFAULT"
  | "STORAGE_UNAVAILABLE"
  | "SAVE_FAILED"
  | "NEWER_VERSION_BLOCKED";

export type PersistenceMeta = {
  saveId: string;
  schemaVersion: number;
  savedAtMs: number;
  lastActiveAtMs: number;
  status: PersistenceStatus;
  message: string;
  autoSaveEnabled: boolean;
  newerVersionBlocked: boolean;
  lastSaveBytes: number;
  lastSaveDurationMs: number;
  lastSaveSource: string;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type PersistenceEnvironment = {
  storage: StorageLike | null;
  nowMs: () => number;
};

export type PersistenceOperationResult = {
  ok: boolean;
  meta: PersistenceMeta;
  message: string;
  summary?: OfflineRewardSummary;
};

const TRACKED_REGISTRY_KEYS = new Set([
  FORMATION_REGISTRY_KEY,
  PLAYER_GOLD_REGISTRY_KEY,
  KEY_BINDINGS_REGISTRY_KEY,
  CONTROL_GROUPS_REGISTRY_KEY,
  INVENTORY_REGISTRY_KEY,
  AUTO_HUNT_REGISTRY_KEY,
  AUTO_PROGRESS_REGISTRY_KEY,
]);

const savingRegistries = new WeakSet<object>();
const saveTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();
let autoSaveControllerCount = 0;
let autoSaveIntervalCount = 0;
let autoSaveDebounceCount = 0;
let storageWriteCount = 0;
type AutoSaveController = {
  intervalHandle: ReturnType<typeof setInterval> | null;
  hidden: boolean;
  lastLifecycleSaveAt: number;
  lastVisibilitySettlementAt: number;
  changedataHandler: (parent: unknown, key: string) => void;
  pagehideHandler: () => void;
  beforeunloadHandler: () => void;
  visibilityHandler: () => void;
};
const autoSaveControllers = new WeakMap<object, AutoSaveController>();

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

let persistenceEnvironment: PersistenceEnvironment = {
  storage: defaultStorage(),
  nowMs: () => Date.now(),
};

export function setPersistenceEnvironment(environment: PersistenceEnvironment): void {
  persistenceEnvironment = environment;
}

export function resetPersistenceEnvironment(): void {
  persistenceEnvironment = { storage: defaultStorage(), nowMs: () => Date.now() };
}

function getPersistenceNow(): number {
  return persistenceEnvironment.nowMs();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(record[key])).join(",") + "}";
}

export function checksumForEnvelope(envelope: Omit<SaveEnvelope, "checksum">): string {
  const input = stableStringify(envelope);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isValidTimestamp(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function makeSaveId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? "save-" + getPersistenceNow().toString(36) + "-" + Math.random().toString(36).slice(2);
}

export type SafeStorageRead = { ok: true; value: string | null } | { ok: false; value: null };

export function safeGetItem(storage: StorageLike | null, key: string): SafeStorageRead {
  if (!storage) return { ok: false, value: null };
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false, value: null };
  }
}

export function safeSetItem(storage: StorageLike | null, key: string, value: string): boolean {
  if (!storage) return false;
  try { storage.setItem(key, value); storageWriteCount += 1; return true; } catch { return false; }
}

export function safeRemoveItem(storage: StorageLike | null, key: string): boolean {
  if (!storage) return false;
  try { storage.removeItem(key); return true; } catch { return false; }
}

function createDefaultMeta(): PersistenceMeta {
  return {
    saveId: makeSaveId(),
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAtMs: 0,
    lastActiveAtMs: 0,
    status: "READY",
    message: "No save loaded.",
    autoSaveEnabled: true,
    newerVersionBlocked: false,
    lastSaveBytes: 0,
    lastSaveDurationMs: 0,
    lastSaveSource: "none",
  };
}

export function getPersistenceMeta(registry: Phaser.Data.DataManager): PersistenceMeta {
  const raw = registry.get(PERSISTENCE_META_REGISTRY_KEY);
  if (!raw || typeof raw !== "object") {
    const fallback = createDefaultMeta();
    registry.set(PERSISTENCE_META_REGISTRY_KEY, fallback);
    return fallback;
  }
  const candidate = raw as Partial<PersistenceMeta>;
  return {
    ...createDefaultMeta(),
    ...candidate,
    saveId: typeof candidate.saveId === "string" && candidate.saveId.length > 0 ? candidate.saveId : makeSaveId(),
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAtMs: isValidTimestamp(candidate.savedAtMs) ? candidate.savedAtMs : 0,
    lastActiveAtMs: isValidTimestamp(candidate.lastActiveAtMs) ? candidate.lastActiveAtMs : 0,
    status: typeof candidate.status === "string" ? candidate.status as PersistenceStatus : "READY",
    message: typeof candidate.message === "string" ? candidate.message : "",
    autoSaveEnabled: candidate.autoSaveEnabled !== false,
    newerVersionBlocked: candidate.newerVersionBlocked === true,
    lastSaveBytes: isValidTimestamp(candidate.lastSaveBytes) ? candidate.lastSaveBytes : 0,
    lastSaveDurationMs: isValidTimestamp(candidate.lastSaveDurationMs) ? candidate.lastSaveDurationMs : 0,
    lastSaveSource: typeof candidate.lastSaveSource === "string" ? candidate.lastSaveSource : "none",
  };
}

function setPersistenceMeta(registry: Phaser.Data.DataManager, meta: PersistenceMeta): void {
  registry.set(PERSISTENCE_META_REGISTRY_KEY, { ...meta });
}

function payloadFromRegistry(registry: Phaser.Data.DataManager): SavePayload {
  const formation = getOrCreateFormationState(registry);
  const ownedIds = new Set(formation.ownedUnits.map((unit) => unit.rosterUnitId));
  return {
    formation,
    playerGold: getOrCreatePlayerGold(registry),
    keyBindings: getOrCreateKeyBindingState(registry),
    controlGroups: getOrCreatePersistentControlGroupState(registry, ownedIds),
    inventory: normalizeInventoryStateForOwnedUnits(getOrCreateInventoryState(registry), ownedIds),
    battleAutoHuntEnabled: registry.get(AUTO_HUNT_REGISTRY_KEY) === true,
    autoProgress: getOrCreateAutoProgressState(registry),
  };
}

export function normalizeSavePayload(value: unknown): SavePayload {
  const candidate = value && typeof value === "object" ? value as Partial<SavePayload> : {};
  const formation = normalizeFormationState(candidate.formation);
  const ownedIds = new Set(formation.ownedUnits.map((unit) => unit.rosterUnitId));
  const controlGroups = normalizePersistentControlGroupState(candidate.controlGroups, ownedIds);
  return {
    formation,
    playerGold: isValidPlayerGold(candidate.playerGold) ? candidate.playerGold : 0,
    keyBindings: isValidKeyBindingState(candidate.keyBindings)
      ? cloneKeyBindingState(candidate.keyBindings)
      : createDefaultKeyBindingState(),
    controlGroups,
    inventory: normalizeInventoryStateForOwnedUnits(candidate.inventory, ownedIds),
    battleAutoHuntEnabled: candidate.battleAutoHuntEnabled === true,
    autoProgress: normalizeAutoProgressState(candidate.autoProgress),
  };
}

export function createDefaultSavePayload(): SavePayload {
  const formation = createDefaultFormationState();
  return {
    formation,
    playerGold: 0,
    keyBindings: createDefaultKeyBindingState(),
    controlGroups: createEmptyPersistentControlGroupState(),
    inventory: normalizeInventoryState(undefined),
    battleAutoHuntEnabled: false,
    autoProgress: normalizeAutoProgressState(undefined),
  };
}

export function applySavePayload(registry: Phaser.Data.DataManager, payload: SavePayload): void {
  savingRegistries.add(registry);
  try {
    const normalized = normalizeSavePayload(payload);
    setFormationState(registry, normalized.formation);
    setPlayerGold(registry, normalized.playerGold);
    setKeyBindingState(registry, normalized.keyBindings);
    setPersistentControlGroupState(registry, normalized.controlGroups);
    setInventoryState(registry, normalized.inventory);
    registry.set(AUTO_HUNT_REGISTRY_KEY, normalized.battleAutoHuntEnabled);
    setAutoProgressState(registry, normalized.autoProgress);
  } finally {
    savingRegistries.delete(registry);
  }
}

function buildEnvelope(payload: SavePayload, saveId: string, savedAtMs: number, lastActiveAtMs: number): SaveEnvelope {
  const unsigned = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    saveId,
    savedAtMs,
    lastActiveAtMs,
    payload: normalizeSavePayload(payload),
  };
  return { ...unsigned, checksum: checksumForEnvelope(unsigned) };
}

export function parseSaveEnvelope(raw: string | null): SaveEnvelope | null {
  if (!raw) {
    return null;
  }
  try {
    const candidate = JSON.parse(raw) as Partial<SaveEnvelope>;
    if (!Number.isSafeInteger(candidate.schemaVersion) || typeof candidate.saveId !== "string" ||
      !isValidTimestamp(candidate.savedAtMs) || !isValidTimestamp(candidate.lastActiveAtMs) ||
      typeof candidate.checksum !== "string" || !candidate.payload) {
      return null;
    }
    const unsigned = {
      schemaVersion: candidate.schemaVersion,
      saveId: candidate.saveId,
      savedAtMs: candidate.savedAtMs,
      lastActiveAtMs: candidate.lastActiveAtMs,
      payload: candidate.payload,
    } as Omit<SaveEnvelope, "checksum">;
    if (checksumForEnvelope(unsigned) !== candidate.checksum) {
      return null;
    }
    if (candidate.schemaVersion !== SAVE_SCHEMA_VERSION) {
      return null;
    }
    return { ...unsigned, payload: normalizeSavePayload(candidate.payload), checksum: candidate.checksum };
  } catch {
    return null;
  }
}

export function validateSaveEnvelope(value: unknown): value is SaveEnvelope {
  return typeof value === "object" && value !== null &&
    parseSaveEnvelope(JSON.stringify(value)) !== null;
}

export function migrateSaveEnvelope(value: unknown): SaveEnvelope | null {
  return validateSaveEnvelope(value) ? value : null;
}

function readValidEnvelope(raw: string | null): SaveEnvelope | null {
  return parseSaveEnvelope(raw);
}

export type SaveCandidate = {
  key: typeof SAVE_PRIMARY_KEY | typeof SAVE_BACKUP_KEY | typeof SAVE_TEMP_KEY;
  envelope: SaveEnvelope;
};

export function chooseSaveCandidate(
  primaryRaw: string | null,
  backupRaw: string | null,
  tempRaw: string | null,
): SaveCandidate | null {
  const primary = readValidEnvelope(primaryRaw);
  if (primary) return { key: SAVE_PRIMARY_KEY, envelope: primary };
  const backup = readValidEnvelope(backupRaw);
  if (backup) return { key: SAVE_BACKUP_KEY, envelope: backup };
  const temp = readValidEnvelope(tempRaw);
  if (temp) return { key: SAVE_TEMP_KEY, envelope: temp };
  return null;
}

export function loadEnvelopeCandidates(storage: StorageLike | null): {
  primary: SaveEnvelope | null;
  backup: SaveEnvelope | null;
  temp: SaveEnvelope | null;
  candidate: SaveCandidate | null;
  storageAvailable: boolean;
} {
  const primaryRead = safeGetItem(storage, SAVE_PRIMARY_KEY);
  const backupRead = safeGetItem(storage, SAVE_BACKUP_KEY);
  const tempRead = safeGetItem(storage, SAVE_TEMP_KEY);
  if (!primaryRead.ok || !backupRead.ok || !tempRead.ok) {
    return { primary: null, backup: null, temp: null, candidate: null, storageAvailable: false };
  }
  const primary = readValidEnvelope(primaryRead.value);
  const backup = readValidEnvelope(backupRead.value);
  const temp = readValidEnvelope(tempRead.value);
  return {
    primary,
    backup,
    temp,
    candidate: chooseSaveCandidate(primaryRead.value, backupRead.value, tempRead.value),
    storageAvailable: true,
  };
}

export function hasFutureSchema(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const candidate = JSON.parse(raw) as { schemaVersion?: unknown };
    return Number.isSafeInteger(candidate.schemaVersion) && (candidate.schemaVersion as number) > SAVE_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

function writeEnvelope(storage: StorageLike | null, key: string, envelope: SaveEnvelope): boolean {
  return safeSetItem(storage, key, JSON.stringify(envelope));
}

export type SafeSaveResult = {
  ok: boolean;
  envelope: SaveEnvelope;
  cleanupWarning?: string;
  bytes: number;
  durationMs: number;
};

export function mergePersistenceMetaAfterSave(
  meta: PersistenceMeta,
  result: SafeSaveResult,
  source: string,
): PersistenceMeta {
  return {
    ...meta,
    savedAtMs: result.ok ? result.envelope.savedAtMs : meta.savedAtMs,
    lastActiveAtMs: result.ok ? result.envelope.lastActiveAtMs : meta.lastActiveAtMs,
    status: result.ok ? "SAVED" : "SAVE_FAILED",
    message: result.ok
      ? result.cleanupWarning ?? "Saved."
      : "Save failed; the game continues in memory.",
    lastSaveBytes: result.ok ? result.bytes : meta.lastSaveBytes,
    lastSaveDurationMs: result.ok ? result.durationMs : meta.lastSaveDurationMs,
    lastSaveSource: result.ok ? source : meta.lastSaveSource,
  };
}

function byteSize(value: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).byteLength;
  return unescape(encodeURIComponent(value)).length;
}

export function savePayloadSafely(
  payload: SavePayload,
  saveId: string,
  savedAtMs: number,
  lastActiveAtMs: number,
  source: string,
  storageOverride: StorageLike | null = persistenceEnvironment.storage,
): SafeSaveResult {
  const envelope = buildEnvelope(payload, saveId, savedAtMs, lastActiveAtMs);
  const serialized = JSON.stringify(envelope);
  const bytes = byteSize(serialized);
  const startedAt = getPersistenceNow();
  const failure = (): SafeSaveResult => ({ ok: false, envelope, bytes, durationMs: Math.max(0, getPersistenceNow() - startedAt) });
  const storage = storageOverride;
  if (!storage) {
    return failure();
  }
  try {
    if (!writeEnvelope(storage, SAVE_TEMP_KEY, envelope)) {
      return failure();
    }
    const tempRead = safeGetItem(storage, SAVE_TEMP_KEY);
    if (!tempRead.ok || !readValidEnvelope(tempRead.value)) {
      return failure();
    }
    const primaryRead = safeGetItem(storage, SAVE_PRIMARY_KEY);
    if (!primaryRead.ok) {
      return failure();
    }
    const currentPrimary = readValidEnvelope(primaryRead.value);
    if (currentPrimary && !writeEnvelope(storage, SAVE_BACKUP_KEY, currentPrimary)) {
      return failure();
    }
    if (!writeEnvelope(storage, SAVE_PRIMARY_KEY, envelope)) {
      return failure();
    }
    const savedPrimaryRead = safeGetItem(storage, SAVE_PRIMARY_KEY);
    if (!savedPrimaryRead.ok || !readValidEnvelope(savedPrimaryRead.value)) {
      return failure();
    }
    const durationMs = Math.max(0, getPersistenceNow() - startedAt);
    return safeRemoveItem(storage, SAVE_TEMP_KEY)
      ? { ok: true, envelope, bytes, durationMs }
      : { ok: true, envelope, bytes, durationMs, cleanupWarning: "Temporary save cleanup failed; the verified primary save remains active." };
  } catch {
    return failure();
  }
}

function resultFromMeta(registry: Phaser.Data.DataManager, message: string, ok: boolean): PersistenceOperationResult {
  const meta = getPersistenceMeta(registry);
  return { ok, meta, message };
}

export function saveRegistryState(registry: Phaser.Data.DataManager, nowMs = getPersistenceNow(), source = "manual"): PersistenceOperationResult {
  repairRuntimeStateAtBoundary(registry);
  const meta = getPersistenceMeta(registry);
  if (meta.newerVersionBlocked) {
    setPersistenceMeta(registry, { ...meta, status: "NEWER_VERSION_BLOCKED", message: "This save was created by a newer version." });
    return resultFromMeta(registry, "This save was created by a newer version.", false);
  }
  const payload = payloadFromRegistry(registry);
  const result = savePayloadSafely(payload, meta.saveId, nowMs, nowMs, source);
  const nextMeta = mergePersistenceMetaAfterSave(meta, result, source);
  setPersistenceMeta(registry, nextMeta);
  return { ok: result.ok, meta: nextMeta, message: nextMeta.message };
}

export function loadGame(registry: Phaser.Data.DataManager, nowMs = getPersistenceNow()): PersistenceOperationResult {
  repairRuntimeStateAtBoundary(registry);
  const storage = persistenceEnvironment.storage;
  if (!storage) {
    applySavePayload(registry, createDefaultSavePayload());
    const meta = { ...getPersistenceMeta(registry), status: "STORAGE_UNAVAILABLE" as const, message: "Storage is unavailable; memory mode is active.", autoSaveEnabled: false };
    setPersistenceMeta(registry, meta);
    return { ok: false, meta, message: meta.message };
  }

  const primaryRead = safeGetItem(storage, SAVE_PRIMARY_KEY);
  const backupRead = safeGetItem(storage, SAVE_BACKUP_KEY);
  const tempRead = safeGetItem(storage, SAVE_TEMP_KEY);
  if (!primaryRead.ok || !backupRead.ok || !tempRead.ok) {
    applySavePayload(registry, createDefaultSavePayload());
    const meta = { ...getPersistenceMeta(registry), status: "STORAGE_UNAVAILABLE" as const, message: "Storage could not be read; memory mode is active.", autoSaveEnabled: false };
    setPersistenceMeta(registry, meta);
    return { ok: false, meta, message: meta.message };
  }

  const primaryRaw = primaryRead.value;
  const backupRaw = backupRead.value;
  const tempRaw = tempRead.value;
  if (hasFutureSchema(primaryRaw) || (!readValidEnvelope(primaryRaw) && hasFutureSchema(backupRaw)) ||
    (!readValidEnvelope(primaryRaw) && !readValidEnvelope(backupRaw) && hasFutureSchema(tempRaw))) {
    const meta = { ...getPersistenceMeta(registry), status: "NEWER_VERSION_BLOCKED" as const, message: "This save was created by a newer version.", newerVersionBlocked: true };
    applySavePayload(registry, createDefaultSavePayload());
    setPersistenceMeta(registry, meta);
    return { ok: false, meta, message: meta.message };
  }
  const primary = readValidEnvelope(primaryRaw);
  const backup = readValidEnvelope(backupRaw);
  const temp = readValidEnvelope(tempRaw);
  const candidate = chooseSaveCandidate(primaryRaw, backupRaw, tempRaw);
  const source = candidate?.envelope ?? null;
  if (!source) {
    if (primaryRaw) {
      safeSetItem(storage, SAVE_RECOVERY_KEY, primaryRaw);
    }
    const payload = payloadFromRegistry(registry);
    const saveId = getPersistenceMeta(registry).saveId;
    const saved = savePayloadSafely(payload, saveId, nowMs, nowMs, "bootstrap");
    applySavePayload(registry, payload);
    const previousMeta = getPersistenceMeta(registry);
    const meta = {
      ...previousMeta,
      saveId,
      savedAtMs: saved.ok ? nowMs : previousMeta.savedAtMs,
      lastActiveAtMs: saved.ok ? nowMs : previousMeta.lastActiveAtMs,
      status: saved.ok ? "RESET_TO_DEFAULT" as const : "SAVE_FAILED" as const,
      message: saved.ok ? "New save created." : "Save data was unavailable.",
      lastSaveBytes: saved.ok ? saved.bytes : previousMeta.lastSaveBytes,
      lastSaveDurationMs: saved.ok ? saved.durationMs : previousMeta.lastSaveDurationMs,
      lastSaveSource: saved.ok ? "bootstrap" : previousMeta.lastSaveSource,
    };
    setPersistenceMeta(registry, meta);
    return { ok: saved.ok, meta, message: meta.message };
  }

  const sourceKey = candidate?.key ?? SAVE_PRIMARY_KEY;
  if (primaryRaw && !primary) {
    safeSetItem(storage, SAVE_RECOVERY_KEY, primaryRaw);
  }
  const olderMeta = getPersistenceMeta(registry);
  const plan = calculateOfflineRewardPlan(source.payload, source.saveId, source.lastActiveAtMs, nowMs);
    const saved = savePayloadSafely(plan.nextPayload, source.saveId, nowMs, plan.nextLastActiveAtMs, "bootstrap");
  if (!saved.ok) {
    applySavePayload(registry, source.payload);
    const meta = { ...olderMeta, saveId: source.saveId, savedAtMs: source.savedAtMs, lastActiveAtMs: source.lastActiveAtMs, status: "SAVE_FAILED" as const, message: "Offline rewards were not applied because the updated save failed." };
    setPersistenceMeta(registry, meta);
    return { ok: false, meta, message: meta.message };
  }
  applySavePayload(registry, plan.nextPayload);
  const recovered = sourceKey === SAVE_BACKUP_KEY || sourceKey === SAVE_TEMP_KEY;
  const meta = {
    ...olderMeta,
    saveId: source.saveId,
    savedAtMs: nowMs,
    lastActiveAtMs: plan.nextLastActiveAtMs,
    status: recovered ? sourceKey === SAVE_BACKUP_KEY ? "RECOVERED_BACKUP" as const : "RECOVERED_TEMP" as const : "SAVED" as const,
    message: recovered
      ? `${sourceKey === SAVE_BACKUP_KEY ? "Backup" : "Temp"} save recovered.`
      : saved.cleanupWarning ?? "Save loaded.",
    newerVersionBlocked: false,
    lastSaveBytes: saved.bytes,
    lastSaveDurationMs: saved.durationMs,
    lastSaveSource: "bootstrap",
  };
  setPersistenceMeta(registry, meta);
  plan.summary.recoveredMessage = recovered ? meta.message : undefined;
  registry.set(PERSISTENCE_SUMMARY_REGISTRY_KEY, plan.summary);
  if (primaryRaw && sourceKey !== SAVE_PRIMARY_KEY) {
    safeSetItem(storage, SAVE_PRIMARY_KEY, JSON.stringify(saved.envelope));
  }
  return { ok: true, meta, message: meta.message, summary: plan.summary };
}

export function getAndClearOfflineSummary(registry: Phaser.Data.DataManager): OfflineRewardSummary | null {
  const summary = registry.get(PERSISTENCE_SUMMARY_REGISTRY_KEY) as OfflineRewardSummary | undefined;
  registry.remove(PERSISTENCE_SUMMARY_REGISTRY_KEY);
  return summary ?? null;
}

export function resetSaveData(registry: Phaser.Data.DataManager, nowMs = getPersistenceNow()): PersistenceOperationResult {
  repairRuntimeStateAtBoundary(registry);
  const storage = persistenceEnvironment.storage;
  let clearFailed = false;
  if (storage) {
    for (const key of [SAVE_PRIMARY_KEY, SAVE_BACKUP_KEY, SAVE_TEMP_KEY, SAVE_RECOVERY_KEY]) {
      if (!safeRemoveItem(storage, key)) clearFailed = true;
    }
  }
  const payload = createDefaultSavePayload();
  applySavePayload(registry, payload);
  clearRuntimeStateIssues(registry);
  registry.remove(PERSISTENCE_SUMMARY_REGISTRY_KEY);
  const meta = { ...createDefaultMeta(), savedAtMs: nowMs, lastActiveAtMs: nowMs, status: "RESET_TO_DEFAULT" as const, message: "Save reset to defaults." };
  setPersistenceMeta(registry, meta);
  if (clearFailed) {
    const failed = { ...meta, status: "SAVE_FAILED" as const, message: "Reset completed in memory, but existing save data could not be cleared." };
    setPersistenceMeta(registry, failed);
    return { ok: false, meta: failed, message: failed.message };
  }
  const result = savePayloadSafely(payload, meta.saveId, nowMs, nowMs, "reset");
  if (!result.ok) {
    const failed = { ...meta, status: "SAVE_FAILED" as const, message: "Reset completed in memory, but saving failed." };
    setPersistenceMeta(registry, failed);
    return { ok: false, meta: failed, message: failed.message };
  }
  const saved = {
    ...meta,
    savedAtMs: nowMs,
    lastActiveAtMs: nowMs,
    lastSaveBytes: result.bytes,
    lastSaveDurationMs: result.durationMs,
    lastSaveSource: "reset",
  };
  setPersistenceMeta(registry, saved);
  return { ok: true, meta: saved, message: saved.message };
}

export function settleOfflineRewards(registry: Phaser.Data.DataManager, nowMs = getPersistenceNow()): PersistenceOperationResult {
  repairRuntimeStateAtBoundary(registry);
  const meta = getPersistenceMeta(registry);
  if (meta.newerVersionBlocked) {
    return resultFromMeta(registry, "This save was created by a newer version.", false);
  }
  const plan = calculateOfflineRewardPlan(payloadFromRegistry(registry), meta.saveId, meta.lastActiveAtMs, nowMs);
  const saved = savePayloadSafely(plan.nextPayload, meta.saveId, nowMs, plan.nextLastActiveAtMs, "offline");
  if (!saved.ok) {
    setPersistenceMeta(registry, { ...meta, status: "SAVE_FAILED", message: "Offline rewards were not applied because saving failed." });
    return { ok: false, meta: getPersistenceMeta(registry), message: "Offline rewards were not applied because saving failed." };
  }
  applySavePayload(registry, plan.nextPayload);
  const nextMeta = {
    ...meta,
    savedAtMs: nowMs,
    lastActiveAtMs: plan.nextLastActiveAtMs,
    status: "SAVED" as const,
    message: "Offline rewards applied and saved.",
    lastSaveBytes: saved.bytes,
    lastSaveDurationMs: saved.durationMs,
    lastSaveSource: "offline",
  };
  setPersistenceMeta(registry, nextMeta);
  registry.set(PERSISTENCE_SUMMARY_REGISTRY_KEY, plan.summary);
  return { ok: true, meta: nextMeta, message: nextMeta.message, summary: plan.summary };
}

export function installAutoSave(registry: Phaser.Data.DataManager): void {
  if (autoSaveControllers.has(registry)) {
    return;
  }
  const controller: AutoSaveController = {
    intervalHandle: null,
    hidden: typeof document !== "undefined" && document.visibilityState === "hidden",
    lastLifecycleSaveAt: 0,
    lastVisibilitySettlementAt: 0,
    changedataHandler: () => undefined,
    pagehideHandler: () => undefined,
    beforeunloadHandler: () => undefined,
    visibilityHandler: () => undefined,
  };
  autoSaveControllers.set(registry, controller);
  autoSaveControllerCount += 1;
  const schedule = (): void => {
    if (controller.hidden || savingRegistries.has(registry) || !getPersistenceMeta(registry).autoSaveEnabled) {
      return;
    }
    const previous = saveTimers.get(registry);
    if (previous) {
      clearTimeout(previous);
      autoSaveDebounceCount = Math.max(0, autoSaveDebounceCount - 1);
    }
    autoSaveDebounceCount += 1;
    saveTimers.set(registry, setTimeout(() => {
      saveTimers.delete(registry);
      autoSaveDebounceCount = Math.max(0, autoSaveDebounceCount - 1);
      if (!controller.hidden && getPersistenceMeta(registry).autoSaveEnabled) saveRegistryState(registry, getPersistenceNow(), "autosave");
    }, AUTO_SAVE_DEBOUNCE_MS));
  };
  const stopInterval = (): void => {
    if (controller.intervalHandle !== null) {
      clearInterval(controller.intervalHandle);
      controller.intervalHandle = null;
      autoSaveIntervalCount = Math.max(0, autoSaveIntervalCount - 1);
    }
  };
  const startInterval = (): void => {
    stopInterval();
    controller.intervalHandle = setInterval(() => {
      if (!controller.hidden && getPersistenceMeta(registry).autoSaveEnabled) saveRegistryState(registry, getPersistenceNow(), "autosave");
    }, AUTO_SAVE_INTERVAL_MS);
    autoSaveIntervalCount += 1;
  };
  const saveOnceForLifecycle = (allowWhenHidden = false): void => {
    if (controller.hidden && !allowWhenHidden) return;
    const now = getPersistenceNow();
    if (now - controller.lastLifecycleSaveAt < 1000) return;
    controller.lastLifecycleSaveAt = now;
    if (getPersistenceMeta(registry).autoSaveEnabled) saveRegistryState(registry, now, "lifecycle");
  };
  controller.changedataHandler = (_parent: unknown, key: string) => {
    if (TRACKED_REGISTRY_KEYS.has(key)) schedule();
  };
  registry.events.on("changedata", controller.changedataHandler);
  startInterval();
  if (typeof window !== "undefined") {
    controller.pagehideHandler = () => saveOnceForLifecycle();
    controller.beforeunloadHandler = () => saveOnceForLifecycle();
    window.addEventListener("pagehide", controller.pagehideHandler);
    window.addEventListener("beforeunload", controller.beforeunloadHandler);
  }
  if (typeof document !== "undefined") {
    controller.visibilityHandler = () => {
      if (document.visibilityState === "hidden") {
        controller.hidden = true;
        const pending = saveTimers.get(registry);
        if (pending) {
          clearTimeout(pending);
          autoSaveDebounceCount = Math.max(0, autoSaveDebounceCount - 1);
        }
        saveTimers.delete(registry);
        stopInterval();
        saveOnceForLifecycle(true);
        return;
      }
      if (!controller.hidden) return;
      controller.hidden = false;
      const now = getPersistenceNow();
      if (now - controller.lastVisibilitySettlementAt >= 1000) {
        controller.lastVisibilitySettlementAt = now;
        settleOfflineRewards(registry, now);
      }
      startInterval();
    };
    document.addEventListener("visibilitychange", controller.visibilityHandler);
  }
}

export function uninstallAutoSave(registry: Phaser.Data.DataManager): void {
  const controller = autoSaveControllers.get(registry);
  if (!controller) return;
  if (controller.intervalHandle !== null) {
    clearInterval(controller.intervalHandle);
    autoSaveIntervalCount = Math.max(0, autoSaveIntervalCount - 1);
  }
  const pending = saveTimers.get(registry);
  if (pending) {
    clearTimeout(pending);
    autoSaveDebounceCount = Math.max(0, autoSaveDebounceCount - 1);
  }
  saveTimers.delete(registry);
  registry.events.off("changedata", controller.changedataHandler);
  if (typeof window !== "undefined") {
    window.removeEventListener("pagehide", controller.pagehideHandler);
    window.removeEventListener("beforeunload", controller.beforeunloadHandler);
  }
  if (typeof document !== "undefined") document.removeEventListener("visibilitychange", controller.visibilityHandler);
  autoSaveControllers.delete(registry);
  autoSaveControllerCount = Math.max(0, autoSaveControllerCount - 1);
}

export function getAutoSaveDiagnostics(registry: Phaser.Data.DataManager): {
  installed: boolean;
  intervalActive: boolean;
  debouncePending: boolean;
  hidden: boolean;
  controllerCount: number;
  intervalCount: number;
  debounceCount: number;
  storageWriteCount: number;
} {
  const controller = autoSaveControllers.get(registry);
  return {
    installed: Boolean(controller),
    intervalActive: controller?.intervalHandle !== null && controller?.intervalHandle !== undefined,
    debouncePending: saveTimers.has(registry),
    hidden: controller?.hidden ?? false,
    controllerCount: autoSaveControllerCount,
    intervalCount: autoSaveIntervalCount,
    debounceCount: autoSaveDebounceCount,
    storageWriteCount,
  };
}
