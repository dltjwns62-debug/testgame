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
    };

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
};

export function getUnitSkillDefinition(skillId: UnitSkillId): UnitSkillDefinition | null {
  return UNIT_SKILL_DEFINITIONS[skillId] ?? null;
}
