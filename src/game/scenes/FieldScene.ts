import Phaser from "phaser";
import {
  CONTACT_DISTANCE,
  GAME_HEIGHT,
  GAME_WIDTH,
  AUTO_HUNT_REGISTRY_KEY,
  MONSTERS,
  MONSTER_RADIUS,
  MONSTER_RESPAWN_DELAY_MS,
  PLAYER_POSITION,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  PERSISTENCE_SUMMARY_REGISTRY_KEY,
  type MonsterDefinition,
} from "../constants";
import { buildBattleRosterFromFormation, getOrCreateFormationState, isValidFormationState } from "../formationState";
import { addPlayerGold, getOrCreatePlayerGold } from "../playerEconomy";
import { getOrCreateKeyBindingState } from "../keyBindings";
import { calculateFinalUnitStats, getEquippedModifierTotals, getItemDefinition, getOrCreateInventoryState } from "../items";
import { getAllyUnitDefinition } from "../rtsBattleDefinitions";
import { formatProgression } from "../progression";
import {
  getOrCreateAutoProgressState,
  recordActualMonsterVictory,
  setAutoRepeatEnabled,
  setSelectedAutoRepeatMonster,
} from "../autoProgress";
import { getAndClearOfflineSummary } from "../persistence";
import { hasFatalRuntimeStateIssue, inspectRuntimeState, repairRuntimeStateAtBoundary } from "../runtimeStateValidation";
import type { OfflineRewardSummary } from "../offlineProgress";
import type { BattleOutcome, OwnedRosterUnit, RTSBattleResult, RTSBattleSceneData } from "../rtsBattleTypes";

type FieldState = "IDLE" | "MOVING" | "BATTLE";

type MonsterView = {
  definition: MonsterDefinition;
  container: Phaser.GameObjects.Container;
  selectionMarker: Phaser.GameObjects.Arc;
  isAvailable: boolean;
  respawnEvent: Phaser.Time.TimerEvent | null;
};

function getHeroStatsLabel(
  registry: Phaser.Data.DataManager,
  hero: OwnedRosterUnit,
): string {
  const definition = getAllyUnitDefinition(hero.unitDefinitionId);
  const stats = calculateFinalUnitStats(
    definition?.maxHp ?? 1,
    definition?.attackDamage ?? 1,
    definition?.defense ?? 0,
    hero.level,
    getEquippedModifierTotals(getOrCreateInventoryState(registry), hero.rosterUnitId),
  );
  return formatProgression(hero) + " · ATK " + stats.attackDamage + " · DEF " + stats.defense + " · HP " + stats.maxHp;
}

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
  private inventoryButton!: Phaser.GameObjects.Rectangle;
  private inventoryButtonLabel!: Phaser.GameObjects.Text;
  private repeatButton!: Phaser.GameObjects.Rectangle;
  private repeatButtonLabel!: Phaser.GameObjects.Text;
  private saveDataButton!: Phaser.GameObjects.Rectangle;
  private saveDataButtonLabel!: Phaser.GameObjects.Text;
  private formationMessage: string | null = null;
  private repeatAfterBattlePending = false;
  private repeatMovementInProgress = false;
  private summaryOpen = false;
  private summaryOverlay: Phaser.GameObjects.Container | null = null;
  private statusDirty = true;
  private statusElapsedMs = 100;
  private lastStatusText = "";
  private statusUpdateCount = 0;
  private runtimeFatal = false;
  private pendingSummary: OfflineRewardSummary | null = null;
  private readonly handleSummaryChanged = (_parent: unknown, key: string): void => {
    if (key !== PERSISTENCE_SUMMARY_REGISTRY_KEY) return;
    const summary = this.game.registry.get(PERSISTENCE_SUMMARY_REGISTRY_KEY) as OfflineRewardSummary | undefined;
    if (!summary) return;
    this.game.registry.remove(PERSISTENCE_SUMMARY_REGISTRY_KEY);
    if (summary.applied || summary.recoveredMessage || summary.rawElapsedMs >= 60_000) {
      if (this.summaryOpen) this.pendingSummary = summary;
      else this.showOfflineSummary(summary);
    }
  };

  private readonly handleCanvasContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  public constructor() {
    super("FieldScene");
  }

  public create(data?: unknown): void {
    repairRuntimeStateAtBoundary(this.game.registry);
    const runtimeIssues = inspectRuntimeState(this.game.registry);
    this.runtimeFatal = hasFatalRuntimeStateIssue(runtimeIssues);
    getOrCreateFormationState(this.game.registry);
    getOrCreatePlayerGold(this.game.registry);
    getOrCreateKeyBindingState(this.game.registry);
    getOrCreateInventoryState(this.game.registry);
    this.drawField();
    this.addStageNotice();
    this.addStatusText();
    this.addFormationButton();
    this.addShopButton();
    this.addKeySettingsButton();
    this.addInventoryButton();
    this.addStage15Controls();
    this.player = this.addPlayer();

    MONSTERS.forEach((monster) => this.addMonster(monster));

    this.setupCanvasContextMenu();
    this.game.registry.events.on("changedata", this.handleSummaryChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.clearRespawnTimers, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.clearRespawnTimers, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.clearSummaryListener, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.clearSummaryListener, this);
    const bootData = data && typeof data === "object" ? data as {
      persistenceMessage?: string;
      offlineSummary?: OfflineRewardSummary;
    } : {};
    const registrySummary = getAndClearOfflineSummary(this.game.registry);
    const summary = bootData.offlineSummary ?? registrySummary;
    if (summary && (summary.applied || summary.recoveredMessage || summary.rawElapsedMs >= 60_000)) {
      this.showOfflineSummary(summary);
    } else if (bootData.persistenceMessage && bootData.persistenceMessage !== "Save loaded.") {
      this.formationMessage = bootData.persistenceMessage;
    }
    if (this.runtimeFatal) {
      this.state = "IDLE";
      this.formationMessage = "A required game state could not be repaired. Use Safe Recovery to continue.";
    }
    this.updateStatusText();
  }

  public update(_time: number, delta: number): void {
    if (this.summaryOpen) {
      return;
    }
    this.movePlayer(delta);
    this.statusElapsedMs += Math.max(0, delta);
    if (this.statusDirty || this.statusElapsedMs >= 100) this.updateStatusText();
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
    this.add.text(48, 36, "Stage 16: Performance & Stability", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });

    this.add.text(50, 66, "Stable runtime, safe saves, and efficient UI updates.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "16px",
    });
  }

  private addStatusText(): void {
    this.stateText = this.add.text(928, 98, "", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "12px",
      fontStyle: "bold",
      lineSpacing: 4,
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
        this.selectMonster(monster.id, "MANUAL");
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

  private selectMonster(monsterId: string, source: "MANUAL" | "REPEAT" = "MANUAL"): void {
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
    this.repeatMovementInProgress = source === "REPEAT";
    setSelectedAutoRepeatMonster(this.game.registry, monsterId);

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
    if (this.runtimeFatal || this.battleTransitionStarted || !this.targetMonster) {
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
      autoRepeatBattle: (() => {
        const autoProgress = getOrCreateAutoProgressState(this.game.registry);
        return autoProgress.autoRepeatEnabled && autoProgress.selectedMonsterId === target.id;
      })(),
    };

    this.scene.pause();
    this.scene.launch("BattleScene", battleData);
  }

  public returnFromBattle(outcome?: BattleOutcome): void {
    if (!this.battleTransitionStarted) {
      return;
    }

    const autoProgress = getOrCreateAutoProgressState(this.game.registry);
    const shouldRepeat = outcome === "VICTORY" && autoProgress.autoRepeatEnabled &&
      autoProgress.selectedMonsterId !== null;
    if (!shouldRepeat && autoProgress.autoRepeatEnabled) {
      setAutoRepeatEnabled(this.game.registry, false);
      this.formationMessage = outcome === "DEFEAT" ? "Repeat Hunt stopped after defeat." : "Repeat Hunt paused by menu.";
    }
    this.repeatAfterBattlePending = shouldRepeat;

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
    if (!this.prepareMenuEntry("Formation is unavailable while the player is moving.")) return;
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
    if (!this.prepareMenuEntry("Shop is unavailable while the player is moving.")) return;
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
    if (!this.prepareMenuEntry("Key settings are unavailable while the player is moving.")) return;
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

  private addInventoryButton(): void {
    this.inventoryButton = this.add.rectangle(862, 66, 104, 28, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 1)
      .setInteractive({ useHandCursor: true });
    this.inventoryButtonLabel = this.add.text(862, 66, "Inventory", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.inventoryButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        this.openInventory();
      }
    });
  }

  public openInventory(): void {
    if (this.battleTransitionStarted || this.state === "BATTLE") {
      return;
    }
    if (!this.prepareMenuEntry("Inventory is unavailable while the player is moving.")) return;
    this.formationMessage = null;
    this.scene.pause();
    this.scene.launch("InventoryScene");
  }

  public returnFromInventory(savedMessage?: string): void {
    this.scene.stop("InventoryScene");
    this.scene.resume();
    this.state = "IDLE";
    this.formationMessage = savedMessage ?? null;
    this.updateStatusText();
  }

  public openSaveData(): void {
    if (this.battleTransitionStarted || this.state === "BATTLE") {
      return;
    }
    if (!this.prepareMenuEntry("Save Data is unavailable while the player is moving.")) return;
    this.scene.pause();
    this.scene.launch("SaveDataScene");
  }

  public returnFromSaveData(savedMessage?: string): void {
    this.scene.stop("SaveDataScene");
    this.scene.resume();
    this.state = "IDLE";
    this.formationMessage = savedMessage ?? null;
    this.updateStatusText();
  }

  public restartAfterReset(message: string): void {
    this.summaryOverlay?.destroy(true);
    this.summaryOverlay = null;
    this.summaryOpen = false;
    this.targetMonster = null;
    this.repeatAfterBattlePending = false;
    this.repeatMovementInProgress = false;
    this.battleTransitionStarted = false;
    this.battleResultApplied = false;
    this.scene.stop("SaveDataScene");
    this.scene.stop("BattleScene");
    this.scene.restart({ persistenceMessage: message });
  }

  public applyBattleResult(result: RTSBattleResult): void {
    repairRuntimeStateAtBoundary(this.game.registry);
    if (hasFatalRuntimeStateIssue(inspectRuntimeState(this.game.registry))) {
      this.battleResultApplied = false;
      return;
    }
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
      recordActualMonsterVictory(this.game.registry, targetMonster.definition.id, {
        autoRepeatVictory: result.autoRepeatBattle === true,
      });
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
    const autoProgress = getOrCreateAutoProgressState(this.game.registry);
    if (this.repeatAfterBattlePending && autoProgress.selectedMonsterId === monster.definition.id) {
      if (autoProgress.autoRepeatEnabled && !this.summaryOpen && !this.battleTransitionStarted) {
        this.repeatAfterBattlePending = false;
        this.selectMonster(monster.definition.id, "REPEAT");
      } else if (!autoProgress.autoRepeatEnabled) {
        this.repeatAfterBattlePending = false;
      }
    }
  }

  private clearRespawnTimers(): void {
    this.monsterViews.forEach((monster) => {
      if (monster.respawnEvent) {
        this.time.removeEvent(monster.respawnEvent);
        monster.respawnEvent = null;
      }
    });
  }

  public getManagedTimerCount(): number {
    let count = this.repeatAfterBattlePending ? 1 : 0;
    this.monsterViews.forEach((monster) => { if (monster.respawnEvent) count += 1; });
    return count;
  }

  public getDiagnosticsSnapshot(): { uiUpdates: number; managedTimers: number } {
    return { uiUpdates: this.statusUpdateCount, managedTimers: this.getManagedTimerCount() };
  }

  private clearSummaryListener(): void {
    this.game.registry.events.off("changedata", this.handleSummaryChanged);
    this.pendingSummary = null;
  }

  private updateStatusText(): void {
    if (!this.stateText) {
      return;
    }
    this.statusUpdateCount += 1;

    const formation = getOrCreateFormationState(this.game.registry);
    const deployedCount = formation.slots.filter((slot) => slot.rosterUnitId !== null).length;
    const hero = formation.ownedUnits.find((unit) => unit.unitRole === "MAIN_CHARACTER");
    const heroSlot = formation.slots.find((slot) => slot.rosterUnitId === hero?.rosterUnitId)?.slotIndex;
    const playerGold = getOrCreatePlayerGold(this.game.registry);
    const autoProgress = getOrCreateAutoProgressState(this.game.registry);
    this.formationButton?.setFillStyle(this.state === "IDLE" ? 0x4b8b6d : 0x293044, 1);
    this.formationButtonLabel?.setColor(this.state === "IDLE" ? "#f3f8e9" : "#8795a8");
    this.shopButton?.setFillStyle(this.state === "IDLE" ? 0x4b8b6d : 0x293044, 1);
    this.shopButtonLabel?.setColor(this.state === "IDLE" ? "#f3f8e9" : "#8795a8");
    this.keySettingsButton?.setFillStyle(this.state === "IDLE" ? 0x4b8b6d : 0x293044, 1);
    this.keySettingsButtonLabel?.setColor(this.state === "IDLE" ? "#f3f8e9" : "#8795a8");
    this.inventoryButton?.setFillStyle(this.state === "IDLE" ? 0x4b8b6d : 0x293044, 1);
    this.inventoryButtonLabel?.setColor(this.state === "IDLE" ? "#f3f8e9" : "#8795a8");
    this.repeatButton?.setFillStyle(autoProgress.autoRepeatEnabled ? 0x3b9b6f : 0x4b8b6d, 1);
    this.repeatButtonLabel?.setText("Repeat: " + (autoProgress.autoRepeatEnabled ? "ON" : "OFF"));
    this.saveDataButton?.setFillStyle(this.state === "IDLE" ? 0x4b8b6d : 0x293044, 1);
    this.saveDataButtonLabel?.setColor(this.state === "IDLE" ? "#f3f8e9" : "#8795a8");
    const nextText = [
      "State: " + this.state + " · Target: " + (this.targetMonster?.definition.name ?? "None") + " · Gold: " + playerGold,
      "Formation: " + deployedCount + "/10 · Owned: " + formation.ownedUnits.length + "/13 · Hero Slot: " + (heroSlot === undefined ? "-" : heroSlot === 9 ? "0" : heroSlot + 1),
      "Hero: " + (hero ? getHeroStatsLabel(this.game.registry, hero) : "Unavailable"),
      "Repeat Hunt: " + (autoProgress.autoRepeatEnabled ? "ON" : "OFF") + " · Target: " + (autoProgress.selectedMonsterId ?? "None"),
      ...(this.formationMessage ? [this.formationMessage] : []),
    ].join("\n");
    if (nextText !== this.lastStatusText) {
      this.stateText.setText(nextText);
      this.lastStatusText = nextText;
    }
    this.statusDirty = false;
    this.statusElapsedMs = 0;
  }

  private addStage15Controls(): void {
    this.repeatButton = this.add.rectangle(680, 510, 136, 28, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 1)
      .setInteractive({ useHandCursor: true });
    this.repeatButtonLabel = this.add.text(680, 510, "", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.repeatButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) this.toggleRepeatHunt();
    });
    this.saveDataButton = this.add.rectangle(835, 510, 136, 28, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 1)
      .setInteractive({ useHandCursor: true });
    this.saveDataButtonLabel = this.add.text(835, 510, "Save Data", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.saveDataButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) this.openSaveData();
    });
  }

  private toggleRepeatHunt(): void {
    const state = getOrCreateAutoProgressState(this.game.registry);
    if (state.autoRepeatEnabled) {
      setAutoRepeatEnabled(this.game.registry, false);
      if (this.repeatMovementInProgress) {
        this.state = "IDLE";
        this.repeatMovementInProgress = false;
      }
      this.repeatAfterBattlePending = false;
      this.formationMessage = "Repeat Hunt stopped.";
      this.updateStatusText();
      return;
    }
    const targetId = state.selectedMonsterId;
    const target = targetId ? this.monsterViews.get(targetId) : undefined;
    const formation = getOrCreateFormationState(this.game.registry);
    if (!targetId || !target || !isValidFormationState(formation)) {
      this.formationMessage = "Select a valid monster with a valid formation before enabling Repeat Hunt.";
      this.updateStatusText();
      return;
    }
    setAutoRepeatEnabled(this.game.registry, true);
    this.game.registry.set(AUTO_HUNT_REGISTRY_KEY, true);
    this.formationMessage = "Repeat Hunt enabled.";
    if (target?.isAvailable) {
      this.repeatAfterBattlePending = false;
      this.selectMonster(targetId, "REPEAT");
    } else {
      this.repeatAfterBattlePending = true;
      this.formationMessage = "Repeat Hunt is waiting for the selected monster to respawn.";
    }
    this.updateStatusText();
  }

  private pauseRepeatHuntForMenu(): void {
    const state = getOrCreateAutoProgressState(this.game.registry);
    if (state.autoRepeatEnabled) {
      setAutoRepeatEnabled(this.game.registry, false);
      this.formationMessage = "Repeat Hunt paused by menu.";
    }
    this.repeatAfterBattlePending = false;
    this.repeatMovementInProgress = false;
  }

  private prepareMenuEntry(unavailableMessage: string): boolean {
    if (this.state === "MOVING") {
      if (!this.repeatMovementInProgress) {
        this.formationMessage = unavailableMessage;
        this.updateStatusText();
        return false;
      }
      this.state = "IDLE";
      this.repeatMovementInProgress = false;
    }
    this.pauseRepeatHuntForMenu();
    return true;
  }

  private showOfflineSummary(summary: OfflineRewardSummary): void {
    this.summaryOpen = true;
    const overlay = this.add.container(0, 0).setDepth(100);
    overlay.add(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x08111d, 0.78));
    overlay.add(this.add.rectangle(GAME_WIDTH / 2, 270, 660, 360, 0x1f2937, 1).setStrokeStyle(2, 0x9ce4b0, 1));
    overlay.add(this.add.text(480, 105, "Offline Hunt Summary", {
      color: "#f6e8ad", fontFamily: "Segoe UI, sans-serif", fontSize: "22px", fontStyle: "bold",
    }).setOrigin(0.5));
    const itemCounts = new Map<string, number>();
    for (const itemDefinitionId of summary.itemDefinitionIds) {
      const displayName = getItemDefinition(itemDefinitionId)?.displayName ?? itemDefinitionId;
      itemCounts.set(displayName, (itemCounts.get(displayName) ?? 0) + 1);
    }
    const items = itemCounts.size > 0
      ? [...itemCounts.entries()].map(([name, count]) => name + " x" + count).join(", ")
      : "None";
    overlay.add(this.add.text(190, 145, [
      "Target: " + (summary.monsterName ?? "None"),
      "Elapsed: " + Math.floor(summary.rawElapsedMs / 1000) + "s · Used: " + Math.floor(summary.eligibleMs / 1000) + "s",
      "Cycles: " + summary.cycles + (summary.capped ? " · 8-hour cap applied" : ""),
      "Gold: +" + summary.gold,
      "EXP: +" + summary.directExperience + " direct · +" + summary.bonusExperience + " bonus",
      "Items: " + items + (summary.itemCapApplied ? " · 100-item cap applied" : ""),
      summary.recoveredMessage ?? "",
    ], {
      color: "#d9f2ff", fontFamily: "Segoe UI, sans-serif", fontSize: "13px", lineSpacing: 8,
      wordWrap: { width: 580 },
    }));
    const continueButton = this.add.rectangle(480, 440, 180, 34, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 1).setInteractive({ useHandCursor: true });
    overlay.add(continueButton);
    overlay.add(this.add.text(480, 440, "Continue", {
      color: "#f3f8e9", fontFamily: "Segoe UI, sans-serif", fontSize: "12px", fontStyle: "bold",
    }).setOrigin(0.5));
    continueButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) this.closeOfflineSummary();
    });
    this.summaryOverlay = overlay;
  }

  private closeOfflineSummary(): void {
    this.summaryOverlay?.destroy(true);
    this.summaryOverlay = null;
    this.summaryOpen = false;
    const pendingSummary = this.pendingSummary;
    this.pendingSummary = null;
    const state = getOrCreateAutoProgressState(this.game.registry);
    if (state.autoRepeatEnabled && state.selectedMonsterId) {
      const target = this.monsterViews.get(state.selectedMonsterId);
      if (target?.isAvailable) this.selectMonster(state.selectedMonsterId, "REPEAT");
    }
    if (pendingSummary) this.showOfflineSummary(pendingSummary);
    this.updateStatusText();
  }
}
