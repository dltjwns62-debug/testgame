import Phaser from "phaser";
import { installAutoSave, loadGame } from "../persistence";
import { hasFatalRuntimeStateIssue, inspectRuntimeState, repairRuntimeStateAtBoundary } from "../runtimeStateValidation";
import { installGlobalRuntimeErrorHandlers, recordRuntimeError } from "../runtimeErrors";

export class BootstrapScene extends Phaser.Scene {
  public constructor() {
    super("BootstrapScene");
  }

  public create(): void {
    const result = loadGame(this.game.registry);
    repairRuntimeStateAtBoundary(this.game.registry);
    installGlobalRuntimeErrorHandlers(this.game.registry);
    const issues = inspectRuntimeState(this.game.registry);
    if (hasFatalRuntimeStateIssue(issues)) {
      const fatal = issues.find((issue) => issue.severity === "FATAL");
      recordRuntimeError("BootstrapScene", new Error(fatal?.message ?? "Unrecoverable game state."), false, this.game.registry);
      this.scene.start("RecoveryScene", { message: fatal?.message ?? "The saved game state cannot be repaired safely." });
      return;
    }
    installAutoSave(this.game.registry);
    this.scene.start("FieldScene", {
      persistenceMessage: result.message,
      offlineSummary: result.summary,
    });
  }
}
