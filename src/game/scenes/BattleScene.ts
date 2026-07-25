import Phaser from "phaser";
import {
  COMBAT_HP_BAR_HEIGHT,
  COMBAT_HP_BAR_WIDTH,
  COMBAT_BUTTON_Y,
  COMBAT_LOG_LIMIT,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_COMBAT_DELTA_MS,
  MONSTER_ATTACK_DAMAGE,
  MONSTER_ATTACK_INTERVAL_MS,
  MONSTER_MAX_HP,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_INTERVAL_MS,
  PLAYER_MAX_HP,
} from "../constants";
import type { BattleSceneData } from "../battleTypes";
import type { FieldScene } from "./FieldScene";

type CombatState = "RUNNING" | "STOPPED_PENDING_RESULT";

export class BattleScene extends Phaser.Scene {
  private returnStarted = false;
  private combatState: CombatState = "RUNNING";
  private combatStopHandled = false;
  private playerName = "Player";
  private monsterName = "Unknown Monster";
  private playerCurrentHp = PLAYER_MAX_HP;
  private playerMaxHp = PLAYER_MAX_HP;
  private monsterCurrentHp = MONSTER_MAX_HP;
  private monsterMaxHp = MONSTER_MAX_HP;
  private playerAttackElapsed = 0;
  private monsterAttackElapsed = 0;
  private readonly attackLogs: string[] = [];
  private playerHpText!: Phaser.GameObjects.Text;
  private monsterHpText!: Phaser.GameObjects.Text;
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private monsterHpBar!: Phaser.GameObjects.Rectangle;
  private combatStateText!: Phaser.GameObjects.Text;
  private attackLogText!: Phaser.GameObjects.Text;

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
    this.resetCombat(data);
    const returnButton = this.addBattleBackground();

    this.add.text(GAME_WIDTH / 2, 64, "Stage 5: Basic Auto Combat", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "32px",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 104, "Player and monster attack automatically.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "17px",
    }).setOrigin(0.5);

    this.add.text(270, 160, this.playerName, {
      color: "#fff9db",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "26px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    this.playerHpText = this.add.text(270, 198, "", {
      color: "#b8e6c1",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "19px",
    }).setOrigin(0.5);
    this.playerHpBar = this.addHealthBar(150, 232, 0x66d18f);

    this.add.text(GAME_WIDTH / 2, 184, "VS", {
      color: "#f4d35e",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(690, 160, this.monsterName, {
      color: "#fff9db",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "26px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    this.monsterHpText = this.add.text(690, 198, "", {
      color: "#ffc1c1",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "19px",
    }).setOrigin(0.5);
    this.monsterHpBar = this.addHealthBar(570, 232, 0xef7185);

    this.combatStateText = this.add.text(GAME_WIDTH / 2, 274, "", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    this.attackLogText = this.add.text(GAME_WIDTH / 2, 334, "", {
      color: "#d9e8e0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "15px",
      align: "center",
      lineSpacing: 5,
    }).setOrigin(0.5, 0);

    returnButton.setInteractive({ useHandCursor: true });
    returnButton.on("pointerdown", this.handleReturnToField);
    this.add.text(GAME_WIDTH / 2, COMBAT_BUTTON_Y, "Return to Field", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.updateHealthDisplay();
    this.updateCombatStatus();
    this.updateAttackLogDisplay();

    if (this.playerCurrentHp === 0 || this.monsterCurrentHp === 0) {
      this.stopCombat();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      returnButton.off("pointerdown", this.handleReturnToField);
      this.playerAttackElapsed = 0;
      this.monsterAttackElapsed = 0;
      this.attackLogs.length = 0;
    });
  }

  public update(_time: number, delta: number): void {
    if (this.combatState !== "RUNNING") {
      return;
    }

    const safeDelta = Math.min(Math.max(delta, 0), MAX_COMBAT_DELTA_MS);
    this.playerAttackElapsed += safeDelta;
    this.monsterAttackElapsed += safeDelta;

    if (this.playerAttackElapsed >= PLAYER_ATTACK_INTERVAL_MS) {
      this.playerAttackElapsed = 0;
      this.performPlayerAttack();
    }

    if (this.combatState !== "RUNNING" || this.monsterCurrentHp === 0) {
      return;
    }

    if (this.monsterAttackElapsed >= MONSTER_ATTACK_INTERVAL_MS) {
      this.monsterAttackElapsed = 0;
      this.performMonsterAttack();
    }
  }

  private resetCombat(data: unknown): void {
    const battleData = this.isBattleSceneData(data) ? data : this.getFallbackData();

    this.returnStarted = false;
    this.combatState = "RUNNING";
    this.combatStopHandled = false;
    this.playerAttackElapsed = 0;
    this.monsterAttackElapsed = 0;
    this.attackLogs.length = 0;
    this.playerName = battleData.playerName;
    this.monsterName = battleData.monsterName;
    this.playerMaxHp = this.sanitizeMaxHp(battleData.playerMaxHp, PLAYER_MAX_HP);
    this.monsterMaxHp = this.sanitizeMaxHp(battleData.monsterMaxHp, MONSTER_MAX_HP);
    this.playerCurrentHp = this.clampHp(battleData.playerCurrentHp, this.playerMaxHp);
    this.monsterCurrentHp = this.clampHp(battleData.monsterCurrentHp, this.monsterMaxHp);
  }

  private addBattleBackground(): Phaser.GameObjects.Rectangle {
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x111827,
      1,
    );
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 440, 0x1f2937, 1);

    const returnButton = this.add.rectangle(GAME_WIDTH / 2, COMBAT_BUTTON_Y, 240, 58, 0x4b8b6d, 1);
    returnButton.setStrokeStyle(2, 0x9ce4b0, 1);
    return returnButton;
  }

  private addHealthBar(x: number, y: number, color: number): Phaser.GameObjects.Rectangle {
    this.add.rectangle(
      x,
      y,
      COMBAT_HP_BAR_WIDTH,
      COMBAT_HP_BAR_HEIGHT,
      0x0b1220,
      1,
    ).setOrigin(0, 0.5);

    return this.add.rectangle(
      x,
      y,
      COMBAT_HP_BAR_WIDTH,
      COMBAT_HP_BAR_HEIGHT,
      color,
      1,
    ).setOrigin(0, 0.5);
  }

  private performPlayerAttack(): void {
    if (this.playerCurrentHp === 0 || this.monsterCurrentHp === 0) {
      return;
    }

    this.monsterCurrentHp = Math.max(0, this.monsterCurrentHp - PLAYER_ATTACK_DAMAGE);
    this.addAttackLog(`${this.playerName} dealt ${PLAYER_ATTACK_DAMAGE} damage to ${this.monsterName}.`);
    this.updateHealthDisplay();

    if (this.monsterCurrentHp === 0) {
      this.stopCombat();
    }
  }

  private performMonsterAttack(): void {
    if (this.playerCurrentHp === 0 || this.monsterCurrentHp === 0) {
      return;
    }

    this.playerCurrentHp = Math.max(0, this.playerCurrentHp - MONSTER_ATTACK_DAMAGE);
    this.addAttackLog(`${this.monsterName} dealt ${MONSTER_ATTACK_DAMAGE} damage to ${this.playerName}.`);
    this.updateHealthDisplay();

    if (this.playerCurrentHp === 0) {
      this.stopCombat();
    }
  }

  private stopCombat(): void {
    if (this.combatStopHandled) {
      return;
    }

    this.combatStopHandled = true;
    this.combatState = "STOPPED_PENDING_RESULT";
    this.playerAttackElapsed = 0;
    this.monsterAttackElapsed = 0;
    this.updateCombatStatus();
  }

  private updateHealthDisplay(): void {
    this.playerHpText.setText(`HP: ${this.playerCurrentHp} / ${this.playerMaxHp}`);
    this.monsterHpText.setText(`HP: ${this.monsterCurrentHp} / ${this.monsterMaxHp}`);
    this.updateHealthBar(this.playerHpBar, this.playerCurrentHp, this.playerMaxHp);
    this.updateHealthBar(this.monsterHpBar, this.monsterCurrentHp, this.monsterMaxHp);
  }

  private updateHealthBar(
    bar: Phaser.GameObjects.Rectangle,
    currentHp: number,
    maxHp: number,
  ): void {
    const ratio = this.getHealthRatio(currentHp, maxHp);
    bar.setDisplaySize(COMBAT_HP_BAR_WIDTH * ratio, COMBAT_HP_BAR_HEIGHT);
  }

  private getHealthRatio(currentHp: number, maxHp: number): number {
    if (maxHp <= 0) {
      return 0;
    }

    return Math.min(1, Math.max(0, currentHp / maxHp));
  }

  private updateCombatStatus(): void {
    if (!this.combatStateText) {
      return;
    }

    if (this.combatState === "RUNNING") {
      this.combatStateText.setText("Combat state: RUNNING");
      return;
    }

    this.combatStateText.setText([
      "Combat state: STOPPED_PENDING_RESULT",
      "Combat stopped at 0 HP.",
      "Result handling will be implemented in Stage 6.",
    ]);
  }

  private addAttackLog(message: string): void {
    if (this.combatState !== "RUNNING") {
      return;
    }

    this.attackLogs.push(message);
    if (this.attackLogs.length > COMBAT_LOG_LIMIT) {
      this.attackLogs.shift();
    }
    this.updateAttackLogDisplay();
  }

  private updateAttackLogDisplay(): void {
    if (!this.attackLogText) {
      return;
    }

    this.attackLogText.setText([
      "Recent attacks",
      ...(this.attackLogs.length > 0 ? this.attackLogs : ["No attacks yet."]),
    ]);
  }

  private sanitizeMaxHp(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private clampHp(value: number, maxHp: number): number {
    return Math.min(maxHp, Math.max(0, value));
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
