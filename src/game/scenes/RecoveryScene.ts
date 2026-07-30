import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { resetSaveData } from "../persistence";
import { prepareRecoveryRetry } from "../runtimeStateValidation";

export class RecoveryScene extends Phaser.Scene {
  private messageText!: Phaser.GameObjects.Text;
  private resetConfirmUntil = 0;
  private resetLabel!: Phaser.GameObjects.Text;

  public constructor() {
    super("RecoveryScene");
  }

  public create(data?: unknown): void {
    const message = data && typeof data === "object" && typeof (data as { message?: unknown }).message === "string"
      ? (data as { message: string }).message
      : "The game state could not be repaired safely.";
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);
    this.add.rectangle(GAME_WIDTH / 2, 270, 760, 330, 0x1f2937, 1).setStrokeStyle(2, 0xef9a9a, 1);
    this.add.text(GAME_WIDTH / 2, 82, "Safe Recovery", {
      color: "#f3f8e9", fontFamily: "Segoe UI, sans-serif", fontSize: "28px", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 142, "A required game state failed validation.", {
      color: "#f3c969", fontFamily: "Segoe UI, sans-serif", fontSize: "16px",
    }).setOrigin(0.5);
    this.messageText = this.add.text(GAME_WIDTH / 2, 205, message, {
      color: "#ffd6d6", fontFamily: "Segoe UI, sans-serif", fontSize: "14px", align: "center", wordWrap: { width: 650 },
    }).setOrigin(0.5);
    this.addButton(300, 360, "Try Again", () => this.tryAgain());
    this.addButton(480, 360, "Return to Field", () => this.returnToField());
    this.addButton(660, 360, "Save Data", () => {
      this.scene.pause("RecoveryScene");
      this.scene.launch("SaveDataScene", { returnScene: "RecoveryScene" });
    });
    const reset = this.addButton(480, 430, "Reset Save", () => this.resetSave());
    this.resetLabel = reset.getData("label") as Phaser.GameObjects.Text;
    this.add.text(GAME_WIDTH / 2, 480, "Reset Save keeps the existing five-second confirmation rule.", {
      color: "#a7b8c8", fontFamily: "Segoe UI, sans-serif", fontSize: "12px",
    }).setOrigin(0.5);
  }

  private addButton(x: number, y: number, label: string, action: () => void): Phaser.GameObjects.Rectangle {
    const button = this.add.rectangle(x, y, 150, 36, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 1).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      color: "#f3f8e9", fontFamily: "Segoe UI, sans-serif", fontSize: "12px", fontStyle: "bold",
    }).setOrigin(0.5);
    button.setData("label", text);
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) action();
    });
    return button;
  }

  private returnToField(): void {
    prepareRecoveryRetry(this.game.registry);
    this.scene.stop("RecoveryScene");
    this.scene.stop("BattleScene");
    this.scene.stop("SaveDataScene");
    this.scene.stop("FieldScene");
    this.scene.start("FieldScene", { persistenceMessage: "Recovered to a safe Field IDLE state." });
  }

  private tryAgain(): void {
    prepareRecoveryRetry(this.game.registry);
    this.scene.stop("RecoveryScene");
    this.scene.stop("SaveDataScene");
    this.scene.stop("BattleScene");
    this.scene.stop("FieldScene");
    this.scene.start("BootstrapScene");
  }

  private resetSave(): void {
    const now = Date.now();
    if (now > this.resetConfirmUntil) {
      this.resetConfirmUntil = now + 5000;
      this.resetLabel.setText("Confirm Reset (5s)");
      this.messageText.setText("Click Reset Save again within 5 seconds to confirm.");
      return;
    }
    const result = resetSaveData(this.game.registry, now);
    this.resetConfirmUntil = 0;
    this.resetLabel.setText("Reset Save");
    this.messageText.setText(result.ok ? "Save reset. Try Again to boot with defaults." : result.message);
    if (result.ok) {
      this.scene.stop("RecoveryScene");
      this.scene.stop("SaveDataScene");
      this.scene.stop("BattleScene");
      this.scene.stop("FieldScene");
      this.scene.start("BootstrapScene");
    }
  }
}
