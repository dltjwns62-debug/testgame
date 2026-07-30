import test from "node:test";
import assert from "node:assert/strict";
import {
  checksumForEnvelope,
  chooseSaveCandidate,
  createDefaultSavePayload,
  hasFutureSchema,
  loadEnvelopeCandidates,
  parseSaveEnvelope,
  savePayloadSafely,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
} from "../src/game/persistence";
import { calculateOfflineRewardPlan } from "../src/game/offlineProgress";
import { normalizeAutoProgressState } from "../src/game/autoProgress";
import { createDefaultFormationState, isValidFormationState, normalizeFormationState } from "../src/game/formationState";
import { normalizePersistentControlGroupState } from "../src/game/controlGroups";
import { normalizeInventoryStateForOwnedUnits, calculatePhysicalDamage } from "../src/game/items";
import { addExperience, calculateBattleEndBonusExperience, normalizeProgressionState, PROGRESSION_CONFIG } from "../src/game/progression";
import { createFormationDestinations, moveToward } from "../src/game/rtsBattleUtils";
import type { RTSBattleUnit } from "../src/game/rtsBattleTypes";
import { installGlobalRuntimeErrorHandlers, clearRuntimeErrorHandlers } from "../src/game/runtimeErrors";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  public getItem(key: string): string | null { return this.values.get(key) ?? null; }
  public setItem(key: string, value: string): void { this.values.set(key, value); }
  public removeItem(key: string): void { this.values.delete(key); }
}

class ThrowingStorage {
  public getItem(): string | null { throw new Error("storage unavailable"); }
  public setItem(): void { throw new Error("quota exceeded"); }
  public removeItem(): void { throw new Error("storage unavailable"); }
}

class QuotaStorage extends MemoryStorage {
  public override setItem(): void { throw new Error("quota exceeded"); }
}

class TempCleanupFailureStorage extends MemoryStorage {
  public override removeItem(key: string): void {
    if (key === "testgame.save.temp") throw new Error("temp cleanup failed");
    super.removeItem(key);
  }
}

function createEnvelope(overrides: Partial<{
  schemaVersion: number;
  saveId: string;
  savedAtMs: number;
  lastActiveAtMs: number;
  payload: ReturnType<typeof createDefaultSavePayload>;
}> = {}): { schemaVersion: number; saveId: string; savedAtMs: number; lastActiveAtMs: number; payload: ReturnType<typeof createDefaultSavePayload>; checksum: string } {
  const unsigned = unsignedEnvelopeInternal(overrides);
  return { ...unsigned, checksum: checksumForEnvelope(unsigned) };
}

function unsignedEnvelopeInternal(overrides: Partial<{
  schemaVersion: number;
  saveId: string;
  savedAtMs: number;
  lastActiveAtMs: number;
  payload: ReturnType<typeof createDefaultSavePayload>;
}> = {}) {
  return {
    schemaVersion: 1,
    saveId: "stage16-test",
    savedAtMs: 1000,
    lastActiveAtMs: 1000,
    payload: createDefaultSavePayload(),
    ...overrides,
  };
}

function offlinePayload() {
  const payload = createDefaultSavePayload();
  payload.autoProgress = normalizeAutoProgressState({
    autoRepeatEnabled: true,
    selectedMonsterId: "slime-1",
    victoryCountsByMonsterId: { "slime-1": 1 },
  });
  return payload;
}

test("safe storage boundary contains read, write, and remove failures", () => {
  const storage = new ThrowingStorage();
  assert.deepEqual(safeGetItem(storage, "save"), { ok: false, value: null });
  assert.equal(safeSetItem(storage, "save", "value"), false);
  assert.equal(safeRemoveItem(storage, "save"), false);
});

test("save envelopes validate their checksum and reject tampering", () => {
  const envelope = createEnvelope();
  const raw = JSON.stringify(envelope);
  assert.ok(parseSaveEnvelope(raw));
  assert.equal(parseSaveEnvelope(raw.replace("stage16-test", "tampered")), null);
});

test("checksum is deterministic and changes when payload changes", () => {
  const first = createEnvelope();
  const second = createEnvelope();
  assert.equal(first.checksum, second.checksum);
  const changed = createEnvelope({ payload: { ...first.payload, playerGold: 1 } });
  assert.notEqual(first.checksum, changed.checksum);
});

test("corrupt JSON and checksum mutations are rejected while schema one is accepted", () => {
  const envelope = createEnvelope();
  assert.equal(parseSaveEnvelope("{broken"), null);
  assert.equal(parseSaveEnvelope(JSON.stringify({ ...envelope, checksum: "00000000" })), null);
  assert.ok(parseSaveEnvelope(JSON.stringify(envelope)));
  assert.equal(hasFutureSchema(JSON.stringify({ ...envelope, schemaVersion: 2 })), true);
});

test("save candidates prefer primary, then backup, then temp", () => {
  const primary = JSON.stringify(createEnvelope({ saveId: "primary" }));
  const backup = JSON.stringify(createEnvelope({ saveId: "backup" }));
  const temp = JSON.stringify(createEnvelope({ saveId: "temp" }));
  assert.equal(chooseSaveCandidate(primary, backup, temp)?.envelope.saveId, "primary");
  assert.equal(chooseSaveCandidate("{bad", backup, temp)?.envelope.saveId, "backup");
  assert.equal(chooseSaveCandidate("{bad", "{bad", temp)?.envelope.saveId, "temp");
});

test("storage candidate adapter recovers valid backup and temp entries", () => {
  const storage = new MemoryStorage();
  storage.setItem("testgame.save.primary", "{bad");
  storage.setItem("testgame.save.backup", JSON.stringify(createEnvelope({ saveId: "backup" })));
  assert.equal(loadEnvelopeCandidates(storage).candidate?.envelope.saveId, "backup");
  storage.setItem("testgame.save.backup", "{bad");
  storage.setItem("testgame.save.temp", JSON.stringify(createEnvelope({ saveId: "temp" })));
  assert.equal(loadEnvelopeCandidates(storage).candidate?.envelope.saveId, "temp");
});

test("all corrupt saves produce no candidate for default recovery", () => {
  const result = loadEnvelopeCandidates(new MemoryStorage());
  assert.equal(result.candidate, null);
  assert.equal(result.storageAvailable, true);
});

test("throwing reads use unavailable memory mode and quota failures preserve primary", () => {
  assert.equal(loadEnvelopeCandidates(new ThrowingStorage()).storageAvailable, false);
  const storage = new QuotaStorage();
  const oldPrimary = JSON.stringify(createEnvelope({ saveId: "old" }));
  MemoryStorage.prototype.setItem.call(storage, "testgame.save.primary", oldPrimary);
  const result = savePayloadSafely(createDefaultSavePayload(), "new", 2000, 2000, "test", storage);
  assert.equal(result.ok, false);
  assert.equal(storage.getItem("testgame.save.primary"), oldPrimary);
});

test("temp cleanup failure does not turn a verified save into failure", () => {
  const storage = new TempCleanupFailureStorage();
  const result = savePayloadSafely(createDefaultSavePayload(), "new", 2000, 2000, "test", storage);
  assert.equal(result.ok, true);
  assert.match(result.cleanupWarning ?? "", /cleanup failed/);
});

test("offline progress keeps the minimum duration boundary and deterministic claim", () => {
  const payload = offlinePayload();
  const below = calculateOfflineRewardPlan(payload, "save-a", 0, 59_999);
  assert.equal(below.summary.applied, false);
  assert.equal(below.summary.rawElapsedMs, 59_999);
  assert.equal(below.nextPayload.autoProgress.offlineRemainderMs, 0);

  const first = calculateOfflineRewardPlan(payload, "save-a", 0, 180_000);
  const second = calculateOfflineRewardPlan(payload, "save-a", 0, 180_000);
  assert.equal(first.summary.cycles, 1);
  assert.deepEqual(first.summary, second.summary);
  assert.equal(first.nextPayload.playerGold, payload.playerGold + 10);
});

test("offline 60 seconds includes existing remainder without inventing a cycle", () => {
  const payload = offlinePayload();
  payload.autoProgress.offlineRemainderMs = 30_000;
  const result = calculateOfflineRewardPlan(payload, "save-a", 0, 60_000);
  assert.equal(result.summary.eligibleMs, 90_000);
  assert.equal(result.summary.cycles, 0);
  assert.equal(result.summary.applied, false);
});

test("offline eight hour cap limits Slime 1 cycles", () => {
  const result = calculateOfflineRewardPlan(offlinePayload(), "save-a", 0, 8 * 60 * 60 * 1000 + 999_999);
  assert.equal(result.summary.capped, true);
  assert.equal(result.summary.cycles, 160);
  assert.ok(result.summary.itemDefinitionIds.length <= 100);
});

test("negative offline clock input is clamped to zero", () => {
  const result = calculateOfflineRewardPlan(offlinePayload(), "save-a", 0, -1);
  assert.equal(result.summary.rawElapsedMs, 0);
  assert.equal(result.summary.gold, 0);
});

test("offline rewards require a recorded first victory", () => {
  const payload = createDefaultSavePayload();
  payload.autoProgress = normalizeAutoProgressState({ autoRepeatEnabled: true, selectedMonsterId: "slime-1" });
  const result = calculateOfflineRewardPlan(payload, "save-a", 0, 180_000);
  assert.equal(result.summary.applied, false);
  assert.equal(result.summary.gold, 0);
});

test("offline rewards require a deployed Hero and do not grant Bench EXP", () => {
  const payload = offlinePayload();
  const heroId = payload.formation.ownedUnits.find((unit) => unit.unitRole === "MAIN_CHARACTER")?.rosterUnitId;
  payload.formation.slots = payload.formation.slots.map((slot) => slot.rosterUnitId === heroId ? { ...slot, rosterUnitId: null } : slot);
  const result = calculateOfflineRewardPlan(payload, "save-a", 0, 180_000);
  assert.equal(result.summary.applied, false);
  const deployedIds = new Set(payload.formation.slots.flatMap((slot) => slot.rosterUnitId ? [slot.rosterUnitId] : []));
  assert.ok(Object.keys(result.summary.experienceByRosterUnitId).every((id) => deployedIds.has(id)));
});

test("offline experience is evenly distributed across deployed units", () => {
  const result = calculateOfflineRewardPlan(offlinePayload(), "save-a", 0, 180_000);
  const values = Object.values(result.summary.experienceByRosterUnitId);
  assert.equal(values.length, 10);
  assert.ok(values.every((value) => value === values[0]));
});

test("offline item results are deterministic for the same seed and claim sequence changes the seed", () => {
  const sameA = calculateOfflineRewardPlan(offlinePayload(), "save-a", 0, 8 * 60 * 60 * 1000);
  const sameB = calculateOfflineRewardPlan(offlinePayload(), "save-a", 0, 8 * 60 * 60 * 1000);
  const changedPayload = offlinePayload();
  changedPayload.autoProgress.offlineClaimSequence = 1;
  const changed = calculateOfflineRewardPlan(changedPayload, "save-a", 0, 8 * 60 * 60 * 1000);
  assert.deepEqual(sameA.summary.itemDefinitionIds, sameB.summary.itemDefinitionIds);
  assert.notDeepEqual(sameA.summary.itemDefinitionIds, changed.summary.itemDefinitionIds);
  assert.ok(sameA.summary.itemDefinitionIds.length <= 100);
});

test("immediate offline re-settlement has no additional elapsed reward", () => {
  const first = calculateOfflineRewardPlan(offlinePayload(), "save-a", 0, 180_000);
  const second = calculateOfflineRewardPlan(first.nextPayload, "save-a", first.nextLastActiveAtMs, first.nextLastActiveAtMs);
  assert.equal(second.summary.cycles, 0);
  assert.equal(second.summary.gold, 0);
});

test("formation normalization preserves Hero deployment and removes ghost slot ids", () => {
  const formation = createDefaultFormationState();
  formation.slots[0] = { slotIndex: 0, rosterUnitId: "ghost" };
  const normalized = normalizeFormationState(formation);
  assert.equal(isValidFormationState(normalized), true);
  assert.equal(normalized.slots.some((slot) => slot.rosterUnitId === "ghost"), false);
  assert.ok(normalized.ownedUnits.some((unit) => unit.unitRole === "MAIN_CHARACTER"));
});

test("control groups remove duplicate and ghost roster references", () => {
  const formation = createDefaultFormationState();
  const ownedIds = new Set(formation.ownedUnits.map((unit) => unit.rosterUnitId));
  const normalized = normalizePersistentControlGroupState({ groups: [[...ownedIds, "ghost", [...ownedIds][0]], [], [], [], [], [], [], [], [], []] }, ownedIds);
  assert.equal(normalized.groups[0].includes("ghost"), false);
  assert.equal(new Set(normalized.groups[0]).size, normalized.groups[0].length);
});

test("inventory normalization removes ghost equipment but retains its ItemInstance", () => {
  const state = normalizeInventoryStateForOwnedUnits({
    itemInstances: [{ itemInstanceId: "item-1", itemDefinitionId: "training-blade", acquiredSequence: 1 }],
    equipmentByRosterUnitId: { ghost: { weapon: "item-1", armor: null, accessory: null } },
    nextItemInstanceSequence: 2,
  }, new Set(["merc-1"]));
  assert.equal(state.equipmentByRosterUnitId.ghost, undefined);
  assert.equal(state.itemInstances.some((item) => item.itemInstanceId === "item-1"), true);
});

test("progression clamps level to 99 and keeps experience non-negative", () => {
  const normalized = normalizeProgressionState({ level: 999, experience: -1 });
  assert.equal(normalized.level, PROGRESSION_CONFIG.maxLevel);
  assert.equal(normalized.experience, 0);
  assert.equal(addExperience(normalized, 100).next.level, 99);
});

test("physical damage always has minimum one and battle bonus is separated", () => {
  assert.equal(calculatePhysicalDamage(1, 999), 1);
  assert.equal(calculatePhysicalDamage(50, 25), 40);
  assert.equal(calculateBattleEndBonusExperience(100), 10);
});

test("formation destinations are finite and unique at arena edges", () => {
  const destinations = createFormationDestinations({ x: -999, y: 999 }, 20);
  assert.equal(new Set(destinations.map((position) => `${position.x},${position.y}`)).size, destinations.length);
  assert.ok(destinations.every((position) => Number.isFinite(position.x) && Number.isFinite(position.y)));
});

test("MOVE helper arrives at destination and preserves finite position", () => {
  const unit = { position: { x: 100, y: 100 }, collisionRadius: 10, moveSpeed: 100 } as RTSBattleUnit;
  assert.equal(moveToward(unit, { x: 101, y: 101 }, 16), true);
  assert.ok(Number.isFinite(unit.position.x) && Number.isFinite(unit.position.y));
});

test("runtime error handlers install once, remove named listeners, and reinstall", () => {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const target = {
    addEventListener(type: string, listener: (event: Event) => void): void {
      const set = listeners.get(type) ?? new Set(); set.add(listener); listeners.set(type, set);
    },
    removeEventListener(type: string, listener: (event: Event) => void): void { listeners.get(type)?.delete(listener); },
  };
  const registry = { set: () => undefined };
  installGlobalRuntimeErrorHandlers(registry, target);
  installGlobalRuntimeErrorHandlers(registry, target);
  assert.equal(listeners.get("error")?.size, 1);
  assert.equal(listeners.get("unhandledrejection")?.size, 1);
  clearRuntimeErrorHandlers();
  assert.equal(listeners.get("error")?.size, 0);
  assert.equal(listeners.get("unhandledrejection")?.size, 0);
  installGlobalRuntimeErrorHandlers(registry, target);
  assert.equal(listeners.get("error")?.size, 1);
  clearRuntimeErrorHandlers();
});

test("memory storage remains usable as a small persistence substitute", () => {
  const storage = new MemoryStorage();
  assert.equal(safeSetItem(storage, "save", "ok"), true);
  assert.deepEqual(safeGetItem(storage, "save"), { ok: true, value: "ok" });
  assert.equal(safeRemoveItem(storage, "save"), true);
  assert.equal(storage.getItem("save"), null);
});
