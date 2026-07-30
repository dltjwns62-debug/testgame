import {
  RUNTIME_ERRORS_REGISTRY_KEY,
} from "./constants";

export type RuntimeErrorRecord = {
  id: string;
  timestampMs: number;
  context: string;
  message: string;
  recoverable: boolean;
};

const recentErrors: RuntimeErrorRecord[] = [];
let sequence = 0;
let globalHandlersInstalled = false;
let installedRegistry: { set(key: string, value: unknown): unknown } | null = null;

function safeMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error.slice(0, 500);
  try { return JSON.stringify(error).slice(0, 500); } catch { return "Unknown runtime error"; }
}

export function getRecentRuntimeErrors(): RuntimeErrorRecord[] {
  return recentErrors.map((record) => ({ ...record }));
}

export function recordRuntimeError(
  context: string,
  error: unknown,
  recoverable: boolean,
  registry?: { set(key: string, value: unknown): unknown },
): RuntimeErrorRecord {
  const record: RuntimeErrorRecord = {
    id: `runtime-error-${++sequence}`,
    timestampMs: Date.now(),
    context,
    message: safeMessage(error),
    recoverable,
  };
  recentErrors.push(record);
  while (recentErrors.length > 20) recentErrors.shift();
  console.error(`[${context}] ${record.message}`);
  const target = registry ?? installedRegistry;
  target?.set(RUNTIME_ERRORS_REGISTRY_KEY, getRecentRuntimeErrors());
  return record;
}

export function installGlobalRuntimeErrorHandlers(registry: { set(key: string, value: unknown): unknown }): void {
  installedRegistry = registry;
  if (globalHandlersInstalled || typeof window === "undefined") return;
  globalHandlersInstalled = true;
  window.addEventListener("error", (event) => {
    recordRuntimeError("window.error", event.error ?? event.message, true);
  });
  window.addEventListener("unhandledrejection", (event) => {
    recordRuntimeError("window.unhandledrejection", event.reason, true);
  });
}

export function clearRuntimeErrorHandlers(): void {
  // Browser globals do not expose stable references until the app is reset.
  // The once-only installation avoids duplicate handlers and infinite recovery loops.
  installedRegistry = null;
}

