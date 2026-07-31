# Online Protocol v1 — Stage 17 완료 계약

Stage 17은 이 protocol v1 계약과 로컬 검증 경계를 완료했다. 실제 서버·계정·네트워크 전송은 구현하지 않았으며 기본 게임은 local-only `DISABLED` mode로 동작한다.

## Snapshot

클라이언트는 기존 `SaveEnvelope`를 그대로 전송하지 않는다. `OnlinePlayerSnapshot`은 `protocolVersion`, `saveId`, `deviceId`, `clientInstanceId`, `clientGeneratedAtMs`, `baseServerRevision`, Formation/owned roster, Gold, progression, Inventory/equipment, Control Group, Key Binding, Auto Hunt와 AutoProgress를 포함한다.

전투 중 임시 유닛 상태, Phaser 객체, Scene 상태, pending timer/event, 전체 runtime error 객체, diagnostics frame 데이터, persistence 진단 메타데이터, 인증 토큰·비밀번호·OAuth code는 snapshot에서 제외한다. Snapshot hash는 hash 필드 자신을 제외한 canonical JSON으로 계산한다.

## Operation envelope

모든 변경은 다음 필드를 가진다.

```ts
type ClientOperationEnvelope = {
  protocolVersion: 1;
  operationId: string;
  deviceId: string;
  clientInstanceId: string;
  createdAtMs: number;
  baseServerRevision: number;
  type: string;
  payloadHash: string;
  payload: unknown;
};
```

필수 operation type은 `SNAPSHOT_CHECKPOINT`, `BATTLE_RESULT_SUBMISSION`, `OFFLINE_REWARD_CLAIM`, `SHOP_PURCHASE_REQUEST`, `EQUIPMENT_CHANGE`, `FORMATION_UPDATE`, `CLIENT_PREFERENCE_UPDATE`다. 최종 Gold·EXP·item 보상은 미래 서버가 재검증하며 클라이언트 operation은 권위 있는 결과를 주장하지 않는다.

## Gateway and errors

Phaser Scene은 fetch를 직접 호출하지 않고 `OnlineGateway`와 `OnlineSyncCoordinator`만 사용한다. timeout·retry·AbortSignal은 coordinator 경계에서 관리한다. `OnlineErrorCode`는 `ONLINE_DISABLED`, `NETWORK_UNAVAILABLE`, `AUTH_REQUIRED`, `AUTH_EXPIRED`, `PROTOCOL_MISMATCH`, `FUTURE_PROTOCOL_VERSION`, `VALIDATION_FAILED`, `REVISION_CONFLICT`, `DUPLICATE_OPERATION`, `RATE_LIMITED`, `SERVER_REJECTED`, `SERVER_ERROR`, `QUEUE_CORRUPTED`, `QUEUE_LIMIT_EXCEEDED`, `CANCELLED`, `TIMEOUT`을 사용한다.

이번 단계의 Disabled/Mock adapter는 실제 네트워크를 만들지 않는다.
