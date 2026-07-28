export type ProgressionState = {
  level: number;
  experience: number;
};

export type ProgressionStats = {
  maxHp: number;
  attackDamage: number;
};

export type ExperienceGainResult = {
  previous: ProgressionState;
  next: ProgressionState;
  levelsGained: number;
};

export const PROGRESSION_CONFIG = {
  maxLevel: 99,
  battleEndBonusRate: 0.1,
  experienceToNextLevel: (currentLevel: number): number => Math.max(1, Math.floor(currentLevel)) * 1000,
  hpGrowthRatePerLevel: 0.1,
  attackGrowthRatePerLevel: 0.05,
} as const;

export const DEFAULT_PROGRESSION_STATE: ProgressionState = {
  level: 1,
  experience: 0,
};

function sanitizeLevel(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 1
    ? Math.min(PROGRESSION_CONFIG.maxLevel, value as number)
    : DEFAULT_PROGRESSION_STATE.level;
}

function sanitizeExperience(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 0
    ? value as number
    : DEFAULT_PROGRESSION_STATE.experience;
}

export function normalizeProgressionState(value: unknown): ProgressionState {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PROGRESSION_STATE };
  }

  const candidate = value as Partial<ProgressionState>;
  return {
    level: sanitizeLevel(candidate.level),
    experience: sanitizeExperience(candidate.experience),
  };
}

export function getExperienceToNextLevel(currentLevel: number): number {
  if (!Number.isSafeInteger(currentLevel) || currentLevel < 1 || currentLevel >= PROGRESSION_CONFIG.maxLevel) {
    return 0;
  }
  return PROGRESSION_CONFIG.experienceToNextLevel(currentLevel);
}

export function getCumulativeExperienceRequiredForLevel(level: number): number {
  const safeLevel = Math.min(PROGRESSION_CONFIG.maxLevel, Math.max(1, Math.floor(level)));
  let total = 0;
  for (let currentLevel = 1; currentLevel < safeLevel; currentLevel += 1) {
    total += PROGRESSION_CONFIG.experienceToNextLevel(currentLevel);
  }
  return total;
}

export function calculateProgressionStats(
  baseMaxHp: number,
  baseAttackDamage: number,
  level: number,
): ProgressionStats {
  const safeLevel = sanitizeLevel(level);
  const safeMaxHp = Number.isFinite(baseMaxHp) && baseMaxHp > 0 ? baseMaxHp : 1;
  const safeAttackDamage = Number.isFinite(baseAttackDamage) && baseAttackDamage > 0 ? baseAttackDamage : 1;
  return {
    maxHp: Math.max(1, Math.round(safeMaxHp * (1 + PROGRESSION_CONFIG.hpGrowthRatePerLevel * (safeLevel - 1)))),
    attackDamage: Math.max(1, Math.round(safeAttackDamage * (1 + PROGRESSION_CONFIG.attackGrowthRatePerLevel * (safeLevel - 1)))),
  };
}

export function addExperience(state: ProgressionState, amount: number): ExperienceGainResult {
  const previous = normalizeProgressionState(state);
  const safeAmount = Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
  const nextExperience = Math.min(Number.MAX_SAFE_INTEGER, previous.experience + safeAmount);
  let level = previous.level;
  while (
    level < PROGRESSION_CONFIG.maxLevel &&
    nextExperience >= getCumulativeExperienceRequiredForLevel(level + 1)
  ) {
    level += 1;
  }

  const next = { level, experience: nextExperience };
  return {
    previous,
    next,
    levelsGained: next.level - previous.level,
  };
}

export function calculateBattleEndBonusExperience(totalDirectExperience: number): number {
  if (!Number.isSafeInteger(totalDirectExperience) || totalDirectExperience < 0 ||
    !Number.isFinite(PROGRESSION_CONFIG.battleEndBonusRate) || PROGRESSION_CONFIG.battleEndBonusRate <= 0) {
    return 0;
  }
  return Math.floor(totalDirectExperience * PROGRESSION_CONFIG.battleEndBonusRate);
}

export function formatProgression(state: ProgressionState): string {
  const safeState = normalizeProgressionState(state);
  if (safeState.level >= PROGRESSION_CONFIG.maxLevel) {
    return `Lv.${safeState.level} MAX · EXP ${safeState.experience.toLocaleString()}`;
  }
  const currentLevelStart = getCumulativeExperienceRequiredForLevel(safeState.level);
  const currentLevelExperience = Math.max(0, safeState.experience - currentLevelStart);
  return `Lv.${safeState.level} · EXP ${currentLevelExperience.toLocaleString()} / ${getExperienceToNextLevel(safeState.level).toLocaleString()}`;
}
