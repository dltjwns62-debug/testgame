import type { OwnedRosterUnit } from "./rtsBattleTypes";

export type ShopOffer = {
  offerId: string;
  displayName: string;
  price: number;
  unitDefinitionId: string;
  rosterUnitId: string;
  description: string;
};

export const SHOP_OFFERS: readonly ShopOffer[] = [
  {
    offerId: "recruit-swordsman",
    displayName: "Swordsman",
    price: 20,
    unitDefinitionId: "mercenary-swordsman",
    rosterUnitId: "owned-swordsman",
    description: "Balanced melee mercenary.",
  },
  {
    offerId: "recruit-guardian",
    displayName: "Guardian",
    price: 35,
    unitDefinitionId: "mercenary-guardian",
    rosterUnitId: "owned-guardian",
    description: "Durable frontline mercenary.",
  },
  {
    offerId: "recruit-scout",
    displayName: "Scout",
    price: 50,
    unitDefinitionId: "mercenary-scout",
    rosterUnitId: "owned-scout",
    description: "Fast melee mercenary.",
  },
] as const;

export function getShopOffer(offerId: string): ShopOffer | null {
  return SHOP_OFFERS.find((offer) => offer.offerId === offerId) ?? null;
}

export function createOwnedUnitFromOffer(offer: ShopOffer): OwnedRosterUnit {
  return {
    rosterUnitId: offer.rosterUnitId,
    unitDefinitionId: offer.unitDefinitionId,
    unitRole: "MERCENARY",
    displayName: offer.displayName,
  };
}
