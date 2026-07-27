import type Phaser from "phaser";
import { KEY_BINDINGS_REGISTRY_KEY } from "./constants";

export type ControlGroupIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type DigitKeyCode =
  | "Digit0" | "Digit1" | "Digit2" | "Digit3" | "Digit4"
  | "Digit5" | "Digit6" | "Digit7" | "Digit8" | "Digit9";

export type LetterKeyCode =
  | "KeyA" | "KeyB" | "KeyC" | "KeyD" | "KeyE" | "KeyF"
  | "KeyG" | "KeyH" | "KeyI" | "KeyJ" | "KeyK" | "KeyL"
  | "KeyM" | "KeyN" | "KeyO" | "KeyP" | "KeyQ" | "KeyR"
  | "KeyS" | "KeyT" | "KeyU" | "KeyV" | "KeyW" | "KeyX"
  | "KeyY" | "KeyZ";

export type KeyBindingState = {
  controlGroupCodes: DigitKeyCode[];
  whirlwindCode: LetterKeyCode;
  firstAidCode: LetterKeyCode;
};

const DIGIT_CODES: readonly DigitKeyCode[] = [
  "Digit0", "Digit1", "Digit2", "Digit3", "Digit4",
  "Digit5", "Digit6", "Digit7", "Digit8", "Digit9",
];

const LETTER_CODES: readonly LetterKeyCode[] = [
  "KeyA", "KeyB", "KeyC", "KeyD", "KeyE", "KeyF", "KeyG",
  "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM", "KeyN",
  "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT", "KeyU",
  "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ",
];

const CONTROL_GROUP_INDICES: readonly ControlGroupIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function isDigitKeyCode(value: unknown): value is DigitKeyCode {
  return typeof value === "string" && DIGIT_CODES.includes(value as DigitKeyCode);
}

export function isLetterKeyCode(value: unknown): value is LetterKeyCode {
  return typeof value === "string" && LETTER_CODES.includes(value as LetterKeyCode);
}

export function createDefaultKeyBindingState(): KeyBindingState {
  return {
    controlGroupCodes: [
      "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
      "Digit6", "Digit7", "Digit8", "Digit9", "Digit0",
    ],
    whirlwindCode: "KeyQ",
    firstAidCode: "KeyW",
  };
}

export function cloneKeyBindingState(state: KeyBindingState): KeyBindingState {
  return {
    controlGroupCodes: [...state.controlGroupCodes],
    whirlwindCode: state.whirlwindCode,
    firstAidCode: state.firstAidCode,
  };
}

export function isValidKeyBindingState(value: unknown): value is KeyBindingState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<KeyBindingState>;
  if (!Array.isArray(candidate.controlGroupCodes) || candidate.controlGroupCodes.length !== CONTROL_GROUP_INDICES.length ||
    !candidate.controlGroupCodes.every(isDigitKeyCode) ||
    new Set(candidate.controlGroupCodes).size !== CONTROL_GROUP_INDICES.length ||
    !isLetterKeyCode(candidate.whirlwindCode) || !isLetterKeyCode(candidate.firstAidCode) ||
    candidate.whirlwindCode === candidate.firstAidCode) {
    return false;
  }

  return DIGIT_CODES.every((code) => candidate.controlGroupCodes?.includes(code));
}

export function getOrCreateKeyBindingState(registry: Phaser.Data.DataManager): KeyBindingState {
  const stored = registry.get(KEY_BINDINGS_REGISTRY_KEY);
  if (isValidKeyBindingState(stored)) {
    return cloneKeyBindingState(stored);
  }

  const fallback = createDefaultKeyBindingState();
  registry.set(KEY_BINDINGS_REGISTRY_KEY, cloneKeyBindingState(fallback));
  return fallback;
}

export function setKeyBindingState(registry: Phaser.Data.DataManager, state: KeyBindingState): void {
  if (!isValidKeyBindingState(state)) {
    throw new Error("Invalid key binding state");
  }
  registry.set(KEY_BINDINGS_REGISTRY_KEY, cloneKeyBindingState(state));
}

export function getKeyCodeLabel(code: string): string {
  if (code.startsWith("Digit")) {
    return code.slice("Digit".length);
  }
  if (code.startsWith("Key")) {
    return code.slice("Key".length);
  }
  return code;
}

export function getControlGroupLabel(groupIndex: ControlGroupIndex): string {
  return getKeyCodeLabel(createDefaultKeyBindingState().controlGroupCodes[groupIndex]);
}

export function findControlGroupIndexByCode(
  state: KeyBindingState,
  code: string,
): ControlGroupIndex | null {
  const index = state.controlGroupCodes.indexOf(code as DigitKeyCode);
  return index >= 0 ? index as ControlGroupIndex : null;
}

export function swapControlGroupBinding(
  state: KeyBindingState,
  groupIndex: ControlGroupIndex,
  code: string,
): ControlGroupIndex | null {
  if (!isDigitKeyCode(code)) {
    return null;
  }

  const previousIndex = state.controlGroupCodes.indexOf(code);
  if (previousIndex < 0 || previousIndex === groupIndex) {
    return previousIndex === groupIndex ? null : null;
  }

  const currentCode = state.controlGroupCodes[groupIndex];
  state.controlGroupCodes[groupIndex] = code;
  state.controlGroupCodes[previousIndex] = currentCode;
  return previousIndex as ControlGroupIndex;
}

export type SkillBindingId = "whirlwind" | "first-aid";

export function swapSkillBinding(
  state: KeyBindingState,
  skillId: SkillBindingId,
  code: string,
): boolean {
  if (!isLetterKeyCode(code)) {
    return false;
  }

  const currentCode = skillId === "whirlwind" ? state.whirlwindCode : state.firstAidCode;
  if (code === currentCode) {
    return false;
  }

  if (skillId === "whirlwind") {
    const previous = currentCode;
    state.whirlwindCode = code;
    if (state.firstAidCode === code) {
      state.firstAidCode = previous;
    }
  } else {
    const previous = currentCode;
    state.firstAidCode = code;
    if (state.whirlwindCode === code) {
      state.whirlwindCode = previous;
    }
  }
  return true;
}
