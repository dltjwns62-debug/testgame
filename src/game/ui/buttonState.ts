export type ButtonTone = "success" | "neutral" | "warning" | "purple";

export const BUTTON_TONE_COLORS: Record<ButtonTone, number> = {
  success: 0x4d9b78,
  neutral: 0x172a40,
  warning: 0xe5a85d,
  purple: 0x8466c7,
};

export type ButtonRenderStateInput = {
  enabled: boolean;
  busy: boolean;
  visible: boolean;
  hovered: boolean;
  pressed: boolean;
  tone: ButtonTone;
  colorOverride?: number;
};

export type ButtonRenderState = {
  active: boolean;
  fillColor: number;
  fillAlpha: number;
  textColor: string;
  interactive: boolean;
};

export function resolveButtonRenderState(input: ButtonRenderStateInput): ButtonRenderState {
  const active = input.visible && input.enabled && !input.busy;
  const baseColor = input.colorOverride ?? BUTTON_TONE_COLORS[input.tone];
  return {
    active,
    fillColor: !active
      ? BUTTON_TONE_COLORS.neutral
      : input.pressed
        ? BUTTON_TONE_COLORS.warning
        : input.hovered
          ? 0x29465b
          : baseColor,
    fillAlpha: active ? 1 : 0.72,
    textColor: active ? "#f6fbef" : "#7890a4",
    interactive: active,
  };
}

export function normalizeProgressRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
