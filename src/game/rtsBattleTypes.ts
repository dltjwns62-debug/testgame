import type { MonsterDefinition } from "./constants";

export type UnitRole = "MAIN_CHARACTER" | "MERCENARY";
export type BattleTeam = "ALLY" | "ENEMY";
export type BattleUnitState = "IDLE" | "MOVING" | "CHASING" | "ATTACKING" | "DEAD";
export type BattleOutcome = "VICTORY" | "DEFEAT";

export type BattlePosition = {
  x: number;
  y: number;
};

export type RosterEntry = {
  rosterUnitId: string;
  unitDefinitionId: string;
  unitRole: UnitRole;
  slotIndex: number;
};

export type RTSBattleUnit = {
  battleUnitId: string;
  rosterUnitId: string | null;
  team: BattleTeam;
  unitRole: UnitRole;
  definitionId: string;
  displayName: string;
  sourceWorldMonsterId: string | null;
  currentHp: number;
  maxHp: number;
  attackDamage: number;
  attackIntervalMs: number;
  attackElapsedMs: number;
  moveSpeed: number;
  attackRange: number;
  collisionRadius: number;
  position: BattlePosition;
  state: BattleUnitState;
  currentTargetId: string | null;
  moveDestination: BattlePosition | null;
  isAlive: boolean;
  slotIndex: number | null;
  skills: string[];
};

export type RTSBattleSceneData = {
  sourceWorldMonsterId: string;
  enemyCount: number;
  allyRoster: RosterEntry[];
};

export type RTSBattleResult = {
  outcome: BattleOutcome;
  sourceWorldMonsterId: string;
  enemyDefinitionId: string;
  enemyDisplayName: string;
  goldReward: number;
};

export type EnemyDefinition = Pick<MonsterDefinition, "id" | "name" | "color" | "goldReward"> & {
  maxHp: number;
  attackDamage: number;
  attackIntervalMs: number;
  moveSpeed: number;
  attackRange: number;
  collisionRadius: number;
};
