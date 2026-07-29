import type Phaser from "phaser";
import { FORMATION_REGISTRY_KEY, INVENTORY_REGISTRY_KEY } from "./constants";
import { calculateProgressionStats } from "./progression";
import type { OwnedRosterUnit } from "./rtsBattleTypes";

export type ItemType = "EQUIPMENT";
export type EquipmentKind = "COMMON" | "UNIQUE";
export type EquipmentSlotId = "weapon" | "armor" | "accessory";
export type WeaponCategory = "melee" | "ranged" | "magic";
export type EquipRestriction = "ALL_UNITS" | "SPECIFIC_UNITS";

export type EquipmentSlotDefinition = {
  id: EquipmentSlotId;
  label: string;
};

export const EQUIPMENT_SLOT_DEFINITIONS: readonly EquipmentSlotDefinition[] = [
  { id: "weapon", label: "Weapon" },
  { id: "armor", label: "Armor" },
  { id: "accessory", label: "Accessory" },
] as const;

export type StatModifier = {
  statId: string;
  value: number;
};

export type ItemDefinition = {
  itemDefinitionId: string;
  displayName: string;
  description: string;
  itemType: ItemType;
  equipmentKind: EquipmentKind;
  slotType: EquipmentSlotId;
  weaponCategory?: WeaponCategory;
  equipRestriction: EquipRestriction;
  allowedUnitDefinitionIds?: readonly string[];
  modifiers: readonly StatModifier[];
};

export type ItemInstance = {
  itemInstanceId: string;
  itemDefinitionId: string;
  acquiredSequence: number;
};

export type EquipmentSlots = Record<EquipmentSlotId, string | null>;

export type InventoryState = {
  itemInstances: ItemInstance[];
  equipmentByRosterUnitId: Record<string, EquipmentSlots>;
  nextItemInstanceSequence: number;
};

export type MonsterDropEntry = {
  itemDefinitionId: string;
  dropChance: number;
};

export type EquipFailureReason =
  | "ITEM_NOT_FOUND"
  | "ITEM_ALREADY_EQUIPPED"
  | "NOT_EQUIPMENT"
  | "UNIT_NOT_FOUND"
  | "SLOT_MISMATCH"
  | "WEAPON_INCOMPATIBLE"
  | "UNIT_RESTRICTED";

export type EquipmentMutationResult =
  | { ok: true; state: InventoryState; replacedItemInstanceId: string | null }
  | { ok: false; state: InventoryState; reason: EquipFailureReason };

export type UnequipResult =
  | { ok: true; state: InventoryState; itemInstanceId: string }
  | { ok: false; state: InventoryState; reason: "UNIT_NOT_FOUND" | "SLOT_EMPTY" };

export type FinalUnitStats = {
  maxHp: number;
  attackDamage: number;
  defense: number;
};

const ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  {
    itemDefinitionId: "training-blade",
    displayName: "Training Blade",
    description: "A dependable melee practice weapon.",
    itemType: "EQUIPMENT",
    equipmentKind: "COMMON",
    slotType: "weapon",
    weaponCategory: "melee",
    equipRestriction: "ALL_UNITS",
    modifiers: [{ statId: "attack", value: 5 }],
  },
  {
    itemDefinitionId: "training-bow",
    displayName: "Training Bow",
    description: "A simple ranged practice weapon.",
    itemType: "EQUIPMENT",
    equipmentKind: "COMMON",
    slotType: "weapon",
    weaponCategory: "ranged",
    equipRestriction: "ALL_UNITS",
    modifiers: [{ statId: "attack", value: 5 }],
  },
  {
    itemDefinitionId: "apprentice-staff",
    displayName: "Apprentice Staff",
    description: "A basic magic weapon for spell users.",
    itemType: "EQUIPMENT",
    equipmentKind: "COMMON",
    slotType: "weapon",
    weaponCategory: "magic",
    equipRestriction: "ALL_UNITS",
    modifiers: [{ statId: "attack", value: 5 }],
  },
  {
    itemDefinitionId: "leather-armor",
    displayName: "Leather Armor",
    description: "Light armor that improves defense.",
    itemType: "EQUIPMENT",
    equipmentKind: "COMMON",
    slotType: "armor",
    equipRestriction: "ALL_UNITS",
    modifiers: [{ statId: "defense", value: 8 }],
  },
  {
    itemDefinitionId: "life-charm",
    displayName: "Life Charm",
    description: "A charm that increases maximum HP.",
    itemType: "EQUIPMENT",
    equipmentKind: "COMMON",
    slotType: "accessory",
    equipRestriction: "ALL_UNITS",
    modifiers: [{ statId: "maxHp", value: 30 }],
  },
  {
    itemDefinitionId: "heros-oathblade",
    displayName: "Hero's Oathblade",
    description: "A unique blade sworn to the main character.",
    itemType: "EQUIPMENT",
    equipmentKind: "UNIQUE",
    slotType: "weapon",
    weaponCategory: "melee",
    equipRestriction: "SPECIFIC_UNITS",
    allowedUnitDefinitionIds: ["trial-main-character"],
    modifiers: [{ statId: "attack", value: 12 }],
  },
] as const;

export const ITEM_DEFINITIONS_BY_ID: Readonly<Record<string, ItemDefinition>> =
  Object.fromEntries(ITEM_DEFINITIONS.map((definition) => [definition.itemDefinitionId, definition]));

export const MONSTER_DROP_TABLES: Readonly<Record<string, readonly MonsterDropEntry[]>> = {
  "slime-1": [{ itemDefinitionId: "training-blade", dropChance: 0.35 }],
  "slime-2": [{ itemDefinitionId: "training-bow", dropChance: 0.35 }],
  "slime-3": [{ itemDefinitionId: "apprentice-staff", dropChance: 0.35 }],
  "slime-4": [
    { itemDefinitionId: "leather-armor", dropChance: 0.3 },
    { itemDefinitionId: "life-charm", dropChance: 0.25 },
    { itemDefinitionId: "heros-oathblade", dropChance: 0.2 },
  ],
};

function createEmptyEquipmentSlots(): EquipmentSlots {
  return Object.fromEntries(
    EQUIPMENT_SLOT_DEFINITIONS.map((slot) => [slot.id, null]),
  ) as EquipmentSlots;
}

function isSafePositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

function isValidEquipmentSlotId(value: unknown): value is EquipmentSlotId {
  return EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.id === value);
}

export function getItemDefinition(itemDefinitionId: string): ItemDefinition | null {
  return ITEM_DEFINITIONS_BY_ID[itemDefinitionId] ?? null;
}

export function getAllItemDefinitions(): readonly ItemDefinition[] {
  return ITEM_DEFINITIONS;
}

export function getMonsterDropTable(monsterId: string): readonly MonsterDropEntry[] {
  return MONSTER_DROP_TABLES[monsterId] ?? [];
}

export function isValidInventoryState(value: unknown): value is InventoryState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<InventoryState>;
  return Array.isArray(candidate.itemInstances) &&
    Boolean(candidate.equipmentByRosterUnitId) &&
    typeof candidate.equipmentByRosterUnitId === "object" &&
    isSafePositiveInteger(candidate.nextItemInstanceSequence);
}

export function normalizeInventoryState(value: unknown): InventoryState {
  const candidate = value && typeof value === "object" ? value as Partial<InventoryState> : {};
  const itemInstances: ItemInstance[] = [];
  const instanceIds = new Set<string>();
  const acquiredSequences = new Set<number>();
  for (const item of Array.isArray(candidate.itemInstances) ? candidate.itemInstances : []) {
    if (!item || typeof item !== "object" ||
      typeof item.itemInstanceId !== "string" ||
      item.itemInstanceId.length === 0 ||
      instanceIds.has(item.itemInstanceId) ||
      typeof item.itemDefinitionId !== "string" ||
      !getItemDefinition(item.itemDefinitionId) ||
      !isSafePositiveInteger(item.acquiredSequence) ||
      acquiredSequences.has(item.acquiredSequence)) {
      continue;
    }
    itemInstances.push({
      itemInstanceId: item.itemInstanceId,
      itemDefinitionId: item.itemDefinitionId,
      acquiredSequence: item.acquiredSequence,
    });
    instanceIds.add(item.itemInstanceId);
    acquiredSequences.add(item.acquiredSequence);
  }

  const equipmentByRosterUnitId: Record<string, EquipmentSlots> = {};
  const equippedInstanceIds = new Set<string>();
  const storedEquipment = candidate.equipmentByRosterUnitId;
  if (storedEquipment && typeof storedEquipment === "object") {
    for (const [rosterUnitId, rawSlots] of Object.entries(storedEquipment)) {
      if (!rosterUnitId || !rawSlots || typeof rawSlots !== "object") {
        continue;
      }
      const slots = createEmptyEquipmentSlots();
      for (const slot of EQUIPMENT_SLOT_DEFINITIONS) {
        const itemInstanceId = (rawSlots as Record<string, unknown>)[slot.id];
        if (typeof itemInstanceId === "string" &&
          instanceIds.has(itemInstanceId) &&
          !equippedInstanceIds.has(itemInstanceId)) {
          slots[slot.id] = itemInstanceId;
          equippedInstanceIds.add(itemInstanceId);
        }
      }
      equipmentByRosterUnitId[rosterUnitId] = slots;
    }
  }

  const storedNext = candidate.nextItemInstanceSequence;
  let nextItemInstanceSequence = isSafePositiveInteger(storedNext) ? storedNext : 1;
  while (instanceIds.has("item-" + nextItemInstanceSequence)) {
    nextItemInstanceSequence += 1;
  }
  return { itemInstances, equipmentByRosterUnitId, nextItemInstanceSequence };
}

export function normalizeInventoryStateForOwnedUnits(
  value: unknown,
  ownedRosterUnitIds: ReadonlySet<string>,
): InventoryState {
  const normalized = normalizeInventoryState(value);
  return {
    ...normalized,
    equipmentByRosterUnitId: Object.fromEntries(
      Object.entries(normalized.equipmentByRosterUnitId)
        .filter(([rosterUnitId]) => ownedRosterUnitIds.has(rosterUnitId))
        .map(([rosterUnitId, slots]) => [rosterUnitId, { ...slots }]),
    ),
  };
}

export function cloneInventoryState(state: InventoryState): InventoryState {
  const normalized = normalizeInventoryState(state);
  return {
    itemInstances: normalized.itemInstances.map((item) => ({ ...item })),
    equipmentByRosterUnitId: Object.fromEntries(
      Object.entries(normalized.equipmentByRosterUnitId).map(([rosterUnitId, slots]) => [
        rosterUnitId,
        { ...slots },
      ]),
    ),
    nextItemInstanceSequence: normalized.nextItemInstanceSequence,
  };
}

export function getOrCreateInventoryState(registry: Phaser.Data.DataManager): InventoryState {
  const stored = registry.get(INVENTORY_REGISTRY_KEY);
  if (isValidInventoryState(stored)) {
    return normalizeInventoryState(stored);
  }
  const fallback = normalizeInventoryState(undefined);
  registry.set(INVENTORY_REGISTRY_KEY, cloneInventoryState(fallback));
  return fallback;
}

export function setInventoryState(registry: Phaser.Data.DataManager, state: InventoryState): void {
  registry.set(INVENTORY_REGISTRY_KEY, cloneInventoryState(state));
}

export function addItemDefinitionsToInventory(
  registry: Phaser.Data.DataManager,
  itemDefinitionIds: readonly string[],
): { itemInstanceIds: string[]; state: InventoryState } {
  const nextState = cloneInventoryState(getOrCreateInventoryState(registry));
  const itemInstanceIds: string[] = [];
  for (const itemDefinitionId of itemDefinitionIds) {
    if (!getItemDefinition(itemDefinitionId)) {
      continue;
    }
    const sequence = nextState.nextItemInstanceSequence;
    const itemInstanceId = "item-" + sequence;
    nextState.itemInstances.push({ itemInstanceId, itemDefinitionId, acquiredSequence: sequence });
    nextState.nextItemInstanceSequence += 1;
    itemInstanceIds.push(itemInstanceId);
  }
  setInventoryState(registry, nextState);
  return { itemInstanceIds, state: nextState };
}

export function rollDrops(
  dropTable: readonly MonsterDropEntry[],
  randomFn: () => number = Math.random,
): string[] {
  return dropTable.flatMap((entry) => {
    const definition = getItemDefinition(entry.itemDefinitionId);
    const chance = entry.dropChance;
    if (!definition || !Number.isFinite(chance) || chance < 0 || chance > 1) {
      return [];
    }
    const roll = randomFn();
    return Number.isFinite(roll) && roll >= 0 && roll < chance ? [entry.itemDefinitionId] : [];
  });
}

function getEquipmentSlots(state: InventoryState, rosterUnitId: string): EquipmentSlots {
  return state.equipmentByRosterUnitId[rosterUnitId] ?? createEmptyEquipmentSlots();
}

export function getEquippedItemInstanceId(
  state: InventoryState,
  rosterUnitId: string,
  slotType: EquipmentSlotId,
): string | null {
  return getEquipmentSlots(state, rosterUnitId)[slotType];
}

export function getEquippedItemInstanceIds(state: InventoryState): Set<string> {
  const equipped = new Set<string>();
  for (const slots of Object.values(state.equipmentByRosterUnitId)) {
    for (const itemInstanceId of Object.values(slots)) {
      if (itemInstanceId) {
        equipped.add(itemInstanceId);
      }
    }
  }
  return equipped;
}

export function getAvailableItemInstances(state: InventoryState): ItemInstance[] {
  const equipped = getEquippedItemInstanceIds(state);
  return state.itemInstances
    .filter((item) => !equipped.has(item.itemInstanceId))
    .sort((first, second) => first.acquiredSequence - second.acquiredSequence);
}

export function getEquippedModifierTotals(
  state: InventoryState,
  rosterUnitId: string,
): Record<string, number> {
  const itemById = new Map(state.itemInstances.map((item) => [item.itemInstanceId, item]));
  const totals: Record<string, number> = {};
  for (const itemInstanceId of Object.values(getEquipmentSlots(state, rosterUnitId))) {
    if (!itemInstanceId) {
      continue;
    }
    const item = itemById.get(itemInstanceId);
    const definition = item ? getItemDefinition(item.itemDefinitionId) : null;
    definition?.modifiers.forEach((modifier) => {
      if (!Number.isFinite(modifier.value)) {
        return;
      }
      totals[modifier.statId] = (totals[modifier.statId] ?? 0) + modifier.value;
    });
  }
  return totals;
}

export function calculateFinalUnitStats(
  baseMaxHp: number,
  baseAttackDamage: number,
  baseDefense: number,
  level: number,
  equipmentModifiers: Record<string, number>,
): FinalUnitStats {
  const progression = calculateProgressionStats(baseMaxHp, baseAttackDamage, level);
  const attackBonus = Number.isFinite(equipmentModifiers.attack) ? equipmentModifiers.attack : 0;
  const maxHpBonus = Number.isFinite(equipmentModifiers.maxHp) ? equipmentModifiers.maxHp : 0;
  const defenseBonus = Number.isFinite(equipmentModifiers.defense) ? equipmentModifiers.defense : 0;
  return {
    maxHp: Math.max(1, Math.round(progression.maxHp + maxHpBonus)),
    attackDamage: Math.max(1, Math.round(progression.attackDamage + attackBonus)),
    defense: Math.max(0, Math.round((Number.isFinite(baseDefense) ? baseDefense : 0) + defenseBonus)),
  };
}

function findEquippedItem(
  state: InventoryState,
  itemInstanceId: string,
): { rosterUnitId: string; slotType: EquipmentSlotId } | null {
  for (const [rosterUnitId, slots] of Object.entries(state.equipmentByRosterUnitId)) {
    for (const slot of EQUIPMENT_SLOT_DEFINITIONS) {
      if (slots[slot.id] === itemInstanceId) {
        return { rosterUnitId, slotType: slot.id };
      }
    }
  }
  return null;
}

export function getEquipFailureReason(
  state: InventoryState,
  rosterUnitId: string,
  unitDefinitionId: string,
  allowedWeaponCategories: readonly WeaponCategory[],
  itemInstanceId: string,
): EquipFailureReason | null {
  const item = state.itemInstances.find((candidate) => candidate.itemInstanceId === itemInstanceId);
  if (!item) {
    return "ITEM_NOT_FOUND";
  }
  const definition = getItemDefinition(item.itemDefinitionId);
  if (!definition) {
    return "NOT_EQUIPMENT";
  }
  if (!unitDefinitionId) {
    return "UNIT_NOT_FOUND";
  }
  const equippedAt = findEquippedItem(state, itemInstanceId);
  const currentSlotItem = getEquippedItemInstanceId(state, rosterUnitId, definition.slotType);
  if (equippedAt && (equippedAt.rosterUnitId !== rosterUnitId || equippedAt.slotType !== definition.slotType)) {
    return "ITEM_ALREADY_EQUIPPED";
  }
  if (definition.slotType !== "weapon" && definition.weaponCategory !== undefined) {
    return "SLOT_MISMATCH";
  }
  if (definition.slotType === "weapon" &&
    (!definition.weaponCategory || !allowedWeaponCategories.includes(definition.weaponCategory))) {
    return "WEAPON_INCOMPATIBLE";
  }
  if (definition.equipRestriction === "SPECIFIC_UNITS" &&
    !definition.allowedUnitDefinitionIds?.includes(unitDefinitionId)) {
    return "UNIT_RESTRICTED";
  }
  if (currentSlotItem === itemInstanceId) {
    return null;
  }
  return null;
}

export function equipItem(
  state: InventoryState,
  rosterUnitId: string,
  unitDefinitionId: string,
  allowedWeaponCategories: readonly WeaponCategory[],
  itemInstanceId: string,
): EquipmentMutationResult {
  const normalized = cloneInventoryState(state);
  const reason = getEquipFailureReason(
    normalized,
    rosterUnitId,
    unitDefinitionId,
    allowedWeaponCategories,
    itemInstanceId,
  );
  if (reason) {
    return { ok: false, state: normalized, reason };
  }
  const item = normalized.itemInstances.find((candidate) => candidate.itemInstanceId === itemInstanceId);
  const definition = item ? getItemDefinition(item.itemDefinitionId) : null;
  if (!item || !definition || !isValidEquipmentSlotId(definition.slotType)) {
    return { ok: false, state: normalized, reason: "ITEM_NOT_FOUND" };
  }
  const slots = getEquipmentSlots(normalized, rosterUnitId);
  const replacedItemInstanceId = slots[definition.slotType];
  for (const rosterSlots of Object.values(normalized.equipmentByRosterUnitId)) {
    for (const slot of EQUIPMENT_SLOT_DEFINITIONS) {
      if (rosterSlots[slot.id] === itemInstanceId) {
        rosterSlots[slot.id] = null;
      }
    }
  }
  normalized.equipmentByRosterUnitId[rosterUnitId] = { ...slots, [definition.slotType]: itemInstanceId };
  return { ok: true, state: normalized, replacedItemInstanceId };
}

export function tryEquipItem(
  registry: Phaser.Data.DataManager,
  rosterUnitId: string,
  unit: OwnedRosterUnit,
  allowedWeaponCategories: readonly WeaponCategory[],
  itemInstanceId: string,
): EquipmentMutationResult {
  const current = getOrCreateInventoryState(registry);
  const ownedUnit = getOwnedUnitFromRegistry(registry, rosterUnitId);
  if (!ownedUnit || unit.rosterUnitId !== rosterUnitId ||
    ownedUnit.unitDefinitionId !== unit.unitDefinitionId || ownedUnit.unitRole !== unit.unitRole) {
    return { ok: false, state: cloneInventoryState(current), reason: "UNIT_NOT_FOUND" };
  }
  const result = equipItem(
    current,
    rosterUnitId,
    unit.unitDefinitionId,
    allowedWeaponCategories,
    itemInstanceId,
  );
  if (result.ok) {
    setInventoryState(registry, result.state);
  }
  return result;
}

export function unequipItem(
  state: InventoryState,
  rosterUnitId: string,
  slotType: EquipmentSlotId,
): UnequipResult {
  const normalized = cloneInventoryState(state);
  const slots = normalized.equipmentByRosterUnitId[rosterUnitId];
  if (!slots) {
    return { ok: false, state: normalized, reason: "UNIT_NOT_FOUND" };
  }
  const itemInstanceId = slots[slotType];
  if (!itemInstanceId) {
    return { ok: false, state: normalized, reason: "SLOT_EMPTY" };
  }
  normalized.equipmentByRosterUnitId[rosterUnitId] = { ...slots, [slotType]: null };
  return { ok: true, state: normalized, itemInstanceId };
}

export function tryUnequipItem(
  registry: Phaser.Data.DataManager,
  rosterUnitId: string,
  unit: OwnedRosterUnit,
  slotType: EquipmentSlotId,
): UnequipResult {
  const current = getOrCreateInventoryState(registry);
  const ownedUnit = getOwnedUnitFromRegistry(registry, rosterUnitId);
  if (!ownedUnit || unit.rosterUnitId !== rosterUnitId ||
    ownedUnit.unitDefinitionId !== unit.unitDefinitionId || ownedUnit.unitRole !== unit.unitRole) {
    return { ok: false, state: cloneInventoryState(current), reason: "UNIT_NOT_FOUND" };
  }
  const result = unequipItem(current, rosterUnitId, slotType);
  if (result.ok) {
    setInventoryState(registry, result.state);
  }
  return result;
}

function getOwnedUnitFromRegistry(
  registry: Phaser.Data.DataManager,
  rosterUnitId: string,
): OwnedRosterUnit | null {
  const stored = registry.get(FORMATION_REGISTRY_KEY) as { ownedUnits?: unknown } | undefined;
  if (!stored || !Array.isArray(stored.ownedUnits)) {
    return null;
  }
  const unit = stored.ownedUnits.find((candidate): candidate is OwnedRosterUnit => {
    if (!candidate || typeof candidate !== "object") {
      return false;
    }
    const record = candidate as Partial<OwnedRosterUnit>;
    return record.rosterUnitId === rosterUnitId &&
      typeof record.unitDefinitionId === "string" &&
      (record.unitRole === "MAIN_CHARACTER" || record.unitRole === "MERCENARY");
  });
  return unit ?? null;
}

export function getItemDescription(itemInstance: ItemInstance): string {
  const definition = getItemDefinition(itemInstance.itemDefinitionId);
  if (!definition) {
    return "Unknown item";
  }
  const modifiers = definition.modifiers
    .map((modifier) => modifier.statId + " " + (modifier.value >= 0 ? "+" : "") + modifier.value)
    .join(", ");
  const weapon = definition.weaponCategory ? " · " + definition.weaponCategory : "";
  return definition.displayName + " · " + definition.equipmentKind + " · " + definition.slotType + weapon + " · " + modifiers;
}

export function calculatePhysicalDamage(rawDamage: number, defense: number): number {
  const safeRawDamage = Number.isFinite(rawDamage) ? Math.max(0, rawDamage) : 0;
  const safeDefense = Number.isFinite(defense) ? Math.max(0, defense) : 0;
  return Math.max(1, Math.round(safeRawDamage * 100 / (100 + safeDefense)));
}
