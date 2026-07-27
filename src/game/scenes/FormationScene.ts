import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, RTS_ALLY_COUNT } from "../constants";
import {
  createDefaultFormationState,
  getFormationSlotLabel,
  getOrCreateFormationState,
  isValidFormationState,
  setFormationState,
} from "../formationState";
import { getAllyUnitDefinition } from "../rtsBattleDefinitions";
import type { FormationState, OwnedRosterUnit } from "../rtsBattleTypes";
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
  private selectedRosterUnitId: string | null = null;
  private readonly slotVisuals = new Map<number, FormationSlotVisual>();
  private readonly ownedVisuals = new Map<string, OwnedUnitVisual>();
  private selectedInfoText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private removeButton!: Phaser.GameObjects.Rectangle;
  private removeButtonLabel!: Phaser.GameObjects.Text;

  public constructor() {
    super("FormationScene");
  }

  public create(): void {
    this.draft = getOrCreateFormationState(this.game.registry);
    this.drawBackground();
    this.addHeader();
    this.addFormationSlots();
    this.addOwnedUnits();
    this.addControls();
    this.refreshUi();
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);
    this.add.rectangle(GAME_WIDTH / 2, 236, 920, 380, 0x1f2937, 1);
    this.add.rectangle(GAME_WIDTH / 2, 492, 920, 70, 0x172033, 1);
  }

  private addHeader(): void {
    this.add.text(32, 18, "Stage 10: Formation", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(34, 52, "Arrange up to 10 units. Hero must remain deployed.", {
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
      const y = 270 + row * 58;
      const background = this.add.rectangle(x, y, 136, 54, 0x26394b, 1)
        .setStrokeStyle(1, 0x54748a, 1)
        .setInteractive({ useHandCursor: true });
      background.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          this.selectUnit(unit.rosterUnitId);
        }
      });
      const nameText = this.add.text(x - 61, y - 21, unit.displayName, {
        color: "#d9f2ff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      });
      const stateText = this.add.text(x - 61, y - 4, "", {
        color: "#b9cad7",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "8px",
        lineSpacing: 1,
        wordWrap: { width: 124 },
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

    this.addButton(640, 430, 132, "Apply & Return", () => this.applyAndReturn(), 0x4b8b6d);
    this.addButton(786, 430, 92, "Cancel", () => this.cancelAndReturn(), 0x536078);
    this.addButton(890, 430, 104, "Reset Default", () => this.resetDefault(), 0x7b5e3b);

    this.removeButton = this.add.rectangle(850, 483, 164, 28, 0x293044, 1)
      .setStrokeStyle(1, 0x536078, 1)
      .setInteractive({ useHandCursor: true });
    this.removeButtonLabel = this.add.text(850, 483, "Remove from Formation", {
      color: "#8795a8",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.removeButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        this.removeSelectedUnit();
      }
    });
  }

  private addButton(
    x: number,
    y: number,
    width: number,
    label: string,
    callback: () => void,
    color: number,
  ): void {
    const background = this.add.rectangle(x, y, width, 30, color, 1)
      .setStrokeStyle(1, 0x9ce4b0, 0.9)
      .setInteractive({ useHandCursor: true });
    background.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        callback();
      }
    });
    this.add.text(x, y, label, {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
    }).setOrigin(0.5);
  }

  private selectUnit(rosterUnitId: string): void {
    if (!this.draft.ownedUnits.some((unit) => unit.rosterUnitId === rosterUnitId)) {
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
      this.setStatus("This unit is already in that slot.", "#c4e4d0");
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
    this.setSlotUnit(slot, null);
    this.setStatus(`${selected.displayName} removed from the formation.`, "#c4e4d0");
    this.refreshUi();
  }

  private applyAndReturn(): void {
    if (!isValidFormationState(this.draft)) {
      this.setStatus("Hero must remain deployed and every slot must be valid.");
      return;
    }
    setFormationState(this.game.registry, this.draft);
    this.returnToField("Formation saved.");
  }

  private cancelAndReturn(): void {
    this.returnToField();
  }

  private resetDefault(): void {
    this.draft = createDefaultFormationState();
    this.selectedRosterUnitId = null;
    this.setStatus("Default formation restored. Apply to save.", "#c4e4d0");
    this.refreshUi();
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
    this.removeButton.setFillStyle(canRemove ? 0x7b5e3b : 0x293044, 1).setAlpha(canRemove ? 1 : 0.55);
    this.removeButtonLabel.setColor(canRemove ? "#fff1d0" : "#8795a8");
  }

  private getUnitSummary(unit: OwnedRosterUnit, slotIndex = this.findSlotForUnit(unit.rosterUnitId)): string {
    const role = unit.unitRole === "MAIN_CHARACTER" ? "Main Character" : "Mercenary";
    const required = unit.unitRole === "MAIN_CHARACTER" ? " · Required" : "";
    const skills = this.hasSkills(unit) ? " · Skills Q/W" : "";
    const placement = slotIndex === null ? "Bench" : `Slot ${getFormationSlotLabel(slotIndex)}`;
    return `${unit.displayName} · ${role}${required}${skills} · ${placement}`;
  }

  private getOwnedUnitDetails(unit: OwnedRosterUnit, slotIndex: number | null): string {
    const role = unit.unitRole === "MAIN_CHARACTER" ? "Main Character" : "Mercenary";
    const required = unit.unitRole === "MAIN_CHARACTER" ? " · Required" : "";
    const skills = this.hasSkills(unit) ? " · Skills Q/W" : "";
    const placement = slotIndex === null ? "Bench" : `Slot ${getFormationSlotLabel(slotIndex)}`;
    return `${role}${required}${skills}\n${placement}`;
  }

  private getSlotStatus(unit: OwnedRosterUnit): string {
    if (unit.unitRole === "MAIN_CHARACTER") {
      return "Required";
    }
    return this.hasSkills(unit) ? "Skills Q/W" : "Mercenary";
  }

  private hasSkills(unit: OwnedRosterUnit): boolean {
    return (getAllyUnitDefinition(unit.unitDefinitionId)?.skills.length ?? 0) > 0;
  }
}
