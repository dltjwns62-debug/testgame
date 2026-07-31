import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { getOrCreateAutoProgressState } from "../autoProgress";
import {
  getPersistenceMeta,
  resetSaveData,
  saveRegistryState,
} from "../persistence";
import { repairRuntimeStateAtBoundary } from "../runtimeStateValidation";
import { getResetRestartScene, getSaveDataReturnScene, type SaveDataReturnScene } from "../sceneNavigation";
import { addPanel, addSceneBackdrop, UI_THEME } from "../ui/theme";

export class SaveDataScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private resetButton!: Phaser.GameObjects.Rectangle;
  private resetLabel!: Phaser.GameObjects.Text;
  private resetConfirmUntil = 0;
  private returnScene: SaveDataReturnScene = "FieldScene";

  public constructor() {
    super("SaveDataScene");
  }

  public create(data?: unknown): void {
    this.returnScene = getSaveDataReturnScene(data);
    repairRuntimeStateAtBoundary(this.game.registry);
    this.drawBackground();
    this.add.text(32, 20, "Stage 17: Save Data & Online Readiness", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(34, 54, "Manage local save data and offline progress safely.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
    });
    this.statusText = this.add.text(64, 112, "", {
      color: "#d9f2ff",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "14px",
      lineSpacing: 8,
      wordWrap: { width: 820 },
    });
    this.messageText = this.add.text(64, 365, "", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      wordWrap: { width: 820 },
    });
    this.addButton(250, 455, 180, "Save Now", () => {
      const result = saveRegistryState(this.game.registry);
      this.messageText.setColor(result.ok ? "#9ce4b0" : "#f3c969").setText(result.message);
      this.refreshUi();
    });
    this.resetButton = this.addButton(480, 455, 180, "Reset Save", () => this.resetSave());
    this.resetLabel = this.resetButton.getData("label") as Phaser.GameObjects.Text;
    this.addButton(710, 455, 180, this.returnScene === "RecoveryScene" ? "Back to Recovery" : "Back to Field", () => this.returnToField());
    this.refreshUi();
  }

  private drawBackground(): void {
    addSceneBackdrop(this, UI_THEME.colors.ink, UI_THEME.colors.goldValue);
    addPanel(this, GAME_WIDTH / 2, 280, 860, 330, UI_THEME.colors.panel, 0.97)
      .setStrokeStyle(1, 0x54748a, 1);
    this.add.rectangle(GAME_WIDTH / 2, 510, GAME_WIDTH, 40, UI_THEME.colors.inkSoft, 1);
  }

  private addButton(
    x: number,
    y: number,
    width: number,
    label: string,
    action: () => void,
  ): Phaser.GameObjects.Rectangle {
    const button = this.add.rectangle(x, y, width, 34, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    button.setData("label", text);
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) action();
    });
    return button;
  }

  private refreshUi(): void {
    const meta = getPersistenceMeta(this.game.registry);
    const autoProgress = getOrCreateAutoProgressState(this.game.registry);
    const lastSaved = meta.savedAtMs > 0 ? new Date(meta.savedAtMs).toLocaleString() : "Never";
    const lastActive = meta.lastActiveAtMs > 0 ? new Date(meta.lastActiveAtMs).toLocaleString() : "Never";
    this.statusText.setText([
      "Storage status: " + meta.status,
      "Schema version: " + meta.schemaVersion,
      "Last saved: " + lastSaved,
      "Last active: " + lastActive,
      "Primary/backup: localStorage safe-save rotation",
      "Auto save: " + (meta.autoSaveEnabled && !meta.newerVersionBlocked ? "enabled" : "disabled"),
      "Repeat Hunt: " + (autoProgress.autoRepeatEnabled ? "ON" : "OFF") + " · Target: " + (autoProgress.selectedMonsterId ?? "None"),
    ]);
    if (meta.newerVersionBlocked) {
      this.messageText.setColor("#f3c969").setText("This save was created by a newer version. Reset Save is required before saving.");
    }
  }

  private resetSave(): void {
    const now = Date.now();
    if (now > this.resetConfirmUntil) {
      this.resetConfirmUntil = now + 5000;
      this.resetLabel.setText("Confirm Reset (5s)");
      this.messageText.setColor("#f3c969").setText("Click Reset Save again within 5 seconds to confirm.");
      return;
    }
    repairRuntimeStateAtBoundary(this.game.registry);
    const result = resetSaveData(this.game.registry, now);
    this.resetConfirmUntil = 0;
    this.resetLabel.setText("Reset Save");
    this.messageText.setColor(result.ok ? "#9ce4b0" : "#f3c969").setText(result.message);
    this.refreshUi();
    if (result.ok) {
      this.scene.stop("SaveDataScene");
      this.scene.stop("RecoveryScene");
      this.scene.stop("BattleScene");
      this.scene.stop("FieldScene");
      this.scene.start(getResetRestartScene(), { persistenceMessage: result.message });
    }
  }

  private returnToField(): void {
    this.scene.stop("SaveDataScene");
    if (this.returnScene === "RecoveryScene") {
      this.scene.resume("RecoveryScene");
      return;
    }
    const fieldScene = this.scene.get("FieldScene") as import("./FieldScene").FieldScene;
    fieldScene.returnFromSaveData(this.messageText.text);
  }
}
