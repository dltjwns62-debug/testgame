import { RTS_ARENA_BOUNDS, RTS_FORMATION_SPACING } from "./constants";
import type { BattlePosition, RTSBattleUnit } from "./rtsBattleTypes";

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distanceBetween(first: BattlePosition, second: BattlePosition): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function constrainToArena(position: BattlePosition, radius: number): BattlePosition {
  return {
    x: clampNumber(position.x, RTS_ARENA_BOUNDS.left + radius, RTS_ARENA_BOUNDS.right - radius),
    y: clampNumber(position.y, RTS_ARENA_BOUNDS.top + radius, RTS_ARENA_BOUNDS.bottom - radius),
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
): BattlePosition[] {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const destinations: BattlePosition[] = [];

  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    destinations.push(constrainToArena({
      x: center.x + (column - (columns - 1) / 2) * RTS_FORMATION_SPACING,
      y: center.y + (row - (rows - 1) / 2) * RTS_FORMATION_SPACING,
    }, 12));
  }

  return destinations;
}

export function findNearestAliveUnit(
  source: RTSBattleUnit,
  candidates: Iterable<RTSBattleUnit>,
): RTSBattleUnit | null {
  let nearest: RTSBattleUnit | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!candidate.isAlive) {
      continue;
    }

    const distance = distanceBetween(source.position, candidate.position);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function moveToward(
  unit: RTSBattleUnit,
  destination: BattlePosition,
  deltaMs: number,
): boolean {
  const deltaX = destination.x - unit.position.x;
  const deltaY = destination.y - unit.position.y;
  const distance = Math.hypot(deltaX, deltaY);
  const travelDistance = unit.moveSpeed * (deltaMs / 1000);

  if (!Number.isFinite(distance) || distance <= 2 || travelDistance >= distance) {
    unit.position = constrainToArena(destination, unit.collisionRadius);
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
      const deltaX = second.position.x - first.position.x;
      const deltaY = second.position.y - first.position.y;
      const distance = Math.hypot(deltaX, deltaY);
      const minimumDistance = first.collisionRadius + second.collisionRadius;

      if (distance >= minimumDistance || distance === 0) {
        continue;
      }

      const push = (minimumDistance - distance) / 2;
      const normalX = deltaX / distance;
      const normalY = deltaY / distance;
      first.position = constrainToArena({
        x: first.position.x - normalX * push,
        y: first.position.y - normalY * push,
      }, first.collisionRadius);
      second.position = constrainToArena({
        x: second.position.x + normalX * push,
        y: second.position.y + normalY * push,
      }, second.collisionRadius);
    }
  }
}
