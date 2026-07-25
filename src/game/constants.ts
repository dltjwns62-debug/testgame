export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const PLAYER_RADIUS = 28;
export const MONSTER_RADIUS = 27;
export const CONTACT_DISTANCE = PLAYER_RADIUS + MONSTER_RADIUS;
export const PLAYER_MOVE_SPEED = 180;

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
