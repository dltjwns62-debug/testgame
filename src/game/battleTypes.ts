export type BattleSceneData = {
  playerName: string;
  playerCurrentHp: number;
  playerMaxHp: number;
  monsterId: string;
  monsterName: string;
  monsterCurrentHp: number;
  monsterMaxHp: number;
  monsterAttackDamage: number;
  monsterAttackIntervalMs: number;
  goldReward: number;
};

export type BattleOutcome = "VICTORY" | "DEFEAT";

export type BattleResult = {
  outcome: BattleOutcome;
  monsterId: string;
  monsterName: string;
  goldReward: number;
};
