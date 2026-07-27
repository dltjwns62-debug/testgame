import { RTS_ARENA_BOUNDS, RTS_FORMATION_SPACING, RTS_MOVE_ARRIVAL_EPSILON } from "./constants";
import type { BattlePosition, RTSBattleUnit } from "./rtsBattleTypes";

export function clampNumber(value: number, min: number, max: number): number {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? Math.max(safeMin, max) : safeMin;
  if (!Number.isFinite(value)) {
    return safeMin + (safeMax - safeMin) / 2;
  }
  return Math.min(safeMax, Math.max(safeMin, value));
}

export function distanceBetween(first: BattlePosition, second: BattlePosition): number {
  const distance = Math.hypot(second.x - first.x, second.y - first.y);
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY;
}

export function constrainToArena(position: BattlePosition, radius: number): BattlePosition {
  const safeRadius = Number.isFinite(radius) ? Math.max(0, radius) : 0;
  return {
    x: clampNumber(position.x, RTS_ARENA_BOUNDS.left + safeRadius, RTS_ARENA_BOUNDS.right - safeRadius),
    y: clampNumber(position.y, RTS_ARENA_BOUNDS.top + safeRadius, RTS_ARENA_BOUNDS.bottom - safeRadius),
  };
}

export function isPointInRectangle(
  point: BattlePosition,
  start: BattlePosition,
  end: BattlePosition,
): boolean {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
}

export function createFormationDestinations(
  center: BattlePosition,
  count: number,
  unitRadius = 13,
): BattlePosition[] {
  const safeCount = Number.isSafeInteger(count) ? Math.max(0, count) : 0;
  if (safeCount === 0) {
    return [];
  }

  const safeRadius = Number.isFinite(unitRadius) ? Math.max(0, unitRadius) : 0;
  const columns = Math.max(1, Math.ceil(Math.sqrt(safeCount)));
  const rows = Math.max(1, Math.ceil(safeCount / columns));
  const offsets = Array.from({ length: safeCount }, (_, index) => ({
    x: (index % columns - (columns - 1) / 2) * RTS_FORMATION_SPACING,
    y: (Math.floor(index / columns) - (rows - 1) / 2) * RTS_FORMATION_SPACING,
  }));
  const minOffsetX = Math.min(...offsets.map((offset) => offset.x));
  const maxOffsetX = Math.max(...offsets.map((offset) => offset.x));
  const minOffsetY = Math.min(...offsets.map((offset) => offset.y));
  const maxOffsetY = Math.max(...offsets.map((offset) => offset.y));
  const safeCenter = constrainToArena(center, safeRadius);
  const centerX = clampNumber(
    safeCenter.x,
    RTS_ARENA_BOUNDS.left + safeRadius - minOffsetX,
    RTS_ARENA_BOUNDS.right - safeRadius - maxOffsetX,
  );
  const centerY = clampNumber(
    safeCenter.y,
    RTS_ARENA_BOUNDS.top + safeRadius - minOffsetY,
    RTS_ARENA_BOUNDS.bottom - safeRadius - maxOffsetY,
  );
  const destinations: BattlePosition[] = [];

  for (const offset of offsets) {
    destinations.push({
      x: centerX + offset.x,
      y: centerY + offset.y,
    });
  }

  return destinations;
}

export function findNearestAliveUnit(
  source: RTSBattleUnit,
  candidates: Iterable<RTSBattleUnit>,
  maxDistance = Number.POSITIVE_INFINITY,
): RTSBattleUnit | null {
  let nearest: RTSBattleUnit | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!candidate.isAlive) {
      continue;
    }

    const distance = distanceBetween(source.position, candidate.position);
    if (distance > maxDistance) {
      continue;
    }

    if (distance < nearestDistance ||
      (distance === nearestDistance && candidate.battleUnitId < (nearest?.battleUnitId ?? ""))) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function requiredAttackDistance(
  attacker: RTSBattleUnit,
  target: RTSBattleUnit,
): number {
  const attackRange = Number.isFinite(attacker.attackRange) ? Math.max(0, attacker.attackRange) : 0;
  const attackerRadius = Number.isFinite(attacker.collisionRadius) ? Math.max(0, attacker.collisionRadius) : 0;
  const targetRadius = Number.isFinite(target.collisionRadius) ? Math.max(0, target.collisionRadius) : 0;
  return attackRange + attackerRadius + targetRadius;
}

export function moveToward(
  unit: RTSBattleUnit,
  destination: BattlePosition,
  deltaMs: number,
): boolean {
  const safePosition = constrainToArena(unit.position, unit.collisionRadius);
  const safeDestination = constrainToArena(destination, unit.collisionRadius);
  unit.position = safePosition;
  const deltaX = safeDestination.x - safePosition.x;
  const deltaY = safeDestination.y - safePosition.y;
  const distance = Math.hypot(deltaX, deltaY);
  const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
  const safeSpeed = Number.isFinite(unit.moveSpeed) ? Math.max(0, unit.moveSpeed) : 0;
  const travelDistance = safeSpeed * (safeDeltaMs / 1000);

  if (!Number.isFinite(distance) || distance <= RTS_MOVE_ARRIVAL_EPSILON || travelDistance >= distance) {
    unit.position = safeDestination;
    return true;
  }

  unit.position = constrainToArena({
    x: unit.position.x + (deltaX / distance) * travelDistance,
    y: unit.position.y + (deltaY / distance) * travelDistance,
  }, unit.collisionRadius);
  return false;
}

export function separateNearbyUnits(units: Iterable<RTSBattleUnit>): void {
  const aliveUnits = [...units].filter((unit) => unit.isAlive);
  for (let firstIndex = 0; firstIndex < aliveUnits.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < aliveUnits.length; secondIndex += 1) {
      const first = aliveUnits[firstIndex];
      const second = aliveUnits[secondIndex];
      if (first.team !== second.team) {
        continue;
      }
      first.position = constrainToArena(first.position, first.collisionRadius);
      second.position = constrainToArena(second.position, second.collisionRadius);
      const deltaX = second.position.x - first.position.x;
      const deltaY = second.position.y - first.position.y;
      const distance = Math.hypot(deltaX, deltaY);
      const firstRadius = Number.isFinite(first.collisionRadius) ? Math.max(0, first.collisionRadius) : 0;
      const secondRadius = Number.isFinite(second.collisionRadius) ? Math.max(0, second.collisionRadius) : 0;
      const minimumDistance = firstRadius + secondRadius;

      if (!Number.isFinite(distance) || distance >= minimumDistance) {
        continue;
      }

      const push = (minimumDistance - distance) / 2;
      const normalX = distance === 0 ? (firstIndex % 2 === 0 ? 1 : 0) : deltaX / distance;
      const normalY = distance === 0 ? (firstIndex % 2 === 0 ? 0 : 1) : deltaY / distance;
      first.position = constrainToArena({
        x: first.position.x - normalX * push,
        y: first.position.y - normalY * push,
      }, firstRadius);
      second.position = constrainToArena({
        x: second.position.x + normalX * push,
        y: second.position.y + normalY * push,
      }, secondRadius);
    }
  }
}
