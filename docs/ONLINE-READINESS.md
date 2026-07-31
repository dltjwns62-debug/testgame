# Stage 17 온라인 확장 준비 — 완료

검수 태그 `review-stage-17-v5`가 승인되어 `main`에 반영됐고 완료 태그 `stage-17-completed`로 고정됐다. 이 문서는 실제 온라인 서비스가 아니라 향후 확장을 위한 계약·검증·adapter 경계의 완료 상태를 기록한다.

Stage 17은 실제 온라인 서비스를 배포하는 단계가 아니다. 기존 localStorage 게임을 그대로 유지하면서, 미래 서버 연결을 위한 TypeScript 계약·검증·adapter 경계를 준비한다.

## 현재 구현 범위

- `ONLINE_PROTOCOL_VERSION = 1`
- `OnlinePlayerSnapshot`과 canonical hash
- `OnlineGateway` 계약
- 기본 `DisabledOnlineGateway`: 네트워크 요청 없음, `ONLINE_DISABLED` 반환
- `MockOnlineGateway`: 메모리 전용 bootstrap/pull/push, revision, idempotency, conflict 재현
- operation envelope와 FIFO pending queue
- queue count 200개·serialized byte 512 KiB 제한
- server-authoritative conflict resolution 정책
- `OnlineSyncCoordinator` 상태 전환과 dispose 경계
- `OnlineStatusScene` 및 `?onlineMock=1` 전용 mock UI
- OpenAPI 계약 문서와 위협 모델

## 의도적으로 구현하지 않은 범위

실제 서버 프로세스, HTTP/WebSocket, 계정·OAuth, bearer token 저장, 클라우드 저장, 실시간 PvP·멀티플레이어, 거래·결제, 채팅, 운영자 페이지, provider SDK와 배포는 구현하지 않는다.

기본 모드는 `DISABLED`이며 기존 localStorage 저장과 전투는 독립적으로 계속 동작한다. `?onlineMock=1`은 실제 서버가 아닌 메모리 adapter만 활성화한다.

## 후보 provider 비교 기준

PostgreSQL 기반 자체 API, Supabase, Firebase, Cloudflare Workers를 다음 capability로 비교한다.

- authoritative transaction과 row-level authorization
- idempotency 및 optimistic concurrency
- realtime 필요성·지역성·운영 복잡도
- 백업·복구·감사 로그
- Phaser 클라이언트 adapter 경계와 vendor lock-in

이번 단계에서는 특정 provider를 선택하지 않는다.
