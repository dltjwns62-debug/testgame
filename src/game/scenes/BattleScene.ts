import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  MONSTER_MAX_HP,
  PLAYER_MAX_HP,
} from "../constants";
import type { BattleSceneData } from "../battleTypes";
import type { FieldScene } from "./FieldScene";

export class BattleScene extends Phaser.Scene {
  private returnStarted = false;

  private readonly handleReturnToField = (): void => {
    if (this.returnStarted) {
      return;
    }

    this.returnStarted = true;
    const fieldScene = this.scene.get("FieldScene") as FieldScene;
    fieldScene.returnFromBattle();
  };

  public constructor() {
    super("BattleScene");
  }

  public create(data: unknown): void {
    this.returnStarted = false;
    const battleData = this.isBattleSceneData(data) ? data : this.getFallbackData();

    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x111827,
      1,
    );
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 420, 0x1f2937, 1);

    this.add.text(GAME_WIDTH / 2, 86, "Battle Placeholder", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "34px",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 132, "Combat will be implemented in Stage 5.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "17px",
    }).setOrigin(0.5);

    this.add.text(270, 216, battleData.playerName, {
      color: "#fff9db",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "26px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    this.add.text(270, 258, `HP: ${battleData.playerCurrentHp} / ${battleData.playerMaxHp}`, {
      color: "#b8e6c1",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 236, "VS", {
      color: "#f4d35e",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(690, 216, battleData.monsterName, {
      color: "#fff9db",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "26px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    this.add.text(690, 258, `HP: ${battleData.monsterCurrentHp} / ${battleData.monsterMaxHp}`, {
      color: "#ffc1c1",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
    }).setOrigin(0.5);

    const returnButton = this.add.rectangle(GAME_WIDTH / 2, 380, 240, 58, 0x4b8b6d, 1);
    returnButton.setStrokeStyle(2, 0x9ce4b0, 1);
    returnButton.setInteractive({ useHandCursor: true });
    returnButton.on("pointerdown", this.handleReturnToField);
    this.add.text(GAME_WIDTH / 2, 380, "Return to Field", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      returnButton.off("pointerdown", this.handleReturnToField);
    });
  }

  private isBattleSceneData(data: unknown): data is BattleSceneData {
    if (!data || typeof data !== "object") {
      return false;
    }

    const candidate = data as Record<string, unknown>;
    const numericFields = [
      candidate.playerCurrentHp,
      candidate.playerMaxHp,
      candidate.monsterCurrentHp,
      candidate.monsterMaxHp,
    ];

    return (
      typeof candidate.playerName === "string" &&
      typeof candidate.monsterId === "string" &&
      typeof candidate.monsterName === "string" &&
      numericFields.every((value) => typeof value === "number" && Number.isFinite(value))
    );
  }

  private getFallbackData(): BattleSceneData {
    return {
      playerName: "Player",
      playerCurrentHp: PLAYER_MAX_HP,
      playerMaxHp: PLAYER_MAX_HP,
      monsterId: "unknown-monster",
      monsterName: "Unknown Monster",
      monsterCurrentHp: MONSTER_MAX_HP,
      monsterMaxHp: MONSTER_MAX_HP,
    };
  }
}
