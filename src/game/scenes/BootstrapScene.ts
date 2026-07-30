import Phaser from "phaser";
import { installAutoSave, loadGame } from "../persistence";

export class BootstrapScene extends Phaser.Scene {
  public constructor() {
    super("BootstrapScene");
  }

  public create(): void {
    const result = loadGame(this.game.registry);
    installAutoSave(this.game.registry);
    this.scene.start("FieldScene", {
      persistenceMessage: result.message,
      offlineSummary: result.summary,
    });
  }
}
