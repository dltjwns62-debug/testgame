export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const PLAYER_RADIUS = 28;
export const MONSTER_RADIUS = 27;
export const CONTACT_DISTANCE = PLAYER_RADIUS + MONSTER_RADIUS;
export const PLAYER_MOVE_SPEED = 180;
export const PLAYER_MAX_HP = 100;
export const MONSTER_MAX_HP = 50;
export const PLAYER_ATTACK_DAMAGE = 10;
export const MONSTER_ATTACK_DAMAGE = 8;
export const PLAYER_ATTACK_INTERVAL_MS = 1000;
export const MONSTER_ATTACK_INTERVAL_MS = 1400;
export const MAX_COMBAT_DELTA_MS = 100;
export const COMBAT_LOG_LIMIT = 4;
export const COMBAT_HP_BAR_WIDTH = 240;
export const COMBAT_HP_BAR_HEIGHT = 18;
export const COMBAT_BUTTON_Y = 480;
export const MONSTER_RESPAWN_DELAY_MS = 3000;
export const RTS_ALLY_COUNT = 10;
export const RTS_ENEMY_COUNT = 10;
export const RTS_ARENA_BOUNDS = {
  left: 28,
  top: 72,
  right: 932,
  bottom: 398,
};
export const RTS_SELECTION_DRAG_THRESHOLD_PX = 6;
export const RTS_MAX_COMBAT_DELTA_MS = 100;
export const RTS_FORMATION_SPACING = 34;
export const RTS_LOCAL_ENGAGEMENT_RANGE = 180;
export const RTS_ALLY_ASSIST_RANGE = 140;
export const RTS_RETALIATION_MEMORY_MS = 2500;
export const AUTO_HUNT_REGISTRY_KEY = "testgame.autoHuntEnabled";

// attackRange is the additional melee reach beyond the unit's body radius.
// The center-to-center attack distance also includes both collision radii.
export const RTS_TRIAL_MAIN_CHARACTER = {
  maxHp: 120,
  attackDamage: 15,
  attackIntervalMs: 900,
  moveSpeed: 120,
  attackRange: 10,
  collisionRadius: 13,
};
export const RTS_TRIAL_MERCENARY = {
  maxHp: 70,
  attackDamage: 8,
  attackIntervalMs: 1100,
  moveSpeed: 100,
  attackRange: 8,
  collisionRadius: 12,
};
export const RTS_SLIME_STATS = {
  slime1: { maxHp: 35, attackDamage: 5, attackIntervalMs: 1300, moveSpeed: 70, attackRange: 8, collisionRadius: 12 },
  slime2: { maxHp: 35, attackDamage: 5, attackIntervalMs: 1300, moveSpeed: 70, attackRange: 8, collisionRadius: 12 },
  slime3: { maxHp: 35, attackDamage: 5, attackIntervalMs: 1300, moveSpeed: 70, attackRange: 8, collisionRadius: 12 },
  slime4: { maxHp: 70, attackDamage: 10, attackIntervalMs: 1000, moveSpeed: 85, attackRange: 10, collisionRadius: 14 },
} as const;

export type MonsterDefinition = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  maxHp: number;
  attackDamage: number;
  attackIntervalMs: number;
  goldReward: number;
};

export const PLAYER_POSITION = {
  x: 220,
  y: 300,
};

export const MONSTERS: readonly MonsterDefinition[] = [
  {
    id: "slime-1",
    name: "Slime 1",
    x: 510,
    y: 165,
    color: 0xe67e91,
    maxHp: MONSTER_MAX_HP,
    attackDamage: MONSTER_ATTACK_DAMAGE,
    attackIntervalMs: MONSTER_ATTACK_INTERVAL_MS,
    goldReward: 10,
  },
  {
    id: "slime-2",
    name: "Slime 2",
    x: 725,
    y: 190,
    color: 0xb98ae6,
    maxHp: MONSTER_MAX_HP,
    attackDamage: MONSTER_ATTACK_DAMAGE,
    attackIntervalMs: MONSTER_ATTACK_INTERVAL_MS,
    goldReward: 10,
  },
  {
    id: "slime-3",
    name: "Slime 3",
    x: 560,
    y: 380,
    color: 0xf0ad62,
    maxHp: MONSTER_MAX_HP,
    attackDamage: MONSTER_ATTACK_DAMAGE,
    attackIntervalMs: MONSTER_ATTACK_INTERVAL_MS,
    goldReward: 10,
  },
  {
    id: "slime-4",
    name: "Slime 4",
    x: 790,
    y: 365,
    color: 0x6fb7e8,
    maxHp: 120,
    attackDamage: 12,
    attackIntervalMs: 1000,
    goldReward: 25,
  },
];
