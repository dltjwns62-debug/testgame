import type Phaser from "phaser";
import {
  FORMATION_REGISTRY_KEY,
  MAX_OWNED_UNIT_COUNT,
  PLAYER_GOLD_REGISTRY_KEY,
} from "./constants";
import {
  cloneFormationState,
  createDefaultFormationState,
  isValidFormationState,
  setFormationState,
} from "./formationState";
import { isValidPlayerGold, setPlayerGold, spendPlayerGold } from "./playerEconomy";
import { createOwnedUnitFromOffer, getShopOffer, type ShopOffer } from "./shopCatalog";
import { getAllyUnitDefinition } from "./rtsBattleDefinitions";
import type { FormationState, OwnedRosterUnit } from "./rtsBattleTypes";

export type ShopPurchaseFailureReason =
  | "UNKNOWN_OFFER"
  | "INVALID_GOLD"
  | "INVALID_FORMATION"
  | "ALREADY_OWNED"
  | "ROSTER_FULL"
  | "INSUFFICIENT_GOLD";

export type ShopPurchaseResult =
  | {
    ok: true;
    offer: ShopOffer;
    previousGold: number;
    nextGold: number;
    ownedUnit: OwnedRosterUnit;
  }
  | {
    ok: false;
    reason: ShopPurchaseFailureReason;
  };

function readFormationForPurchase(registry: Phaser.Data.DataManager): FormationState | null {
  const stored = registry.get(FORMATION_REGISTRY_KEY);
  if (stored === undefined) {
    return createDefaultFormationState();
  }
  return isValidFormationState(stored) ? cloneFormationState(stored) : null;
}

function restorePurchaseState(
  registry: Phaser.Data.DataManager,
  previousFormation: FormationState,
  previousGold: number,
): void {
  setFormationState(registry, previousFormation);
  setPlayerGold(registry, previousGold);
}

export function tryPurchaseShopOffer(
  registry: Phaser.Data.DataManager,
  offerId: string,
): ShopPurchaseResult {
  const offer = getShopOffer(offerId);
  if (!offer) {
    return { ok: false, reason: "UNKNOWN_OFFER" };
  }

  const storedGold = registry.get(PLAYER_GOLD_REGISTRY_KEY);
  if (storedGold !== undefined && !isValidPlayerGold(storedGold)) {
    return { ok: false, reason: "INVALID_GOLD" };
  }
  const currentGold = storedGold === undefined ? 0 : storedGold;

  const formation = readFormationForPurchase(registry);
  if (!formation) {
    return { ok: false, reason: "INVALID_FORMATION" };
  }
  if (formation.ownedUnits.some((unit) => unit.rosterUnitId === offer.rosterUnitId)) {
    return { ok: false, reason: "ALREADY_OWNED" };
  }
  if (formation.ownedUnits.length >= MAX_OWNED_UNIT_COUNT) {
    return { ok: false, reason: "ROSTER_FULL" };
  }
  if (currentGold < offer.price) {
    return { ok: false, reason: "INSUFFICIENT_GOLD" };
  }

  const definition = getAllyUnitDefinition(offer.unitDefinitionId);
  const ownedUnit = createOwnedUnitFromOffer(offer);
  if (!definition || definition.unitRole !== "MERCENARY" || definition.displayName !== ownedUnit.displayName) {
    return { ok: false, reason: "INVALID_FORMATION" };
  }

  const previousFormation = cloneFormationState(formation);
  const nextFormation = cloneFormationState(formation);
  nextFormation.ownedUnits.push(ownedUnit);
  if (!isValidFormationState(nextFormation)) {
    return { ok: false, reason: "INVALID_FORMATION" };
  }

  try {
    setFormationState(registry, nextFormation);
    const remainingGold = spendPlayerGold(registry, offer.price);
    if (remainingGold === null) {
      restorePurchaseState(registry, previousFormation, currentGold);
      return { ok: false, reason: "INVALID_GOLD" };
    }
    return { ok: true, offer, previousGold: currentGold, nextGold: remainingGold, ownedUnit };
  } catch {
    restorePurchaseState(registry, previousFormation, currentGold);
    return { ok: false, reason: "INVALID_FORMATION" };
  }
}
