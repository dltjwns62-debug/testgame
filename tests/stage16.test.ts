import test from "node:test";
import assert from "node:assert/strict";
import {
  checksumForEnvelope,
  createDefaultSavePayload,
  parseSaveEnvelope,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
} from "../src/game/persistence";
import { calculateOfflineRewardPlan } from "../src/game/offlineProgress";
import { normalizeAutoProgressState } from "../src/game/autoProgress";

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

test("safe storage boundary contains read, write, and remove failures", () => {
  const storage = new ThrowingStorage();
  assert.deepEqual(safeGetItem(storage, "save"), { ok: false, value: null });
  assert.equal(safeSetItem(storage, "save", "value"), false);
  assert.equal(safeRemoveItem(storage, "save"), false);
});

test("save envelopes validate their checksum and reject tampering", () => {
  const unsigned = {
    schemaVersion: 1,
    saveId: "stage16-test",
    savedAtMs: 1000,
    lastActiveAtMs: 1000,
    payload: createDefaultSavePayload(),
  };
  const raw = JSON.stringify({ ...unsigned, checksum: checksumForEnvelope(unsigned) });
  assert.ok(parseSaveEnvelope(raw));
  assert.equal(parseSaveEnvelope(raw.replace("stage16-test", "tampered")), null);
});

test("offline progress keeps the minimum duration boundary and deterministic claim", () => {
  const payload = createDefaultSavePayload();
  payload.autoProgress = normalizeAutoProgressState({
    autoRepeatEnabled: true,
    selectedMonsterId: "slime-1",
    victoryCountsByMonsterId: { "slime-1": 1 },
  });
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

test("memory storage remains usable as a small persistence substitute", () => {
  const storage = new MemoryStorage();
  assert.equal(safeSetItem(storage, "save", "ok"), true);
  assert.deepEqual(safeGetItem(storage, "save"), { ok: true, value: "ok" });
  assert.equal(safeRemoveItem(storage, "save"), true);
  assert.equal(storage.getItem("save"), null);
});

