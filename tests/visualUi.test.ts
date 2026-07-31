import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllyUnitDefinition } from "../src/game/rtsBattleDefinitions";
import { getSlimeTextureKey, getUnitTextureKey } from "../src/game/ui/visuals";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetPaths = [
  "public/assets/monsters/slime-1.svg",
  "public/assets/monsters/slime-2.svg",
  "public/assets/monsters/slime-3.svg",
  "public/assets/monsters/slime-4.svg",
  "public/assets/units/hero.svg",
  "public/assets/units/merc.svg",
  "public/assets/units/swordsman.svg",
  "public/assets/units/guardian.svg",
  "public/assets/units/scout.svg",
  "public/assets/units/skill-merc.svg",
];

test("visual pass ships ten safe, self-contained SVG assets", () => {
  for (const relativePath of assetPaths) {
    const absolutePath = join(repoRoot, relativePath);
    assert.ok(existsSync(absolutePath), relativePath);
    const svg = readFileSync(absolutePath, "utf8");
    assert.match(svg, /viewBox=/, relativePath);
    assert.doesNotMatch(svg, /(?:href|src)=['"]https?:\/\//i, relativePath);
    assert.doesNotMatch(svg, /<script\b/i, relativePath);
  }
});

test("visual texture keys distinguish Slimes and every current ally definition", () => {
  const slimeKeys = ["slime-1", "slime-2", "slime-3", "slime-4"].map(getSlimeTextureKey);
  assert.equal(new Set(slimeKeys).size, 4);

  const allyDefinitionIds = [
    "trial-main-character",
    "trial-mercenary",
    "trial-skill-mercenary",
    "mercenary-swordsman",
    "mercenary-guardian",
    "mercenary-scout",
  ];
  const unitKeys = allyDefinitionIds.map((id) => getUnitTextureKey(getAllyUnitDefinition(id)));
  assert.equal(new Set(unitKeys).size, allyDefinitionIds.length);
});
