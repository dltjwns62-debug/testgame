import type Phaser from "phaser";
import { PLAYER_GOLD_REGISTRY_KEY } from "./constants";

export function isValidPlayerGold(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function isValidGoldAmount(value: unknown): value is number {
  return isValidPlayerGold(value);
}

export function getOrCreatePlayerGold(registry: Phaser.Data.DataManager): number {
  const stored = registry.get(PLAYER_GOLD_REGISTRY_KEY);
  if (isValidPlayerGold(stored)) {
    return stored;
  }

  registry.set(PLAYER_GOLD_REGISTRY_KEY, 0);
  return 0;
}

export function setPlayerGold(registry: Phaser.Data.DataManager, gold: number): void {
  if (!isValidPlayerGold(gold)) {
    throw new Error("Invalid player gold");
  }
  registry.set(PLAYER_GOLD_REGISTRY_KEY, gold);
}

export function addPlayerGold(registry: Phaser.Data.DataManager, amount: number): number | null {
  if (!isValidGoldAmount(amount)) {
    return null;
  }

  const currentGold = getOrCreatePlayerGold(registry);
  if (currentGold > Number.MAX_SAFE_INTEGER - amount) {
    return null;
  }

  const nextGold = currentGold + amount;
  setPlayerGold(registry, nextGold);
  return nextGold;
}

export function spendPlayerGold(registry: Phaser.Data.DataManager, amount: number): number | null {
  if (!isValidGoldAmount(amount)) {
    return null;
  }

  const currentGold = getOrCreatePlayerGold(registry);
  if (currentGold < amount) {
    return null;
  }

  const nextGold = currentGold - amount;
  setPlayerGold(registry, nextGold);
  return nextGold;
}
