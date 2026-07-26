import {
  MONSTERS,
  RTS_ALLY_COUNT,
  RTS_ENEMY_COUNT,
  RTS_SLIME_STATS,
  RTS_TRIAL_MAIN_CHARACTER,
  RTS_TRIAL_MERCENARY,
} from "./constants";
import type { EnemyDefinition, RosterEntry } from "./rtsBattleTypes";

const statsByMonsterId = {
  "slime-1": RTS_SLIME_STATS.slime1,
  "slime-2": RTS_SLIME_STATS.slime2,
  "slime-3": RTS_SLIME_STATS.slime3,
  "slime-4": RTS_SLIME_STATS.slime4,
} as const;

export function getEnemyDefinition(monsterId: string): EnemyDefinition | null {
  const monster = MONSTERS.find((entry) => entry.id === monsterId);
  const stats = statsByMonsterId[monsterId as keyof typeof statsByMonsterId];
  if (!monster || !stats) {
    return null;
  }

  return {
    id: monster.id,
    name: monster.name,
    color: monster.color,
    goldReward: monster.goldReward,
    ...stats,
  };
}

export function createTrialRoster(): RosterEntry[] {
  return Array.from({ length: RTS_ALLY_COUNT }, (_, index) => {
    if (index === 0) {
      return {
        rosterUnitId: "ally-main-character",
        unitDefinitionId: "trial-main-character",
        unitRole: "MAIN_CHARACTER",
        slotIndex: 0,
      };
    }

    return {
      rosterUnitId: `ally-mercenary-${String(index).padStart(2, "0")}`,
      unitDefinitionId: "trial-mercenary",
      unitRole: "MERCENARY",
      slotIndex: index,
    };
  });
}

export function getTrialUnitStats(role: RosterEntry["unitRole"]): typeof RTS_TRIAL_MAIN_CHARACTER {
  return role === "MAIN_CHARACTER" ? RTS_TRIAL_MAIN_CHARACTER : RTS_TRIAL_MERCENARY;
}

export function createEnemyIds(enemyDefinitionId: string, count = RTS_ENEMY_COUNT): string[] {
  return Array.from({ length: count }, (_, index) => (
    `enemy-${enemyDefinitionId}-${String(index + 1).padStart(2, "0")}`
  ));
}
