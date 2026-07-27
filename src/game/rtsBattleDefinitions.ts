import {
  MONSTERS,
  RTS_ALLY_COUNT,
  RTS_ENEMY_COUNT,
  RTS_SLIME_STATS,
  RTS_TRIAL_MAIN_CHARACTER,
  RTS_TRIAL_MERCENARY,
} from "./constants";
import type { EnemyDefinition, OwnedRosterUnit, RosterEntry, UnitRole, UnitSkillId } from "./rtsBattleTypes";

export type AllyUnitDefinition = {
  id: string;
  displayName: string;
  unitRole: UnitRole;
  color: number;
  maxHp: number;
  attackDamage: number;
  attackIntervalMs: number;
  moveSpeed: number;
  attackRange: number;
  collisionRadius: number;
  skills: readonly UnitSkillId[];
};

const allyUnitDefinitions: readonly AllyUnitDefinition[] = [
  {
    id: "trial-main-character",
    displayName: "Hero",
    unitRole: "MAIN_CHARACTER",
    color: 0xf4d35e,
    ...RTS_TRIAL_MAIN_CHARACTER,
    skills: [],
  },
  {
    id: "trial-mercenary",
    displayName: "Merc",
    unitRole: "MERCENARY",
    color: 0x63b3ed,
    ...RTS_TRIAL_MERCENARY,
    skills: [],
  },
  {
    id: "trial-skill-mercenary",
    displayName: "Skill Merc",
    unitRole: "MERCENARY",
    color: 0xa78bfa,
    ...RTS_TRIAL_MERCENARY,
    skills: ["whirlwind", "first-aid"],
  },
  {
    id: "mercenary-swordsman",
    displayName: "Swordsman",
    unitRole: "MERCENARY",
    color: 0xf97316,
    maxHp: 85,
    attackDamage: 10,
    attackIntervalMs: 1000,
    moveSpeed: 105,
    attackRange: 8,
    collisionRadius: 12,
    skills: [],
  },
  {
    id: "mercenary-guardian",
    displayName: "Guardian",
    unitRole: "MERCENARY",
    color: 0x34d399,
    maxHp: 115,
    attackDamage: 7,
    attackIntervalMs: 1200,
    moveSpeed: 85,
    attackRange: 8,
    collisionRadius: 13,
    skills: [],
  },
  {
    id: "mercenary-scout",
    displayName: "Scout",
    unitRole: "MERCENARY",
    color: 0xf472b6,
    maxHp: 65,
    attackDamage: 11,
    attackIntervalMs: 900,
    moveSpeed: 125,
    attackRange: 8,
    collisionRadius: 11,
    skills: [],
  },
];

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
        displayName: "Hero",
        slotIndex: 0,
      };
    }

    if (index === 1) {
      return {
        rosterUnitId: "ally-skill-mercenary",
        unitDefinitionId: "trial-skill-mercenary",
        unitRole: "MERCENARY",
        displayName: "Skill Merc",
        slotIndex: index,
      };
    }

    return {
      rosterUnitId: `ally-mercenary-${String(index).padStart(2, "0")}`,
      unitDefinitionId: "trial-mercenary",
      unitRole: "MERCENARY",
      displayName: `Merc ${index}`,
      slotIndex: index,
    };
  });
}

export function createTrialOwnedUnits(): OwnedRosterUnit[] {
  return createTrialRoster().map(({ rosterUnitId, unitDefinitionId, unitRole, displayName }) => ({
    rosterUnitId,
    unitDefinitionId,
    unitRole,
    displayName,
  }));
}

export function getAllyUnitDefinition(unitDefinitionId: string): AllyUnitDefinition | null {
  return allyUnitDefinitions.find((definition) => definition.id === unitDefinitionId) ?? null;
}

export function createEnemyIds(enemyDefinitionId: string, count = RTS_ENEMY_COUNT): string[] {
  return Array.from({ length: count }, (_, index) => (
    `enemy-${enemyDefinitionId}-${String(index + 1).padStart(2, "0")}`
  ));
}
