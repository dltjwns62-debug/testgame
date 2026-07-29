import type { MonsterDefinition } from "./constants";

export type UnitRole = "MAIN_CHARACTER" | "MERCENARY";
export type BattleTeam = "ALLY" | "ENEMY";
export type BattleUnitState = "IDLE" | "MOVING" | "CHASING" | "ATTACKING" | "DEAD";
export type BattleOutcome = "VICTORY" | "DEFEAT";
export type AllyCommandMode = "NONE" | "MOVE" | "ATTACK_MOVE" | "FOCUS_ATTACK" | "LOCAL_ENGAGE" | "AUTO_HUNT";
export type UnitSkillId = "whirlwind" | "first-aid";

export type BattlePosition = {
  x: number;
  y: number;
};

export type RosterEntry = {
  rosterUnitId: string;
  unitDefinitionId: string;
  unitRole: UnitRole;
  displayName: string;
  slotIndex: number;
  level: number;
  experience: number;
};

export type OwnedRosterUnit = {
  rosterUnitId: string;
  unitDefinitionId: string;
  unitRole: UnitRole;
  displayName: string;
  level: number;
  experience: number;
};

export type FormationSlot = {
  slotIndex: number;
  rosterUnitId: string | null;
};

export type FormationState = {
  ownedUnits: OwnedRosterUnit[];
  slots: FormationSlot[];
};

export type RTSBattleUnit = {
  battleUnitId: string;
  rosterUnitId: string | null;
  team: BattleTeam;
  unitRole: UnitRole;
  definitionId: string;
  displayName: string;
  color: number;
  sourceWorldMonsterId: string | null;
  currentHp: number;
  maxHp: number;
  baseMaxHp: number;
  attackDamage: number;
  baseAttackDamage: number;
  defense: number;
  baseDefense: number;
  level: number;
  experience: number;
  attackIntervalMs: number;
  attackElapsedMs: number;
  moveSpeed: number;
  attackRange: number;
  collisionRadius: number;
  position: BattlePosition;
  /** Fixed defense anchor for local aggro/leash checks; never an automatic return destination. */
  guardPosition: BattlePosition;
  state: BattleUnitState;
  currentTargetId: string | null;
  moveDestination: BattlePosition | null;
  commandMode: AllyCommandMode;
  commandDestination: BattlePosition | null;
  lastAttackerId: string | null;
  lastAttackedAt: number;
  isAlive: boolean;
  experienceRewardGranted: boolean;
  dropRollCompleted: boolean;
  slotIndex: number | null;
  skills: UnitSkillId[];
  skillReadyAtMs: Partial<Record<UnitSkillId, number>>;
};

export type RTSBattleSceneData = {
  sourceWorldMonsterId: string;
  enemyCount: number;
  allyRoster: RosterEntry[];
  autoRepeatBattle?: boolean;
};

export type RTSBattleResult = {
  outcome: BattleOutcome;
  sourceWorldMonsterId: string;
  enemyDefinitionId: string;
  enemyDisplayName: string;
  goldReward: number;
  directExperienceTotal: number;
  bonusExperienceTotal: number;
  experienceRewards: Array<{
    rosterUnitId: string;
    directExperience: number;
    bonusExperience: number;
  }>;
  loot: Array<{
    itemInstanceId: string;
    itemDefinitionId: string;
  }>;
};

export type EnemyDefinition = Pick<MonsterDefinition, "id" | "name" | "color" | "goldReward" | "experienceReward"> & {
  maxHp: number;
  attackDamage: number;
  defense: number;
  attackIntervalMs: number;
  moveSpeed: number;
  attackRange: number;
  collisionRadius: number;
  dropTable: readonly {
    itemDefinitionId: string;
    dropChance: number;
  }[];
};
