import Phaser from "phaser";
import {
  CONTACT_DISTANCE,
  GAME_HEIGHT,
  GAME_WIDTH,
  MONSTERS,
  MONSTER_MAX_HP,
  MONSTER_RADIUS,
  PLAYER_MAX_HP,
  PLAYER_POSITION,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  type MonsterDefinition,
} from "../constants";
import type { BattleSceneData } from "../battleTypes";

type FieldState = "IDLE" | "MOVING" | "BATTLE";

type MonsterView = {
  definition: MonsterDefinition;
  container: Phaser.GameObjects.Container;
  selectionMarker: Phaser.GameObjects.Arc;
};

export class FieldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private readonly monsterViews = new Map<string, MonsterView>();
  private targetMonster: MonsterView | null = null;
  private state: FieldState = "IDLE";
  private stateText!: Phaser.GameObjects.Text;
  private battleTransitionStarted = false;

  private readonly handleCanvasContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  public constructor() {
    super("FieldScene");
  }

  public create(): void {
    this.drawField();
    this.addStageNotice();
    this.addStatusText();
    this.player = this.addPlayer();

    MONSTERS.forEach((monster) => this.addMonster(monster));

    this.setupCanvasContextMenu();
  }

  public update(_time: number, delta: number): void {
    this.movePlayer(delta);
    this.updateStatusText();
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
    this.add.text(48, 36, "Stage 4: Battle Transition", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });

    this.add.text(50, 66, "Right-click a monster and approach it to enter battle.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "16px",
    });
  }

  private addStatusText(): void {
    this.stateText = this.add.text(650, 36, "", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      lineSpacing: 8,
    });
    this.updateStatusText();
  }

  private addPlayer(): Phaser.GameObjects.Container {
    const player = this.add.container(PLAYER_POSITION.x, PLAYER_POSITION.y);
    player.setData("entityId", "player-1");

    player.add(this.add.circle(0, 0, PLAYER_RADIUS, 0xf4d35e));
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

    return player;
  }

  private addMonster(monster: MonsterDefinition): void {
    const monsterObject = this.add.container(monster.x, monster.y);
    monsterObject.setData("entityId", monster.id);

    const selectionMarker = this.add.arc(
      0,
      0,
      MONSTER_RADIUS + 12,
      0,
      360,
      false,
      0xf4d35e,
      0,
    );
    selectionMarker.setStrokeStyle(3, 0xf4d35e, 1);
    selectionMarker.setVisible(false);
    monsterObject.add(selectionMarker);

    monsterObject.add(this.add.circle(0, 0, MONSTER_RADIUS, monster.color));
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

    monsterObject.setInteractive(
      new Phaser.Geom.Rectangle(-42, -42, 84, 84),
      Phaser.Geom.Rectangle.Contains,
    );
    monsterObject.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2) {
        this.selectMonster(monster.id);
      }
    });

    this.monsterViews.set(monster.id, {
      definition: monster,
      container: monsterObject,
      selectionMarker,
    });
  }

  private setupCanvasContextMenu(): void {
    const canvas = this.game.canvas;
    canvas.removeEventListener("contextmenu", this.handleCanvasContextMenu);
    canvas.addEventListener("contextmenu", this.handleCanvasContextMenu);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.removeCanvasContextMenu, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.removeCanvasContextMenu, this);
  }

  private removeCanvasContextMenu(): void {
    this.game.canvas.removeEventListener("contextmenu", this.handleCanvasContextMenu);
  }

  private selectMonster(monsterId: string): void {
    if (this.battleTransitionStarted) {
      return;
    }

    const nextTarget = this.monsterViews.get(monsterId);
    if (!nextTarget) {
      return;
    }

    if (this.targetMonster && this.targetMonster !== nextTarget) {
      this.targetMonster.selectionMarker.setVisible(false);
    }

    this.targetMonster = nextTarget;
    this.targetMonster.selectionMarker.setVisible(true);

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      nextTarget.container.x,
      nextTarget.container.y,
    );
    if (distance <= CONTACT_DISTANCE) {
      this.startBattleTransition();
      return;
    }

    this.state = "MOVING";
  }

  private movePlayer(delta: number): void {
    if (this.state !== "MOVING" || !this.targetMonster) {
      return;
    }

    const target = this.targetMonster.container;
    const deltaX = target.x - this.player.x;
    const deltaY = target.y - this.player.y;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

    if (distance <= CONTACT_DISTANCE) {
      this.startBattleTransition();
      return;
    }

    const travelDistance = PLAYER_MOVE_SPEED * (delta / 1000);
    const remainingDistance = distance - CONTACT_DISTANCE;
    if (travelDistance >= remainingDistance) {
      const ratio = remainingDistance / distance;
      this.player.setPosition(
        this.player.x + deltaX * ratio,
        this.player.y + deltaY * ratio,
      );
      this.startBattleTransition();
      return;
    }

    const directionX = deltaX / distance;
    const directionY = deltaY / distance;
    this.player.x += directionX * travelDistance;
    this.player.y += directionY * travelDistance;
  }

  private startBattleTransition(): void {
    if (this.battleTransitionStarted || !this.targetMonster) {
      return;
    }

    this.battleTransitionStarted = true;
    this.state = "BATTLE";
    this.updateStatusText();

    const target = this.targetMonster.definition;
    const battleData: BattleSceneData = {
      playerName: "Player",
      playerCurrentHp: PLAYER_MAX_HP,
      playerMaxHp: PLAYER_MAX_HP,
      monsterId: target.id,
      monsterName: target.name,
      monsterCurrentHp: MONSTER_MAX_HP,
      monsterMaxHp: MONSTER_MAX_HP,
    };

    this.scene.pause();
    this.scene.launch("BattleScene", battleData);
  }

  public returnFromBattle(): void {
    if (!this.battleTransitionStarted) {
      return;
    }

    this.battleTransitionStarted = false;
    this.state = "IDLE";
    this.scene.stop("BattleScene");
    this.scene.resume();
    this.updateStatusText();
  }

  private updateStatusText(): void {
    if (!this.stateText) {
      return;
    }

    this.stateText.setText([
      `State: ${this.state}`,
      `Target: ${this.targetMonster?.definition.name ?? "None"}`,
    ]);
  }
}
