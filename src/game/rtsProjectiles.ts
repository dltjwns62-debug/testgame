import type { BattlePosition, ProjectileVisualType } from "./rtsBattleTypes";

export type ActiveProjectile = {
  id: string;
  ownerUnitId: string;
  targetUnitId: string;
  projectileType: ProjectileVisualType;
  speed: number;
  basicDamage: number;
  damage: number;
  position: BattlePosition;
  impactApplied: boolean;
};

export type ProjectileAdvanceResult = {
  projectile: ActiveProjectile;
  reachedTarget: boolean;
  valid: boolean;
};

export function advanceProjectile(
  projectile: ActiveProjectile,
  targetPosition: BattlePosition,
  deltaMs: number,
): ProjectileAdvanceResult {
  if (!Number.isFinite(projectile.speed) || projectile.speed <= 0 || projectile.impactApplied ||
    !Number.isFinite(deltaMs) || deltaMs < 0 || !Number.isFinite(targetPosition.x) || !Number.isFinite(targetPosition.y)) {
    return { projectile, reachedTarget: false, valid: false };
  }
  const dx = targetPosition.x - projectile.position.x;
  const dy = targetPosition.y - projectile.position.y;
  const distance = Math.hypot(dx, dy);
  const travel = projectile.speed * Math.min(deltaMs, 250) / 1000;
  if (!Number.isFinite(distance) || distance <= travel || distance <= 1) {
    projectile.position = { x: targetPosition.x, y: targetPosition.y };
    return { projectile, reachedTarget: true, valid: true };
  }
  projectile.position = {
    x: projectile.position.x + dx / distance * travel,
    y: projectile.position.y + dy / distance * travel,
  };
  return { projectile, reachedTarget: false, valid: true };
}

export function isPositionInRadius(position: BattlePosition, center: BattlePosition, radius: number): boolean {
  if (!Number.isFinite(radius) || radius < 0 || !Number.isFinite(position.x) || !Number.isFinite(position.y) ||
    !Number.isFinite(center.x) || !Number.isFinite(center.y)) return false;
  return Math.hypot(position.x - center.x, position.y - center.y) <= radius;
}

export function resolveProjectileImpact(projectile: ActiveProjectile, targetAlive: boolean): boolean {
  if (projectile.impactApplied || !targetAlive) return false;
  projectile.impactApplied = true;
  return true;
}
