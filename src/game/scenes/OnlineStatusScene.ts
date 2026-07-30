import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { createOnlineGateway } from "../online/onlineGateway";
import { createRegistrySnapshotForOnlineSync, OnlineSyncCoordinator } from "../online/onlineSyncCoordinator";
import { createSnapshotCheckpointOperation } from "../online/onlineOperations";
import { createDefaultOnlineSessionState, getOrCreateOnlineSessionState, setOnlineSessionState } from "../online/onlineRegistry";
import { type MockOnlineGateway } from "../online/mockOnlineGateway";

export class OnlineStatusScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private coordinator!: OnlineSyncCoordinator;
  private gateway!: ReturnType<typeof createOnlineGateway>;
  private mockMode = false;
  private busy = false;
  private disposed = false;
  private readonly actionButtons: Phaser.GameObjects.Rectangle[] = [];

  public constructor() {
    super("OnlineStatusScene");
  }

  public create(): void {
    this.disposed = false;
    this.busy = false;
    this.actionButtons.length = 0;
    this.mockMode = new URLSearchParams(window.location.search).get("onlineMock") === "1";
    const existing = getOrCreateOnlineSessionState(this.game.registry);
    const next = { ...existing, mockMode: this.mockMode, status: this.mockMode ? existing.status === "DISABLED" ? "OFFLINE" as const : existing.status : "DISABLED" as const };
    setOnlineSessionState(this.game.registry, this.mockMode ? next : { ...createDefaultOnlineSessionState(false), deviceId: existing.deviceId, clientInstanceId: existing.clientInstanceId });
    if (!this.gateway || (this.gateway instanceof Object && this.mockMode !== this.gatewayIsMock())) this.gateway = createOnlineGateway(this.mockMode);
    this.coordinator = new OnlineSyncCoordinator(this.game.registry, this.gateway);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111827);
    this.add.rectangle(GAME_WIDTH / 2, 280, 860, 360, 0x1f2937, 1).setStrokeStyle(1, 0x54748a, 1);
    this.add.text(48, 32, "Stage 17: Online Expansion Readiness", { color: "#f3f8e9", fontFamily: "Segoe UI, sans-serif", fontSize: "24px", fontStyle: "bold" });
    this.add.text(50, 68, "Disabled by default. Mock mode never contacts a real server.", { color: "#c4e4d0", fontFamily: "Segoe UI, sans-serif", fontSize: "13px" });
    this.statusText = this.add.text(64, 124, "", { color: "#d9f2ff", fontFamily: "Segoe UI, sans-serif", fontSize: "14px", lineSpacing: 8, wordWrap: { width: 820 } });
    this.messageText = this.add.text(64, 380, "", { color: "#f6e8ad", fontFamily: "Segoe UI, sans-serif", fontSize: "13px", wordWrap: { width: 820 } });
    this.addButton(160, 490, 180, "Back to Field", () => this.returnToField(), false);
    this.addButton(360, 490, 180, "Refresh Status", () => this.refreshStatus());
    if (this.mockMode) {
      this.addButton(560, 490, 160, "Connect Mock", () => this.connectMock());
      this.addButton(760, 490, 160, "Push Snapshot", () => this.pushSnapshot());
      this.addButton(560, 535, 160, "Pull Snapshot", () => this.pullSnapshot());
      this.addButton(760, 535, 160, "Simulate Conflict", () => this.simulateConflict());
      this.addButton(360, 535, 180, "Disconnect Mock", () => this.disconnectMock());
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.disposeCoordinator, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.disposeCoordinator, this);
    this.refreshUi();
  }

  private gatewayIsMock(): boolean {
    return this.gateway instanceof Object && typeof (this.gateway as Partial<MockOnlineGateway>).simulateConflict === "function";
  }

  private addButton(x: number, y: number, width: number, label: string, action: () => void, managed = true): void {
    const button = this.add.rectangle(x, y, width, 32, 0x4b8b6d, 1).setStrokeStyle(1, 0x9ce4b0, 0.9).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { color: "#f3f8e9", fontFamily: "Segoe UI, sans-serif", fontSize: "11px", fontStyle: "bold" }).setOrigin(0.5);
    if (managed) this.actionButtons.push(button);
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      if (pointer.button === 0 && !this.busy && !this.disposed) void action();
    });
  }

  private setActionsEnabled(enabled: boolean): void {
    for (const button of this.actionButtons) {
      button.disableInteractive();
      if (enabled) button.setInteractive({ useHandCursor: true });
      button.setFillStyle(enabled ? 0x4b8b6d : 0x293044, 1);
    }
  }

  private async runAction(action: () => Promise<void> | void): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.setActionsEnabled(false);
    try {
      await action();
    } finally {
      if (!this.disposed) {
        this.busy = false;
        this.setActionsEnabled(true);
        this.refreshUi();
      }
    }
  }

  private refreshUi(message?: string): void {
    if (this.disposed || !this.statusText || !this.messageText) return;
    const state = getOrCreateOnlineSessionState(this.game.registry);
    this.statusText.setText([
      "Mode: " + (state.mockMode ? "MOCK — NOT A REAL SERVER" : "DISABLED"),
      "Protocol version: " + state.protocolVersion,
      "Connection status: " + state.status,
      "Account: " + (state.accountId ?? "Not configured"),
      "Server revision: " + (state.serverRevision ?? "-"),
      "Last synced: " + (state.lastSyncedAtMs ? new Date(state.lastSyncedAtMs).toLocaleString() : "Never"),
      "Pending operation count: " + state.pendingOperationCount,
      "Last error: " + (state.lastErrorCode ?? "None"),
      "Local save remains active. No real server or account is configured.",
    ]);
    if (message) this.messageText.setText(message);
  }

  private async connectMock(): Promise<void> {
    await this.runAction(async () => {
      const state = getOrCreateOnlineSessionState(this.game.registry);
      const result = await this.coordinator.bootstrap(createRegistrySnapshotForOnlineSync(this.game.registry, state));
      this.refreshUi(result.ok ? "Mock session connected in memory." : result.error.message);
    });
  }

  private async pushSnapshot(): Promise<void> {
    await this.runAction(async () => {
      const state = getOrCreateOnlineSessionState(this.game.registry);
      const snapshot = createRegistrySnapshotForOnlineSync(this.game.registry, state);
      const operation = createSnapshotCheckpointOperation(snapshot, { deviceId: state.deviceId, clientInstanceId: state.clientInstanceId, baseServerRevision: state.serverRevision ?? 0 });
      const queued = this.coordinator.enqueue(operation);
      if (!queued.ok) { this.refreshUi(queued.error.message); return; }
      const result = await this.coordinator.sync(snapshot);
      this.refreshUi(result.ok ? "Snapshot push completed in mock mode." : result.error.message);
    });
  }

  private async pullSnapshot(): Promise<void> {
    await this.runAction(async () => {
      const result = await this.coordinator.sync(createRegistrySnapshotForOnlineSync(this.game.registry, getOrCreateOnlineSessionState(this.game.registry)));
      this.refreshUi(result.ok ? "Mock snapshot pull completed." : result.error.message);
    });
  }

  private async disconnectMock(): Promise<void> {
    await this.runAction(async () => {
      await this.coordinator.disconnect();
      this.refreshUi("Mock session disconnected. Local save remains active.");
    });
  }

  private simulateConflict(): void {
    const mock = this.gateway as MockOnlineGateway;
    mock.simulateConflict();
    this.refreshUi("Mock server revision advanced. The next sync can show CONFLICT.");
  }

  private refreshStatus(): void {
    this.refreshUi("Status refreshed. Local save remains active.");
  }

  private disposeCoordinator(): void {
    if (this.disposed) return;
    this.disposed = true;
    void this.coordinator?.dispose();
  }

  private returnToField(): void {
    this.disposeCoordinator();
    this.scene.stop("OnlineStatusScene");
    const field = this.scene.get("FieldScene") as import("./FieldScene").FieldScene;
    const message = typeof this.messageText?.text === "string" ? this.messageText.text : undefined;
    field.returnFromOnlineStatus(message);
  }
}
