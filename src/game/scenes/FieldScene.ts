import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  MONSTERS,
  PLAYER_POSITION,
  type MonsterDefinition,
} from "../constants";

export class FieldScene extends Phaser.Scene {
  public constructor() {
    super("FieldScene");
  }

  public create(): void {
    this.drawField();
    this.addStageNotice();
    this.addPlayer();

    MONSTERS.forEach((monster) => this.addMonster(monster));
  }

  private drawField(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x315f55);
    this.add.rectangle(GAME_WIDTH / 2, 92, GAME_WIDTH - 48, 2, 0x6ec6a7, 0.45);

    const decorations = [
      { x: 110, y: 145, radius: 42, color: 0x4b8b6d, alpha: 0.35 },
      { x: 390, y: 450, radius: 58, color: 0x4b8b6d, alpha: 0.3 },
      { x: 880, y: 120, radius: 52, color: 0x4b8b6d, alpha: 0.3 },
      { x: 900, y: 470, radius: 72, color: 0x24483f, alpha: 0.28 },
    ];

    decorations.forEach(({ x, y, radius, color, alpha }) => {
      this.add.circle(x, y, radius, color, alpha);
    });

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 58, GAME_WIDTH - 48, 2, 0x6ec6a7, 0.3);
  }

  private addStageNotice(): void {
    this.add.text(48, 36, "Stage 2: Field Rendering", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });

    this.add.text(50, 66, "Player and monsters are stationary.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "16px",
    });
  }

  private addPlayer(): void {
    const player = this.add.container(PLAYER_POSITION.x, PLAYER_POSITION.y);
    player.setData("entityId", "player-1");

    player.add(this.add.circle(0, 0, 28, 0xf4d35e));
    player.add(this.add.rectangle(0, 24, 34, 18, 0x34699a));
    player.add(this.add.circle(-9, -5, 4, 0x12253a));
    player.add(this.add.circle(9, -5, 4, 0x12253a));
    player.add(this.add.text(0, 58, "Player", {
      color: "#fff9db",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5));
  }

  private addMonster(monster: MonsterDefinition): void {
    const monsterObject = this.add.container(monster.x, monster.y);
    monsterObject.setData("entityId", monster.id);

    monsterObject.add(this.add.circle(0, 0, 27, monster.color));
    monsterObject.add(this.add.rectangle(0, 20, 42, 12, monster.color));
    monsterObject.add(this.add.circle(-9, -4, 4, 0x2a2340));
    monsterObject.add(this.add.circle(9, -4, 4, 0x2a2340));
    monsterObject.add(this.add.text(0, 54, monster.name, {
      color: "#fff9db",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "17px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5));
  }
}
