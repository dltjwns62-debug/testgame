import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import {
  getFormationSlotLabel,
  getOrCreateFormationState,
} from "../formationState";
import {
  EQUIPMENT_SLOT_DEFINITIONS,
  calculateFinalUnitStats,
  getAvailableItemInstances,
  getEquipFailureReason,
  getEquippedItemInstanceId,
  getEquippedModifierTotals,
  getItemDefinition,
  getItemDescription,
  getOrCreateInventoryState,
  tryEquipItem,
  tryUnequipItem,
  type EquipmentSlotId,
  type ItemInstance,
} from "../items";
import { getAllyUnitDefinition } from "../rtsBattleDefinitions";
import { formatProgression, normalizeProgressionState } from "../progression";
import type { OwnedRosterUnit } from "../rtsBattleTypes";
import type { FieldScene } from "./FieldScene";

type ItemRowVisual = {
  background: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  detailText: Phaser.GameObjects.Text;
};

type SlotVisual = {
  background: Phaser.GameObjects.Rectangle;
  labelText: Phaser.GameObjects.Text;
  itemText: Phaser.GameObjects.Text;
  button: Phaser.GameObjects.Rectangle;
  buttonLabel: Phaser.GameObjects.Text;
};

const ITEMS_PER_PAGE = 6;

export class InventoryScene extends Phaser.Scene {
  private selectedRosterUnitId: string | null = null;
  private selectedItemInstanceId: string | null = null;
  private inventoryPage = 0;
  private readonly unitVisuals = new Map<string, {
    background: Phaser.GameObjects.Rectangle;
    nameText: Phaser.GameObjects.Text;
    detailText: Phaser.GameObjects.Text;
  }>();
  private readonly itemRows: ItemRowVisual[] = [];
  private readonly slotVisuals = new Map<EquipmentSlotId, SlotVisual>();
  private selectedUnitText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private itemDetailText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private pageText!: Phaser.GameObjects.Text;
  private previousButton!: Phaser.GameObjects.Rectangle;
  private nextButton!: Phaser.GameObjects.Rectangle;
  private equipButton!: Phaser.GameObjects.Rectangle;
  private equipButtonLabel!: Phaser.GameObjects.Text;

  private readonly handleWheel = (
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void => {
    if (deltaY > 0) {
      this.inventoryPage += 1;
    } else if (deltaY < 0) {
      this.inventoryPage -= 1;
    }
    this.refreshUi();
  };

  public constructor() {
    super("InventoryScene");
  }

  public create(): void {
    const formation = getOrCreateFormationState(this.game.registry);
    this.selectedRosterUnitId = formation.ownedUnits[0]?.rosterUnitId ?? null;
    this.selectedItemInstanceId = null;
    this.inventoryPage = 0;
    this.unitVisuals.clear();
    this.itemRows.length = 0;
    this.slotVisuals.clear();
    this.drawBackground();
    this.addHeader();
    this.addUnitList(formation.ownedUnits);
    this.addUnitDetails();
    this.addItemList();
    this.addControls();
    this.input.on("wheel", this.handleWheel, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("wheel", this.handleWheel, this);
    });
    this.refreshUi();
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);
    this.add.rectangle(145, 290, 250, 390, 0x1f2937, 1)
      .setStrokeStyle(1, 0x54748a, 1);
    this.add.rectangle(480, 290, 300, 390, 0x1f2937, 1)
      .setStrokeStyle(1, 0x54748a, 1);
    this.add.rectangle(805, 290, 300, 390, 0x1f2937, 1)
      .setStrokeStyle(1, 0x54748a, 1);
    this.add.rectangle(GAME_WIDTH / 2, 515, GAME_WIDTH, 50, 0x172033, 1);
  }

  private addHeader(): void {
    this.add.text(30, 16, "Stage 14: Inventory & Equipment", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(32, 50, "Equip the right item on any owned unit. Equipment persists for this session.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "12px",
    });
    const back = this.add.rectangle(875, 29, 130, 30, 0x536078, 1)
      .setStrokeStyle(1, 0x9ce4b0, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add.text(875, 29, "Back to Field", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    back.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        this.returnToField();
      }
    });
  }

  private addUnitList(ownedUnits: OwnedRosterUnit[]): void {
    this.add.text(34, 88, "Owned Units", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    });
    ownedUnits.forEach((unit, index) => {
      const y = 116 + index * 27;
      const background = this.add.rectangle(145, y, 224, 24, 0x26394b, 1)
        .setStrokeStyle(1, 0x54748a, 1)
        .setInteractive({ useHandCursor: true });
      background.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          this.selectUnit(unit.rosterUnitId);
        }
      });
      const nameText = this.add.text(38, y - 9, unit.displayName, {
        color: "#d9f2ff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      });
      const detailText = this.add.text(170, y - 9, "", {
        color: "#b9cad7",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "8px",
        align: "right",
        fixedWidth: 86,
      });
      this.unitVisuals.set(unit.rosterUnitId, { background, nameText, detailText });
    });
  }

  private addUnitDetails(): void {
    this.add.text(334, 88, "Selected Unit", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    });
    this.selectedUnitText = this.add.text(340, 112, "", {
      color: "#e9ddff",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "12px",
      fontStyle: "bold",
      wordWrap: { width: 280 },
    });
    this.statsText = this.add.text(340, 148, "", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      lineSpacing: 3,
      wordWrap: { width: 280 },
    });
    this.add.text(334, 202, "Equipment Slots", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    });

    EQUIPMENT_SLOT_DEFINITIONS.forEach((slot, index) => {
      const y = 244 + index * 70;
      const background = this.add.rectangle(480, y, 278, 56, 0x26394b, 1)
        .setStrokeStyle(1, 0x54748a, 1);
      const labelText = this.add.text(352, y - 21, slot.label, {
        color: "#f6e8ad",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      });
      const itemText = this.add.text(352, y - 5, "", {
        color: "#d9f2ff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "9px",
        wordWrap: { width: 150 },
      });
      const button = this.add.rectangle(580, y, 62, 24, 0x536078, 1)
        .setStrokeStyle(1, 0x9ce4b0, 0.8)
        .setInteractive({ useHandCursor: true });
      const buttonLabel = this.add.text(580, y, "Unequip", {
        color: "#f3f8e9",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "8px",
        fontStyle: "bold",
      }).setOrigin(0.5);
      button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          this.unequip(slot.id);
        }
      });
      this.slotVisuals.set(slot.id, { background, labelText, itemText, button, buttonLabel });
    });
  }

  private addItemList(): void {
    this.add.text(660, 88, "Available Items", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    });
    for (let index = 0; index < ITEMS_PER_PAGE; index += 1) {
      const y = 125 + index * 48;
      const background = this.add.rectangle(805, y, 278, 42, 0x26394b, 1)
        .setStrokeStyle(1, 0x54748a, 1);
      const nameText = this.add.text(670, y - 16, "", {
        color: "#d9f2ff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        wordWrap: { width: 255 },
      });
      const detailText = this.add.text(670, y + 1, "", {
        color: "#b9cad7",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "8px",
        wordWrap: { width: 255 },
      });
      background.setInteractive({ useHandCursor: true });
      background.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          const current = this.getAvailableItems()[this.inventoryPage * ITEMS_PER_PAGE + index];
          if (current) {
            this.selectedItemInstanceId = current.itemInstanceId;
            this.refreshUi();
          }
        }
      });
      this.itemRows.push({ background, nameText, detailText });
    }
    this.itemDetailText = this.add.text(660, 420, "", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "9px",
      wordWrap: { width: 270 },
      lineSpacing: 2,
    });
  }

  private addControls(): void {
    this.statusText = this.add.text(34, 488, "", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      wordWrap: { width: 400 },
    });
    this.equipButton = this.add.rectangle(805, 472, 150, 28, 0x4b8b6d, 1)
      .setStrokeStyle(1, 0x9ce4b0, 0.9)
      .setInteractive({ useHandCursor: true });
    this.equipButtonLabel = this.add.text(805, 472, "Equip Selected", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.equipButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        this.equipSelectedItem();
      }
    });
    this.previousButton = this.add.rectangle(688, 512, 48, 22, 0x536078, 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(688, 512, "<", { color: "#f3f8e9", fontSize: "12px" }).setOrigin(0.5);
    this.previousButton.on("pointerdown", () => {
      this.inventoryPage -= 1;
      this.refreshUi();
    });
    this.pageText = this.add.text(805, 512, "", {
      color: "#b9cad7",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "9px",
      align: "center",
    }).setOrigin(0.5);
    this.nextButton = this.add.rectangle(922, 512, 48, 22, 0x536078, 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(922, 512, ">", { color: "#f3f8e9", fontSize: "12px" }).setOrigin(0.5);
    this.nextButton.on("pointerdown", () => {
      this.inventoryPage += 1;
      this.refreshUi();
    });
  }

  private selectUnit(rosterUnitId: string): void {
    if (this.selectedRosterUnitId === rosterUnitId) {
      return;
    }
    this.selectedRosterUnitId = rosterUnitId;
    this.selectedItemInstanceId = null;
    this.setStatus("Selected unit changed.", "#c4e4d0");
    this.refreshUi();
  }

  private getAvailableItems(): ItemInstance[] {
    return getAvailableItemInstances(getOrCreateInventoryState(this.game.registry));
  }

  private getSelectedUnit(): OwnedRosterUnit | null {
    return getOrCreateFormationState(this.game.registry).ownedUnits
      .find((unit) => unit.rosterUnitId === this.selectedRosterUnitId) ?? null;
  }

  private refreshUi(): void {
    const formation = getOrCreateFormationState(this.game.registry);
    const inventory = getOrCreateInventoryState(this.game.registry);
    const selectedUnit = this.getSelectedUnit();
    if (!selectedUnit && formation.ownedUnits[0]) {
      this.selectedRosterUnitId = formation.ownedUnits[0].rosterUnitId;
    }
    const currentUnit = this.getSelectedUnit();
    const available = getAvailableItemInstances(inventory);
    const maxPage = Math.max(0, Math.ceil(available.length / ITEMS_PER_PAGE) - 1);
    this.inventoryPage = Math.min(maxPage, Math.max(0, this.inventoryPage));
    if (!available.some((item) => item.itemInstanceId === this.selectedItemInstanceId)) {
      this.selectedItemInstanceId = null;
    }

    for (const unit of formation.ownedUnits) {
      const visual = this.unitVisuals.get(unit.rosterUnitId);
      if (!visual) {
        continue;
      }
      const selected = unit.rosterUnitId === this.selectedRosterUnitId;
      const deployed = formation.slots.find((slot) => slot.rosterUnitId === unit.rosterUnitId);
      visual.background.setFillStyle(selected ? 0x4b3670 : 0x26394b, 1)
        .setStrokeStyle(1, selected ? 0xe9ddff : 0x54748a, 1);
      visual.detailText.setText((deployed ? getFormationSlotLabel(deployed.slotIndex) : "Bench") + " · " + formatProgression(unit));
    }

    if (currentUnit) {
      const definition = getAllyUnitDefinition(currentUnit.unitDefinitionId);
      const stats = calculateFinalUnitStats(
        definition?.maxHp ?? 1,
        definition?.attackDamage ?? 1,
        definition?.defense ?? 0,
        normalizeProgressionState(currentUnit).level,
        getEquippedModifierTotals(inventory, currentUnit.rosterUnitId),
      );
      this.selectedUnitText.setText(currentUnit.displayName + " · " + currentUnit.unitDefinitionId);
      this.statsText.setText(
        formatProgression(currentUnit) + " | Max HP: " + stats.maxHp +
        " | Attack: " + stats.attackDamage + " | Defense: " + stats.defense,
      );
    } else {
      this.selectedUnitText.setText("No owned unit");
      this.statsText.setText("");
    }

    for (const slot of EQUIPMENT_SLOT_DEFINITIONS) {
      const visual = this.slotVisuals.get(slot.id);
      if (!visual) {
        continue;
      }
      const itemInstanceId = currentUnit
        ? getEquippedItemInstanceId(inventory, currentUnit.rosterUnitId, slot.id)
        : null;
      const item = itemInstanceId ? inventory.itemInstances.find((candidate) => candidate.itemInstanceId === itemInstanceId) : null;
      const definition = item ? getItemDefinition(item.itemDefinitionId) : null;
      visual.itemText.setText(definition ? definition.displayName + " (" + itemInstanceId + ")" : "Empty");
      visual.button.setAlpha(item ? 1 : 0.45);
      visual.buttonLabel.setColor(item ? "#f3f8e9" : "#8795a8");
    }

    for (let index = 0; index < this.itemRows.length; index += 1) {
      const visual = this.itemRows[index];
      const item = available[this.inventoryPage * ITEMS_PER_PAGE + index];
      if (!item) {
        visual.background.setVisible(false).disableInteractive();
        visual.nameText.setVisible(false);
        visual.detailText.setVisible(false);
        continue;
      }
      const definition = getItemDefinition(item.itemDefinitionId);
      const selected = item.itemInstanceId === this.selectedItemInstanceId;
      const reason = currentUnit && definition
        ? getEquipFailureReason(
          inventory,
          currentUnit.rosterUnitId,
          currentUnit.unitDefinitionId,
          getAllyUnitDefinition(currentUnit.unitDefinitionId)?.allowedWeaponCategories ?? [],
          item.itemInstanceId,
        )
        : "UNIT_NOT_FOUND";
      visual.background.setVisible(true).setInteractive({ useHandCursor: true })
        .setFillStyle(selected ? 0x4b3670 : reason ? 0x293044 : 0x26394b, 1)
        .setStrokeStyle(1, selected ? 0xe9ddff : reason ? 0x7b5e3b : 0x54748a, 1);
      visual.nameText.setVisible(true).setText(definition?.displayName ?? "Unknown item");
      visual.detailText.setVisible(true).setText(
        getItemDescription(item) + (reason ? " | Cannot equip: " + this.getFailureMessage(reason) : " | Equipable"),
      );
    }

    const selectedItem = available.find((item) => item.itemInstanceId === this.selectedItemInstanceId);
    this.itemDetailText.setText(selectedItem ? "Selected: " + getItemDescription(selectedItem) : "Select an item to inspect it.");
    const canEquip = Boolean(currentUnit && selectedItem && getAllyUnitDefinition(currentUnit.unitDefinitionId) &&
      !getEquipFailureReason(
        inventory,
        currentUnit.rosterUnitId,
        currentUnit.unitDefinitionId,
        getAllyUnitDefinition(currentUnit.unitDefinitionId)?.allowedWeaponCategories ?? [],
        selectedItem.itemInstanceId,
      ));
    this.equipButton.setFillStyle(canEquip ? 0x4b8b6d : 0x293044, 1).setAlpha(canEquip ? 1 : 0.6);
    this.equipButtonLabel.setColor(canEquip ? "#f3f8e9" : "#8795a8");
    this.pageText.setText("Page " + (this.inventoryPage + 1) + "/" + (maxPage + 1) + " · " + available.length + " items");
    this.previousButton.setAlpha(this.inventoryPage > 0 ? 1 : 0.45);
    this.nextButton.setAlpha(this.inventoryPage < maxPage ? 1 : 0.45);
  }

  private equipSelectedItem(): void {
    const unit = this.getSelectedUnit();
    const itemId = this.selectedItemInstanceId;
    const definition = unit ? getAllyUnitDefinition(unit.unitDefinitionId) : null;
    if (!unit || !itemId || !definition) {
      this.setStatus("Select a unit and an equipable item.");
      return;
    }
    const result = tryEquipItem(
      this.game.registry,
      unit.rosterUnitId,
      unit,
      definition.allowedWeaponCategories,
      itemId,
    );
    if (!result.ok) {
      this.setStatus("Cannot equip: " + this.getFailureMessage(result.reason));
      return;
    }
    this.selectedItemInstanceId = null;
    this.setStatus("Equipment updated.", "#9ce4b0");
    this.refreshUi();
  }

  private unequip(slotType: EquipmentSlotId): void {
    const unit = this.getSelectedUnit();
    if (!unit) {
      return;
    }
    const result = tryUnequipItem(this.game.registry, unit.rosterUnitId, unit, slotType);
    if (result.ok) {
      this.setStatus("Equipment removed.", "#c4e4d0");
      this.refreshUi();
    } else {
      this.setStatus("No item is equipped in that slot.", "#f3c969");
    }
  }

  private getFailureMessage(reason: string): string {
    switch (reason) {
      case "ITEM_NOT_FOUND": return "Item not found.";
      case "ITEM_ALREADY_EQUIPPED": return "Item is already equipped.";
      case "NOT_EQUIPMENT": return "Item is not equipment.";
      case "UNIT_NOT_FOUND": return "Unit is not owned.";
      case "SLOT_MISMATCH": return "Item slot is invalid.";
      case "WEAPON_INCOMPATIBLE": return "Weapon category is not allowed.";
      case "UNIT_RESTRICTED": return "This unique item is restricted to another unit.";
      default: return "Equipment restriction.";
    }
  }

  private setStatus(message: string, color = "#f3c969"): void {
    this.statusText.setColor(color);
    this.statusText.setText(message);
  }

  private returnToField(): void {
    const fieldScene = this.scene.get("FieldScene") as FieldScene;
    fieldScene.returnFromInventory();
  }
}
