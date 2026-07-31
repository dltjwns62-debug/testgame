import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, RTS_ALLY_COUNT } from "../constants";
import {
  getOrCreatePersistentControlGroupState,
  replaceControlGroupMember,
  setPersistentControlGroupState,
  type PersistentControlGroupState,
} from "../controlGroups";
import {
  getFormationSlotLabel,
  getOrCreateFormationState,
  isValidFormationState,
  cloneFormationState,
  resetFormationSlotsToDefault,
  setFormationState,
} from "../formationState";
import { getAllyUnitDefinition } from "../rtsBattleDefinitions";
import { calculateFinalUnitStats, getEquippedModifierTotals, getOrCreateInventoryState } from "../items";
import { formatProgression, getExperienceToNextLevel } from "../progression";
import { repairRuntimeStateAtBoundary } from "../runtimeStateValidation";
import type { FormationState, OwnedRosterUnit } from "../rtsBattleTypes";
import { addButton as addCommonButton, addPanel, addProgressBar, addSceneBackdrop, setProgressBar, UI_THEME, type ButtonVisual } from "../ui/theme";
import { createVisualTextures, getUnitTextureKey } from "../ui/visuals";
import type { FieldScene } from "./FieldScene";

type FormationSlotVisual = {
  background: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  stateText: Phaser.GameObjects.Text;
};

type OwnedUnitVisual = {
  background: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  stateText: Phaser.GameObjects.Text;
};

export class FormationScene extends Phaser.Scene {
  private draft!: FormationState;
  private initialFormationState!: FormationState;
  private controlGroupState!: PersistentControlGroupState;
  private selectedRosterUnitId: string | null = null;
  private readonly slotVisuals = new Map<number, FormationSlotVisual>();
  private readonly ownedVisuals = new Map<string, OwnedUnitVisual>();
  private selectedInfoText!: Phaser.GameObjects.Text;
  private selectedExpBar!: { fill: Phaser.GameObjects.Rectangle };
  private selectedExpText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private removeButton!: Phaser.GameObjects.Rectangle;
  private removeButtonLabel!: Phaser.GameObjects.Text;
  private removeButtonVisual!: ButtonVisual;

  public constructor() {
    super("FormationScene");
  }

  public create(): void {
    repairRuntimeStateAtBoundary(this.game.registry);
    this.selectedRosterUnitId = null;
    this.slotVisuals.clear();
    this.ownedVisuals.clear();
    this.draft = getOrCreateFormationState(this.game.registry);
    this.initialFormationState = cloneFormationState(this.draft);
    this.controlGroupState = getOrCreatePersistentControlGroupState(
      this.game.registry,
      new Set(this.draft.ownedUnits.map((unit) => unit.rosterUnitId)),
    );
    createVisualTextures(this);
    this.drawBackground();
    this.addHeader();
    this.addFormationSlots();
    this.addOwnedUnits();
    this.addControls();
    this.refreshUi();
  }

  private drawBackground(): void {
    addSceneBackdrop(this, UI_THEME.colors.ink, UI_THEME.colors.purple);
    addPanel(this, GAME_WIDTH / 2, 236, 920, 380, UI_THEME.colors.panel, 0.97);
    this.add.rectangle(GAME_WIDTH / 2, 492, 920, 70, UI_THEME.colors.inkSoft, 0.98)
      .setStrokeStyle(1, UI_THEME.colors.panelBorder, 0.52);
  }

  private addHeader(): void {
    this.add.text(32, 18, "Stage 17: Formation & Local Runtime", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(34, 52, "Arrange units and review their current equipment-ready stats.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
    });
  }

  private addFormationSlots(): void {
    this.add.text(36, 76, "Formation Slots", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    });

    for (let slotIndex = 0; slotIndex < RTS_ALLY_COUNT; slotIndex += 1) {
      const x = 74 + slotIndex * 90;
      const background = this.add.rectangle(x, 130, 82, 76, 0x26394b, 1)
        .setStrokeStyle(1, 0x54748a, 1)
        .setInteractive({ useHandCursor: true });
      background.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          this.handleSlotClick(slotIndex);
        }
      });
      const nameText = this.add.text(x, 130, "", {
        color: "#d9f2ff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 74 },
      }).setOrigin(0.5);
      const stateText = this.add.text(x, 158, "", {
        color: "#b9cad7",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "9px",
        align: "center",
      }).setOrigin(0.5);
      this.add.text(x - 35, 101, getFormationSlotLabel(slotIndex), {
        color: "#f6e8ad",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
      });
      this.slotVisuals.set(slotIndex, { background, nameText, stateText });
    }
  }

  private addOwnedUnits(): void {
    this.add.text(36, 226, "Owned Units", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    });

    this.draft.ownedUnits.forEach((unit, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = 126 + column * 150;
      const y = 260 + row * 44;
      const background = this.add.rectangle(x, y, 136, 42, 0x26394b, 1)
        .setStrokeStyle(1, 0x54748a, 1)
        .setInteractive({ useHandCursor: true });
      background.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          this.selectUnit(unit.rosterUnitId);
        }
      });
      this.add.image(x - 51, y - 2, getUnitTextureKey(getAllyUnitDefinition(unit.unitDefinitionId))).setDisplaySize(28, 28);
      const nameText = this.add.text(x - 31, y - 16, unit.displayName, {
        color: "#d9f2ff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      });
      const stateText = this.add.text(x - 31, y + 1, "", {
        color: "#b9cad7",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "7px",
        lineSpacing: 0,
        wordWrap: { width: 94 },
      });
      this.ownedVisuals.set(unit.rosterUnitId, { background, nameText, stateText });
    });
  }

  private addControls(): void {
    this.selectedInfoText = this.add.text(36, 386, "", {
      color: "#e9ddff",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "12px",
      fontStyle: "bold",
    });
    this.statusText = this.add.text(36, 410, "", {
      color: "#f3c969",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      wordWrap: { width: 560 },
    });
    this.add.text(570, 386, "Selected EXP", { color: UI_THEME.colors.muted, fontFamily: UI_THEME.fontFamily, fontSize: "10px", fontStyle: "bold" });
    this.selectedExpBar = addProgressBar(this, 700, 402, 260, 0, UI_THEME.colors.accent, 8);
    this.selectedExpText = this.add.text(570, 397, "No unit", { color: UI_THEME.colors.muted, fontFamily: UI_THEME.fontFamily, fontSize: "10px" });

    this.addButton(640, 430, 132, "Apply & Return", () => this.applyAndReturn(), 0x4b8b6d);
    this.addButton(786, 430, 92, "Cancel", () => this.cancelAndReturn(), 0x536078);
    this.addButton(890, 430, 104, "Reset Default", () => this.resetDefault(), 0x7b5e3b);

    this.removeButtonVisual = addCommonButton(this, 850, 483, 164, "Remove from Formation", () => this.removeSelectedUnit(), {
      color: UI_THEME.colors.warning,
      disabled: true,
      fontSize: "10px",
      height: 28,
    });
    this.removeButton = this.removeButtonVisual.background;
    this.removeButtonLabel = this.removeButtonVisual.label;
  }

  private addButton(
    x: number,
    y: number,
    width: number,
    label: string,
    callback: () => void,
    color: number,
  ): void {
    addCommonButton(this, x, y, width, label, callback, { color, fontSize: "10px", height: 30 });
  }

  private selectUnit(rosterUnitId: string): void {
    if (!this.draft.ownedUnits.some((unit) => unit.rosterUnitId === rosterUnitId)) {
      return;
    }

    if (this.selectedRosterUnitId === rosterUnitId) {
      this.selectedRosterUnitId = null;
      this.setStatus("Selection cleared.", "#c4e4d0");
      this.refreshUi();
      return;
    }

    this.selectedRosterUnitId = rosterUnitId;
    this.setStatus("Select a formation slot to place or swap this unit.", "#c4e4d0");
    this.refreshUi();
  }

  private handleSlotClick(slotIndex: number): void {
    if (!this.selectedRosterUnitId) {
      const occupant = this.getUnitInSlot(slotIndex);
      if (occupant) {
        this.selectUnit(occupant.rosterUnitId);
      } else {
        this.setStatus("Select an owned unit first.");
      }
      return;
    }

    const selectedId = this.selectedRosterUnitId;
    const currentSlot = this.findSlotForUnit(selectedId);
    const occupant = this.getUnitInSlot(slotIndex);
    if (currentSlot === slotIndex) {
      this.selectedRosterUnitId = null;
      this.setStatus("Selection cleared.", "#c4e4d0");
      this.refreshUi();
      return;
    }
    if (currentSlot === null && occupant?.unitRole === "MAIN_CHARACTER") {
      this.setStatus("Hero must remain in the formation.");
      return;
    }

    if (currentSlot !== null) {
      this.setSlotUnit(slotIndex, selectedId);
      this.setSlotUnit(currentSlot, occupant?.rosterUnitId ?? null);
    } else {
      this.setSlotUnit(slotIndex, selectedId);
    }

    this.selectedRosterUnitId = null;
    this.setStatus(occupant ? "Units swapped." : "Unit placed.", "#9ce4b0");
    this.refreshUi();
  }

  private removeSelectedUnit(): void {
    const selected = this.getSelectedUnit();
    if (!selected) {
      this.setStatus("Select a unit first.");
      return;
    }
    if (selected.unitRole === "MAIN_CHARACTER") {
      this.setStatus("Hero must remain in the formation.");
      return;
    }
    const slot = this.findSlotForUnit(selected.rosterUnitId);
    if (slot === null) {
      this.setStatus("This unit is not deployed.", "#c4e4d0");
      return;
    }
    const removedName = selected.displayName;
    this.setSlotUnit(slot, null);
    this.selectedRosterUnitId = null;
    this.setStatus(`${removedName} removed from the formation.`, "#c4e4d0");
    this.refreshUi();
  }

  private applyAndReturn(): void {
    if (!isValidFormationState(this.draft)) {
      this.setStatus("Hero must remain deployed and every slot must be valid.");
      return;
    }
    let nextControlGroupState = this.controlGroupState;
    for (const replacement of this.getDirectBenchReplacements()) {
      nextControlGroupState = replaceControlGroupMember(
        nextControlGroupState,
        replacement.previousRosterUnitId,
        replacement.nextRosterUnitId,
      );
    }
    setFormationState(this.game.registry, this.draft);
    setPersistentControlGroupState(this.game.registry, nextControlGroupState);
    this.returnToField("Formation saved.");
  }

  private cancelAndReturn(): void {
    this.returnToField();
  }

  private resetDefault(): void {
    this.draft = resetFormationSlotsToDefault(this.draft);
    this.selectedRosterUnitId = null;
    this.setStatus("Default formation restored. Apply to save.", "#c4e4d0");
    this.refreshUi();
  }

  private getDirectBenchReplacements(): Array<{ previousRosterUnitId: string; nextRosterUnitId: string }> {
    const originallyDeployedIds = new Set(
      this.initialFormationState.slots.flatMap((slot) => slot.rosterUnitId ? [slot.rosterUnitId] : []),
    );
    const finallyDeployedIds = new Set(
      this.draft.slots.flatMap((slot) => slot.rosterUnitId ? [slot.rosterUnitId] : []),
    );
    const replacements: Array<{ previousRosterUnitId: string; nextRosterUnitId: string }> = [];

    for (const slot of this.draft.slots) {
      const originalId = this.initialFormationState.slots.find((entry) => entry.slotIndex === slot.slotIndex)?.rosterUnitId;
      const nextId = slot.rosterUnitId;
      if (!originalId || !nextId || originalId === nextId ||
        originallyDeployedIds.has(nextId) || finallyDeployedIds.has(originalId)) {
        continue;
      }
      const previous = this.initialFormationState.ownedUnits.find((unit) => unit.rosterUnitId === originalId);
      const next = this.draft.ownedUnits.find((unit) => unit.rosterUnitId === nextId);
      if (previous?.unitRole === "MERCENARY" && next?.unitRole === "MERCENARY") {
        replacements.push({ previousRosterUnitId: originalId, nextRosterUnitId: nextId });
      }
    }

    return replacements;
  }

  private returnToField(savedMessage?: string): void {
    const fieldScene = this.scene.get("FieldScene") as FieldScene;
    fieldScene.returnFromFormation(savedMessage);
  }

  private getSelectedUnit(): OwnedRosterUnit | null {
    return this.draft.ownedUnits.find((unit) => unit.rosterUnitId === this.selectedRosterUnitId) ?? null;
  }

  private getUnitInSlot(slotIndex: number): OwnedRosterUnit | null {
    const slot = this.draft.slots.find((entry) => entry.slotIndex === slotIndex);
    if (!slot?.rosterUnitId) {
      return null;
    }
    return this.draft.ownedUnits.find((unit) => unit.rosterUnitId === slot.rosterUnitId) ?? null;
  }

  private findSlotForUnit(rosterUnitId: string): number | null {
    return this.draft.slots.find((slot) => slot.rosterUnitId === rosterUnitId)?.slotIndex ?? null;
  }

  private setSlotUnit(slotIndex: number, rosterUnitId: string | null): void {
    const slot = this.draft.slots.find((entry) => entry.slotIndex === slotIndex);
    if (slot) {
      slot.rosterUnitId = rosterUnitId;
    }
  }

  private setStatus(message: string, color = "#f3c969"): void {
    this.statusText.setColor(color);
    this.statusText.setText(message);
  }

  private refreshUi(): void {
    const selected = this.getSelectedUnit();
    this.selectedInfoText.setText(selected ? `Selected: ${this.getUnitSummary(selected)}` : "Selected: None");
    const expRequired = selected ? getExperienceToNextLevel(selected.level) : 1;
    const expRatio = selected && selected.level < 99 ? selected.experience / expRequired : selected ? 1 : 0;
    setProgressBar(this.selectedExpBar, 256, expRatio);
    this.selectedExpText.setText(selected ? (selected.level >= 99 ? "MAX LEVEL" : `${selected.experience.toLocaleString()} / ${expRequired.toLocaleString()} EXP`) : "No unit");
    for (let slotIndex = 0; slotIndex < RTS_ALLY_COUNT; slotIndex += 1) {
      const visual = this.slotVisuals.get(slotIndex);
      if (!visual) {
        continue;
      }
      const unit = this.getUnitInSlot(slotIndex);
      const isSelected = unit?.rosterUnitId === this.selectedRosterUnitId;
      visual.background
        .setFillStyle(isSelected ? 0x4b3670 : 0x26394b, 1)
        .setStrokeStyle(1, isSelected ? 0xe9ddff : 0x54748a, 1);
      visual.nameText.setText(unit?.displayName ?? "EMPTY").setColor(unit ? "#d9f2ff" : "#8795a8");
      visual.stateText.setText(unit ? this.getSlotStatus(unit) : "Available");
    }

    for (const unit of this.draft.ownedUnits) {
      const visual = this.ownedVisuals.get(unit.rosterUnitId);
      if (!visual) {
        continue;
      }
      const deployed = this.findSlotForUnit(unit.rosterUnitId) !== null;
      const isSelected = unit.rosterUnitId === this.selectedRosterUnitId;
      visual.background
        .setFillStyle(isSelected ? 0x4b3670 : 0x26394b, 1)
        .setStrokeStyle(1, isSelected ? 0xe9ddff : 0x54748a, 1);
      visual.stateText.setText(this.getOwnedUnitDetails(unit, deployed ? this.findSlotForUnit(unit.rosterUnitId) : null));
    }

    const canRemove = Boolean(selected && selected.unitRole !== "MAIN_CHARACTER" && this.findSlotForUnit(selected.rosterUnitId) !== null);
    this.removeButtonVisual.setEnabled(canRemove);
    this.removeButtonLabel.setColor(canRemove ? "#fff1d0" : "#8795a8");
  }

  private getUnitSummary(unit: OwnedRosterUnit, slotIndex = this.findSlotForUnit(unit.rosterUnitId)): string {
    const role = unit.unitRole === "MAIN_CHARACTER" ? "Main Character" : "Mercenary";
    const required = unit.unitRole === "MAIN_CHARACTER" ? " · Required" : "";
    const skills = this.hasSkills(unit) ? " · Skills Q/W" : "";
    const placement = slotIndex === null ? "Bench" : `Slot ${getFormationSlotLabel(slotIndex)}`;
    return `${unit.displayName} · ${formatProgression(unit)} · ${this.getFinalStatsSummary(unit)} · ${role}${required}${skills} · ${placement}`;
  }

  private getOwnedUnitDetails(unit: OwnedRosterUnit, slotIndex: number | null): string {
    const role = unit.unitRole === "MAIN_CHARACTER" ? "Main Character" : "Mercenary";
    const required = unit.unitRole === "MAIN_CHARACTER" ? " · Required" : "";
    const skills = this.hasSkills(unit) ? " · Skills Q/W" : "";
    const placement = slotIndex === null ? "Bench" : `Slot ${getFormationSlotLabel(slotIndex)}`;
    return `${formatProgression(unit)}\n${role}${required}${skills} · ${placement}`;
  }

  private getSlotStatus(unit: OwnedRosterUnit): string {
    if (unit.unitRole === "MAIN_CHARACTER") {
      return `${formatProgression(unit)}\nRequired`;
    }
    return `${formatProgression(unit)}\n${this.hasSkills(unit) ? "Skills Q/W" : "Mercenary"}`;
  }

  private hasSkills(unit: OwnedRosterUnit): boolean {
    return (getAllyUnitDefinition(unit.unitDefinitionId)?.skills.length ?? 0) > 0;
  }

  private getFinalStatsSummary(unit: OwnedRosterUnit): string {
    const definition = getAllyUnitDefinition(unit.unitDefinitionId);
    const stats = calculateFinalUnitStats(
      definition?.maxHp ?? 1,
      definition?.attackDamage ?? 1,
      definition?.defense ?? 0,
      unit.level,
      getEquippedModifierTotals(getOrCreateInventoryState(this.game.registry), unit.rosterUnitId),
    );
    return "HP " + stats.maxHp + " · ATK " + stats.attackDamage + " · DEF " + stats.defense;
  }
}
