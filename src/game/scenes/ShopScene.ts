import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, MAX_OWNED_UNIT_COUNT } from "../constants";
import { getOrCreateFormationState } from "../formationState";
import { getOrCreatePlayerGold } from "../playerEconomy";
import { SHOP_OFFERS, type ShopOffer } from "../shopCatalog";
import { tryPurchaseShopOffer, type ShopPurchaseFailureReason } from "../shopPurchase";
import type { AllyUnitDefinition } from "../rtsBattleDefinitions";
import { getAllyUnitDefinition } from "../rtsBattleDefinitions";
import { repairRuntimeStateAtBoundary } from "../runtimeStateValidation";
import type { FieldScene } from "./FieldScene";
import { addButton as addCommonButton, addPanel, addSceneBackdrop, UI_THEME, type ButtonVisual } from "../ui/theme";
import { createVisualTextures, getUnitTextureKey } from "../ui/visuals";

type OfferVisual = {
  button: Phaser.GameObjects.Rectangle;
  buttonLabel: Phaser.GameObjects.Text;
  visual: ButtonVisual;
};

export class ShopScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private ownedText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private readonly offerVisuals = new Map<string, OfferVisual>();
  private purchaseInProgress = false;

  public constructor() {
    super("ShopScene");
  }

  public create(): void {
    repairRuntimeStateAtBoundary(this.game.registry);
    this.offerVisuals.clear();
    this.purchaseInProgress = false;
    createVisualTextures(this);
    this.drawBackground();
    this.addHeader();
    this.addOffers();
    this.addControls();
    this.refreshUi();
  }

  private drawBackground(): void {
    addSceneBackdrop(this, UI_THEME.colors.ink, UI_THEME.colors.goldValue);
    addPanel(this, GAME_WIDTH / 2, 250, 920, 330, UI_THEME.colors.panel, 0.97);
    this.add.rectangle(GAME_WIDTH / 2, 492, 920, 70, UI_THEME.colors.inkSoft, 0.98)
      .setStrokeStyle(1, UI_THEME.colors.panelBorder, 0.52);
  }

  private addHeader(): void {
    this.add.text(32, 18, "Stage 17: Mercenary Shop & Local Runtime", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(34, 52, "Spend Gold to recruit a new mercenary. Recruits start on the bench.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
    });
    this.goldText = this.add.text(650, 22, "", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "17px",
      fontStyle: "bold",
      align: "right",
    }).setOrigin(1, 0);
    this.ownedText = this.add.text(650, 51, "", {
      color: "#b9cad7",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "12px",
      align: "right",
    }).setOrigin(1, 0);
  }

  private addOffers(): void {
    SHOP_OFFERS.forEach((offer, index) => {
      const x = 175 + index * 305;
      const definition = getAllyUnitDefinition(offer.unitDefinitionId);
      this.addOfferCard(offer, definition, x);
    });
  }

  private addOfferCard(offer: ShopOffer, definition: AllyUnitDefinition | null, x: number): void {
    this.add.rectangle(x, 235, 270, 260, 0x26394b, 1)
      .setStrokeStyle(1, definition?.color ?? 0x54748a, 1);
    if (definition) {
      this.add.image(x - 92, 141, getUnitTextureKey(definition)).setDisplaySize(52, 52);
    }
    this.add.text(x - 62, 125, offer.displayName, {
      color: "#d9f2ff",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "17px",
      fontStyle: "bold",
    });
    this.add.text(x - 108, 167, offer.description, {
      color: "#b9cad7",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      wordWrap: { width: 216 },
      lineSpacing: 2,
    });
    this.add.text(x - 108, 211, definition
      ? `HP ${definition.maxHp} · ATK ${definition.attackDamage}\nSpeed ${definition.moveSpeed} · Reach ${definition.attackRange}`
      : "Definition unavailable", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      lineSpacing: 4,
    });
    this.add.text(x, 268, `Price: ${offer.price} Gold`, {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "15px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);

    const visual = addCommonButton(this, x, 323, 150, "Buy", () => this.purchase(offer), { height: 32, fontSize: "11px" });
    this.offerVisuals.set(offer.offerId, { button: visual.background, buttonLabel: visual.label, visual });
  }

  private addControls(): void {
    this.statusText = this.add.text(36, 405, "", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "12px",
      wordWrap: { width: 620 },
    });

    addCommonButton(this, 820, 475, 180, "Return to Field", () => this.returnToField(), { color: UI_THEME.colors.inkSoft, height: 32 });
  }

  private purchase(offer: ShopOffer): void {
    if (this.purchaseInProgress) {
      return;
    }
    this.purchaseInProgress = true;
    try {
      const result = tryPurchaseShopOffer(this.game.registry, offer.offerId);
      if (result.ok) {
        this.setStatus(`${offer.displayName} recruited for ${offer.price} Gold. Apply Formation to deploy.`, "#9ce4b0");
      } else {
        this.setStatus(this.getFailureMessage(result.reason), "#f3c969");
      }
      this.refreshUi();
    } finally {
      this.purchaseInProgress = false;
    }
  }

  private getFailureMessage(reason: ShopPurchaseFailureReason): string {
    switch (reason) {
      case "INSUFFICIENT_GOLD":
        return "Not enough Gold.";
      case "ALREADY_OWNED":
        return "This mercenary is already owned.";
      case "ROSTER_FULL":
        return "Roster full. Maximum owned units: 13.";
      case "INVALID_GOLD":
        return "Gold data is invalid and was reset. Try again.";
      case "INVALID_FORMATION":
        return "Formation data is invalid. Return to Field and repair it.";
      default:
        return "This shop offer is unavailable.";
    }
  }

  private refreshUi(): void {
    const gold = getOrCreatePlayerGold(this.game.registry);
    const formation = getOrCreateFormationState(this.game.registry);
    this.goldText.setText(`Gold: ${gold}`);
    this.ownedText.setText(`Owned: ${formation.ownedUnits.length}/${MAX_OWNED_UNIT_COUNT}`);

    for (const offer of SHOP_OFFERS) {
      const visual = this.offerVisuals.get(offer.offerId);
      if (!visual) {
        continue;
      }
      const owned = formation.ownedUnits.some((unit) => unit.rosterUnitId === offer.rosterUnitId);
      const full = formation.ownedUnits.length >= MAX_OWNED_UNIT_COUNT;
      if (owned) {
        visual.visual.setEnabled(false);
        visual.button.setFillStyle(0x536078, 1).setAlpha(0.8);
        visual.buttonLabel.setText("Owned").setColor("#d9f2ff");
      } else if (full) {
        visual.visual.setEnabled(false);
        visual.button.setFillStyle(0x293044, 1).setAlpha(0.65);
        visual.buttonLabel.setText("Roster Full").setColor("#8795a8");
      } else {
        const affordable = gold >= offer.price;
        visual.visual.setEnabled(affordable);
        visual.button.setFillStyle(affordable ? 0x4b8b6d : 0x293044, 1).setAlpha(1);
        visual.buttonLabel.setText("Buy").setColor(affordable ? "#f3f8e9" : "#8795a8");
      }
    }
  }

  private setStatus(message: string, color: string): void {
    this.statusText.setColor(color);
    this.statusText.setText(message);
  }

  private returnToField(): void {
    const fieldScene = this.scene.get("FieldScene") as FieldScene;
    fieldScene.returnFromShop();
  }
}
