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
let installedRegistry: { set(key: string, value: unknown): unknown } | null = null;
type RuntimeErrorEventTarget = {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
};
let installedWindow: RuntimeErrorEventTarget | null = null;
let errorHandler: ((event: Event) => void) | null = null;
let unhandledRejectionHandler: ((event: Event) => void) | null = null;

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

export function installGlobalRuntimeErrorHandlers(
  registry: { set(key: string, value: unknown): unknown },
  eventTarget: RuntimeErrorEventTarget | null = typeof window === "undefined" ? null : window,
): void {
  if (eventTarget && installedWindow === eventTarget) {
    installedRegistry = registry;
    return;
  }
  clearRuntimeErrorHandlers();
  installedRegistry = registry;
  if (!eventTarget) return;
  errorHandler = (event: Event) => {
    const candidate = event as ErrorEvent;
    recordRuntimeError("window.error", candidate.error ?? candidate.message, true);
  };
  unhandledRejectionHandler = (event: Event) => {
    const candidate = event as PromiseRejectionEvent;
    recordRuntimeError("window.unhandledrejection", candidate.reason, true);
  };
  installedWindow = eventTarget;
  eventTarget.addEventListener("error", errorHandler);
  eventTarget.addEventListener("unhandledrejection", unhandledRejectionHandler);
}

export function clearRuntimeErrorHandlers(): void {
  if (installedWindow && errorHandler && unhandledRejectionHandler) {
    installedWindow.removeEventListener("error", errorHandler);
    installedWindow.removeEventListener("unhandledrejection", unhandledRejectionHandler);
  }
  installedWindow = null;
  errorHandler = null;
  unhandledRejectionHandler = null;
  installedRegistry = null;
}
