import Phaser from "phaser";
import { installAutoSave, loadGame } from "../persistence";
import { repairRuntimeStateAtBoundary } from "../runtimeStateValidation";
import { installGlobalRuntimeErrorHandlers } from "../runtimeErrors";

export class BootstrapScene extends Phaser.Scene {
  public constructor() {
    super("BootstrapScene");
  }

  public create(): void {
    const result = loadGame(this.game.registry);
    repairRuntimeStateAtBoundary(this.game.registry);
    installGlobalRuntimeErrorHandlers(this.game.registry);
    installAutoSave(this.game.registry);
    this.scene.start("FieldScene", {
      persistenceMessage: result.message,
      offlineSummary: result.summary,
    });
  }
}
