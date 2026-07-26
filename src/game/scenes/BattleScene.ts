import Phaser from "phaser";
import {
  COMBAT_LOG_LIMIT,
  GAME_HEIGHT,
  GAME_WIDTH,
  RTS_ALLY_COUNT,
  RTS_ARENA_BOUNDS,
  RTS_ENEMY_COUNT,
  RTS_MAX_COMBAT_DELTA_MS,
  RTS_SELECTION_DRAG_THRESHOLD_PX,
} from "../constants";
import { createEnemyIds, getEnemyDefinition, getTrialUnitStats } from "../rtsBattleDefinitions";
import type {
  BattleOutcome,
  BattlePosition,
  EnemyDefinition,
  RTSBattleResult,
  RTSBattleSceneData,
  RTSBattleUnit,
  RosterEntry,
} from "../rtsBattleTypes";
import {
  constrainToArena,
  createFormationDestinations,
  distanceBetween,
  findNearestAliveUnit,
  isPointInRectangle,
  moveToward,
  separateNearbyUnits,
} from "../rtsBattleUtils";
import type { FieldScene } from "./FieldScene";

type UnitVisual = {
  container: Phaser.GameObjects.Container;
  interactionZone: Phaser.GameObjects.Zone;
  healthFill: Phaser.GameObjects.Rectangle;
  selectionRing: Phaser.GameObjects.Arc;
};

type SlotVisual = {
  nameText: Phaser.GameObjects.Text;
  stateText: Phaser.GameObjects.Text;
  hpFill: Phaser.GameObjects.Rectangle;
};

type PointerPosition = {
  x: number;
  y: number;
};

type CombatState = "RUNNING" | "VICTORY" | "DEFEAT";

export class BattleScene extends Phaser.Scene {
  private returnStarted = false;
  private combatState: CombatState = "RUNNING";
  private dataError: string | null = null;
  private resultCommitted = false;
  private sourceWorldMonsterId = "unknown-monster";
  private enemyDefinitionId = "slime-1";
  private enemyDisplayName = "Slime 1";
  private enemyColor = 0xe67e91;
  private goldReward = 0;
  private readonly units = new Map<string, RTSBattleUnit>();
  private readonly unitVisuals = new Map<string, UnitVisual>();
  private readonly slotVisuals = new Map<number, SlotVisual>();
  private readonly selectedUnitIds = new Set<string>();
  private readonly attackLogs: string[] = [];
  private arena!: Phaser.GameObjects.Rectangle;
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private selectedInfoText!: Phaser.GameObjects.Text;
  private outcomeText!: Phaser.GameObjects.Text;
  private attackLogText!: Phaser.GameObjects.Text;
  private dragStart: PointerPosition | null = null;
  private dragEnd: PointerPosition | null = null;
  private isDragging = false;
  private suppressArenaPointer = false;

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
    this.resetBattle(data);
    this.drawBackground();
    this.addHeader();
    this.addArenaInteraction();
    this.addBattleUnits();
    this.addSelectionUi();
    this.addBottomUi();
    this.refreshAllVisuals();
    this.updateUi();

    if (this.dataError) {
      this.outcomeText.setText(["BATTLE DATA ERROR", this.dataError, "Return to Field to continue."]);
    } else if (this.getAliveUnits("ENEMY").length === 0) {
      this.commitResult("VICTORY");
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupInput, this);
  }

  public update(_time: number, delta: number): void {
    if (this.dataError) {
      this.updateUi();
      return;
    }

    if (this.combatState !== "RUNNING") {
      this.refreshAllVisuals();
      return;
    }

    const safeDelta = Number.isFinite(delta)
      ? Math.min(Math.max(delta, 0), RTS_MAX_COMBAT_DELTA_MS)
      : 0;
    this.updateAllies(safeDelta);
    if (this.combatState === "RUNNING") {
      this.updateEnemies(safeDelta);
    }
    if (this.combatState === "RUNNING") {
      separateNearbyUnits(this.units.values());
      this.checkBattleOutcome();
    }
    this.refreshAllVisuals();
    this.updateUi();
  }

  private resetBattle(data: unknown): void {
    this.returnStarted = false;
    this.combatState = "RUNNING";
    this.resultCommitted = false;
    this.dataError = null;
    this.units.clear();
    this.unitVisuals.clear();
    this.slotVisuals.clear();
    this.selectedUnitIds.clear();
    this.attackLogs.length = 0;
    this.dragStart = null;
    this.dragEnd = null;
    this.isDragging = false;
    this.suppressArenaPointer = false;

    if (!this.isRTSBattleSceneData(data)) {
      this.dataError = "The battle payload is invalid.";
      return;
    }

    const enemyDefinition = getEnemyDefinition(data.sourceWorldMonsterId);
    if (!enemyDefinition) {
      this.dataError = `Unknown world monster: ${data.sourceWorldMonsterId}`;
      return;
    }

    this.sourceWorldMonsterId = data.sourceWorldMonsterId;
    this.enemyDefinitionId = enemyDefinition.id;
    this.enemyDisplayName = enemyDefinition.name;
    this.enemyColor = enemyDefinition.color;
    this.goldReward = this.sanitizeGold(enemyDefinition.goldReward);

    const roster = [...data.allyRoster].sort((first, second) => first.slotIndex - second.slotIndex);
    const allyPositions = createFormationDestinations({ x: GAME_WIDTH / 2, y: 338 }, RTS_ALLY_COUNT);
    roster.slice(0, RTS_ALLY_COUNT).forEach((entry, index) => {
      this.units.set(entry.rosterUnitId, this.createAllyUnit(entry, allyPositions[index]));
    });

    const enemyPositions = createFormationDestinations({ x: GAME_WIDTH / 2, y: 138 }, RTS_ENEMY_COUNT);
    createEnemyIds(this.enemyDefinitionId, RTS_ENEMY_COUNT).forEach((battleUnitId, index) => {
      this.units.set(battleUnitId, this.createEnemyUnit(battleUnitId, enemyPositions[index], enemyDefinition));
    });
  }

  private createAllyUnit(entry: RosterEntry, position: BattlePosition): RTSBattleUnit {
    const stats = getTrialUnitStats(entry.unitRole);
    return {
      battleUnitId: entry.rosterUnitId,
      rosterUnitId: entry.rosterUnitId,
      team: "ALLY",
      unitRole: entry.unitRole,
      definitionId: entry.unitDefinitionId,
      displayName: entry.unitRole === "MAIN_CHARACTER" ? "Hero" : `Merc ${entry.slotIndex}`,
      sourceWorldMonsterId: null,
      currentHp: stats.maxHp,
      maxHp: stats.maxHp,
      attackDamage: stats.attackDamage,
      attackIntervalMs: stats.attackIntervalMs,
      attackElapsedMs: 0,
      moveSpeed: stats.moveSpeed,
      attackRange: stats.attackRange,
      collisionRadius: stats.collisionRadius,
      position,
      state: "IDLE",
      currentTargetId: null,
      moveDestination: null,
      isAlive: true,
      slotIndex: entry.slotIndex,
      skills: [],
    };
  }

  private createEnemyUnit(
    battleUnitId: string,
    position: BattlePosition,
    enemyDefinition: EnemyDefinition,
  ): RTSBattleUnit {
    return {
      battleUnitId,
      rosterUnitId: null,
      team: "ENEMY",
      unitRole: "MERCENARY",
      definitionId: this.enemyDefinitionId,
      displayName: this.enemyDisplayName,
      sourceWorldMonsterId: this.sourceWorldMonsterId,
      currentHp: enemyDefinition.maxHp,
      maxHp: enemyDefinition.maxHp,
      attackDamage: enemyDefinition.attackDamage,
      attackIntervalMs: enemyDefinition.attackIntervalMs,
      attackElapsedMs: 0,
      moveSpeed: enemyDefinition.moveSpeed,
      attackRange: enemyDefinition.attackRange,
      collisionRadius: enemyDefinition.collisionRadius,
      position,
      state: "IDLE",
      currentTargetId: null,
      moveDestination: null,
      isAlive: true,
      slotIndex: null,
      skills: [],
    };
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);
    this.add.rectangle(GAME_WIDTH / 2, 235, 920, 340, 0x1f2937, 1);
    this.add.rectangle(GAME_WIDTH / 2, 438, 920, 92, 0x172033, 1);
    this.add.line(0, 0, 22, 420, 938, 420, 0x6ec6a7, 0.65).setOrigin(0);
  }

  private addHeader(): void {
    this.add.text(32, 14, "Stage 7: 10v10 RTS Battle Core", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(34, 45, `Enemy: ${this.enemyDisplayName} x10 · Command allies manually.`, {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "14px",
    });
    this.statusText = this.add.text(670, 18, "", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "15px",
      fontStyle: "bold",
      align: "right",
    }).setOrigin(0, 0);
  }

  private addArenaInteraction(): void {
    this.arena = this.add.rectangle(
      (RTS_ARENA_BOUNDS.left + RTS_ARENA_BOUNDS.right) / 2,
      (RTS_ARENA_BOUNDS.top + RTS_ARENA_BOUNDS.bottom) / 2,
      RTS_ARENA_BOUNDS.right - RTS_ARENA_BOUNDS.left,
      RTS_ARENA_BOUNDS.bottom - RTS_ARENA_BOUNDS.top,
      0x26394b,
      0.55,
    ).setInteractive();
    this.arena.on("pointerdown", this.handleArenaPointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
  }

  private addBattleUnits(): void {
    for (const unit of this.units.values()) {
      const radius = unit.collisionRadius;
      const color = unit.team === "ALLY"
        ? unit.unitRole === "MAIN_CHARACTER" ? 0xf4d35e : 0x63b3ed
        : this.enemyColor;
      const container = this.add.container(unit.position.x, unit.position.y);
      const selectionRing = this.add.arc(0, 0, radius + 7, 0, 360, false, 0xf7d154, 0);
      selectionRing.setStrokeStyle(2, 0xf7d154, 1).setVisible(false);
      const body = this.add.circle(0, 0, radius, color);
      const banner = this.add.rectangle(0, radius - 1, radius * 1.55, 6, color);
      const eyes = [this.add.circle(-4, -2, 2, 0x172033), this.add.circle(4, -2, 2, 0x172033)];
      const label = this.add.text(0, radius + 8, this.getUnitLabel(unit), {
        color: unit.team === "ALLY" ? "#d9f2ff" : "#ffd2d2",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const healthBack = this.add.rectangle(0, -radius - 7, 32, 4, 0x0b1220).setOrigin(0.5);
      const healthFill = this.add.rectangle(0, -radius - 7, 32, 4, unit.team === "ALLY" ? 0x66d18f : 0xef7185).setOrigin(0, 0.5);
      healthFill.x = -16;
      container.add([selectionRing, body, banner, ...eyes, label, healthBack, healthFill]);
      const interactionZone = this.add.zone(unit.position.x, unit.position.y, radius * 2 + 12, radius * 2 + 12);
      interactionZone.setInteractive({ useHandCursor: true });
      interactionZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handleUnitPointerDown(unit.battleUnitId, pointer));
      this.unitVisuals.set(unit.battleUnitId, { container, interactionZone, healthFill, selectionRing });
    }
  }

  private addSelectionUi(): void {
    this.selectionGraphics = this.add.graphics();
    this.selectedInfoText = this.add.text(GAME_WIDTH / 2, 426, "", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      align: "center",
    }).setOrigin(0.5);
    this.outcomeText = this.add.text(GAME_WIDTH / 2, 232, "", {
      color: "#f7d154",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5).setDepth(10);
  }

  private addBottomUi(): void {
    this.add.rectangle(150, 113, 236, 70, 0x172033, 0.88)
      .setStrokeStyle(1, 0x54748a, 1)
      .setDepth(4);
    this.attackLogText = this.add.text(42, 84, "", {
      color: "#b9cad7",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      lineSpacing: 2,
      wordWrap: { width: 216 },
    }).setDepth(5);

    const slotWidth = 82;
    for (let index = 0; index < RTS_ALLY_COUNT; index += 1) {
      const x = 48 + index * 86;
      const slot = this.add.rectangle(x, 490, slotWidth, 58, 0x26394b, 1).setStrokeStyle(1, 0x54748a, 1);
      slot.setInteractive({ useHandCursor: true });
      slot.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          const unit = [...this.units.values()].find((candidate) => candidate.team === "ALLY" && candidate.slotIndex === index);
          if (unit?.isAlive) {
            this.selectSingleUnit(unit.battleUnitId);
          }
        }
      });
      this.add.text(x - slotWidth / 2 + 6, 466, index === 9 ? "0" : String(index + 1), {
        color: "#f6e8ad",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
      });
      const nameText = this.add.text(x, 480, "", {
        color: "#d9f2ff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        align: "center",
      }).setOrigin(0.5);
      const stateText = this.add.text(x, 493, "", {
        color: "#b9cad7",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "9px",
        align: "center",
      }).setOrigin(0.5);
      const hpBack = this.add.rectangle(x - 27, 511, 54, 4, 0x0b1220).setOrigin(0, 0.5);
      const hpFill = this.add.rectangle(x - 27, 511, 54, 4, 0x66d18f).setOrigin(0, 0.5);
      this.slotVisuals.set(index, { nameText, stateText, hpFill });
    }

    const returnButton = this.add.rectangle(840, 35, 150, 32, 0x4b8b6d, 1).setStrokeStyle(1, 0x9ce4b0, 1);
    returnButton.setInteractive({ useHandCursor: true });
    returnButton.on("pointerdown", this.handleReturnToField);
    this.add.text(840, 35, "Return to Field", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    }).setOrigin(0.5);
  }

  private updateAllies(deltaMs: number): void {
    for (const unit of this.units.values()) {
      if (unit.team !== "ALLY" || !unit.isAlive) {
        continue;
      }

      if (unit.currentTargetId) {
        const target = this.units.get(unit.currentTargetId);
        if (!target?.isAlive) {
          unit.currentTargetId = null;
          unit.state = "IDLE";
          unit.attackElapsedMs = 0;
        } else {
          this.updateUnitAgainstTarget(unit, target, deltaMs);
          continue;
        }
      }

      if (unit.moveDestination) {
        unit.state = "MOVING";
        if (moveToward(unit, unit.moveDestination, deltaMs)) {
          unit.moveDestination = null;
          unit.state = "IDLE";
        }
      } else {
        unit.state = "IDLE";
      }
    }
  }

  private updateEnemies(deltaMs: number): void {
    const allies = this.getAliveUnits("ALLY");
    for (const unit of this.units.values()) {
      if (unit.team !== "ENEMY" || !unit.isAlive) {
        continue;
      }

      let target = unit.currentTargetId ? this.units.get(unit.currentTargetId) : null;
      if (!target?.isAlive) {
        target = findNearestAliveUnit(unit, allies);
        unit.currentTargetId = target?.battleUnitId ?? null;
      }

      if (!target) {
        unit.state = "IDLE";
        continue;
      }

      this.updateUnitAgainstTarget(unit, target, deltaMs);
    }
  }

  private updateUnitAgainstTarget(unit: RTSBattleUnit, target: RTSBattleUnit, deltaMs: number): void {
    const distance = distanceBetween(unit.position, target.position);
    const attackDistance = unit.attackRange + target.collisionRadius;
    if (distance > attackDistance) {
      unit.state = "CHASING";
      unit.attackElapsedMs = 0;
      moveToward(unit, target.position, deltaMs);
      return;
    }

    unit.state = "ATTACKING";
    unit.attackElapsedMs += deltaMs;
    if (unit.attackElapsedMs >= unit.attackIntervalMs) {
      unit.attackElapsedMs = 0;
      this.applyDamage(unit, target);
    }
  }

  private applyDamage(attacker: RTSBattleUnit, target: RTSBattleUnit): void {
    if (
      this.combatState !== "RUNNING" ||
      !attacker.isAlive ||
      !target.isAlive ||
      this.units.get(target.battleUnitId) !== target ||
      distanceBetween(attacker.position, target.position) > attacker.attackRange + target.collisionRadius
    ) {
      return;
    }

    target.currentHp = Math.max(0, target.currentHp - attacker.attackDamage);
    this.addAttackLog(`${attacker.displayName} dealt ${attacker.attackDamage} to ${target.displayName}.`);
    if (target.currentHp === 0) {
      target.isAlive = false;
      target.state = "DEAD";
      target.currentTargetId = null;
      target.moveDestination = null;
      target.attackElapsedMs = 0;
      this.selectedUnitIds.delete(target.battleUnitId);
      const visual = this.unitVisuals.get(target.battleUnitId);
      visual?.container.disableInteractive();
    }
  }

  private checkBattleOutcome(): void {
    if (this.getAliveUnits("ENEMY").length === 0) {
      this.commitResult("VICTORY");
    } else if (this.getAliveUnits("ALLY").length === 0) {
      this.commitResult("DEFEAT");
    }
  }

  private commitResult(outcome: BattleOutcome): void {
    if (this.resultCommitted) {
      return;
    }

    this.resultCommitted = true;
    this.combatState = outcome;
    for (const unit of this.units.values()) {
      unit.attackElapsedMs = 0;
      if (unit.isAlive && unit.state !== "DEAD") {
        unit.state = "IDLE";
      }
    }

    const result: RTSBattleResult = {
      outcome,
      sourceWorldMonsterId: this.sourceWorldMonsterId,
      enemyDefinitionId: this.enemyDefinitionId,
      enemyDisplayName: this.enemyDisplayName,
      goldReward: outcome === "VICTORY" ? this.goldReward : 0,
    };
    const fieldScene = this.scene.get("FieldScene") as FieldScene;
    fieldScene.applyBattleResult(result);
    this.outcomeText.setText(outcome === "VICTORY"
      ? ["VICTORY", `${this.enemyDisplayName} squad defeated.`, `Reward: +${this.goldReward} Gold`]
      : ["DEFEAT", "All allied units are defeated.", "Reward: 0 Gold"]);
  }

  private selectSingleUnit(unitId: string): void {
    const unit = this.units.get(unitId);
    if (!unit?.isAlive || unit.team !== "ALLY") {
      return;
    }

    this.selectedUnitIds.clear();
    this.selectedUnitIds.add(unitId);
    this.updateUi();
  }

  private selectUnitsInRectangle(start: PointerPosition, end: PointerPosition): void {
    this.selectedUnitIds.clear();
    for (const unit of this.units.values()) {
      if (unit.team === "ALLY" && unit.isAlive && isPointInRectangle(unit.position, start, end)) {
        this.selectedUnitIds.add(unit.battleUnitId);
      }
    }
    this.updateUi();
  }

  private issueMoveCommand(destination: PointerPosition): void {
    const selected = this.getSelectedAliveAllies();
    if (selected.length === 0 || this.combatState !== "RUNNING") {
      return;
    }

    const destinations = createFormationDestinations(destination, selected.length);
    selected.forEach((unit, index) => {
      unit.currentTargetId = null;
      unit.attackElapsedMs = 0;
      unit.moveDestination = destinations[index];
      unit.state = "MOVING";
    });
    this.addAttackLog(`Move order issued to ${selected.length} allied units.`);
  }

  private issueAttackCommand(enemyId: string): void {
    const enemy = this.units.get(enemyId);
    const selected = this.getSelectedAliveAllies();
    if (!enemy?.isAlive || enemy.team !== "ENEMY" || selected.length === 0 || this.combatState !== "RUNNING") {
      return;
    }

    selected.forEach((unit) => {
      unit.currentTargetId = enemyId;
      unit.moveDestination = null;
      unit.attackElapsedMs = 0;
      unit.state = "CHASING";
    });
    this.addAttackLog(`Attack order issued against ${enemy.displayName}.`);
  }

  private handleUnitPointerDown(unitId: string, pointer: Phaser.Input.Pointer): void {
    pointer.event?.stopPropagation();
    this.suppressArenaPointer = true;
    const unit = this.units.get(unitId);
    if (!unit?.isAlive || this.combatState !== "RUNNING") {
      return;
    }

    if (pointer.button === 0 && unit.team === "ALLY") {
      this.selectSingleUnit(unitId);
    } else if (pointer.button === 2 && unit.team === "ENEMY") {
      this.issueAttackCommand(unitId);
    }
  }

  private handleArenaPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.combatState !== "RUNNING" || this.suppressArenaPointer) {
      return;
    }

    const position = this.constrainPointer(pointer);
    if (pointer.button === 2) {
      this.issueMoveCommand(position);
      return;
    }

    if (pointer.button === 0) {
      this.dragStart = position;
      this.dragEnd = position;
      this.isDragging = false;
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStart || !pointer.isDown || pointer.button !== 0) {
      return;
    }

    this.dragEnd = this.constrainPointer(pointer);
    const distance = distanceBetween(this.dragStart, this.dragEnd);
    this.isDragging = distance >= RTS_SELECTION_DRAG_THRESHOLD_PX;
    this.drawSelectionRectangle();
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.dragStart && pointer.button === 0 && this.dragEnd) {
      if (this.isDragging) {
        this.selectUnitsInRectangle(this.dragStart, this.dragEnd);
      } else if (!this.suppressArenaPointer) {
        this.selectedUnitIds.clear();
        this.updateUi();
      }
    }

    this.dragStart = null;
    this.dragEnd = null;
    this.isDragging = false;
    this.suppressArenaPointer = false;
    this.selectionGraphics?.clear();
  }

  private drawSelectionRectangle(): void {
    if (!this.dragStart || !this.dragEnd || !this.isDragging) {
      this.selectionGraphics.clear();
      return;
    }

    const left = Math.min(this.dragStart.x, this.dragEnd.x);
    const top = Math.min(this.dragStart.y, this.dragEnd.y);
    const width = Math.abs(this.dragEnd.x - this.dragStart.x);
    const height = Math.abs(this.dragEnd.y - this.dragStart.y);
    this.selectionGraphics.clear();
    this.selectionGraphics.fillStyle(0x63b3ed, 0.18);
    this.selectionGraphics.fillRect(left, top, width, height);
    this.selectionGraphics.lineStyle(1, 0x9bd7ff, 1);
    this.selectionGraphics.strokeRect(left, top, width, height);
  }

  private addAttackLog(message: string): void {
    this.attackLogs.push(message);
    if (this.attackLogs.length > COMBAT_LOG_LIMIT) {
      this.attackLogs.shift();
    }
  }

  private refreshAllVisuals(): void {
    for (const unit of this.units.values()) {
      const visual = this.unitVisuals.get(unit.battleUnitId);
      if (!visual) {
        continue;
      }

      visual.container.setPosition(unit.position.x, unit.position.y);
      visual.interactionZone.setPosition(unit.position.x, unit.position.y);
      visual.container.setAlpha(unit.isAlive ? 1 : 0.28);
      visual.interactionZone.setActive(unit.isAlive);
      if (!unit.isAlive) {
        visual.interactionZone.disableInteractive();
      }
      visual.selectionRing.setVisible(unit.isAlive && this.selectedUnitIds.has(unit.battleUnitId));
      visual.healthFill.setDisplaySize(32 * this.getHealthRatio(unit.currentHp, unit.maxHp), 4);
    }
  }

  private updateUi(): void {
    const selected = this.getSelectedAliveAllies();
    const aliveAllies = this.getAliveUnits("ALLY").length;
    const aliveEnemies = this.getAliveUnits("ENEMY").length;
    this.statusText?.setText([
      `Allies: ${aliveAllies}/${RTS_ALLY_COUNT}`,
      `Enemies: ${aliveEnemies}/${RTS_ENEMY_COUNT}`,
      `State: ${this.dataError ? "INVALID_DATA" : this.combatState}`,
    ]);
    this.selectedInfoText?.setText(this.dataError
      ? "Battle cannot start with invalid data. Return to Field."
      : selected.length === 0
      ? "No allies selected. Left-click or drag to select; right-click to command."
      : `${selected.length} ally selected${selected.length === 1 ? "" : "s"}. Skills are not available in Stage 7.`);
    this.attackLogText?.setText(["Recent orders", ...(this.attackLogs.length > 0 ? this.attackLogs.slice(-3) : ["No orders yet."])]);
    this.refreshSlotUi();
  }

  private refreshSlotUi(): void {
    for (let index = 0; index < RTS_ALLY_COUNT; index += 1) {
      const unit = [...this.units.values()].find((candidate) => candidate.team === "ALLY" && candidate.slotIndex === index);
      const visual = this.slotVisuals.get(index);
      if (!unit || !visual) {
        continue;
      }

      visual.nameText.setText(unit.unitRole === "MAIN_CHARACTER" ? "Hero" : `Merc ${index}`);
      visual.stateText.setText(unit.isAlive ? unit.state : "DEAD");
      visual.stateText.setColor(unit.isAlive ? "#b9cad7" : "#ef9a9a");
      visual.hpFill.setDisplaySize(54 * this.getHealthRatio(unit.currentHp, unit.maxHp), 4);
    }
  }

  private getAliveUnits(team: "ALLY" | "ENEMY"): RTSBattleUnit[] {
    return [...this.units.values()].filter((unit) => unit.team === team && unit.isAlive);
  }

  private getSelectedAliveAllies(): RTSBattleUnit[] {
    return [...this.selectedUnitIds]
      .map((unitId) => this.units.get(unitId))
      .filter((unit): unit is RTSBattleUnit => Boolean(unit?.isAlive && unit.team === "ALLY"));
  }

  private getUnitLabel(unit: RTSBattleUnit): string {
    if (unit.team === "ENEMY") {
      return this.enemyDefinitionId.replace("slime-", "S");
    }
    return unit.unitRole === "MAIN_CHARACTER" ? "Hero" : `M${(unit.slotIndex ?? 0)}`;
  }

  private getHealthRatio(currentHp: number, maxHp: number): number {
    return Number.isFinite(currentHp) && Number.isFinite(maxHp) && maxHp > 0
      ? Math.min(1, Math.max(0, currentHp / maxHp))
      : 0;
  }

  private constrainPointer(pointer: Phaser.Input.Pointer): PointerPosition {
    return constrainToArena({ x: pointer.worldX, y: pointer.worldY }, 0);
  }

  private cleanupInput(): void {
    this.arena?.off("pointerdown", this.handleArenaPointerDown, this);
    this.input.off("pointermove", this.handlePointerMove, this);
    this.input.off("pointerup", this.handlePointerUp, this);
  }

  private sanitizeGold(value: number): number {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  private isRTSBattleSceneData(data: unknown): data is RTSBattleSceneData {
    if (!data || typeof data !== "object") {
      return false;
    }

    const candidate = data as Record<string, unknown>;
    if (candidate.enemyDefinitionId !== undefined &&
      candidate.enemyDefinitionId !== candidate.sourceWorldMonsterId) {
      return false;
    }
    if (!(typeof candidate.sourceWorldMonsterId === "string" &&
      Number.isSafeInteger(candidate.enemyCount) &&
      candidate.enemyCount === RTS_ENEMY_COUNT &&
      Array.isArray(candidate.allyRoster) &&
      candidate.allyRoster.length === RTS_ALLY_COUNT)) {
      return false;
    }

    const roster = candidate.allyRoster as unknown[];
    const validSlots = new Set<number>();
    return (
      typeof candidate.sourceWorldMonsterId === "string" &&
      roster.every((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        const rosterEntry = entry as Record<string, unknown>;
        const valid = typeof rosterEntry.rosterUnitId === "string" &&
          typeof rosterEntry.unitDefinitionId === "string" &&
          (rosterEntry.unitRole === "MAIN_CHARACTER" || rosterEntry.unitRole === "MERCENARY") &&
          Number.isSafeInteger(rosterEntry.slotIndex) &&
          (rosterEntry.slotIndex as number) >= 0 &&
          (rosterEntry.slotIndex as number) < RTS_ALLY_COUNT &&
          !validSlots.has(rosterEntry.slotIndex as number);
        if (valid) {
          validSlots.add(rosterEntry.slotIndex as number);
        }
        return valid;
      }) && validSlots.size === RTS_ALLY_COUNT
    );
  }
}
