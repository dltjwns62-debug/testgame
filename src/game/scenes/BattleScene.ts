import Phaser from "phaser";
import {
  AUTO_HUNT_REGISTRY_KEY,
  COMBAT_LOG_LIMIT,
  GAME_HEIGHT,
  GAME_WIDTH,
  RTS_ALLY_COUNT,
  RTS_ARENA_BOUNDS,
  RTS_ENEMY_COUNT,
  RTS_GUARD_AGGRO_RANGE,
  RTS_GUARD_LEASH_RANGE,
  RTS_MAX_COMBAT_DELTA_MS,
  RTS_MOVE_ARRIVAL_EPSILON,
  RTS_RETALIATION_MEMORY_MS,
  RTS_SELECTION_DRAG_THRESHOLD_PX,
} from "../constants";
import {
  createEmptyControlGroups,
  controlGroupMapToPersistentState,
  getAvailableControlGroupMemberIds,
  getControlGroupOrdinalLabel,
  getOrCreatePersistentControlGroupState,
  persistentStateToControlGroupMap,
  recallControlGroup,
  saveControlGroup,
  setPersistentControlGroupState,
  type ControlGroupMap,
} from "../controlGroups";
import { getOrCreateFormationState, grantRosterUnitExperience } from "../formationState";
import { setAutoRepeatEnabled } from "../autoProgress";
import { repairRuntimeStateAtBoundary } from "../runtimeStateValidation";
import { recordFatalRuntimeStateIssue } from "../runtimeStateValidation";
import { recordRuntimeError } from "../runtimeErrors";
import {
  addItemDefinitionsToInventory,
  calculateFinalUnitStats,
  calculatePhysicalDamage,
  getEquippedModifierTotals,
  getMonsterDropTable,
  getOrCreateInventoryState,
  getItemDefinition,
  rollDrops,
} from "../items";
import {
  createDefaultKeyBindingState,
  findControlGroupIndexByCode,
  getKeyCodeLabel,
  getOrCreateKeyBindingState,
  type ControlGroupIndex,
  type KeyBindingState,
} from "../keyBindings";
import { createEnemyIds, getAllyUnitDefinition, getEnemyDefinition } from "../rtsBattleDefinitions";
import type {
  BattleOutcome,
  BattlePosition,
  EnemyDefinition,
  RTSBattleResult,
  RTSBattleSceneData,
  RTSBattleUnit,
  RosterEntry,
  UnitSkillId,
} from "../rtsBattleTypes";
import { getUnitSkillDefinition } from "../unitSkills";
import {
  calculateBattleEndBonusExperience,
  calculateProgressionStats,
  formatProgression,
  normalizeProgressionState,
  type ExperienceGainResult,
} from "../progression";
import {
  constrainToArena,
  createFormationDestinations,
  distanceBetween,
  findNearestAliveUnit,
  isWithinDistanceFromAnchor,
  isPointInRectangle,
  moveToward,
  requiredAttackDistance,
  separateNearbyUnits,
} from "../rtsBattleUtils";
import type { FieldScene } from "./FieldScene";

type UnitVisual = {
  container: Phaser.GameObjects.Container;
  interactionZone: Phaser.GameObjects.Zone;
  healthFill: Phaser.GameObjects.Rectangle;
  selectionRing: Phaser.GameObjects.Arc;
  attackReachRing: Phaser.GameObjects.Arc;
  guardReachRing: Phaser.GameObjects.Arc;
};

type SlotVisual = {
  nameText: Phaser.GameObjects.Text;
  stateText: Phaser.GameObjects.Text;
  hpFill: Phaser.GameObjects.Rectangle;
};

type AutoHuntButtonVisual = {
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

type SkillButtonVisual = {
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  skillId: UnitSkillId;
};

type SkillPanelVisual = {
  background: Phaser.GameObjects.Rectangle;
  ownerText: Phaser.GameObjects.Text;
  buttons: Map<UnitSkillId, SkillButtonVisual>;
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
  private combatTimeMs = 0;
  private autoHuntEnabled = false;
  private sourceWorldMonsterId = "unknown-monster";
  private enemyDefinitionId = "slime-1";
  private enemyDisplayName = "Slime 1";
  private enemyColor = 0xe67e91;
  private goldReward = 0;
  private autoRepeatBattle = false;
  private experienceReward = 0;
  private battleEndExperienceGranted = false;
  private directExperienceTotal = 0;
  private bonusExperienceTotal = 0;
  private readonly directExperienceByRosterUnitId = new Map<string, number>();
  private readonly bonusExperienceByRosterUnitId = new Map<string, number>();
  private lootItems: RTSBattleResult["loot"] = [];
  private readonly units = new Map<string, RTSBattleUnit>();
  private readonly unitVisuals = new Map<string, UnitVisual>();
  private readonly slotVisuals = new Map<number, SlotVisual>();
  private readonly selectedUnitIds = new Set<string>();
  private keyBindingState: KeyBindingState = createDefaultKeyBindingState();
  private controlGroups: ControlGroupMap = createEmptyControlGroups();
  private readonly attackLogs: string[] = [];
  private arena!: Phaser.GameObjects.Rectangle;
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private selectedInfoText!: Phaser.GameObjects.Text;
  private skillPanel!: SkillPanelVisual;
  private outcomeText!: Phaser.GameObjects.Text;
  private attackLogText!: Phaser.GameObjects.Text;
  private autoHuntButton!: AutoHuntButtonVisual;
  private readonly controlGroupTexts = new Map<ControlGroupIndex, Phaser.GameObjects.Text>();
  private readonly allyBySlot = new Map<number, RTSBattleUnit>();
  private readonly delayedEvents = new Set<Phaser.Time.TimerEvent>();
  private dragStart: PointerPosition | null = null;
  private dragEnd: PointerPosition | null = null;
  private isDragging = false;
  private suppressArenaPointer = false;
  private uiDirty = true;
  private uiElapsedMs = 100;
  private visualStateDirty = true;
  private uiUpdateCount = 0;

  private readonly handleBattleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || event.shiftKey) {
      return;
    }

    if (event.ctrlKey && !event.altKey && !event.metaKey) {
      const groupIndex = findControlGroupIndexByCode(this.keyBindingState, event.code);
      if (groupIndex !== null) {
        event.preventDefault();
        event.stopPropagation();
        this.saveCurrentSelectionToGroup(groupIndex);
      }
      return;
    }

    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const groupIndex = findControlGroupIndexByCode(this.keyBindingState, event.code);
    if (groupIndex !== null) {
      event.preventDefault();
      event.stopPropagation();
      this.recallGroup(groupIndex);
      return;
    }

    const skillId = event.code === this.keyBindingState.whirlwindCode
      ? "whirlwind"
      : event.code === this.keyBindingState.firstAidCode
      ? "first-aid"
      : null;
    if (skillId) {
      event.preventDefault();
      event.stopPropagation();
      this.useSelectedSkill(skillId);
    }
  };

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
    repairRuntimeStateAtBoundary(this.game.registry);
    this.resetBattle(data);
    this.drawBackground();
    this.addHeader();
    this.addArenaInteraction();
    this.addBattleUnits();
    this.addSelectionUi();
    this.addBottomUi();
    this.markVisualStateDirty();
    this.refreshAllVisuals();
    this.updateUi();

    if (this.dataError) {
      this.outcomeText.setText(["BATTLE DATA ERROR", this.dataError, "Return to Field to continue."]);
      recordRuntimeError("BattleScene", new Error(this.dataError), false, this.game.registry);
      this.scene.launch("RecoveryScene", { message: this.dataError });
    } else if (this.getAliveUnits("ENEMY").length === 0) {
      this.commitResult("VICTORY");
    }

    this.input.keyboard?.on("keydown", this.handleBattleKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupInput, this);
  }

  public update(_time: number, delta: number): void {
    if (this.dataError) {
      this.updateUiIfDue(0);
      return;
    }

    if (this.combatState !== "RUNNING") {
      this.refreshAllVisuals();
      this.updateUiIfDue(delta);
      return;
    }

    const safeDelta = Number.isFinite(delta)
      ? Math.min(Math.max(delta, 0), RTS_MAX_COMBAT_DELTA_MS)
      : 0;
    this.combatTimeMs += safeDelta;
    for (const ally of this.getAliveUnits("ALLY")) {
      this.normalizeCompletedMoveCommand(ally);
    }
    this.updateAllies(safeDelta);
    if (this.combatState === "RUNNING") {
      this.updateEnemies(safeDelta);
    }
    if (this.combatState === "RUNNING") {
      separateNearbyUnits(this.units.values());
      this.checkBattleOutcome();
    }
    this.refreshAllVisuals();
    this.updateUiIfDue(safeDelta);
  }

  public getManagedTimerCount(): number {
    return this.delayedEvents.size;
  }

  public getDiagnosticsSnapshot(): { uiUpdates: number; managedTimers: number } {
    return { uiUpdates: this.uiUpdateCount, managedTimers: this.getManagedTimerCount() };
  }

  private updateUiIfDue(deltaMs: number): void {
    this.uiElapsedMs += Math.max(0, deltaMs);
    if (this.uiDirty || this.uiElapsedMs >= 100) this.updateUi();
  }

  private resetBattle(data: unknown): void {
    repairRuntimeStateAtBoundary(this.game.registry);
    this.returnStarted = false;
    this.combatState = "RUNNING";
    this.resultCommitted = false;
    this.dataError = null;
    this.combatTimeMs = 0;
    this.keyBindingState = getOrCreateKeyBindingState(this.game.registry);
    const formation = getOrCreateFormationState(this.game.registry);
    const ownedRosterUnitIds = new Set(formation.ownedUnits.map((unit) => unit.rosterUnitId));
    const persistentControlGroups = getOrCreatePersistentControlGroupState(this.game.registry, ownedRosterUnitIds);
    this.controlGroups = persistentStateToControlGroupMap(persistentControlGroups);
    this.controlGroupTexts.clear();
    const storedAutoHunt = this.game.registry.get(AUTO_HUNT_REGISTRY_KEY);
    this.autoHuntEnabled = storedAutoHunt === true;
    if (storedAutoHunt === undefined) {
      this.game.registry.set(AUTO_HUNT_REGISTRY_KEY, false);
    }
    this.sourceWorldMonsterId = "unknown-monster";
    this.enemyDefinitionId = "unknown-enemy";
    this.enemyDisplayName = "Unknown enemy";
    this.enemyColor = 0x64748b;
    this.goldReward = 0;
    this.autoRepeatBattle = false;
    this.experienceReward = 0;
    this.battleEndExperienceGranted = false;
    this.directExperienceTotal = 0;
    this.bonusExperienceTotal = 0;
    this.directExperienceByRosterUnitId.clear();
    this.bonusExperienceByRosterUnitId.clear();
    this.lootItems = [];
    this.units.clear();
    this.unitVisuals.clear();
    this.slotVisuals.clear();
    this.selectedUnitIds.clear();
    this.markVisualStateDirty();
    this.attackLogs.length = 0;
    this.dragStart = null;
    this.dragEnd = null;
    this.isDragging = false;
    this.suppressArenaPointer = false;

    if (!this.isRTSBattleSceneData(data)) {
      this.dataError = "The battle payload is invalid.";
      recordFatalRuntimeStateIssue(this.game.registry, "battle.payload.invalid", "battleData", this.dataError);
      return;
    }

    const enemyDefinition = getEnemyDefinition(data.sourceWorldMonsterId);
    if (!enemyDefinition) {
      this.dataError = `Unknown world monster: ${data.sourceWorldMonsterId}`;
      recordFatalRuntimeStateIssue(this.game.registry, "battle.enemy.invalid", "battleData.sourceWorldMonsterId", this.dataError);
      return;
    }

    this.sourceWorldMonsterId = data.sourceWorldMonsterId;
    this.enemyDefinitionId = enemyDefinition.id;
    this.enemyDisplayName = enemyDefinition.name;
    this.enemyColor = enemyDefinition.color;
    this.goldReward = this.sanitizeGold(enemyDefinition.goldReward);
    this.experienceReward = this.sanitizeExperience(enemyDefinition.experienceReward);
    this.autoRepeatBattle = data.autoRepeatBattle === true;

    const roster = [...data.allyRoster].sort((first, second) => first.slotIndex - second.slotIndex);
    const invalidAlly = roster.find((entry) => {
      const definition = getAllyUnitDefinition(entry.unitDefinitionId);
      return !definition || definition.unitRole !== entry.unitRole;
    });
    if (invalidAlly) {
      this.dataError = `Invalid ally definition: ${invalidAlly.unitDefinitionId}`;
      recordFatalRuntimeStateIssue(this.game.registry, "battle.ally.invalid", "battleData.allyRoster", this.dataError);
      return;
    }

    const allyPositions = createFormationDestinations({ x: GAME_WIDTH / 2, y: 338 }, RTS_ALLY_COUNT);
    roster.forEach((entry) => {
      const ally = this.createAllyUnit(entry, allyPositions[entry.slotIndex]);
      if (ally) {
        this.units.set(entry.rosterUnitId, ally);
      }
    });

    if (this.units.size !== roster.length) {
      this.dataError = "The ally roster contains invalid unit definitions.";
      recordFatalRuntimeStateIssue(this.game.registry, "battle.roster.invalid", "battleData.allyRoster", this.dataError);
      this.units.clear();
      return;
    }

    const enemyPositions = createFormationDestinations({ x: GAME_WIDTH / 2, y: 138 }, RTS_ENEMY_COUNT);
    createEnemyIds(this.enemyDefinitionId, RTS_ENEMY_COUNT).forEach((battleUnitId, index) => {
      this.units.set(battleUnitId, this.createEnemyUnit(battleUnitId, enemyPositions[index], enemyDefinition));
    });

    if (this.autoHuntEnabled) {
      this.activateAutoHuntForIdleAllies();
    }
  }

  private createAllyUnit(entry: RosterEntry, position: BattlePosition): RTSBattleUnit | null {
    const definition = getAllyUnitDefinition(entry.unitDefinitionId);
    if (!definition || definition.unitRole !== entry.unitRole) {
      return null;
    }

    const progression = normalizeProgressionState(entry);
    const equipmentModifiers = getEquippedModifierTotals(
      getOrCreateInventoryState(this.game.registry),
      entry.rosterUnitId,
    );
    const stats = calculateFinalUnitStats(
      definition.maxHp,
      definition.attackDamage,
      definition.defense,
      progression.level,
      equipmentModifiers,
    );
    return {
      battleUnitId: entry.rosterUnitId,
      rosterUnitId: entry.rosterUnitId,
      team: "ALLY",
      unitRole: entry.unitRole,
      definitionId: entry.unitDefinitionId,
      displayName: entry.displayName,
      color: definition.color,
      sourceWorldMonsterId: null,
      currentHp: stats.maxHp,
      maxHp: stats.maxHp,
      baseMaxHp: definition.maxHp,
      attackDamage: stats.attackDamage,
      baseAttackDamage: definition.attackDamage,
      defense: stats.defense,
      baseDefense: definition.defense,
      level: progression.level,
      experience: progression.experience,
      attackIntervalMs: definition.attackIntervalMs,
      attackElapsedMs: 0,
      moveSpeed: definition.moveSpeed,
      attackRange: definition.attackRange,
      collisionRadius: definition.collisionRadius,
      position,
      guardPosition: { x: position.x, y: position.y },
      state: "IDLE",
      currentTargetId: null,
      moveDestination: null,
      commandMode: "NONE",
      commandDestination: null,
      lastAttackerId: null,
      lastAttackedAt: 0,
      isAlive: true,
      experienceRewardGranted: false,
      dropRollCompleted: false,
      slotIndex: entry.slotIndex,
      skills: [...definition.skills],
      skillReadyAtMs: {},
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
      color: this.enemyColor,
      sourceWorldMonsterId: this.sourceWorldMonsterId,
      currentHp: enemyDefinition.maxHp,
      maxHp: enemyDefinition.maxHp,
      baseMaxHp: enemyDefinition.maxHp,
      attackDamage: enemyDefinition.attackDamage,
      baseAttackDamage: enemyDefinition.attackDamage,
      defense: enemyDefinition.defense,
      baseDefense: enemyDefinition.defense,
      level: 1,
      experience: 0,
      attackIntervalMs: enemyDefinition.attackIntervalMs,
      attackElapsedMs: 0,
      moveSpeed: enemyDefinition.moveSpeed,
      attackRange: enemyDefinition.attackRange,
      collisionRadius: enemyDefinition.collisionRadius,
      position,
      guardPosition: { x: position.x, y: position.y },
      state: "IDLE",
      currentTargetId: null,
      moveDestination: null,
      commandMode: "NONE",
      commandDestination: null,
      lastAttackerId: null,
      lastAttackedAt: 0,
      isAlive: true,
      experienceRewardGranted: false,
      dropRollCompleted: false,
      slotIndex: null,
      skills: [],
      skillReadyAtMs: {},
    };
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);
    this.add.rectangle(GAME_WIDTH / 2, 235, 920, 340, 0x1f2937, 1);
    this.add.rectangle(GAME_WIDTH / 2, 438, 920, 92, 0x172033, 1);
    this.add.line(0, 0, 22, 420, 938, 420, 0x6ec6a7, 0.65).setOrigin(0);
  }

  private addHeader(): void {
    this.add.text(32, 12, "Stage 17: Online Expansion Readiness", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(34, 43, `Enemy: ${this.enemyDisplayName} x10`, {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "12px",
    });
    this.add.text(34, 57, "Earn EXP, collect loot, and grow stronger with equipment.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
    });
    this.add.text(280, 43, `Ctrl+${getKeyCodeLabel(this.keyBindingState.controlGroupCodes[0])} save · ${getKeyCodeLabel(this.keyBindingState.controlGroupCodes[0])} recall`, {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
    });
    this.add.text(280, 57, `Whirlwind: ${getKeyCodeLabel(this.keyBindingState.whirlwindCode)} · First Aid: ${getKeyCodeLabel(this.keyBindingState.firstAidCode)}`, {
      color: "#e9ddff",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
    });
    const autoHuntBackground = this.add.rectangle(500, 28, 150, 28, 0x26394b, 1)
      .setStrokeStyle(1, 0x54748a, 1);
    autoHuntBackground.setInteractive({ useHandCursor: true });
    autoHuntBackground.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      this.setAutoHuntEnabled(!this.autoHuntEnabled);
    });
    this.autoHuntButton = {
      background: autoHuntBackground,
      label: this.add.text(500, 28, "", {
        color: "#d9e8f2",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
      }).setOrigin(0.5),
    };
    this.statusText = this.add.text(730, 14, "", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "15px",
      fontStyle: "bold",
      align: "right",
    }).setOrigin(1, 0);
  }

  private setAutoHuntEnabled(enabled: boolean): void {
    if (this.dataError || this.combatState !== "RUNNING") {
      return;
    }

    this.autoHuntEnabled = enabled;
    this.markVisualStateDirty();
    this.game.registry.set(AUTO_HUNT_REGISTRY_KEY, enabled);
    if (!enabled && this.autoRepeatBattle) {
      setAutoRepeatEnabled(this.game.registry, false);
      this.addAttackLog("Repeat Hunt stopped because Battle Auto Hunt was disabled.");
    }
    this.addAttackLog(enabled ? "Auto Hunt enabled." : "Auto Hunt disabled.");

    if (enabled) {
      this.activateAutoHuntForIdleAllies();
    } else {
      for (const unit of this.units.values()) {
        if (unit.team !== "ALLY" || !unit.isAlive || unit.commandMode !== "AUTO_HUNT") {
          continue;
        }

        const currentPosition = constrainToArena(unit.position, unit.collisionRadius);
        unit.guardPosition = { x: currentPosition.x, y: currentPosition.y };
        unit.currentTargetId = null;
        unit.moveDestination = null;
        unit.commandDestination = null;
        unit.attackElapsedMs = 0;
        unit.lastAttackerId = null;
        unit.lastAttackedAt = 0;
        unit.commandMode = "NONE";
        unit.state = "IDLE";
      }
    }

    this.updateUi();
  }

  private activateAutoHuntForIdleAllies(): void {
    for (const unit of this.units.values()) {
      if (unit.team === "ALLY" && unit.isAlive && unit.commandMode === "NONE") {
        unit.commandMode = "AUTO_HUNT";
      }
    }
  }

  private updateAutoHuntUi(): void {
    const color = this.autoHuntEnabled ? 0x3b9b6f : 0x26394b;
    const stroke = this.autoHuntEnabled ? 0x9ce4b0 : 0x54748a;
    const label = `Auto Hunt: ${this.autoHuntEnabled ? "ON" : "OFF"}`;
    if (this.autoHuntButton?.label.text !== label) {
      this.autoHuntButton?.background.setFillStyle(color, 1).setStrokeStyle(1, stroke, 1);
      this.autoHuntButton?.label.setText(label);
    }
  }

  private getSingleSelectedSkillOwner(): RTSBattleUnit | null {
    if (this.dataError || this.combatState !== "RUNNING") {
      return null;
    }

    const selected = this.getSelectedAliveAllies();
    if (selected.length !== 1) {
      return null;
    }

    const unit = selected[0];
    return this.units.get(unit.battleUnitId) === unit && unit.skills.length > 0 ? unit : null;
  }

  private getSkillCooldownRemainingMs(unit: RTSBattleUnit, skillId: UnitSkillId): number {
    return Math.max(0, (unit.skillReadyAtMs[skillId] ?? 0) - this.combatTimeMs);
  }

  private updateSkillUi(): void {
    const owner = this.getSingleSelectedSkillOwner();
    if (!owner) {
      this.hideSkillUi();
      return;
    }

    this.skillPanel.background.setVisible(true);
    this.skillPanel.ownerText.setText(`${owner.displayName} Skills`).setVisible(true);
    for (const skillId of ["whirlwind", "first-aid"] as const) {
      const button = this.skillPanel.buttons.get(skillId);
      const definition = getUnitSkillDefinition(skillId);
      if (!button || !definition || !owner.skills.includes(skillId)) {
        button?.background.disableInteractive().setVisible(false);
        button?.label.setVisible(false);
        continue;
      }

      const remainingMs = this.getSkillCooldownRemainingMs(owner, skillId);
      const fullHp = skillId === "first-aid" && owner.currentHp >= owner.maxHp;
      const status = remainingMs > 0
        ? `${(Math.ceil(remainingMs / 100) / 10).toFixed(1)}s`
        : fullHp
        ? "FULL HP"
        : "READY";
      const enabled = remainingMs <= 0 && !fullHp;
      button.background
        .setFillStyle(enabled ? 0x4b3670 : 0x293044, 1)
        .setStrokeStyle(1, enabled ? 0xa78bfa : 0x536078, 1)
        .setVisible(true);
      const keyLabel = skillId === "whirlwind"
        ? getKeyCodeLabel(this.keyBindingState.whirlwindCode)
        : getKeyCodeLabel(this.keyBindingState.firstAidCode);
      button.label.setText(`[${keyLabel}] ${definition.name} · ${status}`).setVisible(true);
      if (enabled) {
        button.background.setInteractive({ useHandCursor: true });
      } else {
        button.background.disableInteractive();
      }
    }
  }

  private hideSkillUi(): void {
    this.skillPanel?.background.setVisible(false);
    this.skillPanel?.ownerText.setVisible(false);
    this.skillPanel?.buttons.forEach((button) => {
      button.background.disableInteractive().setVisible(false);
      button.label.setVisible(false);
    });
  }

  private useSelectedSkill(skillId: UnitSkillId): void {
    const caster = this.getSingleSelectedSkillOwner();
    const definition = getUnitSkillDefinition(skillId);
    if (!caster || !definition || !caster.skills.includes(skillId) ||
      this.getSkillCooldownRemainingMs(caster, skillId) > 0) {
      return;
    }

    if (definition.effectType === "SELF_HEAL") {
      const actualHeal = Math.min(definition.healAmount, caster.maxHp - caster.currentHp);
      if (actualHeal <= 0) {
        this.addAttackLog(`${caster.displayName} is already at full HP.`);
        this.updateUi();
        return;
      }

      caster.currentHp += actualHeal;
      caster.skillReadyAtMs[skillId] = this.combatTimeMs + definition.cooldownMs;
      this.addAttackLog(`${caster.displayName} restored ${actualHeal} HP with First Aid.`);
      this.showSkillEffect(caster.position, caster.collisionRadius + 16, 0x86efac);
      this.updateUi();
      return;
    }

    const targets = this.getAliveUnits("ENEMY").filter((enemy) => {
      const distance = distanceBetween(caster.position, enemy.position);
      return Number.isFinite(distance) && distance <= definition.effectRadius + enemy.collisionRadius;
    });
    let hitCount = 0;
    let defeatedCount = 0;
    for (const target of targets) {
      const wasAlive = target.isAlive;
      if (this.applySkillDamage(caster, target, definition.damage, definition.name)) {
        hitCount += 1;
        if (wasAlive && !target.isAlive) {
          defeatedCount += 1;
        }
      }
    }

    if (hitCount === 0) {
      this.addAttackLog("No enemies in Whirlwind range.");
      this.updateUi();
      return;
    }

    caster.skillReadyAtMs[skillId] = this.combatTimeMs + definition.cooldownMs;
    this.addAttackLog(
      defeatedCount > 0
        ? `Whirlwind hit ${hitCount} enemies and defeated ${defeatedCount}.`
        : `Whirlwind hit ${hitCount} enemies for ${definition.damage} damage.`,
    );
    this.showSkillEffect(caster.position, definition.effectRadius, 0xc4b5fd);
    this.checkBattleOutcome();
    this.updateUi();
  }

  private applySkillDamage(
    caster: RTSBattleUnit,
    target: RTSBattleUnit,
    damage: number,
    _skillName: string,
  ): boolean {
    if (
      this.combatState !== "RUNNING" ||
      !caster.isAlive ||
      caster.team !== "ALLY" ||
      !target.isAlive ||
      target.team !== "ENEMY" ||
      this.units.get(target.battleUnitId) !== target ||
      !Number.isFinite(damage) ||
      damage <= 0
    ) {
      return false;
    }

    target.currentHp = Math.max(0, target.currentHp - calculatePhysicalDamage(damage, target.defense));
    if (target.currentHp === 0) {
      this.markUnitDead(target, caster);
    }
    return true;
  }

  private showSkillEffect(position: BattlePosition, radius: number, color: number): void {
    const effect = this.add.arc(position.x, position.y, radius, 0, 360, false, color, 0.08)
      .setStrokeStyle(2, color, 0.55);
    this.scheduleDelayed(240, () => effect.destroy());
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
      const color = unit.team === "ALLY" ? unit.color : this.enemyColor;
      const container = this.add.container(unit.position.x, unit.position.y);
      const guardReachRing = this.add.arc(
        unit.guardPosition.x,
        unit.guardPosition.y,
        RTS_GUARD_AGGRO_RANGE,
        0,
        360,
        false,
        0xf59e0b,
        0,
      );
      guardReachRing.setStrokeStyle(1, 0xf59e0b, 0.2).setVisible(false);
      const attackReachRing = this.add.arc(0, 0, radius + unit.attackRange, 0, 360, false, 0x67e8f9, 0);
      attackReachRing.setStrokeStyle(1, 0x67e8f9, 0.42).setVisible(false);
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
      container.add([attackReachRing, selectionRing, body, banner, ...eyes, label, healthBack, healthFill]);
      const interactionZone = this.add.zone(unit.position.x, unit.position.y, radius * 2 + 12, radius * 2 + 12);
      interactionZone.setInteractive({ useHandCursor: true });
      interactionZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handleUnitPointerDown(unit.battleUnitId, pointer));
      this.unitVisuals.set(unit.battleUnitId, {
        container,
        interactionZone,
        healthFill,
        selectionRing,
        attackReachRing,
        guardReachRing,
      });
    }
  }

  private addSelectionUi(): void {
    this.selectionGraphics = this.add.graphics();
    this.selectedInfoText = this.add.text(260, 407, "", {
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
    this.addSkillPanelUi();
    this.addControlGroupUi();
  }

  private addControlGroupUi(): void {
    this.add.rectangle(265, 441, 474, 38, 0x172033, 0.72)
      .setStrokeStyle(1, 0x54748a, 1)
      .setDepth(4);

    for (let index = 0; index < RTS_ALLY_COUNT; index += 1) {
      const groupIndex = index as ControlGroupIndex;
      const column = index % 5;
      const row = Math.floor(index / 5);
      const text = this.add.text(40 + column * 92, 432 + row * 16, "", {
        color: "#b9cad7",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
      }).setDepth(5);
      this.controlGroupTexts.set(groupIndex, text);
    }
  }

  private addSkillPanelUi(): void {
    const background = this.add.rectangle(720, 438, 380, 48, 0x172033, 0.96)
      .setStrokeStyle(1, 0x7c5bb8, 1)
      .setVisible(false);
    const ownerText = this.add.text(535, 416, "", {
      color: "#e9ddff",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    }).setVisible(false);
    const buttons = new Map<UnitSkillId, SkillButtonVisual>();
    ([
      { skillId: "whirlwind" as const, x: 680 },
      { skillId: "first-aid" as const, x: 820 },
    ]).forEach(({ skillId, x }) => {
      const buttonBackground = this.add.rectangle(x, 443, 126, 25, 0x4b3670, 1)
        .setStrokeStyle(1, 0xa78bfa, 1)
        .setVisible(false);
      buttonBackground.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          this.useSelectedSkill(skillId);
        }
      });
      const label = this.add.text(x, 443, "", {
        color: "#f4efff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      }).setOrigin(0.5).setVisible(false);
      buttons.set(skillId, { background: buttonBackground, label, skillId });
    });
    this.skillPanel = { background, ownerText, buttons };
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

      this.normalizeCompletedMoveCommand(unit);
      if (this.isActiveMoveCommand(unit)) {
        this.updateUnitOnMoveCommand(unit, deltaMs);
        if (this.isActiveMoveCommand(unit)) {
          continue;
        }
      }

      const hadTarget = Boolean(unit.currentTargetId);
      let currentTarget = this.getAliveEnemy(unit.currentTargetId);
      let targetLost = false;
      if (currentTarget && unit.commandMode === "LOCAL_ENGAGE" && !this.isTargetWithinGuardLeash(unit, currentTarget)) {
        targetLost = true;
        unit.currentTargetId = null;
        unit.attackElapsedMs = 0;
        unit.commandMode = this.autoHuntEnabled ? "AUTO_HUNT" : "LOCAL_ENGAGE";
        unit.state = "IDLE";
        currentTarget = null;
      }
      if (!currentTarget && unit.commandMode === "FOCUS_ATTACK") {
        unit.commandMode = this.autoHuntEnabled ? "AUTO_HUNT" : "LOCAL_ENGAGE";
      }
      if (unit.currentTargetId && !currentTarget) {
        targetLost = true;
        unit.currentTargetId = null;
        unit.attackElapsedMs = 0;
        if (unit.commandMode === "FOCUS_ATTACK") {
          unit.commandMode = this.autoHuntEnabled ? "AUTO_HUNT" : "LOCAL_ENGAGE";
        }
        if (unit.commandMode === "ATTACK_MOVE" && unit.commandDestination) {
          unit.moveDestination = unit.commandDestination;
        }
      }

      if (currentTarget) {
        this.updateUnitAgainstTarget(unit, currentTarget, deltaMs);
        continue;
      }

      const nextTarget = this.chooseAllyTarget(unit, targetLost && hadTarget);
      if (nextTarget) {
        if (unit.commandMode === "NONE" || unit.commandMode === "LOCAL_ENGAGE") {
          unit.commandMode = "LOCAL_ENGAGE";
        }
        this.assignAllyTarget(unit, nextTarget);
        this.updateUnitAgainstTarget(unit, nextTarget, deltaMs);
        continue;
      }

      if (unit.commandMode === "ATTACK_MOVE" && unit.commandDestination) {
        unit.state = "MOVING";
        if (moveToward(unit, unit.commandDestination, deltaMs)) {
          this.finishMoveCommand(unit, false);
        }
      } else {
        unit.moveDestination = null;
        unit.commandDestination = null;
        if (unit.commandMode === "LOCAL_ENGAGE") {
          unit.commandMode = this.autoHuntEnabled ? "AUTO_HUNT" : "NONE";
        }
        unit.state = "IDLE";
      }
    }
  }

  private isActiveMoveCommand(unit: RTSBattleUnit): boolean {
    if (unit.commandMode !== "MOVE" || !unit.commandDestination) {
      return false;
    }

    const { x, y } = unit.commandDestination;
    if (!Number.isFinite(x) || !Number.isFinite(y) ||
      !Number.isFinite(unit.position.x) || !Number.isFinite(unit.position.y)) {
      return false;
    }

    return distanceBetween(unit.position, unit.commandDestination) > RTS_MOVE_ARRIVAL_EPSILON;
  }

  private normalizeCompletedMoveCommand(unit: RTSBattleUnit): void {
    if (unit.commandMode === "MOVE" && !this.isActiveMoveCommand(unit)) {
      const destination = unit.commandDestination;
      const arrived = Boolean(
        destination &&
        Number.isFinite(destination.x) &&
        Number.isFinite(destination.y) &&
        Number.isFinite(unit.position.x) &&
        Number.isFinite(unit.position.y) &&
        distanceBetween(unit.position, destination) <= RTS_MOVE_ARRIVAL_EPSILON,
      );
      this.finishMoveCommand(unit, arrived);
    }
  }

  private updateUnitOnMoveCommand(unit: RTSBattleUnit, deltaMs: number): void {
    if (!this.isActiveMoveCommand(unit)) {
      this.normalizeCompletedMoveCommand(unit);
      return;
    }

    const destination = unit.commandDestination;
    if (!destination) {
      this.finishMoveCommand(unit, false);
      return;
    }
    unit.currentTargetId = null;
    unit.attackElapsedMs = 0;
    unit.state = "MOVING";
    unit.moveDestination = destination;
    if (moveToward(unit, destination, deltaMs)) {
      this.finishMoveCommand(unit, true);
    }
  }

  private finishMoveCommand(unit: RTSBattleUnit, updateGuardPosition: boolean): void {
    if (updateGuardPosition && Number.isFinite(unit.position.x) && Number.isFinite(unit.position.y)) {
      const arrivedPosition = constrainToArena(unit.position, unit.collisionRadius);
      unit.position = arrivedPosition;
      unit.guardPosition = { x: arrivedPosition.x, y: arrivedPosition.y };
    }
    unit.moveDestination = null;
    unit.commandDestination = null;
    unit.currentTargetId = null;
    unit.attackElapsedMs = 0;
    unit.commandMode = this.autoHuntEnabled ? "AUTO_HUNT" : "NONE";
    unit.lastAttackerId = null;
    unit.lastAttackedAt = 0;
    unit.state = "IDLE";
  }

  private getAliveEnemy(unitId: string | null): RTSBattleUnit | null {
    if (!unitId) {
      return null;
    }

    const unit = this.units.get(unitId);
    return unit?.isAlive && unit.team === "ENEMY" ? unit : null;
  }

  private chooseAllyTarget(unit: RTSBattleUnit, targetLost: boolean): RTSBattleUnit | null {
    if (unit.commandMode === "FOCUS_ATTACK") {
      return null;
    }

    if (unit.commandMode === "AUTO_HUNT") {
      return this.findPreferredEnemyTarget(unit);
    }

    const retaliationTarget = this.getRetaliationTarget(unit);
    if (retaliationTarget) {
      return retaliationTarget;
    }

    if (unit.commandMode === "ATTACK_MOVE") {
      return this.findPreferredEnemyTarget(unit, RTS_GUARD_LEASH_RANGE);
    }

    if (targetLost || unit.commandMode === "LOCAL_ENGAGE") {
      return this.findGuardAggroTarget(unit, RTS_GUARD_LEASH_RANGE);
    }

    if (unit.commandMode === "NONE") {
      return this.findGuardAggroTarget(unit, RTS_GUARD_AGGRO_RANGE);
    }

    return null;
  }

  private getRetaliationTarget(unit: RTSBattleUnit): RTSBattleUnit | null {
    if (!unit.lastAttackerId ||
      this.combatTimeMs - unit.lastAttackedAt > RTS_RETALIATION_MEMORY_MS) {
      return null;
    }

    const attacker = this.getAliveEnemy(unit.lastAttackerId);
    if (!attacker || !this.isTargetWithinGuardLeash(unit, attacker)) {
      return null;
    }

    return attacker;
  }

  private findPreferredEnemyTarget(
    unit: RTSBattleUnit,
    maxDistance = Number.POSITIVE_INFINITY,
  ): RTSBattleUnit | null {
    const targetCounts = new Map<string, number>();
    for (const ally of this.getAliveUnits("ALLY")) {
      if (ally.currentTargetId && this.getAliveEnemy(ally.currentTargetId)) {
        targetCounts.set(ally.currentTargetId, (targetCounts.get(ally.currentTargetId) ?? 0) + 1);
      }
    }

    const candidates = this.getAliveUnits("ENEMY")
      .map((candidate) => ({
        candidate,
        distance: distanceBetween(unit.position, candidate.position),
        assignedCount: targetCounts.get(candidate.battleUnitId) ?? 0,
      }))
      .filter(({ distance }) => Number.isFinite(distance) && distance <= maxDistance)
      .sort((first, second) => (
        first.assignedCount - second.assignedCount ||
        first.distance - second.distance ||
        first.candidate.battleUnitId.localeCompare(second.candidate.battleUnitId)
      ));

    return candidates[0]?.candidate ?? null;
  }

  private findGuardAggroTarget(
    unit: RTSBattleUnit,
    maxGuardDistance: number = RTS_GUARD_AGGRO_RANGE,
  ): RTSBattleUnit | null {
    if (
      !unit.isAlive ||
      unit.team !== "ALLY" ||
      !Number.isFinite(maxGuardDistance) ||
      maxGuardDistance < 0 ||
      !Number.isFinite(unit.guardPosition.x) ||
      !Number.isFinite(unit.guardPosition.y)
    ) {
      return null;
    }

    const targetCounts = new Map<string, number>();
    for (const ally of this.getAliveUnits("ALLY")) {
      if (ally.currentTargetId && this.getAliveEnemy(ally.currentTargetId)) {
        targetCounts.set(ally.currentTargetId, (targetCounts.get(ally.currentTargetId) ?? 0) + 1);
      }
    }

    return this.getAliveUnits("ENEMY")
      .map((enemy) => ({
        enemy,
        currentDistance: distanceBetween(unit.position, enemy.position),
        assignedCount: targetCounts.get(enemy.battleUnitId) ?? 0,
      }))
      .filter(({ enemy, currentDistance }) => (
        this.units.get(enemy.battleUnitId) === enemy &&
        isWithinDistanceFromAnchor(unit.guardPosition, enemy.position, maxGuardDistance) &&
        Number.isFinite(currentDistance)
      ))
      .sort((first, second) => (
        first.assignedCount - second.assignedCount ||
        first.currentDistance - second.currentDistance ||
        first.enemy.battleUnitId.localeCompare(second.enemy.battleUnitId)
      ))[0]?.enemy ?? null;
  }

  private isTargetWithinGuardLeash(unit: RTSBattleUnit, target: RTSBattleUnit): boolean {
    return isWithinDistanceFromAnchor(unit.guardPosition, target.position, RTS_GUARD_LEASH_RANGE);
  }

  private assignAllyTarget(unit: RTSBattleUnit, target: RTSBattleUnit): void {
    if (!unit.isAlive || unit.team !== "ALLY" || !target.isAlive || target.team !== "ENEMY") {
      return;
    }

    unit.currentTargetId = target.battleUnitId;
    unit.moveDestination = null;
    unit.attackElapsedMs = 0;
    unit.state = "CHASING";
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
    const attackDistance = requiredAttackDistance(unit, target);
    if (distance > attackDistance) {
      unit.state = "CHASING";
      unit.attackElapsedMs = 0;
      moveToward(unit, this.getAttackApproachPosition(unit, target, attackDistance), deltaMs);
      return;
    }

    unit.state = "ATTACKING";
    unit.attackElapsedMs += deltaMs;
    if (unit.attackElapsedMs >= unit.attackIntervalMs) {
      unit.attackElapsedMs = 0;
      this.applyDamage(unit, target);
    }
  }

  private getAttackApproachPosition(
    attacker: RTSBattleUnit,
    target: RTSBattleUnit,
    requiredDistance: number,
  ): BattlePosition {
    const targetPosition = constrainToArena(target.position, target.collisionRadius);
    const attackerPosition = constrainToArena(attacker.position, attacker.collisionRadius);
    const deltaX = targetPosition.x - attackerPosition.x;
    const deltaY = targetPosition.y - attackerPosition.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (!Number.isFinite(distance) || distance <= 0) {
      return targetPosition;
    }

    const safeDistance = Number.isFinite(requiredDistance) ? Math.max(0, requiredDistance) : 0;
    return constrainToArena({
      x: targetPosition.x - (deltaX / distance) * safeDistance,
      y: targetPosition.y - (deltaY / distance) * safeDistance,
    }, attacker.collisionRadius);
  }

  private markUnitDead(unit: RTSBattleUnit, killer: RTSBattleUnit | null = null): void {
    if (!unit.isAlive) {
      return;
    }

    if (unit.team === "ENEMY" && !unit.experienceRewardGranted) {
      unit.experienceRewardGranted = true;
      this.grantDirectExperience(killer);
    }
    if (unit.team === "ENEMY" && !unit.dropRollCompleted) {
      unit.dropRollCompleted = true;
      this.rollEnemyDrops(unit);
    }
    unit.currentHp = 0;
    unit.isAlive = false;
    unit.state = "DEAD";
    unit.currentTargetId = null;
    unit.moveDestination = null;
    unit.commandDestination = null;
    unit.attackElapsedMs = 0;
    this.selectedUnitIds.delete(unit.battleUnitId);
    this.markVisualStateDirty();
    this.unitVisuals.get(unit.battleUnitId)?.interactionZone.disableInteractive();
  }

  private grantDirectExperience(killer: RTSBattleUnit | null): void {
    if (!killer || killer.team !== "ALLY" || !killer.isAlive || !killer.rosterUnitId ||
      this.units.get(killer.battleUnitId) !== killer || !Number.isSafeInteger(this.experienceReward) ||
      this.experienceReward <= 0) {
      return;
    }

    const result = this.grantExperienceToUnit(killer, this.experienceReward, "DIRECT");
    if (!result) {
      return;
    }

    this.directExperienceTotal += this.experienceReward;
    this.directExperienceByRosterUnitId.set(
      killer.rosterUnitId,
      (this.directExperienceByRosterUnitId.get(killer.rosterUnitId) ?? 0) + this.experienceReward,
    );
    this.addAttackLog(`${killer.displayName} gained +${this.experienceReward} EXP.`);
    if (result.levelsGained > 0) {
      this.addAttackLog(`${killer.displayName} LEVEL UP! Lv.${result.next.level}`);
    }
  }

  private grantExperienceToUnit(
    unit: RTSBattleUnit,
    amount: number,
    _source: "DIRECT" | "BONUS",
  ): ExperienceGainResult | null {
    if (!unit.isAlive || unit.team !== "ALLY" || !unit.rosterUnitId ||
      !Number.isSafeInteger(amount) || amount <= 0 || this.units.get(unit.battleUnitId) !== unit) {
      return null;
    }

    const result = grantRosterUnitExperience(this.game.registry, unit.rosterUnitId, amount);
    if (!result) {
      return null;
    }

    const previousMaxHp = unit.maxHp;
    const stats = calculateFinalUnitStats(
      unit.baseMaxHp,
      unit.baseAttackDamage,
      unit.baseDefense,
      result.next.level,
      getEquippedModifierTotals(getOrCreateInventoryState(this.game.registry), unit.rosterUnitId),
    );
    unit.level = result.next.level;
    unit.experience = result.next.experience;
    unit.maxHp = stats.maxHp;
    unit.attackDamage = stats.attackDamage;
    unit.defense = stats.defense;
    if (unit.isAlive) {
      unit.currentHp = Math.min(unit.maxHp, Math.max(0, unit.currentHp + (unit.maxHp - previousMaxHp)));
    }

    if (_source === "BONUS") {
      this.bonusExperienceTotal += amount;
      this.bonusExperienceByRosterUnitId.set(
        unit.rosterUnitId,
        (this.bonusExperienceByRosterUnitId.get(unit.rosterUnitId) ?? 0) + amount,
      );
    }
    return result;
  }

  private rollEnemyDrops(enemy: RTSBattleUnit): void {
    const dropTable = getMonsterDropTable(enemy.sourceWorldMonsterId ?? this.sourceWorldMonsterId);
    const itemDefinitionIds = rollDrops(dropTable);
    if (itemDefinitionIds.length === 0) {
      return;
    }
    const added = addItemDefinitionsToInventory(this.game.registry, itemDefinitionIds);
    itemDefinitionIds.forEach((itemDefinitionId, index) => {
      const itemInstanceId = added.itemInstanceIds[index];
      if (itemInstanceId) {
        this.lootItems.push({ itemInstanceId, itemDefinitionId });
      }
    });
    const names = itemDefinitionIds
      .map((itemDefinitionId) => getItemDefinition(itemDefinitionId)?.displayName ?? itemDefinitionId)
      .join(", ");
    this.addAttackLog(enemy.displayName + " dropped: " + names + ".");
  }

  private grantBattleEndBonusExperience(outcome: BattleOutcome): void {
    if (this.battleEndExperienceGranted) {
      return;
    }

    this.battleEndExperienceGranted = true;
    if (outcome !== "VICTORY") {
      return;
    }

    const bonusExperience = calculateBattleEndBonusExperience(this.directExperienceTotal);
    if (bonusExperience <= 0) {
      return;
    }

    for (const ally of this.getAliveUnits("ALLY")) {
      const result = this.grantExperienceToUnit(ally, bonusExperience, "BONUS");
      if (result?.levelsGained) {
        this.addAttackLog(`${ally.displayName} LEVEL UP! Lv.${result.next.level}`);
      }
    }
  }

  private getExperienceRewards(): RTSBattleResult["experienceRewards"] {
    const rosterUnitIds = new Set([
      ...this.directExperienceByRosterUnitId.keys(),
      ...this.bonusExperienceByRosterUnitId.keys(),
    ]);
    return [...rosterUnitIds].sort().map((rosterUnitId) => ({
      rosterUnitId,
      directExperience: this.directExperienceByRosterUnitId.get(rosterUnitId) ?? 0,
      bonusExperience: this.bonusExperienceByRosterUnitId.get(rosterUnitId) ?? 0,
    }));
  }

  private applyDamage(attacker: RTSBattleUnit, target: RTSBattleUnit): void {
    if (
      this.combatState !== "RUNNING" ||
      !attacker.isAlive ||
      !target.isAlive ||
      this.units.get(target.battleUnitId) !== target ||
      distanceBetween(attacker.position, target.position) > requiredAttackDistance(attacker, target)
    ) {
      return;
    }

    const damage = calculatePhysicalDamage(attacker.attackDamage, target.defense);
    target.currentHp = Math.max(0, target.currentHp - damage);
    target.lastAttackerId = attacker.battleUnitId;
    target.lastAttackedAt = this.combatTimeMs;
    if (target.team === "ALLY") {
      this.normalizeCompletedMoveCommand(target);
      const isMoving = this.isActiveMoveCommand(target);
      const activeTarget = this.getAliveEnemy(target.currentTargetId);
      const canRetaliate = this.autoHuntEnabled || this.isTargetWithinGuardLeash(target, attacker);
      if (!isMoving && !activeTarget && canRetaliate) {
        target.currentTargetId = attacker.battleUnitId;
        if (target.commandMode === "ATTACK_MOVE") {
          target.moveDestination = null;
        } else {
          target.commandMode = "LOCAL_ENGAGE";
          target.commandDestination = null;
          target.moveDestination = null;
        }
        target.attackElapsedMs = 0;
      }
    }
    this.addAttackLog(attacker.displayName + " dealt " + damage + " to " + target.displayName + ".");
    if (target.currentHp === 0) {
      this.markUnitDead(target, attacker);
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
    this.grantBattleEndBonusExperience(outcome);
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
      directExperienceTotal: this.directExperienceTotal,
      bonusExperienceTotal: this.bonusExperienceTotal,
      experienceRewards: this.getExperienceRewards(),
      loot: [...this.lootItems],
      autoRepeatBattle: this.autoRepeatBattle,
    };
    const fieldScene = this.scene.get("FieldScene") as FieldScene;
    fieldScene.applyBattleResult(result);
    const lootLine = this.getLootSummaryLine();
    this.outcomeText.setText(outcome === "VICTORY"
      ? ["VICTORY", this.enemyDisplayName + " squad defeated.", "Reward: +" + this.goldReward + " Gold", "Direct EXP: " + this.directExperienceTotal, "Bonus EXP: " + this.bonusExperienceTotal, lootLine]
      : ["DEFEAT", "All allied units are defeated.", "Reward: 0 Gold", "Direct EXP: " + this.directExperienceTotal, "Bonus EXP: 0", lootLine]);
    if (this.autoRepeatBattle) {
      this.scheduleDelayed(1400, () => fieldScene.returnFromBattle(outcome));
    }
  }

  private getLootSummaryLine(): string {
    if (this.lootItems.length === 0) {
      return "Loot: None";
    }
    const counts = new Map<string, number>();
    for (const loot of this.lootItems) {
      counts.set(loot.itemDefinitionId, (counts.get(loot.itemDefinitionId) ?? 0) + 1);
    }
    return "Loot: " + [...counts.entries()]
      .map(([itemDefinitionId, count]) => (
        (getItemDefinition(itemDefinitionId)?.displayName ?? itemDefinitionId) + " x" + count
      ))
      .join(", ");
  }

  private saveCurrentSelectionToGroup(groupIndex: ControlGroupIndex): void {
    if (this.dataError || this.combatState !== "RUNNING") {
      return;
    }

    const ids = saveControlGroup(this.controlGroups, groupIndex, this.selectedUnitIds, this.units.values());
    setPersistentControlGroupState(this.game.registry, controlGroupMapToPersistentState(this.controlGroups));
    const groupLabel = getControlGroupOrdinalLabel(groupIndex);
    this.addAttackLog(ids.length > 0
      ? `Group ${groupLabel} saved: ${ids.length} units.`
      : `Group ${groupLabel} cleared.`);
    this.updateUi();
  }

  private recallGroup(groupIndex: ControlGroupIndex): void {
    if (this.dataError || this.combatState !== "RUNNING") {
      return;
    }

    const ids = recallControlGroup(this.controlGroups, groupIndex, this.units);
    this.selectedUnitIds.clear();
    ids.forEach((unitId) => this.selectedUnitIds.add(unitId));
    this.markVisualStateDirty();
    this.refreshAllVisuals();
    const groupLabel = getControlGroupOrdinalLabel(groupIndex);
    this.addAttackLog(ids.length > 0
      ? `Group ${groupLabel} recalled: ${ids.length} living units.`
      : `Group ${groupLabel} has no living units.`);
    this.updateUi();
  }

  private selectSingleUnit(unitId: string): void {
    const unit = this.units.get(unitId);
    if (!unit?.isAlive || unit.team !== "ALLY") {
      return;
    }

    this.selectedUnitIds.clear();
    this.selectedUnitIds.add(unitId);
    this.markVisualStateDirty();
    this.updateUi();
  }

  private selectUnitsInRectangle(start: PointerPosition, end: PointerPosition): void {
    this.selectedUnitIds.clear();
    for (const unit of this.units.values()) {
      if (unit.team === "ALLY" && unit.isAlive && isPointInRectangle(unit.position, start, end)) {
        this.selectedUnitIds.add(unit.battleUnitId);
      }
    }
    this.markVisualStateDirty();
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
      unit.commandMode = "MOVE";
      unit.commandDestination = destinations[index];
      unit.moveDestination = destinations[index];
      unit.lastAttackerId = null;
      unit.lastAttackedAt = 0;
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
      unit.commandMode = "FOCUS_ATTACK";
      unit.commandDestination = null;
      unit.moveDestination = null;
      unit.attackElapsedMs = 0;
      unit.lastAttackerId = null;
      unit.lastAttackedAt = 0;
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
        this.markVisualStateDirty();
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
    this.refreshUnitTransformsAndHealth();
    if (this.visualStateDirty) this.refreshUnitStateVisuals();
  }

  private refreshUnitTransformsAndHealth(): void {
    for (const unit of this.units.values()) {
      const visual = this.unitVisuals.get(unit.battleUnitId);
      if (!visual) continue;
      visual.container.setPosition(unit.position.x, unit.position.y);
      visual.interactionZone.setPosition(unit.position.x, unit.position.y);
      visual.guardReachRing.setPosition(unit.guardPosition.x, unit.guardPosition.y);
      visual.healthFill.setDisplaySize(32 * this.getHealthRatio(unit.currentHp, unit.maxHp), 4);
    }
  }

  private refreshUnitStateVisuals(): void {
    const selectedAllies = this.getSelectedAliveAllies();
    const selectedAllyId = selectedAllies.length === 1 ? selectedAllies[0].battleUnitId : null;
    for (const unit of this.units.values()) {
      const visual = this.unitVisuals.get(unit.battleUnitId);
      if (!visual) {
        continue;
      }

      visual.container.setAlpha(unit.isAlive ? 1 : 0.28);
      visual.interactionZone.setActive(unit.isAlive);
      if (!unit.isAlive) {
        visual.interactionZone.disableInteractive();
      }
      visual.selectionRing.setVisible(unit.isAlive && this.selectedUnitIds.has(unit.battleUnitId));
      visual.attackReachRing.setVisible(unit.isAlive && unit.battleUnitId === selectedAllyId);
      visual.guardReachRing.setVisible(
        unit.isAlive &&
        unit.team === "ALLY" &&
        unit.battleUnitId === selectedAllyId &&
        !this.autoHuntEnabled,
      );
    }
    this.visualStateDirty = false;
  }

  private markVisualStateDirty(): void {
    this.visualStateDirty = true;
  }

  private updateUi(): void {
    this.uiUpdateCount += 1;
    const selected = this.getSelectedAliveAllies();
    const aliveAllies = this.getAliveUnits("ALLY").length;
    const aliveEnemies = this.getAliveUnits("ENEMY").length;
    this.setTextIfChanged(this.statusText, [
      `Allies: ${aliveAllies}/${RTS_ALLY_COUNT}`,
      `Enemies: ${aliveEnemies}/${RTS_ENEMY_COUNT}`,
      `State: ${this.dataError ? "INVALID_DATA" : this.combatState}`,
    ]);
    this.setTextIfChanged(this.selectedInfoText, this.dataError
      ? "Battle cannot start with invalid data. Return to Field."
      : selected.length === 0
      ? "No allies selected. Left-click or drag to select; right-click to command."
      : selected.length === 1
      ? `${this.getSelectionInfoLabel(selected[0])} · Melee reach: ${selected[0].attackRange}px${this.autoHuntEnabled ? "" : ` · Guard: ${RTS_GUARD_AGGRO_RANGE}px`}`
      : `${selected.length} ally selected${selected.length === 1 ? "" : "s"}. Manual commands have priority over Auto Hunt.`);
    this.setTextIfChanged(this.attackLogText, ["Recent orders", ...(this.attackLogs.length > 0 ? this.attackLogs.slice(-3) : ["No orders yet."])]);
    this.updateAutoHuntUi();
    this.updateSkillUi();
    this.refreshControlGroupUi();
    this.refreshSlotUi();
    this.uiDirty = false;
    this.uiElapsedMs = 0;
  }

  private refreshControlGroupUi(): void {
    for (let index = 0; index < RTS_ALLY_COUNT; index += 1) {
      const groupIndex = index as ControlGroupIndex;
      const visual = this.controlGroupTexts.get(groupIndex);
      if (!visual) {
        continue;
      }
      const key = getKeyCodeLabel(this.keyBindingState.controlGroupCodes[groupIndex]);
      const totalCount = this.controlGroups.get(groupIndex)?.length ?? 0;
      const livingCount = getAvailableControlGroupMemberIds(this.controlGroups, groupIndex, this.units).length;
      const ordinal = getControlGroupOrdinalLabel(groupIndex);
      this.setTextIfChanged(visual, `G${ordinal} [${key}]: ${totalCount > 0 ? `${livingCount}/${totalCount}` : "--"}`);
    }
  }

  private refreshSlotUi(): void {
    this.allyBySlot.clear();
    for (const candidate of this.units.values()) {
      if (candidate.team === "ALLY" && candidate.slotIndex !== null && candidate.slotIndex !== undefined) {
        this.allyBySlot.set(candidate.slotIndex, candidate);
      }
    }
    for (let index = 0; index < RTS_ALLY_COUNT; index += 1) {
      const unit = this.allyBySlot.get(index);
      const visual = this.slotVisuals.get(index);
      if (!visual) {
        continue;
      }

      if (!unit) {
        this.setTextIfChanged(visual.nameText, "EMPTY");
        this.setTextIfChanged(visual.stateText, "AVAILABLE");
        visual.nameText.setColor("#8795a8");
        visual.stateText.setColor("#8795a8");
        visual.hpFill.setDisplaySize(0, 4);
        continue;
      }

      this.setTextIfChanged(visual.nameText, unit.displayName);
      const stateLabel = unit.commandMode === "AUTO_HUNT" ? `AUTO / ${unit.state}` : unit.state;
      this.setTextIfChanged(visual.stateText, unit.isAlive ? stateLabel : "DEAD");
      visual.stateText.setColor(unit.isAlive ? "#b9cad7" : "#ef9a9a");
      visual.hpFill.setDisplaySize(54 * this.getHealthRatio(unit.currentHp, unit.maxHp), 4);
    }
  }

  private setTextIfChanged(text: Phaser.GameObjects.Text | undefined, value: string | readonly string[]): void {
    if (!text) return;
    const next = typeof value === "string" ? value : value.join("\n");
    if (text.text !== next) text.setText(next);
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
    return unit.unitRole === "MAIN_CHARACTER"
      ? "Hero"
      : unit.displayName === "Skill Merc" ? "Skill Merc" : `M${(unit.slotIndex ?? 0)}`;
  }

  private getSelectionInfoLabel(unit: RTSBattleUnit): string {
    return `${unit.displayName} · ${formatProgression(unit)} · HP ${unit.currentHp}/${unit.maxHp} · ATK ${unit.attackDamage} · DEF ${unit.defense}`;
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
    this.input.keyboard?.off("keydown", this.handleBattleKeyDown, this);
    for (const timer of this.delayedEvents) this.time.removeEvent(timer);
    this.delayedEvents.clear();
  }

  private scheduleDelayed(delayMs: number, callback: () => void): void {
    let timer: Phaser.Time.TimerEvent;
    timer = this.time.delayedCall(delayMs, () => {
      this.delayedEvents.delete(timer);
      callback();
    });
    this.delayedEvents.add(timer);
  }

  private sanitizeGold(value: number): number {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  private sanitizeExperience(value: number): number {
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
      candidate.allyRoster.length >= 1 &&
      candidate.allyRoster.length <= RTS_ALLY_COUNT)) {
      return false;
    }
    if (candidate.autoRepeatBattle !== undefined && candidate.autoRepeatBattle !== true && candidate.autoRepeatBattle !== false) {
      return false;
    }

    const roster = candidate.allyRoster as unknown[];
    const validSlots = new Set<number>();
    const rosterIds = new Set<string>();
    let mainCharacterCount = 0;
    return (
      typeof candidate.sourceWorldMonsterId === "string" &&
      roster.every((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        const rosterEntry = entry as Record<string, unknown>;
        const valid = typeof rosterEntry.rosterUnitId === "string" &&
          typeof rosterEntry.unitDefinitionId === "string" &&
          typeof rosterEntry.displayName === "string" &&
          rosterEntry.displayName.length > 0 &&
          (rosterEntry.unitRole === "MAIN_CHARACTER" || rosterEntry.unitRole === "MERCENARY") &&
          !rosterIds.has(rosterEntry.rosterUnitId as string) &&
          Number.isSafeInteger(rosterEntry.slotIndex) &&
          (rosterEntry.slotIndex as number) >= 0 &&
          (rosterEntry.slotIndex as number) < RTS_ALLY_COUNT &&
          !validSlots.has(rosterEntry.slotIndex as number);
        if (valid) {
          validSlots.add(rosterEntry.slotIndex as number);
          rosterIds.add(rosterEntry.rosterUnitId as string);
          if (rosterEntry.unitRole === "MAIN_CHARACTER") {
            mainCharacterCount += 1;
          }
        }
        return valid;
      }) && validSlots.size === roster.length && rosterIds.size === roster.length && mainCharacterCount === 1
    );
  }
}
