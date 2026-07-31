import {
  ONLINE_PROTOCOL_VERSION,
  type BootstrapRequest,
  type BootstrapResponse,
  type OnlineGateway,
  type OnlineResult,
  type PullSnapshotRequest,
  type PullSnapshotResponse,
  type PushOperationsRequest,
  type PushOperationsResponse,
} from "./onlineTypes";

const disabledError = {
  code: "ONLINE_DISABLED" as const,
  message: "Online connectivity is disabled; the local game remains fully active.",
  retryable: false,
};

export class DisabledOnlineGateway implements OnlineGateway {
  public async bootstrap(_request: BootstrapRequest, _signal?: AbortSignal): Promise<OnlineResult<BootstrapResponse>> {
    return { ok: false, error: disabledError };
  }

  public async pullSnapshot(_request: PullSnapshotRequest, _signal?: AbortSignal): Promise<OnlineResult<PullSnapshotResponse>> {
    return { ok: false, error: disabledError };
  }

  public async pushOperations(_request: PushOperationsRequest, _signal?: AbortSignal): Promise<OnlineResult<PushOperationsResponse>> {
    return { ok: false, error: disabledError };
  }

  public async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  public get protocolVersion(): number {
    return ONLINE_PROTOCOL_VERSION;
  }
}
