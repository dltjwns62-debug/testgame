import Phaser from "phaser";
import { installAutoSave, loadGame } from "../persistence";
import { hasFatalRuntimeStateIssue, inspectRuntimeState, repairRuntimeStateAtBoundary } from "../runtimeStateValidation";
import { installGlobalRuntimeErrorHandlers, recordRuntimeError } from "../runtimeErrors";

export class BootstrapScene extends Phaser.Scene {
  public constructor() {
    super("BootstrapScene");
  }

  public preload(): void {
    const assets = [
      ["visual-slime-1", "assets/monsters/slime-1.svg"],
      ["visual-slime-2", "assets/monsters/slime-2.svg"],
      ["visual-slime-3", "assets/monsters/slime-3.svg"],
      ["visual-slime-4", "assets/monsters/slime-4.svg"],
      ["visual-unit-hero", "assets/units/hero.svg"],
      ["visual-unit-merc", "assets/units/merc.svg"],
      ["visual-unit-skill-merc", "assets/units/skill-merc.svg"],
      ["visual-unit-swordsman", "assets/units/swordsman.svg"],
      ["visual-unit-guardian", "assets/units/guardian.svg"],
      ["visual-unit-scout", "assets/units/scout.svg"],
    ] as const;
    for (const [key, path] of assets) {
      this.load.svg(key, path, { width: 96, height: 96 });
    }
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
