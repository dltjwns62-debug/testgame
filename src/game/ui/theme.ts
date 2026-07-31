import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";

export const UI_THEME = {
  colors: {
    ink: 0x102033,
    inkSoft: 0x172a40,
    panel: 0x20354a,
    panelRaised: 0x29465b,
    panelBorder: 0x79d6bd,
    text: "#f6fbef",
    muted: "#b9d3d1",
    gold: "#ffe08a",
    goldValue: 0xffe08a,
    success: 0x4d9b78,
    successBorder: 0xa4edc7,
    accent: 0x66c7e8,
    warning: 0xe5a85d,
    danger: 0xd9697e,
    purple: 0x8466c7,
  },
  fontFamily: "Segoe UI, system-ui, sans-serif",
} as const;

export type ButtonVisual = {
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

export function addSceneBackdrop(
  scene: Phaser.Scene,
  backgroundColor: number = UI_THEME.colors.ink,
  accentColor: number = UI_THEME.colors.panelBorder,
): Phaser.GameObjects.Container {
  const layer = scene.add.container(0, 0).setDepth(-100);
  layer.add(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, backgroundColor, 1));
  layer.add(scene.add.circle(120, 98, 145, accentColor, 0.07));
  layer.add(scene.add.circle(900, 470, 210, UI_THEME.colors.accent, 0.045));
  layer.add(scene.add.rectangle(GAME_WIDTH / 2, 84, GAME_WIDTH - 42, 2, accentColor, 0.4));
  layer.add(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 48, GAME_WIDTH - 42, 2, accentColor, 0.22));
  return layer;
}

export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number = UI_THEME.colors.panel,
  alpha = 0.96,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, width, height, fill, alpha)
    .setStrokeStyle(2, UI_THEME.colors.panelBorder, 0.72);
}

export function addSectionLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, label.toUpperCase(), {
    color: UI_THEME.colors.gold,
    fontFamily: UI_THEME.fontFamily,
    fontSize: "12px",
    fontStyle: "bold",
    letterSpacing: 1,
  });
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  action: () => void,
  options: { color?: number; disabled?: boolean; fontSize?: string } = {},
): ButtonVisual {
  const disabled = options.disabled ?? false;
  const background = scene.add.rectangle(
    x,
    y,
    width,
    34,
    disabled ? UI_THEME.colors.inkSoft : options.color ?? UI_THEME.colors.success,
    disabled ? 0.72 : 1,
  ).setStrokeStyle(1, disabled ? 0x496176 : UI_THEME.colors.successBorder, 0.95);
  const text = scene.add.text(x, y, label, {
    color: disabled ? "#7890a4" : UI_THEME.colors.text,
    fontFamily: UI_THEME.fontFamily,
    fontSize: options.fontSize ?? "11px",
    fontStyle: "bold",
    align: "center",
  }).setOrigin(0.5);
  if (!disabled) {
    background.setInteractive({ useHandCursor: true });
    background.on("pointerover", () => background.setFillStyle(UI_THEME.colors.panelRaised, 1));
    background.on("pointerout", () => background.setFillStyle(options.color ?? UI_THEME.colors.success, 1));
    background.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) action();
    });
  }
  return { background, label: text };
}

export function addProgressBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  ratio: number,
  fillColor: number,
  height = 8,
): { background: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle } {
  const background = scene.add.rectangle(x, y, width, height, UI_THEME.colors.ink, 0.95)
    .setStrokeStyle(1, UI_THEME.colors.panelBorder, 0.65);
  const fill = scene.add.rectangle(x - width / 2 + 2, y, Math.max(0, width - 4) * Phaser.Math.Clamp(ratio, 0, 1), height - 3, fillColor, 1)
    .setOrigin(0, 0.5);
  return { background, fill };
}

export function setProgressBar(
  visual: { fill: Phaser.GameObjects.Rectangle },
  width: number,
  ratio: number,
): void {
  visual.fill.displayWidth = Math.max(0, width - 4) * Phaser.Math.Clamp(ratio, 0, 1);
}

export function addBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color = UI_THEME.colors.panelRaised,
): Phaser.GameObjects.Container {
  const badge = scene.add.container(x, y);
  const text = scene.add.text(0, 0, label, {
    color: UI_THEME.colors.text,
    fontFamily: UI_THEME.fontFamily,
    fontSize: "10px",
    fontStyle: "bold",
  }).setOrigin(0.5);
  badge.add(scene.add.rectangle(0, 0, Math.max(54, text.width + 18), 22, color, 1).setStrokeStyle(1, UI_THEME.colors.panelBorder, 0.75));
  badge.add(text);
  return badge;
}
