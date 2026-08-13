import Phaser from "phaser";
import type { AllyUnitDefinition } from "../rtsBattleDefinitions";

const slimeTextureById: Record<string, string> = {
  "slime-1": "visual-slime-1",
  "slime-2": "visual-slime-2",
  "slime-3": "visual-slime-3",
  "slime-4": "visual-slime-4",
};

const unitTextureByDefinition: Record<string, string> = {
  "trial-main-character": "visual-unit-hero",
  "trial-mercenary": "visual-unit-merc",
  "trial-skill-mercenary": "visual-unit-skill-merc",
  "mercenary-swordsman": "visual-unit-swordsman",
  "mercenary-guardian": "visual-unit-guardian",
  "mercenary-scout": "visual-unit-scout",
};

export function getSlimeTextureKey(monsterId: string): string {
  return slimeTextureById[monsterId] ?? "visual-slime-1";
}

export function getUnitTextureKey(definition: AllyUnitDefinition | null | undefined): string {
  return definition ? unitTextureByDefinition[definition.id] ?? "visual-unit-merc" : "visual-unit-merc";
}

export function createVisualTextures(scene: Phaser.Scene): void {
  // Assets are loaded by BootstrapScene. This helper keeps callers resilient when a scene is tested in isolation.
  const fallbackKeys = [...Object.values(slimeTextureById), ...Object.values(unitTextureByDefinition)];
  for (const key of fallbackKeys) {
    if (!scene.textures.exists(key)) {
      createFallbackTexture(scene, key);
    }
  }
  if (!scene.textures.exists("visual-projectile-arrow")) {
    const arrow = scene.make.graphics({ x: 0, y: 0 });
    arrow.lineStyle(3, 0xf8e7a1, 1).lineBetween(3, 8, 25, 8);
    arrow.fillStyle(0xffd166, 1).fillTriangle(29, 8, 21, 3, 21, 13);
    arrow.generateTexture("visual-projectile-arrow", 32, 16);
    arrow.destroy();
  }
  if (!scene.textures.exists("visual-projectile-magic-bolt")) {
    const bolt = scene.make.graphics({ x: 0, y: 0 });
    bolt.fillStyle(0x93c5fd, 0.22).fillCircle(12, 12, 11);
    bolt.fillStyle(0xc4b5fd, 0.9).fillCircle(12, 12, 6);
    bolt.fillStyle(0xffffff, 1).fillCircle(10, 10, 2);
    bolt.generateTexture("visual-projectile-magic-bolt", 24, 24);
    bolt.destroy();
  }
}

function createFallbackTexture(scene: Phaser.Scene, key: string): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const isSlime = key.includes("slime");
  const color = isSlime ? 0x73c99c : key.includes("guardian") ? 0x34d399 : key.includes("scout") ? 0xf472b6 : 0x63b3ed;
  graphics.fillStyle(0x0b1220, 0.22);
  graphics.fillEllipse(32, 58, 44, 9);
  graphics.fillStyle(color, 1);
  graphics.fillEllipse(32, isSlime ? 36 : 31, isSlime ? 50 : 38, isSlime ? 40 : 42);
  graphics.fillStyle(0xffffff, 0.22);
  graphics.fillEllipse(22, isSlime ? 25 : 19, 11, 7);
  graphics.fillStyle(0x172033, 1);
  graphics.fillCircle(24, isSlime ? 34 : 29, 3);
  graphics.fillCircle(40, isSlime ? 34 : 29, 3);
  graphics.lineStyle(2, 0x172033, 1);
  graphics.arc(32, isSlime ? 42 : 38, 8, 0.15, Math.PI - 0.15, false);
  graphics.generateTexture(key, 64, 64);
  graphics.destroy();
}
