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

export type MonsterDefinition = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
};

export const PLAYER_POSITION = {
  x: 220,
  y: 300,
};

export const MONSTERS: readonly MonsterDefinition[] = [
  { id: "slime-1", name: "Slime 1", x: 510, y: 165, color: 0xe67e91 },
  { id: "slime-2", name: "Slime 2", x: 725, y: 190, color: 0xb98ae6 },
  { id: "slime-3", name: "Slime 3", x: 560, y: 380, color: 0xf0ad62 },
  { id: "slime-4", name: "Slime 4", x: 790, y: 365, color: 0x6fb7e8 },
];
