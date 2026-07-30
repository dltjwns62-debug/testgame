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

const installedAutoSave = new WeakSet<object>();
const savingRegistries = new WeakSet<object>();
const saveTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();
type AutoSaveController = {
  intervalHandle: ReturnType<typeof setInterval> | null;
  hidden: boolean;
  lastLifecycleSaveAt: number;
  lastVisibilitySettlementAt: number;
};
const autoSaveControllers = new WeakMap<object, AutoSaveController>();

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

function checksumForEnvelope(envelope: Omit<SaveEnvelope, "checksum">): string {
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
  return random ?? "save-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export type SafeStorageRead = { ok: true; value: string | null } | { ok: false; value: null };

export function safeGetItem(storage: Storage | null, key: string): SafeStorageRead {
  if (!storage) return { ok: false, value: null };
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false, value: null };
  }
}

export function safeSetItem(storage: Storage | null, key: string, value: string): boolean {
  if (!storage) return false;
  try { storage.setItem(key, value); return true; } catch { return false; }
}

export function safeRemoveItem(storage: Storage | null, key: string): boolean {
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

function hasFutureSchema(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const candidate = JSON.parse(raw) as { schemaVersion?: unknown };
    return Number.isSafeInteger(candidate.schemaVersion) && (candidate.schemaVersion as number) > SAVE_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

function writeEnvelope(storage: Storage | null, key: string, envelope: SaveEnvelope): boolean {
  return safeSetItem(storage, key, JSON.stringify(envelope));
}

type SafeSaveResult = {
  ok: boolean;
  envelope: SaveEnvelope;
  cleanupWarning?: string;
};

function savePayloadSafely(
  payload: SavePayload,
  saveId: string,
  savedAtMs: number,
  lastActiveAtMs: number,
): SafeSaveResult {
  const envelope = buildEnvelope(payload, saveId, savedAtMs, lastActiveAtMs);
  const storage = getStorage();
  if (!storage) {
    return { ok: false, envelope };
  }
  try {
    if (!writeEnvelope(storage, SAVE_TEMP_KEY, envelope)) {
      return { ok: false, envelope };
    }
    const tempRead = safeGetItem(storage, SAVE_TEMP_KEY);
    if (!tempRead.ok || !readValidEnvelope(tempRead.value)) {
      return { ok: false, envelope };
    }
    const primaryRead = safeGetItem(storage, SAVE_PRIMARY_KEY);
    if (!primaryRead.ok) {
      return { ok: false, envelope };
    }
    const currentPrimary = readValidEnvelope(primaryRead.value);
    if (currentPrimary && !writeEnvelope(storage, SAVE_BACKUP_KEY, currentPrimary)) {
      return { ok: false, envelope };
    }
    if (!writeEnvelope(storage, SAVE_PRIMARY_KEY, envelope)) {
      return { ok: false, envelope };
    }
    const savedPrimaryRead = safeGetItem(storage, SAVE_PRIMARY_KEY);
    if (!savedPrimaryRead.ok || !readValidEnvelope(savedPrimaryRead.value)) {
      return { ok: false, envelope };
    }
    return safeRemoveItem(storage, SAVE_TEMP_KEY)
      ? { ok: true, envelope }
      : { ok: true, envelope, cleanupWarning: "Temporary save cleanup failed; the verified primary save remains active." };
  } catch {
    return { ok: false, envelope };
  }
}

function resultFromMeta(registry: Phaser.Data.DataManager, message: string, ok: boolean): PersistenceOperationResult {
  const meta = getPersistenceMeta(registry);
  return { ok, meta, message };
}

export function saveRegistryState(registry: Phaser.Data.DataManager, nowMs = Date.now()): PersistenceOperationResult {
  const meta = getPersistenceMeta(registry);
  if (meta.newerVersionBlocked) {
    setPersistenceMeta(registry, { ...meta, status: "NEWER_VERSION_BLOCKED", message: "This save was created by a newer version." });
    return resultFromMeta(registry, "This save was created by a newer version.", false);
  }
  const payload = payloadFromRegistry(registry);
  const result = savePayloadSafely(payload, meta.saveId, nowMs, nowMs);
  const nextMeta = {
    ...meta,
    savedAtMs: result.ok ? result.envelope.savedAtMs : meta.savedAtMs,
    lastActiveAtMs: result.ok ? result.envelope.lastActiveAtMs : meta.lastActiveAtMs,
    status: result.ok ? "SAVED" as const : "SAVE_FAILED" as const,
    message: result.ok
      ? result.cleanupWarning ?? "Saved."
      : "Save failed; the game continues in memory.",
  };
  setPersistenceMeta(registry, nextMeta);
  return { ok: result.ok, meta: nextMeta, message: nextMeta.message };
}

export function loadGame(registry: Phaser.Data.DataManager, nowMs = Date.now()): PersistenceOperationResult {
  const storage = getStorage();
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
  const source = primary ?? backup ?? temp;
  if (!source) {
    if (primaryRaw) {
      safeSetItem(storage, SAVE_RECOVERY_KEY, primaryRaw);
    }
    const payload = payloadFromRegistry(registry);
    const saveId = getPersistenceMeta(registry).saveId;
    const saved = savePayloadSafely(payload, saveId, nowMs, nowMs);
    applySavePayload(registry, payload);
    const previousMeta = getPersistenceMeta(registry);
    const meta = { ...previousMeta, saveId, savedAtMs: saved.ok ? nowMs : previousMeta.savedAtMs, lastActiveAtMs: saved.ok ? nowMs : previousMeta.lastActiveAtMs, status: saved.ok ? "RESET_TO_DEFAULT" as const : "SAVE_FAILED" as const, message: saved.ok ? "New save created." : "Save data was unavailable." };
    setPersistenceMeta(registry, meta);
    return { ok: saved.ok, meta, message: meta.message };
  }

  const sourceKey = primary ? SAVE_PRIMARY_KEY : backup ? SAVE_BACKUP_KEY : SAVE_TEMP_KEY;
  if (primaryRaw && !primary) {
    safeSetItem(storage, SAVE_RECOVERY_KEY, primaryRaw);
  }
  const olderMeta = getPersistenceMeta(registry);
  const plan = calculateOfflineRewardPlan(source.payload, source.saveId, source.lastActiveAtMs, nowMs);
  const saved = savePayloadSafely(plan.nextPayload, source.saveId, nowMs, plan.nextLastActiveAtMs);
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

export function resetSaveData(registry: Phaser.Data.DataManager, nowMs = Date.now()): PersistenceOperationResult {
  const storage = getStorage();
  if (storage) {
    for (const key of [SAVE_PRIMARY_KEY, SAVE_BACKUP_KEY, SAVE_TEMP_KEY, SAVE_RECOVERY_KEY]) {
      safeRemoveItem(storage, key);
    }
  }
  const payload = createDefaultSavePayload();
  applySavePayload(registry, payload);
  registry.remove(PERSISTENCE_SUMMARY_REGISTRY_KEY);
  const meta = { ...createDefaultMeta(), savedAtMs: nowMs, lastActiveAtMs: nowMs, status: "RESET_TO_DEFAULT" as const, message: "Save reset to defaults." };
  setPersistenceMeta(registry, meta);
  const result = savePayloadSafely(payload, meta.saveId, nowMs, nowMs);
  if (!result.ok) {
    const failed = { ...meta, status: "SAVE_FAILED" as const, message: "Reset completed in memory, but saving failed." };
    setPersistenceMeta(registry, failed);
    return { ok: false, meta: failed, message: failed.message };
  }
  const saved = { ...meta, savedAtMs: nowMs, lastActiveAtMs: nowMs };
  setPersistenceMeta(registry, saved);
  return { ok: true, meta: saved, message: saved.message };
}

export function settleOfflineRewards(registry: Phaser.Data.DataManager, nowMs = Date.now()): PersistenceOperationResult {
  const meta = getPersistenceMeta(registry);
  if (meta.newerVersionBlocked) {
    return resultFromMeta(registry, "This save was created by a newer version.", false);
  }
  const plan = calculateOfflineRewardPlan(payloadFromRegistry(registry), meta.saveId, meta.lastActiveAtMs, nowMs);
  const saved = savePayloadSafely(plan.nextPayload, meta.saveId, nowMs, plan.nextLastActiveAtMs);
  if (!saved.ok) {
    setPersistenceMeta(registry, { ...meta, status: "SAVE_FAILED", message: "Offline rewards were not applied because saving failed." });
    return { ok: false, meta: getPersistenceMeta(registry), message: "Offline rewards were not applied because saving failed." };
  }
  applySavePayload(registry, plan.nextPayload);
  const nextMeta = { ...meta, savedAtMs: nowMs, lastActiveAtMs: plan.nextLastActiveAtMs, status: "SAVED" as const, message: "Offline rewards applied and saved." };
  setPersistenceMeta(registry, nextMeta);
  registry.set(PERSISTENCE_SUMMARY_REGISTRY_KEY, plan.summary);
  return { ok: true, meta: nextMeta, message: nextMeta.message, summary: plan.summary };
}

export function installAutoSave(registry: Phaser.Data.DataManager): void {
  if (installedAutoSave.has(registry)) {
    return;
  }
  installedAutoSave.add(registry);
  const controller: AutoSaveController = {
    intervalHandle: null,
    hidden: typeof document !== "undefined" && document.visibilityState === "hidden",
    lastLifecycleSaveAt: 0,
    lastVisibilitySettlementAt: 0,
  };
  autoSaveControllers.set(registry, controller);
  const schedule = (): void => {
    if (controller.hidden || savingRegistries.has(registry) || !getPersistenceMeta(registry).autoSaveEnabled) {
      return;
    }
    const previous = saveTimers.get(registry);
    if (previous) clearTimeout(previous);
    saveTimers.set(registry, setTimeout(() => {
      saveTimers.delete(registry);
      if (!controller.hidden && getPersistenceMeta(registry).autoSaveEnabled) saveRegistryState(registry);
    }, AUTO_SAVE_DEBOUNCE_MS));
  };
  const stopInterval = (): void => {
    if (controller.intervalHandle !== null) {
      clearInterval(controller.intervalHandle);
      controller.intervalHandle = null;
    }
  };
  const startInterval = (): void => {
    stopInterval();
    controller.intervalHandle = setInterval(() => {
      if (!controller.hidden && getPersistenceMeta(registry).autoSaveEnabled) saveRegistryState(registry);
    }, AUTO_SAVE_INTERVAL_MS);
  };
  const saveOnceForLifecycle = (allowWhenHidden = false): void => {
    if (controller.hidden && !allowWhenHidden) return;
    const now = Date.now();
    if (now - controller.lastLifecycleSaveAt < 1000) return;
    controller.lastLifecycleSaveAt = now;
    if (getPersistenceMeta(registry).autoSaveEnabled) saveRegistryState(registry, now);
  };
  registry.events.on("changedata", (_parent: unknown, key: string) => {
    if (TRACKED_REGISTRY_KEYS.has(key)) schedule();
  });
  startInterval();
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => saveOnceForLifecycle());
    window.addEventListener("beforeunload", () => saveOnceForLifecycle());
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        controller.hidden = true;
        const pending = saveTimers.get(registry);
        if (pending) clearTimeout(pending);
        saveTimers.delete(registry);
        stopInterval();
        saveOnceForLifecycle(true);
        return;
      }
      if (!controller.hidden) return;
      controller.hidden = false;
      const now = Date.now();
      if (now - controller.lastVisibilitySettlementAt >= 1000) {
        controller.lastVisibilitySettlementAt = now;
        settleOfflineRewards(registry, now);
      }
      startInterval();
    });
  }
}
