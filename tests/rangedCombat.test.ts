import test from "node:test";
import assert from "node:assert/strict";
import { getAllyUnitDefinition } from "../src/game/rtsBattleDefinitions";
import { getUnitSkillDefinition } from "../src/game/unitSkills";
import { normalizeKeyBindingState, swapSkillBinding } from "../src/game/keyBindings";
import { calculateProcDamage, isValidProjectileSpeed, shouldTriggerProc } from "../src/game/rtsAttackProfiles";
import { advanceProjectile, isPositionInRadius, resolveProjectileImpact, type ActiveProjectile } from "../src/game/rtsProjectiles";

test("ranged unit attack profiles are data-driven", () => {
  assert.deepEqual(getAllyUnitDefinition("mercenary-scout")?.basicAttack, { style: "PROJECTILE", projectileType: "ARROW", projectileSpeed: 580 });
  assert.equal(getAllyUnitDefinition("trial-skill-mercenary")?.basicAttack.style, "PROJECTILE");
  assert.equal(getAllyUnitDefinition("trial-skill-mercenary")?.basicAttack.projectileType, "MAGIC_BOLT");
  assert.equal(getAllyUnitDefinition("mercenary-swordsman")?.basicAttack.style, "MELEE");
  assert.equal(getAllyUnitDefinition("mercenary-guardian")?.basicAttack.style, "MELEE");
  assert.ok((getAllyUnitDefinition("mercenary-scout")?.attackRange ?? 0) > 8);
  assert.ok((getAllyUnitDefinition("trial-skill-mercenary")?.attackRange ?? 0) > 8);
});

test("projectile target remains fixed, advances safely, and impacts once", () => {
  const projectile: ActiveProjectile = { id: "p1", ownerUnitId: "a1", targetUnitId: "e1", projectileType: "ARROW", speed: 580, basicDamage: 10, damage: 10, position: { x: 0, y: 0 }, impactApplied: false };
  const flight = advanceProjectile(projectile, { x: 100, y: 0 }, 100);
  assert.equal(flight.valid, true);
  assert.equal(flight.reachedTarget, false);
  assert.equal(projectile.targetUnitId, "e1");
  const impact = advanceProjectile(projectile, { x: 100, y: 0 }, 200);
  assert.equal(impact.reachedTarget, true);
  assert.equal(resolveProjectileImpact(projectile, true), true);
  assert.equal(resolveProjectileImpact(projectile, true), false);
  assert.equal(resolveProjectileImpact({ ...projectile, impactApplied: false }, false), false);
  assert.equal(advanceProjectile({ ...projectile, impactApplied: false }, { x: 100, y: 0 }, 10000).valid, true);
});

test("projectile and meteor geometry helpers reject invalid values", () => {
  assert.equal(isValidProjectileSpeed(580), true);
  assert.equal(isValidProjectileSpeed(Number.NaN), false);
  assert.equal(isValidProjectileSpeed(-1), false);
  assert.equal(isPositionInRadius({ x: 10, y: 0 }, { x: 0, y: 0 }, 11), true);
  assert.equal(isPositionInRadius({ x: 20, y: 0 }, { x: 0, y: 0 }, 11), false);
  assert.equal(isPositionInRadius({ x: 0, y: 0 }, { x: 0, y: 0 }, Number.NaN), false);
});

test("Meteor is a ground-area skill and Arcane Burst proc boundaries are deterministic", () => {
  const meteor = getUnitSkillDefinition("meteor");
  assert.equal(meteor?.effectType, "GROUND_AREA_DAMAGE");
  assert.equal(meteor?.damage, 30);
  assert.equal(meteor?.effectRadius, 72);
  assert.equal(meteor?.cooldownMs, 9000);
  assert.equal(meteor?.castDelayMs, 450);
  assert.equal(shouldTriggerProc(0.15, 0), true);
  assert.equal(shouldTriggerProc(0.15, 0.1499), true);
  assert.equal(shouldTriggerProc(0.15, 0.15), false);
  assert.equal(calculateProcDamage(11, { type: "ARCANE_BURST", chance: 0.15, radius: 42, damageMultiplier: 0.5 }), 5);
});

test("legacy key bindings migrate Meteor without changing Q/W", () => {
  const migrated = normalizeKeyBindingState({ controlGroupCodes: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"], whirlwindCode: "KeyQ", firstAidCode: "KeyW" });
  assert.equal(migrated.whirlwindCode, "KeyQ");
  assert.equal(migrated.firstAidCode, "KeyW");
  assert.equal(migrated.meteorCode, "KeyE");
  assert.equal(swapSkillBinding(migrated, "meteor", "KeyQ"), true);
  assert.equal(migrated.meteorCode, "KeyQ");
  assert.equal(migrated.whirlwindCode, "KeyE");
});
