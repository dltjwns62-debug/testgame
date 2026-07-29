import Phaser from "phaser";
import { BattleScene } from "./scenes/BattleScene";
import { FieldScene } from "./scenes/FieldScene";
import { FormationScene } from "./scenes/FormationScene";
import { KeySettingsScene } from "./scenes/KeySettingsScene";
import { InventoryScene } from "./scenes/InventoryScene";
import { ShopScene } from "./scenes/ShopScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: "game-container",
  backgroundColor: "#315f55",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  scene: [FieldScene, FormationScene, ShopScene, KeySettingsScene, InventoryScene, BattleScene],
};
