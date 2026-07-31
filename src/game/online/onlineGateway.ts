import { DisabledOnlineGateway } from "./disabledOnlineGateway";
import { MockOnlineGateway } from "./mockOnlineGateway";
import type { OnlineGateway } from "./onlineTypes";

export function createOnlineGateway(mockMode = false): OnlineGateway {
  return mockMode ? new MockOnlineGateway() : new DisabledOnlineGateway();
}

export class NullAuthTokenProvider {
  public async getToken(): Promise<string | null> { return null; }
  public async clearToken(): Promise<void> { return Promise.resolve(); }
}
