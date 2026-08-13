import type { BasicAttackProc } from "./rtsBattleTypes";

export function shouldTriggerProc(chance: number, roll: number): boolean {
  return Number.isFinite(chance) && chance > 0 && Number.isFinite(roll) && roll >= 0 && roll < chance;
}

export function calculateProcDamage(basicDamage: number, proc: BasicAttackProc): number {
  if (!Number.isFinite(basicDamage) || basicDamage <= 0 || !Number.isFinite(proc.damageMultiplier) || proc.damageMultiplier <= 0) {
    return 0;
  }
  return Math.max(1, Math.floor(basicDamage * proc.damageMultiplier));
}

export function isValidProjectileSpeed(speed: number): boolean {
  return Number.isFinite(speed) && speed > 0 && speed <= 5000;
}
