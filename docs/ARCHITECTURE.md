# 현재 구조와 확장 경계

16단계 성능 및 안정화는 `review-stage-16-v4` 검수를 승인받아 `main`에 반영했으며, 완료 스냅샷은 `stage-16-completed` 태그로 고정한다. 17단계 온라인 확장은 아직 구현하지 않는다.

## Scene/UI 계층

- `src/main.ts`: Phaser 진입점
- `src/game/scenes/`: Bootstrap, Field, Battle과 메뉴 Scene
- `src/game/*.ts`: Formation, Control Group, Inventory, Progression, AutoProgress, Persistence 순수 로직
- `src/game/persistence.ts`: Storage adapter, SaveEnvelope, offline settlement 경계
- `tests/`: Phaser 전체를 복제하지 않는 Node 내장 순수 함수 회귀 테스트

Field, Battle, Formation, Shop, Keys, Inventory, Save Data, Recovery Scene은 화면과 입력을 담당한다. 화면은 registry와 순수 계산 모듈의 경계를 호출하고, 프레임 루프에서 저장·복구를 직접 수행하지 않는다.

## 전투 시뮬레이션 계층

`rtsBattleUtils.ts`, `rtsBattleDefinitions.ts`, `progression.ts`, `items.ts`가 피해·이동·대형·레벨·장비 계산을 담당한다. BattleScene은 유닛 상태를 갱신하고 `RTSBattleResult`를 한 번만 Field에 전달한다. 결과 적용과 Gold/EXP/loot 반영은 Field의 중복 방지 경계에서 수행한다.

## 게임 데이터 정의 계층

몬스터·아군·스킬·아이템 정의는 정적 definition이고, Formation·Gold·Inventory·AutoProgress·Control Group은 registry의 세션 상태다. `rosterUnitId`는 보유·편성·부대·성장·장비 대상을 연결하는 지속 식별자이며, `itemInstanceId`는 동일 정의에서 분리된 개별 아이템을 식별한다.

## 데이터 경계

- authoritative한 현재 클라이언트 세션 상태는 Phaser registry와 `rosterUnitId`를 기준으로 한다.
- 장비 인스턴스 식별자는 `itemInstanceId`를 사용한다.
- 전투 결과는 `RTSBattleResult` 단일 경계를 사용한다.
- 저장은 `SaveEnvelope`와 schema/checksum 검증을 거친다.
- 시간은 `PersistenceEnvironment.nowMs`, 저장소는 `StorageLike` persistence adapter를 통해 주입한다.
- Random source는 offline reward의 `saveId`·`offlineClaimSequence`·monster·cycle seed 경계에 둔다.
- Reward 계산은 `calculateOfflineRewardPlan`이 담당하고 실제 Gold/EXP/item 적용은 validated payload 경계에서만 수행한다.
- runtime validation은 Bootstrap, scene 진입, save/load/reset, battle result 경계에서 수행하며 매 프레임 실행하지 않는다.
- 전투 결과 중복 방지는 Battle commit과 Field `battleResultApplied` 경계를 함께 사용한다.
- `saveId`는 저장 envelope를 식별하고, `offlineClaimSequence`는 동일 기간의 오프라인 보상 재청구를 분리한다.

## 현재 클라이언트와 향후 서버 경계

현재 클라이언트 authoritative 영역은 Phaser registry, localStorage SaveEnvelope, 전투 시뮬레이션, 보상 적용이다. 서버 authoritative로 이동할 영역은 계정 소유권, Gold/아이템/경험치 영속성, 전투 결과·중복 보상 검증, 거래와 온라인 진행이다. 게임 규칙은 localStorage API를 직접 호출하지 않고 persistence adapter만 사용한다.

## Stage 17 확장 경계

서버 authoritative 상태, API endpoint, 인증, 데이터베이스, 저장 충돌 해결, 프로토콜·실시간 네트워크, 계정·멀티플레이어의 실제 서비스는 아직 구현하지 않는다. Stage 17은 이 경계를 문서화하고 Disabled/Mock adapter 후보를 검토한다.
