# 현재 구조와 확장 경계

## 계층

- `src/main.ts`: Phaser 진입점
- `src/game/scenes/`: Bootstrap, Field, Battle과 메뉴 Scene
- `src/game/*.ts`: Formation, Control Group, Inventory, Progression, AutoProgress, Persistence 순수 로직
- `src/game/persistence.ts`: Storage adapter, SaveEnvelope, offline settlement 경계
- `tests/`: Phaser 전체를 복제하지 않는 Node 내장 순수 함수 회귀 테스트

## 데이터 경계

- authoritative한 현재 세션 상태는 Phaser registry와 `rosterUnitId`를 기준으로 한다.
- 장비 인스턴스 식별자는 `itemInstanceId`를 사용한다.
- 전투 결과는 `RTSBattleResult` 단일 경계를 사용한다.
- 저장은 `SaveEnvelope`와 schema/checksum 검증을 거친다.
- 시간과 Storage는 persistence 테스트 경계에서 주입할 수 있어야 한다.

## Stage 17 확장 경계

서버 authoritative 상태, API endpoint, 인증, 데이터베이스, 실시간 네트워크, 계정·멀티플레이어는 Stage 16에서 구현하지 않는다. 서버 도입 시 게임 규칙 코드가 직접 localStorage에 의존하지 않도록 persistence adapter를 교체한다.
