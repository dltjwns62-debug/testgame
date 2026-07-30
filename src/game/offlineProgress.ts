import {
  MONSTERS,
  OFFLINE_CYCLE_DURATION_MS,
  OFFLINE_MAX_DURATION_MS,
  OFFLINE_MIN_DURATION_MS,
  RTS_ENEMY_COUNT,
} from "./constants";
import { getMonsterDropTable, getItemDefinition, type ItemInstance } from "./items";
import { addExperience } from "./progression";
import { normalizeAutoProgressState } from "./autoProgress";
import type { SavePayload } from "./persistence";
import { cloneFormationState, isValidFormationState } from "./formationState";
import { cloneInventoryState } from "./items";
import { cloneKeyBindingState } from "./keyBindings";
import { clonePersistentControlGroupState } from "./controlGroups";

export type OfflineRewardSummary = {
  applied: boolean;
  reason: string;
  monsterId: string | null;
  monsterName: string;
  rawElapsedMs: number;
  eligibleMs: number;
  capped: boolean;
  cycles: number;
  gold: number;
  directExperience: number;
  bonusExperience: number;
  experienceByRosterUnitId: Record<string, number>;
  itemDefinitionIds: string[];
  itemCapApplied: boolean;
  recoveredMessage?: string;
};

export type OfflineRewardPlan = {
  nextPayload: SavePayload;
  nextLastActiveAtMs: number;
  summary: OfflineRewardSummary;
};

function safeNow(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function safeElapsed(nowMs: number, lastActiveAtMs: number): number {
  if (!Number.isFinite(lastActiveAtMs) || lastActiveAtMs < 0) {
    return 0;
  }
  return Math.max(0, nowMs - lastActiveAtMs);
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createDeterministicRandom(seedText: string): () => number {
  let state = hashString(seedText) || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function emptySummary(reason: string, nowMs: number, monsterId: string | null, monsterName = "None"): OfflineRewardSummary {
  return {
    applied: false,
    reason,
    monsterId,
    monsterName,
    rawElapsedMs: 0,
    eligibleMs: 0,
    capped: false,
    cycles: 0,
    gold: 0,
    directExperience: 0,
    bonusExperience: 0,
    experienceByRosterUnitId: {},
    itemDefinitionIds: [],
    itemCapApplied: false,
  };
}

export function calculateOfflineRewardPlan(
  payload: SavePayload,
  saveId: string,
  lastActiveAtMs: number,
  nowMs: number,
): OfflineRewardPlan {
  const nextPayload: SavePayload = {
    formation: cloneFormationState(payload.formation),
    playerGold: payload.playerGold,
    keyBindings: cloneKeyBindingState(payload.keyBindings),
    controlGroups: clonePersistentControlGroupState(payload.controlGroups),
    inventory: cloneInventoryState(payload.inventory),
    battleAutoHuntEnabled: payload.battleAutoHuntEnabled,
    autoProgress: normalizeAutoProgressState(payload.autoProgress),
  };
  const safeCurrentTime = safeNow(nowMs);
  const autoProgress = nextPayload.autoProgress;
  const rawElapsedMs = safeElapsed(safeCurrentTime, lastActiveAtMs);
  const selectedMonsterId = autoProgress.selectedMonsterId;
  const monster = selectedMonsterId
    ? MONSTERS.find((candidate) => candidate.id === selectedMonsterId)
    : undefined;
  const defaultSummary = emptySummary("Offline hunting is not enabled.", safeCurrentTime, selectedMonsterId, monster?.name ?? "None");
  defaultSummary.rawElapsedMs = rawElapsedMs;

  if (!autoProgress.autoRepeatEnabled || !monster) {
    autoProgress.offlineClaimSequence += 1;
    autoProgress.offlineRemainderMs = 0;
    return { nextPayload, nextLastActiveAtMs: safeCurrentTime, summary: defaultSummary };
  }
  if ((autoProgress.victoryCountsByMonsterId[monster.id] ?? 0) < 1) {
    defaultSummary.reason = "Offline rewards are locked until this monster is defeated once.";
    autoProgress.offlineClaimSequence += 1;
    return { nextPayload, nextLastActiveAtMs: safeCurrentTime, summary: defaultSummary };
  }
  if (!isValidFormationState(nextPayload.formation)) {
    defaultSummary.reason = "Formation data was invalid.";
    autoProgress.offlineClaimSequence += 1;
    return { nextPayload, nextLastActiveAtMs: safeCurrentTime, summary: defaultSummary };
  }

  const deployed = nextPayload.formation.slots
    .filter((slot) => slot.rosterUnitId !== null)
    .sort((left, right) => left.slotIndex - right.slotIndex)
    .map((slot) => slot.rosterUnitId as string);
  const heroId = nextPayload.formation.ownedUnits.find((unit) => unit.unitRole === "MAIN_CHARACTER")?.rosterUnitId;
  if (!heroId || !deployed.includes(heroId) || deployed.length < 1) {
    defaultSummary.reason = "A valid formation with a deployed Hero is required.";
    autoProgress.offlineClaimSequence += 1;
    return { nextPayload, nextLastActiveAtMs: safeCurrentTime, summary: defaultSummary };
  }

  const cappedElapsedMs = Math.min(rawElapsedMs, OFFLINE_MAX_DURATION_MS);
  const meetsMinimumDuration = rawElapsedMs >= OFFLINE_MIN_DURATION_MS;
  const eligibleMs = meetsMinimumDuration
    ? cappedElapsedMs + autoProgress.offlineRemainderMs
    : 0;
  const cycleDurationMs = OFFLINE_CYCLE_DURATION_MS[monster.id] ?? 0;
  const cycles = cycleDurationMs > 0 && meetsMinimumDuration
    ? Math.floor(eligibleMs / cycleDurationMs)
    : 0;
  const directPoolPerCycle = RTS_ENEMY_COUNT * monster.experienceReward;
  const directQuotient = deployed.length > 0 ? Math.floor(directPoolPerCycle / deployed.length) : 0;
  const directRemainder = deployed.length > 0 ? directPoolPerCycle % deployed.length : 0;
  const directByRosterUnitId: Record<string, number> = {};
  const experienceByRosterUnitId: Record<string, number> = {};
  let totalDirectExperience = 0;
  let totalBonusExperience = 0;
  for (let index = 0; index < deployed.length; index += 1) {
    const direct = (directQuotient * cycles) + (index < directRemainder ? cycles : 0);
    const bonus = Math.floor(directPoolPerCycle * 0.1) * cycles;
    const total = direct + bonus;
    directByRosterUnitId[deployed[index]] = direct;
    experienceByRosterUnitId[deployed[index]] = total;
    totalDirectExperience += direct;
    totalBonusExperience += bonus;
    const unit = nextPayload.formation.ownedUnits.find((candidate) => candidate.rosterUnitId === deployed[index]);
    if (unit && total > 0) {
      const result = addExperience(unit, total);
      unit.level = result.next.level;
      unit.experience = result.next.experience;
    }
  }

  const gold = cycles > 0 ? Math.min(Number.MAX_SAFE_INTEGER, cycles * monster.goldReward) : 0;
  nextPayload.playerGold = Math.min(Number.MAX_SAFE_INTEGER, nextPayload.playerGold + gold);
  const itemDefinitionIds: string[] = [];
  const itemCap = 100;
  const dropTable = getMonsterDropTable(monster.id);
  for (let cycleIndex = 0; cycleIndex < cycles; cycleIndex += 1) {
    const random = createDeterministicRandom(
      `${saveId}:${autoProgress.offlineClaimSequence}:${monster.id}:${cycleIndex}`,
    );
    for (const entry of dropTable) {
      if (itemDefinitionIds.length >= itemCap) {
        break;
      }
      const definition = getItemDefinition(entry.itemDefinitionId);
      if (definition && Number.isFinite(entry.dropChance) && random() < entry.dropChance) {
        itemDefinitionIds.push(entry.itemDefinitionId);
      }
    }
  }
  let itemCapApplied = false;
  const theoreticalDropCount = cycles * dropTable.length;
  if (theoreticalDropCount > itemCap) {
    itemCapApplied = itemDefinitionIds.length >= itemCap;
  }
  for (const itemDefinitionId of itemDefinitionIds) {
    const sequence = nextPayload.inventory.nextItemInstanceSequence;
    nextPayload.inventory.itemInstances.push({
      itemInstanceId: "item-" + sequence,
      itemDefinitionId,
      acquiredSequence: sequence,
    } as ItemInstance);
    nextPayload.inventory.nextItemInstanceSequence += 1;
  }
  autoProgress.totalOfflineCycles = Math.min(Number.MAX_SAFE_INTEGER, autoProgress.totalOfflineCycles + cycles);
  if (meetsMinimumDuration) {
    autoProgress.offlineRemainderMs = cycleDurationMs > 0 ? eligibleMs % cycleDurationMs : 0;
  }
  autoProgress.offlineClaimSequence = Math.min(Number.MAX_SAFE_INTEGER, autoProgress.offlineClaimSequence + 1);
  return {
    nextPayload,
    nextLastActiveAtMs: safeCurrentTime,
    summary: {
      applied: cycles > 0,
      reason: cycles > 0 ? "Offline rewards applied." : "Not enough elapsed time for an offline cycle.",
      monsterId: monster.id,
      monsterName: monster.name,
      rawElapsedMs,
      eligibleMs,
      capped: rawElapsedMs > OFFLINE_MAX_DURATION_MS,
      cycles,
      gold,
      directExperience: totalDirectExperience,
      bonusExperience: totalBonusExperience,
      experienceByRosterUnitId,
      itemDefinitionIds,
      itemCapApplied,
    },
  };
}
