import Phaser from "phaser";
import {
  CONTACT_DISTANCE,
  GAME_HEIGHT,
  GAME_WIDTH,
  MONSTERS,
  MONSTER_RADIUS,
  MONSTER_RESPAWN_DELAY_MS,
  PLAYER_POSITION,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  type MonsterDefinition,
} from "../constants";
import { buildBattleRosterFromFormation, getOrCreateFormationState, isValidFormationState } from "../formationState";
import { addPlayerGold, getOrCreatePlayerGold } from "../playerEconomy";
import { getOrCreateKeyBindingState } from "../keyBindings";
import type { RTSBattleResult, RTSBattleSceneData } from "../rtsBattleTypes";

type FieldState = "IDLE" | "MOVING" | "BATTLE";

type MonsterView = {
  definition: MonsterDefinition;
  container: Phaser.GameObjects.Container;
  selectionMarker: Phaser.GameObjects.Arc;
  isAvailable: boolean;
  respawnEvent: Phaser.Time.TimerEvent | null;
};

export class FieldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private readonly monsterViews = new Map<string, MonsterView>();
  private targetMonster: MonsterView | null = null;
  private state: FieldState = "IDLE";
  private stateText!: Phaser.GameObjects.Text;
  private battleTransitionStarted = false;
  private battleResultApplied = false;
  private formationButton!: Phaser.GameObjects.Rectangle;
  private formationButtonLabel!: Phaser.GameObjects.Text;
  private shopButton!: Phaser.GameObjects.Rectangle;
  private shopButtonLabel!: Phaser.GameObjects.Text;
  private keySettingsButton!: Phaser.GameObjects.Rectangle;
  private keySettingsButtonLabel!: Phaser.GameObjects.Text;
  private formationMessage: string | null = null;

  private readonly handleCanvasContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  public constructor() {
    super("FieldScene");
  }

  public create(): void {
    getOrCreateFormationState(this.game.registry);
    getOrCreatePlayerGold(this.game.registry);
    getOrCreateKeyBindingState(this.game.registry);
    this.drawField();
    this.addStageNotice();
    this.addStatusText();
    this.addFormationButton();
    this.addShopButton();
    this.addKeySettingsButton();
    this.player = this.addPlayer();

    MONSTERS.forEach((monster) => this.addMonster(monster));

    this.setupCanvasContextMenu();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.clearRespawnTimers, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.clearRespawnTimers, this);
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
    this.add.text(48, 36, "Stage 12: Control Groups", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });

    this.add.text(50, 66, "Save and recall living units during battle.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "16px",
    });
  }

  private addStatusText(): void {
    this.stateText = this.add.text(928, 36, "", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      lineSpacing: 8,
      align: "right",
    }).setOrigin(1, 0);
    this.updateStatusText();
  }

  private addFormationButton(): void {
    this.formationButton = this.add.rectangle(520, 66, 112, 28, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 1)
      .setInteractive({ useHandCursor: true });
    this.formationButtonLabel = this.add.text(520, 66, "Formation", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.formationButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        this.openFormation();
      }
    });
  }

  private addShopButton(): void {
    this.shopButton = this.add.rectangle(640, 66, 104, 28, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 1)
      .setInteractive({ useHandCursor: true });
    this.shopButtonLabel = this.add.text(640, 66, "Shop", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.shopButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        this.openShop();
      }
    });
  }

  private addKeySettingsButton(): void {
    this.keySettingsButton = this.add.rectangle(750, 66, 96, 28, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 1)
      .setInteractive({ useHandCursor: true });
    this.keySettingsButtonLabel = this.add.text(750, 66, "Keys", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.keySettingsButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        this.openKeySettings();
      }
    });
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

    const monsterView: MonsterView = {
      definition: monster,
      container: monsterObject,
      selectionMarker,
      isAvailable: true,
      respawnEvent: null,
    };

    this.enableMonsterInteraction(monsterView);
    monsterObject.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const currentMonster = this.monsterViews.get(monster.id);
      if (pointer.button === 2 && currentMonster?.isAvailable) {
        this.selectMonster(monster.id);
      }
    });

    this.monsterViews.set(monster.id, monsterView);
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
    if (!nextTarget || !nextTarget.isAvailable) {
      return;
    }

    if (this.targetMonster && this.targetMonster !== nextTarget) {
      this.targetMonster.selectionMarker.setVisible(false);
    }

    this.targetMonster = nextTarget;
    this.targetMonster.selectionMarker.setVisible(true);
    this.battleResultApplied = false;

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
    this.battleResultApplied = false;
    this.state = "BATTLE";
    this.updateStatusText();

    const target = this.targetMonster.definition;
    const formation = getOrCreateFormationState(this.game.registry);
    const allyRoster = buildBattleRosterFromFormation(formation);
    if (!isValidFormationState(formation) || allyRoster.length < 1 || allyRoster.length > 10) {
      this.battleTransitionStarted = false;
      this.state = "IDLE";
      this.formationMessage = "Formation is invalid. Open Formation to repair it.";
      this.updateStatusText();
      return;
    }
    const battleData: RTSBattleSceneData = {
      sourceWorldMonsterId: target.id,
      enemyCount: 10,
      allyRoster,
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

  public openFormation(): void {
    if (this.battleTransitionStarted) {
      return;
    }
    if (this.state === "MOVING") {
      this.formationMessage = "Formation is unavailable while the player is moving.";
      this.updateStatusText();
      return;
    }

    this.formationMessage = null;
    this.scene.pause();
    this.scene.launch("FormationScene");
  }

  public returnFromFormation(savedMessage?: string): void {
    this.scene.stop("FormationScene");
    this.scene.resume();
    this.state = "IDLE";
    this.formationMessage = savedMessage ?? null;
    this.updateStatusText();
  }

  public openShop(): void {
    if (this.battleTransitionStarted || this.state === "BATTLE") {
      return;
    }
    if (this.state === "MOVING") {
      this.formationMessage = "Shop is unavailable while the player is moving.";
      this.updateStatusText();
      return;
    }

    this.formationMessage = null;
    this.scene.pause();
    this.scene.launch("ShopScene");
  }

  public returnFromShop(savedMessage?: string): void {
    this.scene.stop("ShopScene");
    this.scene.resume();
    this.state = "IDLE";
    this.formationMessage = savedMessage ?? null;
    this.updateStatusText();
  }

  public openKeySettings(): void {
    if (this.battleTransitionStarted || this.state === "BATTLE") {
      return;
    }
    if (this.state === "MOVING") {
      this.formationMessage = "Key settings are unavailable while the player is moving.";
      this.updateStatusText();
      return;
    }

    this.formationMessage = null;
    this.scene.pause();
    this.scene.launch("KeySettingsScene");
  }

  public returnFromKeySettings(savedMessage?: string): void {
    this.scene.stop("KeySettingsScene");
    this.scene.resume();
    this.state = "IDLE";
    this.formationMessage = savedMessage ?? null;
    this.updateStatusText();
  }

  public applyBattleResult(result: RTSBattleResult): void {
    if (
      !result ||
      !this.battleTransitionStarted ||
      this.battleResultApplied ||
      !this.targetMonster
    ) {
      return;
    }

    const targetMonster = this.targetMonster;
    if (
      !targetMonster.isAvailable ||
      result.sourceWorldMonsterId !== targetMonster.definition.id ||
      result.enemyDefinitionId !== targetMonster.definition.id
    ) {
      return;
    }

    if (result.outcome !== "VICTORY" && result.outcome !== "DEFEAT") {
      return;
    }

    if (result.outcome === "VICTORY") {
      const expectedReward = targetMonster.definition.goldReward;
      if (
        !Number.isSafeInteger(expectedReward) ||
        expectedReward < 0 ||
        result.goldReward !== expectedReward
      ) {
        return;
      }

      if (addPlayerGold(this.game.registry, expectedReward) === null) {
        return;
      }

      this.battleResultApplied = true;
      this.hideMonster(targetMonster);
      this.targetMonster = null;
      this.scheduleRespawn(targetMonster);
      return;
    }

    if (result.goldReward !== 0) {
      return;
    }

    this.battleResultApplied = true;
  }

  private enableMonsterInteraction(monster: MonsterView): void {
    monster.container.setInteractive(
      new Phaser.Geom.Rectangle(-42, -42, 84, 84),
      Phaser.Geom.Rectangle.Contains,
    );
  }

  private hideMonster(monster: MonsterView): void {
    monster.isAvailable = false;
    monster.selectionMarker.setVisible(false);
    monster.container.setVisible(false);
    monster.container.disableInteractive();
  }

  private scheduleRespawn(monster: MonsterView): void {
    if (monster.respawnEvent) {
      this.time.removeEvent(monster.respawnEvent);
    }

    monster.respawnEvent = this.time.delayedCall(
      MONSTER_RESPAWN_DELAY_MS,
      () => this.respawnMonster(monster),
    );
  }

  private respawnMonster(monster: MonsterView): void {
    monster.respawnEvent = null;
    monster.isAvailable = true;
    monster.container.setVisible(true);
    monster.container.setActive(true);
    monster.selectionMarker.setVisible(false);
    this.enableMonsterInteraction(monster);
  }

  private clearRespawnTimers(): void {
    this.monsterViews.forEach((monster) => {
      if (monster.respawnEvent) {
        this.time.removeEvent(monster.respawnEvent);
        monster.respawnEvent = null;
      }
    });
  }

  private updateStatusText(): void {
    if (!this.stateText) {
      return;
    }

    const formation = getOrCreateFormationState(this.game.registry);
    const deployedCount = formation.slots.filter((slot) => slot.rosterUnitId !== null).length;
    const hero = formation.ownedUnits.find((unit) => unit.unitRole === "MAIN_CHARACTER");
    const heroSlot = formation.slots.find((slot) => slot.rosterUnitId === hero?.rosterUnitId)?.slotIndex;
    const playerGold = getOrCreatePlayerGold(this.game.registry);
    this.formationButton?.setFillStyle(this.state === "IDLE" ? 0x4b8b6d : 0x293044, 1);
    this.formationButtonLabel?.setColor(this.state === "IDLE" ? "#f3f8e9" : "#8795a8");
    this.shopButton?.setFillStyle(this.state === "IDLE" ? 0x4b8b6d : 0x293044, 1);
    this.shopButtonLabel?.setColor(this.state === "IDLE" ? "#f3f8e9" : "#8795a8");
    this.keySettingsButton?.setFillStyle(this.state === "IDLE" ? 0x4b8b6d : 0x293044, 1);
    this.keySettingsButtonLabel?.setColor(this.state === "IDLE" ? "#f3f8e9" : "#8795a8");
    this.stateText.setText([
      `State: ${this.state}`,
      `Target: ${this.targetMonster?.definition.name ?? "None"}`,
      `Gold: ${playerGold}`,
      `Formation: ${deployedCount}/10 · Owned: ${formation.ownedUnits.length}/13 · Hero Slot: ${heroSlot === undefined ? "-" : heroSlot === 9 ? "0" : heroSlot + 1}`,
      ...(this.formationMessage ? [this.formationMessage] : []),
    ]);
  }
}
