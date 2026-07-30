export type SaveDataReturnScene = "FieldScene" | "RecoveryScene";

export type SaveDataSceneData = {
  returnScene?: SaveDataReturnScene;
};

export function getSaveDataReturnScene(data: unknown): SaveDataReturnScene {
  if (data && typeof data === "object" && (data as SaveDataSceneData).returnScene === "RecoveryScene") {
    return "RecoveryScene";
  }
  return "FieldScene";
}

export function getResetRestartScene(): "BootstrapScene" {
  return "BootstrapScene";
}

