import type Phaser from "phaser";
import { AUTO_PROGRESS_REGISTRY_KEY, MONSTERS } from "./constants";

export type AutoProgressState = {
  autoRepeatEnabled: boolean;
  selectedMonsterId: string | null;
  victoryCountsByMonsterId: Record<string, number>;
  totalAutoRepeatVictories: number;
  totalOfflineCycles: number;
  offlineRemainderMs: number;
  offlineClaimSequence: number;
};

function isKnownMonsterId(value: unknown): value is string {
  return typeof value === "string" && MONSTERS.some((monster) => monster.id === value);
}

function safeCount(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
}

export function createDefaultAutoProgressState(): AutoProgressState {
  return {
    autoRepeatEnabled: false,
    selectedMonsterId: null,
    victoryCountsByMonsterId: Object.fromEntries(MONSTERS.map((monster) => [monster.id, 0])),
    totalAutoRepeatVictories: 0,
    totalOfflineCycles: 0,
    offlineRemainderMs: 0,
    offlineClaimSequence: 0,
  };
}

export function normalizeAutoProgressState(value: unknown): AutoProgressState {
  const fallback = createDefaultAutoProgressState();
  const candidate = value && typeof value === "object" ? value as Partial<AutoProgressState> : {};
  const rawCounts = candidate.victoryCountsByMonsterId;
  const victoryCountsByMonsterId = { ...fallback.victoryCountsByMonsterId };
  if (rawCounts && typeof rawCounts === "object") {
    for (const monster of MONSTERS) {
      victoryCountsByMonsterId[monster.id] = safeCount((rawCounts as Record<string, unknown>)[monster.id]);
    }
  }
  const selectedMonsterId = isKnownMonsterId(candidate.selectedMonsterId)
    ? candidate.selectedMonsterId
    : null;
  return {
    autoRepeatEnabled: candidate.autoRepeatEnabled === true,
    selectedMonsterId,
    victoryCountsByMonsterId,
    totalAutoRepeatVictories: safeCount(candidate.totalAutoRepeatVictories),
    totalOfflineCycles: safeCount(candidate.totalOfflineCycles),
    offlineRemainderMs: Number.isSafeInteger(candidate.offlineRemainderMs) &&
      (candidate.offlineRemainderMs as number) >= 0 ? candidate.offlineRemainderMs as number : 0,
    offlineClaimSequence: safeCount(candidate.offlineClaimSequence),
  };
}

export function getOrCreateAutoProgressState(registry: Phaser.Data.DataManager): AutoProgressState {
  const stored = registry.get(AUTO_PROGRESS_REGISTRY_KEY);
  const state = normalizeAutoProgressState(stored);
  if (JSON.stringify(stored) !== JSON.stringify(state)) {
    registry.set(AUTO_PROGRESS_REGISTRY_KEY, state);
  }
  return state;
}

export function setAutoProgressState(registry: Phaser.Data.DataManager, state: AutoProgressState): void {
  registry.set(AUTO_PROGRESS_REGISTRY_KEY, normalizeAutoProgressState(state));
}

export function setAutoRepeatEnabled(registry: Phaser.Data.DataManager, enabled: boolean): AutoProgressState {
  const state = getOrCreateAutoProgressState(registry);
  state.autoRepeatEnabled = enabled === true;
  setAutoProgressState(registry, state);
  return state;
}

export function setSelectedAutoRepeatMonster(
  registry: Phaser.Data.DataManager,
  monsterId: string | null,
): AutoProgressState {
  const state = getOrCreateAutoProgressState(registry);
  state.selectedMonsterId = isKnownMonsterId(monsterId) ? monsterId : null;
  setAutoProgressState(registry, state);
  return state;
}

export function recordActualMonsterVictory(
  registry: Phaser.Data.DataManager,
  monsterId: string,
): AutoProgressState {
  const state = getOrCreateAutoProgressState(registry);
  if (isKnownMonsterId(monsterId)) {
    state.victoryCountsByMonsterId[monsterId] = safeCount(state.victoryCountsByMonsterId[monsterId]) + 1;
    state.totalAutoRepeatVictories = safeCount(state.totalAutoRepeatVictories) + 1;
  }
  setAutoProgressState(registry, state);
  return state;
}

export function hasActualVictory(state: AutoProgressState, monsterId: string | null): boolean {
  return isKnownMonsterId(monsterId) && safeCount(state.victoryCountsByMonsterId[monsterId]) > 0;
}
