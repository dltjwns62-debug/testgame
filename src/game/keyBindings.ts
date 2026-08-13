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
  meteorCode: LetterKeyCode;
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
    meteorCode: "KeyE",
  };
}

export function cloneKeyBindingState(state: KeyBindingState): KeyBindingState {
  const used = new Set([state.whirlwindCode, state.firstAidCode]);
  const meteorCode = isLetterKeyCode(state.meteorCode) && !used.has(state.meteorCode)
    ? state.meteorCode
    : LETTER_CODES.find((code) => !used.has(code)) ?? "KeyE";
  return {
    controlGroupCodes: [...state.controlGroupCodes],
    whirlwindCode: state.whirlwindCode,
    firstAidCode: state.firstAidCode,
    meteorCode,
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
    (candidate.meteorCode !== undefined && (!isLetterKeyCode(candidate.meteorCode) ||
      new Set([candidate.whirlwindCode, candidate.firstAidCode, candidate.meteorCode]).size !== 3))) {
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

export type SkillBindingId = "whirlwind" | "first-aid" | "meteor";

export function swapSkillBinding(
  state: KeyBindingState,
  skillId: SkillBindingId,
  code: string,
): boolean {
  if (!isLetterKeyCode(code)) {
    return false;
  }

  const currentCode = skillId === "whirlwind"
    ? state.whirlwindCode
    : skillId === "first-aid" ? state.firstAidCode : (state.meteorCode ?? "KeyE");
  if (code === currentCode) {
    return false;
  }

  const codes: Record<SkillBindingId, LetterKeyCode> = {
    whirlwind: state.whirlwindCode,
    "first-aid": state.firstAidCode,
    meteor: state.meteorCode ?? "KeyE",
  };
  const previous = currentCode;
  codes[skillId] = code;
  const conflictingSkill = (Object.keys(codes) as SkillBindingId[]).find((id) => id !== skillId && codes[id] === code);
  if (conflictingSkill) codes[conflictingSkill] = previous;
  state.whirlwindCode = codes.whirlwind;
  state.firstAidCode = codes["first-aid"];
  state.meteorCode = codes.meteor;
  return true;
}

export function normalizeKeyBindingState(value: unknown): KeyBindingState {
  const candidate = value && typeof value === "object" ? value as Partial<KeyBindingState> : {};
  const fallback = createDefaultKeyBindingState();
  const controlGroupCodes = Array.isArray(candidate.controlGroupCodes) &&
    candidate.controlGroupCodes.length === CONTROL_GROUP_INDICES.length &&
    candidate.controlGroupCodes.every(isDigitKeyCode) &&
    new Set(candidate.controlGroupCodes).size === CONTROL_GROUP_INDICES.length
    ? [...candidate.controlGroupCodes]
    : fallback.controlGroupCodes;
  const whirlwindCode = isLetterKeyCode(candidate.whirlwindCode) ? candidate.whirlwindCode : fallback.whirlwindCode;
  const firstAidCode = isLetterKeyCode(candidate.firstAidCode) && candidate.firstAidCode !== whirlwindCode
    ? candidate.firstAidCode : fallback.firstAidCode === whirlwindCode ? "KeyR" : fallback.firstAidCode;
  const used = new Set([whirlwindCode, firstAidCode]);
  const requestedMeteor = candidate.meteorCode;
  const meteorCode = isLetterKeyCode(requestedMeteor) && !used.has(requestedMeteor)
    ? requestedMeteor
    : !used.has("KeyE") ? "KeyE" : LETTER_CODES.find((code) => !used.has(code)) ?? "KeyE";
  return { controlGroupCodes, whirlwindCode, firstAidCode, meteorCode };
}
