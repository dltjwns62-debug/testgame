import type Phaser from "phaser";
import { PERSISTENCE_META_REGISTRY_KEY, RUNTIME_ERRORS_REGISTRY_KEY, RUNTIME_STATE_ISSUES_REGISTRY_KEY } from "./constants";
import { getAutoSaveDiagnostics } from "./persistence";

type DiagnosticsWindow = Window & { __testgameDiagnosticsCleanup?: () => void };

export function installDiagnosticsOverlay(game: Phaser.Game): void {
  if (typeof window === "undefined" || typeof document === "undefined" ||
    new URLSearchParams(window.location.search).get("diagnostics") !== "1") return;
  const overlay = document.createElement("pre");
  overlay.setAttribute("aria-label", "Test Game diagnostics");
  overlay.style.cssText = [
    "position:fixed", "top:8px", "left:8px", "z-index:9999", "margin:0", "padding:8px",
    "background:rgba(0,0,0,.82)", "color:#a7f3d0", "font:12px/1.35 monospace", "pointer-events:none",
    "white-space:pre-wrap", "max-width:330px",
  ].join(";");
  document.body.appendChild(overlay);
  let frames = 0;
  let frameStart = performance.now();
  let lastFrame = frameStart;
  const durations: number[] = [];
  let lastUiSampleAt = frameStart;
  let lastUiCount = 0;
  let raf = 0;
  const sampleFrame = (now: number): void => {
    const duration = Math.max(0, now - lastFrame);
    lastFrame = now;
    durations.push(duration);
    if (durations.length > 120) durations.shift();
    frames += 1;
    raf = requestAnimationFrame(sampleFrame);
  };
  raf = requestAnimationFrame(sampleFrame);
  const interval = window.setInterval(() => {
    const elapsed = Math.max(1, performance.now() - frameStart);
    const fps = frames * 1000 / elapsed;
    const sorted = [...durations].sort((a, b) => a - b);
    const average = durations.length ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    const activeScenes = game.scene.getScenes(true);
    const scenes = activeScenes.map((scene) => scene.scene.key).join(", ") || "none";
    const battle = activeScenes.find((scene) => scene.scene.key === "BattleScene") as unknown as { units?: Map<string, { team: string; isAlive: boolean }> } | undefined;
    const units = battle?.units ? [...battle.units.values()] : [];
    const aliveAllies = units.filter((unit) => unit.team === "ALLY" && unit.isAlive).length;
    const aliveEnemies = units.filter((unit) => unit.team === "ENEMY" && unit.isAlive).length;
    const registry = game.registry;
    const meta = registry.get(PERSISTENCE_META_REGISTRY_KEY) as { lastSaveSource?: string; lastSaveBytes?: number } | undefined;
    const issues = registry.get(RUNTIME_STATE_ISSUES_REGISTRY_KEY) as unknown[] | undefined;
    const errors = registry.get(RUNTIME_ERRORS_REGISTRY_KEY) as unknown[] | undefined;
    const autosave = getAutoSaveDiagnostics(registry);
    const field = activeScenes.find((scene) => scene.scene.key === "FieldScene") as unknown as { getDiagnosticsSnapshot?: () => { uiUpdates: number; managedTimers: number } } | undefined;
    const battleScene = activeScenes.find((scene) => scene.scene.key === "BattleScene") as unknown as { getDiagnosticsSnapshot?: () => { uiUpdates: number; managedTimers: number } } | undefined;
    const fieldSnapshot = field?.getDiagnosticsSnapshot?.() ?? { uiUpdates: 0, managedTimers: 0 };
    const battleSnapshot = battleScene?.getDiagnosticsSnapshot?.() ?? { uiUpdates: 0, managedTimers: 0 };
    const uiCount = fieldSnapshot.uiUpdates + battleSnapshot.uiUpdates;
    const uiRate = (uiCount - lastUiCount) * 1000 / Math.max(1, performance.now() - lastUiSampleAt);
    lastUiCount = uiCount;
    lastUiSampleAt = performance.now();
    overlay.textContent = [
      "Test Game diagnostics",
      `Scene: ${scenes}`,
      `FPS rolling: ${fps.toFixed(1)} · frame avg: ${average.toFixed(1)}ms · p95: ${p95.toFixed(1)}ms`,
      `Alive allies/enemies: ${aliveAllies}/${aliveEnemies}`,
      `Autosave: controllers=${autosave.controllerCount} · interval=${autosave.intervalCount} · debounce=${autosave.debounceCount}`,
      `Managed timers: ${fieldSnapshot.managedTimers + battleSnapshot.managedTimers}`,
      `Last save: ${meta?.lastSaveSource ?? "none"} · ${meta?.lastSaveBytes ?? 0} bytes`,
      `Persistence: ${String((registry.get(PERSISTENCE_META_REGISTRY_KEY) as { status?: unknown } | undefined)?.status ?? "unknown")}`,
      `UI updates/sec: ${uiRate.toFixed(1)} · storage writes: ${autosave.storageWriteCount}`,
      `Runtime issues: ${issues?.length ?? 0} · errors: ${errors?.length ?? 0}`,
    ].join("\n");
    frames = 0;
    frameStart = performance.now();
  }, 500);
  const cleanup = (): void => {
    cancelAnimationFrame(raf);
    window.clearInterval(interval);
    overlay.remove();
    delete (window as DiagnosticsWindow).__testgameDiagnosticsCleanup;
  };
  (window as DiagnosticsWindow).__testgameDiagnosticsCleanup = cleanup;
  window.addEventListener("pagehide", cleanup, { once: true });
}
