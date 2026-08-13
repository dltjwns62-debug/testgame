import type { UnitSkillId } from "./rtsBattleTypes";

export type UnitSkillDefinition =
  | {
      id: "whirlwind";
      name: "Whirlwind";
      shortDescription: string;
      cooldownMs: number;
      hotkey: "Q";
      effectType: "AREA_DAMAGE";
      damage: number;
      effectRadius: number;
    }
  | {
      id: "first-aid";
      name: "First Aid";
      shortDescription: string;
      cooldownMs: number;
      hotkey: "W";
      effectType: "SELF_HEAL";
      healAmount: number;
    }
  | {
      id: "meteor";
      name: "Meteor";
      shortDescription: string;
      cooldownMs: number;
      hotkey: "E";
      effectType: "GROUND_AREA_DAMAGE";
      damage: number;
      effectRadius: number;
      castDelayMs: number;
    };

export const UNIT_SKILL_IDS: readonly UnitSkillId[] = ["whirlwind", "first-aid", "meteor"];

export const UNIT_SKILL_DEFINITIONS: Readonly<Record<UnitSkillId, UnitSkillDefinition>> = {
  whirlwind: {
    id: "whirlwind",
    name: "Whirlwind",
    shortDescription: "Nearby enemies take melee area damage.",
    cooldownMs: 6000,
    hotkey: "Q",
    effectType: "AREA_DAMAGE",
    damage: 18,
    effectRadius: 52,
  },
  "first-aid": {
    id: "first-aid",
    name: "First Aid",
    shortDescription: "Restore the caster's HP.",
    cooldownMs: 8000,
    hotkey: "W",
    effectType: "SELF_HEAL",
    healAmount: 25,
  },
  meteor: {
    id: "meteor",
    name: "Meteor",
    shortDescription: "Target the ground for delayed area damage.",
    cooldownMs: 9000,
    hotkey: "E",
    effectType: "GROUND_AREA_DAMAGE",
    damage: 30,
    effectRadius: 72,
    castDelayMs: 450,
  },
};

export function getUnitSkillDefinition(skillId: UnitSkillId): UnitSkillDefinition | null {
  return UNIT_SKILL_DEFINITIONS[skillId] ?? null;
}
