import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import {
  getControlGroupDisplayNumber,
  type ControlGroupIndex,
} from "../controlGroups";
import {
  cloneKeyBindingState,
  createDefaultKeyBindingState,
  getKeyCodeLabel,
  getOrCreateKeyBindingState,
  isDigitKeyCode,
  isLetterKeyCode,
  isValidKeyBindingState,
  setKeyBindingState,
  swapControlGroupBinding,
  swapSkillBinding,
  type KeyBindingState,
  type SkillBindingId,
} from "../keyBindings";
import type { FieldScene } from "./FieldScene";

type CaptureAction =
  | { kind: "GROUP"; groupIndex: ControlGroupIndex }
  | { kind: "SKILL"; skillId: SkillBindingId };

type GroupVisual = {
  label: Phaser.GameObjects.Text;
  button: Phaser.GameObjects.Rectangle;
  buttonLabel: Phaser.GameObjects.Text;
};

type SkillVisual = {
  label: Phaser.GameObjects.Text;
  button: Phaser.GameObjects.Rectangle;
  buttonLabel: Phaser.GameObjects.Text;
};

export class KeySettingsScene extends Phaser.Scene {
  private draftKeyBindings!: KeyBindingState;
  private captureAction: CaptureAction | null = null;
  private readonly groupVisuals = new Map<ControlGroupIndex, GroupVisual>();
  private readonly skillVisuals = new Map<SkillBindingId, SkillVisual>();
  private captureText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.captureAction || event.repeat) {
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.captureAction = null;
      this.setStatus("Key capture cancelled.", "#c4e4d0");
      this.refreshUi();
      return;
    }

    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.setStatus("Press the key without modifier keys.");
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (this.captureAction.kind === "GROUP") {
      this.captureGroupKey(event.code);
    } else {
      this.captureSkillKey(event.code);
    }
  };

  public constructor() {
    super("KeySettingsScene");
  }

  public create(): void {
    this.captureAction = null;
    this.groupVisuals.clear();
    this.skillVisuals.clear();
    this.draftKeyBindings = cloneKeyBindingState(getOrCreateKeyBindingState(this.game.registry));
    this.drawBackground();
    this.addHeader();
    this.addControlGroups();
    this.addSkills();
    this.addControls();
    this.refreshUi();
    this.input.keyboard?.on("keydown", this.handleKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupInput, this);
  }

  private drawBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);
    this.add.rectangle(GAME_WIDTH / 2, 275, 920, 400, 0x1f2937, 1);
    this.add.rectangle(GAME_WIDTH / 2, 500, 920, 58, 0x172033, 1);
  }

  private addHeader(): void {
    this.add.text(32, 16, "Stage 12: Key Settings", {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(34, 50, "Ctrl + group key saves a group. Press the group key to recall it.", {
      color: "#c4e4d0",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
    });
    this.captureText = this.add.text(34, 75, "", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    });
  }

  private addControlGroups(): void {
    this.add.text(34, 94, "Control Groups", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    });

    for (let groupIndex = 0; groupIndex < 10; groupIndex += 1) {
      const typedIndex = groupIndex as ControlGroupIndex;
      const column = groupIndex < 5 ? 0 : 1;
      const row = groupIndex % 5;
      const x = column === 0 ? 250 : 700;
      const y = 128 + row * 43;
      this.add.rectangle(x, y, 408, 36, 0x26394b, 1)
        .setStrokeStyle(1, 0x54748a, 1);
      const label = this.add.text(x - 190, y - 11, "", {
        color: "#d9f2ff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        wordWrap: { width: 250 },
      });
      const button = this.add.rectangle(x + 150, y, 82, 25, 0x536078, 1)
        .setStrokeStyle(1, 0x9ce4b0, 0.9)
        .setInteractive({ useHandCursor: true });
      const buttonLabel = this.add.text(x + 150, y, "Change", {
        color: "#f3f8e9",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      }).setOrigin(0.5);
      button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          this.beginGroupCapture(typedIndex);
        }
      });
      this.groupVisuals.set(typedIndex, { label, button, buttonLabel });
    }
  }

  private addSkills(): void {
    this.add.text(34, 350, "Skills", {
      color: "#f6e8ad",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "13px",
      fontStyle: "bold",
    });

    ([
      { skillId: "whirlwind" as const, x: 250, name: "Whirlwind" },
      { skillId: "first-aid" as const, x: 700, name: "First Aid" },
    ]).forEach(({ skillId, x, name }) => {
      const y = 393;
      this.add.rectangle(x, y, 408, 42, 0x26394b, 1)
        .setStrokeStyle(1, 0x7c5bb8, 1);
      const label = this.add.text(x - 190, y - 12, "", {
        color: "#e9ddff",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
      });
      const button = this.add.rectangle(x + 150, y, 82, 25, 0x536078, 1)
        .setStrokeStyle(1, 0x9ce4b0, 0.9)
        .setInteractive({ useHandCursor: true });
      const buttonLabel = this.add.text(x + 150, y, "Change", {
        color: "#f3f8e9",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
      }).setOrigin(0.5);
      button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        if (pointer.button === 0) {
          this.beginSkillCapture(skillId);
        }
      });
      this.skillVisuals.set(skillId, { label, button, buttonLabel });
      label.setData("skillName", name);
    });
  }

  private addControls(): void {
    this.statusText = this.add.text(34, 453, "", {
      color: "#f3c969",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "11px",
      wordWrap: { width: 600 },
    });
    this.addButton(620, 500, 148, "Apply & Return", () => this.applyAndReturn(), 0x4b8b6d);
    this.addButton(780, 500, 92, "Cancel", () => this.cancelAndReturn(), 0x536078);
    this.addButton(900, 500, 112, "Reset Defaults", () => this.resetDefaults(), 0x7b5e3b);
  }

  private addButton(
    x: number,
    y: number,
    width: number,
    label: string,
    callback: () => void,
    color: number,
  ): void {
    const button = this.add.rectangle(x, y, width, 30, color, 1)
      .setStrokeStyle(1, 0x9ce4b0, 0.9)
      .setInteractive({ useHandCursor: true });
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0) {
        callback();
      }
    });
    this.add.text(x, y, label, {
      color: "#f3f8e9",
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
    }).setOrigin(0.5);
  }

  private beginGroupCapture(groupIndex: ControlGroupIndex): void {
    this.captureAction = { kind: "GROUP", groupIndex };
    this.setStatus("Press a number key. Escape cancels.", "#f6e8ad");
    this.refreshUi();
  }

  private beginSkillCapture(skillId: SkillBindingId): void {
    this.captureAction = { kind: "SKILL", skillId };
    this.setStatus("Press a letter key. Escape cancels.", "#f6e8ad");
    this.refreshUi();
  }

  private captureGroupKey(code: string): void {
    if (!isDigitKeyCode(code)) {
      this.setStatus("Control groups require a number key from 0 to 9.");
      return;
    }

    const action = this.captureAction;
    if (!action || action.kind !== "GROUP") {
      return;
    }
    const swappedIndex = swapControlGroupBinding(this.draftKeyBindings, action.groupIndex, code);
    const groupLabel = getControlGroupDisplayNumber(action.groupIndex);
    if (swappedIndex === null) {
      this.setStatus(`Group ${groupLabel} binding unchanged.`, "#c4e4d0");
    } else {
      this.setStatus(`Group ${groupLabel} and Group ${getControlGroupDisplayNumber(swappedIndex)} bindings swapped.`, "#9ce4b0");
    }
    this.captureAction = null;
    this.refreshUi();
  }

  private captureSkillKey(code: string): void {
    if (!isLetterKeyCode(code)) {
      this.setStatus("Skills require a letter key from A to Z.");
      return;
    }

    const action = this.captureAction;
    if (!action || action.kind !== "SKILL") {
      return;
    }
    const changed = swapSkillBinding(this.draftKeyBindings, action.skillId, code);
    const skillName = action.skillId === "whirlwind" ? "Whirlwind" : "First Aid";
    this.setStatus(changed ? `${skillName} binding updated.` : `${skillName} binding unchanged.`, changed ? "#9ce4b0" : "#c4e4d0");
    this.captureAction = null;
    this.refreshUi();
  }

  private applyAndReturn(): void {
    if (!isValidKeyBindingState(this.draftKeyBindings)) {
      this.setStatus("Key settings are invalid.");
      return;
    }
    setKeyBindingState(this.game.registry, this.draftKeyBindings);
    this.returnToField("Key settings saved.");
  }

  private cancelAndReturn(): void {
    this.returnToField();
  }

  private resetDefaults(): void {
    this.draftKeyBindings = createDefaultKeyBindingState();
    this.captureAction = null;
    this.setStatus("Default key settings restored. Apply to save.", "#c4e4d0");
    this.refreshUi();
  }

  private refreshUi(): void {
    for (const [groupIndex, visual] of this.groupVisuals) {
      const label = getControlGroupDisplayNumber(groupIndex);
      const key = getKeyCodeLabel(this.draftKeyBindings.controlGroupCodes[groupIndex]);
      const active = this.captureAction?.kind === "GROUP" && this.captureAction.groupIndex === groupIndex;
      visual.label.setText(`Group ${label}\nRecall: ${key} · Save: Ctrl + ${key}`);
      visual.button.setFillStyle(active ? 0x4b3670 : 0x536078, 1).setStrokeStyle(1, active ? 0xe9ddff : 0x9ce4b0, 0.9);
    }

    for (const [skillId, visual] of this.skillVisuals) {
      const key = skillId === "whirlwind"
        ? getKeyCodeLabel(this.draftKeyBindings.whirlwindCode)
        : getKeyCodeLabel(this.draftKeyBindings.firstAidCode);
      const name = skillId === "whirlwind" ? "Whirlwind" : "First Aid";
      const active = this.captureAction?.kind === "SKILL" && this.captureAction.skillId === skillId;
      visual.label.setText(`${name}\nKey: ${key}`);
      visual.button.setFillStyle(active ? 0x4b3670 : 0x536078, 1).setStrokeStyle(1, active ? 0xe9ddff : 0x9ce4b0, 0.9);
    }

    if (this.captureAction?.kind === "GROUP") {
      this.captureText.setText(`Press a number key for Group ${getControlGroupDisplayNumber(this.captureAction.groupIndex)}. Escape cancels.`);
    } else if (this.captureAction?.kind === "SKILL") {
      this.captureText.setText(`Press a letter key for ${this.captureAction.skillId === "whirlwind" ? "Whirlwind" : "First Aid"}. Escape cancels.`);
    } else {
      this.captureText.setText("Select Change to edit a key. Changes are saved only with Apply & Return.");
    }
  }

  private setStatus(message: string, color = "#f3c969"): void {
    this.statusText?.setColor(color).setText(message);
  }

  private returnToField(message?: string): void {
    const fieldScene = this.scene.get("FieldScene") as FieldScene;
    fieldScene.returnFromKeySettings(message);
  }

  private cleanupInput(): void {
    this.input.keyboard?.off("keydown", this.handleKeyDown, this);
  }
}
