# 프로젝트 결정 사항

## 12단계 v5 문서 일치성 결정 (검수 재제출)

- 결정: 현재 구현 설명은 `CONTROL_GROUPS_REGISTRY_KEY`와 `rosterUnitId`를 기준으로 같은 세션에서 유지되는 persistent 부대 설계를 설명해야 한다.
- 결정: 사망·Bench 유닛은 persistent 부대 원본에서 삭제하지 않으며, recall/UI에서 현재 생존·편성 유닛만 필터링한다.
- 결정: `docs/STATUS.md`에 남아 있던 BattleScene별 초기화·사망 ID 즉시 삭제 설명은 과거 구현 기록과 현재 구현을 혼동하므로 현재 요약에서 제거한다.
- 결정: `review-stage-12-v4`와 v4의 `changes_requested` 기록은 보존하고, 문서 정정본을 `review-stage-12-v5`로 `review_pending` 제출한다.
- 결정: v4 사용자 실행 테스트는 실행하지 않았으므로 `not_tested`로 유지한다.
- 결정: 13단계 경험치·레벨·능력치 기능은 별도 승인·시작 명령 전까지 구현하지 않는다.
- 상태: 확정

## 12단계 v4 지역 방어 기준점 결정 (검수 재제출)

- 결정: Auto Hunt OFF 아군은 고정 `guardPosition` 기준으로 지역 방어를 수행한다.
- 결정: `guardPosition`은 자동 복귀 목적지가 아니라 지역 적 탐색과 교전 leash의 defense anchor다.
- 결정: NONE 상태의 최초 적 탐색은 guardPosition 기준 `RTS_GUARD_AGGRO_RANGE = 140`px다.
- 결정: LOCAL_ENGAGE 재탐색과 최대 추적 범위는 guardPosition 기준 `RTS_GUARD_LEASH_RANGE = 180`px다.
- 결정: 타깃을 잃으면 180px 안의 다른 적을 먼저 찾고, 다른 적이 없으면 현재 위치에서 IDLE로 멈춘다.
- 결정: 지역 전투 종료 후 유닛은 이전 생성 위치나 guardPosition으로 자동 귀환하지 않는다.
- 결정: guardPosition은 전투 시작, 사용자의 MOVE 정상 완료, Auto Hunt ON→OFF 전환 때만 갱신한다.
- 결정: 자동 전투 이동·타깃 손실·타깃 전환·분리 충돌은 guardPosition을 갱신하지 않는다.
- 결정: Auto Hunt ON은 전장 전체 탐색을 유지하고, FOCUS_ATTACK은 guard leash 예외를 유지한다.
- 결정: 전투맵 크기, 카메라 이동·확대는 이번 수정 범위가 아니다.
- 결정: `review-stage-12-v3`는 사용자 테스트 실패와 `changes_requested`로 보존하고, 수정본은 `review-stage-12-v4`로 `review_pending` 제출한다.
- 상태: 확정

## 12단계 v3 전투 간 부대 지속 결정 (검수 재제출)

- 결정: 부대 구성은 BattleScene별 임시 상태가 아니라 같은 게임 세션에서 유지되는 registry 상태다.
- 결정: `CONTROL_GROUPS_REGISTRY_KEY`에 10개 부대를 `rosterUnitId` 배열로 저장하고 registry 읽기·쓰기에 깊은 복사를 사용한다.
- 결정: FormationState의 전체 `ownedUnits`를 부대 ID 유효성 기준으로 사용하며 Bench 유닛도 부대 정의에 유지한다.
- 결정: 전투 사망은 현재 선택과 조회 결과에만 영향을 주고 persistent 부대 정의는 삭제하지 않는다.
- 결정: recall과 UI 인원수 조회는 원본 그룹을 수정하지 않으며, 현재 생존·편성 유닛만 선택 가능하게 한다.
- 결정: Bench 유닛이 점유된 일반 용병 슬롯을 직접 대체하고 Apply하면 기존 유닛의 모든 부대 지정을 새 `rosterUnitId`로 승계한다.
- 결정: 구매만 한 경우, 빈 슬롯 배치, 배치 유닛 간 슬롯 교환, 단순 Bench 이동에는 부대 승계를 적용하지 않는다.
- 결정: 승리·패배·Field·Formation·Shop 이동 후에도 부대 구성과 KeyBindingState를 유지한다.
- 결정: 브라우저 새로고침 이후 영구 저장은 15단계에서 처리하며 이번 단계에서 localStorage는 사용하지 않는다.
- 결정: `review-stage-12-v2`는 사용자 통합 테스트 실패와 changes_requested로 보존하고 수정본은 `review-stage-12-v3`로 `review_pending` 제출한다.
- 상태: 확정

## 12단계 v2 UI 수정 결정 (historical; superseded by v3)

- 결정: 부대 상태 UI는 `RTS_ARENA_BOUNDS` 밖의 좌측 하단 소형 5×2 영역에 배치하고 전투장 중앙에 큰 패널을 두지 않는다.
- 결정: UI 배경과 텍스트는 적·아군·선택 드래그·적 우클릭·하단 슬롯·Skill 패널을 가리지 않도록 한다.
- 결정: 내부 groupIndex 0~9는 유지하되 정식 이름은 Group 1~Group 10으로 표시한다.
- 결정: 실제 호출키는 사용자 설정값을 표시하고, 기본 설정에서 Group 10의 키는 0이다.
- 결정: `review-stage-12-v1`은 중앙 UI 겹침과 Group 10 표기 문제로 `changes_requested`로 보존하고, 수정본은 `review-stage-12-v2`로 `review_pending` 제출한다.
- 결정: 사용자 실행 테스트는 아직 `not_tested`이며 12단계 승인 전 `main`을 변경하지 않는다.
- 상태: 확정

## 12단계 부대 지정과 단축키 설정 결정 (historical; superseded by v3)

- 결정: 부대는 BattleScene 인스턴스의 임시 상태로만 유지하고 새 전투마다 10개 그룹을 초기화한다.
- 결정: Ctrl+1…Ctrl+9·Ctrl+0은 생존한 선택 ALLY를 저장하고, 1…9·0은 현재 살아 있는 그룹 멤버만 호출한다.
- 결정: 그룹 멤버는 현재 `battleUnitId`를 사용하고 `slotIndex` 오름차순, `battleUnitId` 순으로 결정적으로 정렬한다.
- 결정: 사망·오래된 ID는 선택과 모든 그룹에서 제거하며, 부대 호출은 명령·목표·목적지·Guard·Auto Hunt·스킬 쿨다운을 변경하지 않는다.
- 결정: 숫자 그룹 키와 Whirlwind·First Aid 키는 `testgame.keyBindings` registry에 저장하고, 손상된 값은 전체 기본값으로 복구한다.
- 결정: 같은 종류의 키 충돌은 두 설정을 교환하고, KeySettingsScene의 Cancel은 draft를 폐기하며 Apply 때만 registry에 저장한다.
- 결정: 12단계는 `review-stage-12-v1`로 `review_pending` 제출하며 사용자 실행 테스트는 `not_tested`, ChatGPT 코드 검수는 `not_reviewed`로 기록한다.
- 결정: 12단계 승인 전에는 `main`을 변경하지 않고, 13단계 경험치·레벨·능력치 기능을 구현하지 않는다.
- 상태: 확정

## 11단계 최종 승인 및 main 반영 결정

- 결정: `review-stage-11-v1`의 정적 코드 검수를 승인한다.
- 결정: 승인 커밋 `c63369ce05e19b23d43eff5d753b8f9159736bdc`를 `main`에 no-ff 병합한다.
- 결정: 기능 커밋 `3d654a2a5cc34578833b345236d436e296cd6f15`와 기존 검수 태그를 보존한다.
- 결정: 11단계를 `completed`로 확정하고 완료 태그 `stage-11-completed`를 생성한다.
- 결정: 사용자 수동 테스트는 사용자 요청으로 생략 (`skipped_by_user`)하며 통과로 기록하지 않는다.
- 결정: 다음 통합 테스트 마일스톤은 12단계로 둔다.
- 결정: 반복 구매·판매·환불·원거리·투사체·부대 단축키·경험치·아이템·영구 저장·온라인 기능은 구현하지 않는다.
- 상태: 확정

## 11단계 상점·용병 구매 기능 결정 (검수 제출 당시)

- Gold는 `PLAYER_GOLD_REGISTRY_KEY`로 세션 동안 유지하고, 전투 보상과 상점 소비는 같은 registry 잔액을 사용한다.
- 초기 Gold는 0이며, 음수·소수·NaN·Infinity·문자열·객체·안전하지 않은 정수는 유효하지 않은 값으로 처리한다.
- 상점 상품은 Swordsman, Guardian, Scout 세 종류이며 각 상품은 현재 한 번만 구매할 수 있다.
- 구매 성공 시 Gold는 정확히 한 번 차감되고, Gold와 FormationState가 부분 성공으로 어긋나지 않도록 동기식 원자 처리와 복구를 사용한다.
- 구매한 유닛은 `ownedUnits`에 추가하고 슬롯에는 자동 배치하지 않으며, 구매 직후 상태는 Bench다.
- `ownedUnits`는 기본 10명과 구매 가능한 용병 최대 3명을 합쳐 10~13명으로 검증하고, 편성 슬롯은 계속 10개로 유지한다.
- Reset Default는 구매 용병을 삭제하지 않고 초기 기본 10명을 슬롯에 복원하며 구매 용병은 Bench로 보존한다.
- 구매 용병의 이름·정의·능력치는 슬롯과 무관한 정체성으로 유지하고 실제 편성 roster에 포함될 때 자신의 정의를 사용한다.
- Gold와 구매 결과는 Phaser registry 세션 범위에서만 유지하며 새로고침·브라우저 종료·서버 저장은 다루지 않는다.
- 반복 구매·판매·환불·재고 갱신·랜덤 상품·원거리 공격·새 스킬은 구현하지 않는다.
- 부대 지정과 단축키는 12단계에서 별도 구현한다.
- 11단계는 `review-stage-11-v1`로 `review_pending` 제출하며, 사용자 요청으로 수동 테스트를 생략하고 `main`에는 병합하지 않는다.
- 상태: 확정

## Stage 9 v3 per-unit guard defense decisions

- Auto Hunt OFF allies each own an independent `guardPosition`, initially copied from their spawn position.
- A successful floor MOVE stores the constrained arrival position as the new guard position; invalid MOVE cleanup does not change it.
- An ally detects any living enemy within `RTS_GUARD_AGGRO_RANGE = 140` of its own guard position, regardless of damage or enemy `currentTargetId`.
- Local defense uses `RTS_GUARD_LEASH_RANGE = 180`; targets beyond it are released and the ally returns home.
- Guard aggro targets are distributed by assigned count, current distance, and `battleUnitId`.
- Only active MOVE blocks guard defense. FOCUS_ATTACK ignores guard leash, and Auto Hunt ON keeps global search.
- Auto Hunt OFF transition copies each AUTO_HUNT ally's current position into a new guard position before clearing its target.
- The v2 AllyAssistThreat request system is replaced rather than run alongside guard defense.
- A single selected ally in Auto Hunt OFF shows the guard range centered on `guardPosition`; per-unit ranges remain deferred.

## Stage 9 v2 persistent local ally assistance decisions (historical; superseded by v3)

- Local assistance reacts to real damage and to nearby enemies that are pursuing an ally through `currentTargetId`.
- A distant target assignment alone does not create a threat; the enemy and target must be within `RTS_LOCAL_ENGAGEMENT_RANGE`.
- `AllyAssistThreat` entries remain valid for `RTS_ALLY_ASSIST_THREAT_MEMORY_MS = 2500`ms and are refreshed while pursuit continues.
- Support candidates are checked continuously within the shared `RTS_ALLY_ASSIST_RANGE = 140`; per-unit `assistRange` remains deferred.
- Only active MOVE has priority over support. Completed or stale MOVE is normalized immediately.
- `FOCUS_ATTACK`, `AUTO_HUNT`, and an existing valid `LOCAL_ENGAGE` target are not overwritten.
- Multiple threats and targets use deterministic distance, attacker, pursuit, target-count, and `battleUnitId` ordering.
- `review-stage-09-v1` is preserved; the v2 submission is `review-stage-09-v2` and is recorded as `changes_requested`.

현재 단계 기준: 11단계 — 상점·용병 구매 기능 (`review_pending`)

## 결정 목록

### 1. 장르

- 결정: 장르는 자동사냥 방치형 웹게임이다.
- 상태: 확정

### 2. 첫 번째 플레이 흐름

- 결정: 첫 번째 플레이 흐름은 필드에서 몬스터를 선택하고 접근한 뒤 전투 화면으로 진입하는 것이다.
- 상태: 확정

### 3. 초기 실행 방식

- 결정: 초기 버전은 로컬 실행을 우선한다.
- 상태: 확정

### 4. 저장소 운영

- 결정: 하나의 GitHub 저장소에서 계속 확장한다.
- 상태: 확정

### 5. 단계별 개발 방식

- 결정: 개발은 작은 단계로 나누어 진행하고, 각 단계는 별도 작업 브랜치에서 구현한다.
- 상태: 확정

### 6. 검수 전 작업 브랜치 운영

- 결정: 작업 브랜치는 검수 전에 GitHub에 push한다.
- 상태: 확정

### 7. main 반영 절차

- 결정: 검수 전에는 `main`에 병합하지 않으며, 사용자 검수 통과 후 별도의 승인 작업으로 `main`에 반영한다.
- 상태: 확정

### 최초 main 부트스트랩 예외

- 결정: 저장소 최초 생성 과정에서 검수 전에 `main`에 초기 문서가 반영된 사실을 일회성 예외로 기록한다.
- 결정: 해당 커밋은 1단계 검수 승인을 의미하지 않는다.
- 결정: 기존 Git 기록은 강제 수정하거나 삭제하지 않는다.
- 결정: 이후 모든 단계는 승인된 `main`에서 작업 브랜치를 만들고, 검수 전에는 해당 작업 브랜치에만 push한다.
- 결정: 검수 승인 전에는 `main`을 직접 변경하거나 병합하지 않는다.
- 상태: 확정

### 9. 검수 버전 관리

- 결정: 검수 대상 버전은 tracked 파일 내부의 현재 커밋 해시가 아니라 변경되지 않는 Git 태그로 관리한다.
- 결정: 검수 태그는 `review-stage-XX-vN` 형식을 사용하며, 현재 태그는 `review-stage-01-v1`이다.
- 결정: 이미 원격에 존재하는 검수 태그는 이동하거나 덮어쓰지 않는다.
- 상태: 확정

### 10. 온라인 기능 범위

- 결정: 실제 온라인 기능은 초기 범위에서 제외하지만, 나중에 확장 가능한 구조를 고려한다.
- 상태: 확정

### 11. 기술 스택

- 결정: 현재 기술 스택은 아직 확정하지 않는다.
- 상태: 확정

### 12. 1단계 검수 승인 및 main 반영

- 결정: 1단계 검수 결과를 승인한다.
- 결정: 승인 검수 태그는 `review-stage-01-v1`이다.
- 결정: 승인 커밋은 `87edf1f8fad331e79a17dc60e698daae9814fb58`이다.
- 결정: 승인된 작업의 `main` 반영을 허용한다.
- 결정: 1단계를 완료 확정한다.
- 결정: 2단계는 별도 명령으로 시작한다.
- 상태: 확정

## 2단계 기술 스택

- 결정: 브라우저 기반 2D 게임 프레임워크로 Phaser를 사용한다.
- 결정: 게임 코드는 TypeScript로 작성한다.
- 결정: 로컬 개발 서버와 빌드는 Vite를 사용한다.
- 결정: 패키지는 npm으로 관리한다.
- 결정: 현재 단계에서는 React, Vue, 서버 프레임워크를 사용하지 않는다.
- 이유: 첫 프로젝트에서 구조와 실행 방법을 단순하게 유지하면서 이후 이동과 전투 기능을 확장하기 위함이다.
- 상태: 확정

## 2단계 검수 승인 및 main 반영

- 결정: 2단계 검수 결과를 승인한다.
- 결정: 승인 태그는 `review-stage-02-v2`이다.
- 결정: 승인 커밋은 `98da2757670ab2502b1edc2dc6ecf0b1d427cb7f`이다.
- 결정: 사용자 실행 테스트는 통과했다.
- 결정: `main` 반영을 허용한다.
- 결정: 2단계를 완료 확정한다.
- 결정: 3단계는 별도 명령으로 시작한다.
- 상태: 확정

## 3단계 구현 결정

- 결정: 몬스터 선택은 우클릭으로 수행한다.
- 결정: 좌클릭은 사용하지 않는다.
- 결정: 빈 바닥 우클릭은 아무 동작도 하지 않는다.
- 결정: 이동은 delta 기반 직선 이동으로 구현한다.
- 결정: 물리 엔진과 경로 탐색은 사용하지 않는다.
- 결정: 도착 기준은 플레이어와 몬스터의 접촉 거리다.
- 결정: 도착 시 이동만 멈추며 전투 진입은 4단계로 연기한다.
- 결정: 상태는 `IDLE`과 `MOVING`만 사용한다.
- 상태: 확정

## 3단계 검수 승인 및 main 반영

- 결정: 3단계 검수 결과를 승인한다.
- 결정: 승인 검수 태그는 `review-stage-03-v1`이다.
- 결정: 승인 커밋은 `d4acc8dab457cc23f3fa2993143b421c5b599aab`이다.
- 결정: 3단계에 한해 사용자의 명시적 요청으로 수동 실행 테스트를 생략한다.
- 결정: 수동 실행 테스트 생략은 테스트 통과와 다르며 `skipped_by_user`로 기록한다.
- 결정: 코드 검수 승인과 자동 검사 결과를 기준으로 3단계 `main` 병합을 승인한다.
- 결정: 이후 단계의 수동 테스트까지 자동으로 생략한다는 의미는 아니다.
- 결정: 3단계를 완료 확정한다.
- 결정: 4단계는 별도 시작 명령으로 시작한다.
- 상태: 확정

## 4단계 구현 결정

- 결정: 플레이어가 현재 목표의 `CONTACT_DISTANCE`에 도착하면 `BattleScene`으로 전환한다.
- 결정: 필드 상태에 `BATTLE`을 추가하고 전환 직전에 상태를 변경한다.
- 결정: 중복 전환 방지를 위해 FieldScene과 BattleScene에 최소한의 guard를 둔다.
- 결정: FieldScene을 보존하기 위해 pause/resume 방식을 사용한다.
- 결정: BattleScene에는 정적인 참가자 이름과 HP만 표시한다.
- 결정: Return to Field는 기존 필드 위치와 선택 표시를 유지한다.
- 결정: 복귀 후 필드 상태는 `IDLE`로 변경하고 자동 재진입하지 않는다.
- 결정: 실제 공격과 HP 감소는 5단계로 연기한다.
- 결정: 3단계 수동 테스트 생략은 4단계에 자동 적용하지 않는다.
- 상태: 확정

## 4단계 검수 승인 및 main 반영

- 결정: 4단계 검수 결과를 승인한다.
- 결정: 승인 태그는 `review-stage-04-v1`이다.
- 결정: 승인 커밋은 `0fd7e3c88d35350ada4050ae6c9448ec5a9e02c2`이다.
- 결정: 사용자 실행 테스트는 통과했다.
- 결정: `main` 반영을 허용한다.
- 결정: 4단계를 완료 확정한다.
- 결정: 실제 자동전투는 5단계로 유지한다.
- 결정: 5단계는 별도 시작 명령으로 시작한다.
- 상태: 확정

## 5단계 구현 결정

- 결정: 자동전투는 `BattleScene`의 `update`와 delta 누적으로 처리한다.
- 결정: 플레이어 공격 주기는 1000ms, 몬스터 공격 주기는 1400ms로 한다.
- 결정: 플레이어 피해량은 10, 몬스터 피해량은 8로 고정한다.
- 결정: 랜덤 피해, 방어력, 치명타는 사용하지 않는다.
- 결정: 같은 프레임에는 플레이어 공격을 먼저 처리한다.
- 결정: HP는 0 미만으로 내려가지 않도록 보정한다.
- 결정: 한쪽 HP가 0이면 공격만 정지하고 중립적인 안내를 표시한다.
- 결정: 승패와 결과 처리는 6단계로 연기한다.
- 결정: 전투를 나갔다 다시 들어오면 새 전투로 초기화한다.
- 상태: 확정

## 5단계 검수 승인 및 main 반영

- 결정: 5단계 검수 결과를 승인한다.
- 결정: 승인 태그는 `review-stage-05-v1`이다.
- 결정: 승인 커밋은 `02f6c49bf11f902d757f62a639ec4be4656351b7`이다.
- 결정: 사용자 실행 테스트는 통과했다.
- 결정: `main` 반영을 허용한다.
- 결정: 5단계를 완료 확정한다.
- 결정: 6단계는 별도 시작 명령으로 시작한다.
- 결정: 필드 상단 단계 표시 문제는 `main`에서 직접 수정하지 않고 6단계 작업 브랜치에서 수정한다.
- 상태: 확정

## 6단계 구현 결정

- 결정: 전투 결과 상태는 `RUNNING`, `VICTORY`, `DEFEAT`만 사용한다.
- 결정: 같은 프레임에서는 플레이어 공격을 먼저 처리하고, 몬스터 HP가 0이면 몬스터 공격 없이 즉시 승리 처리한다.
- 결정: 결과는 `resultCommitted` guard로 한 번만 확정한다.
- 결정: Slime 1~3의 승리 보상은 각 10 Gold, Slime 4의 승리 보상은 25 Gold이다.
- 결정: 패배 시 Gold를 지급하지 않고 몬스터를 필드에 유지한다.
- 결정: 승리한 몬스터는 필드에서 숨긴 뒤 3초 후 동일 위치·색상·이름으로 재생성한다.
- 결정: 전투 결과 화면은 자동으로 필드로 돌아가지 않으며 Return to Field로 복귀한다.
- 결정: 6단계에 한해 사용자 실행 테스트는 아직 실시하지 않고 `not_tested`로 기록한다.
- 결정: 경험치·레벨·능력치·아이템·인벤토리·저장·온라인 기능은 7단계 이후로 연기한다.
- 상태: 확정

## 6단계 검수 제출 상태

- 결정: 현재 작업 브랜치는 `stage-06-results-rewards-respawn`이다.
- 결정: 최초 검수 태그 `review-stage-06-v1`은 수정 요청 기록으로 보존한다.
- 결정: 현재 재검수 기준 태그는 `review-stage-06-v2`이다.
- 결정: 6단계는 구현 완료 후 검수 대기 (`review_pending`)로 기록한다.
- 결정: 필드 상단의 이전 `Stage 4` 안내 문구는 6단계 브랜치에서 `Stage 6`으로 수정한다.
- 결정: 7단계는 별도 시작 명령 전까지 시작하지 않는다.
- 상태: 확정

## 6단계 검수 수정 결정

- 결정: 승리 보상은 전달된 결과값이 아니라 현재 몬스터 정의의 `goldReward`를 공식 기준으로 사용한다.
- 결정: 전달된 승리 보상이 공식 보상과 다르면 결과를 적용하지 않고 Gold를 지급하지 않는다.
- 결정: 패배 결과는 전달된 보상이 정확히 0일 때만 적용한다.
- 결정: 결과 검증을 모두 통과한 뒤에만 결과 적용 guard를 변경한다.
- 결정: 6단계 최초 검수에서 발견된 보상 검증 문제를 수정 요청으로 기록한다.
- 상태: 확정

## 6단계 최종 승인 및 main 반영

- 결정: 최초 검수 태그는 `review-stage-06-v1`, 결과는 수정 요청으로 보존한다.
- 결정: 최종 검수 태그는 `review-stage-06-v2`이다.
- 결정: 최종 승인 커밋은 `d5fe39174aaf1d96e194f858992253f8f311f4be`이다.
- 결정: Gold 검증 수정이 확인됐다.
- 결정: 사용자 실행 테스트는 통과했다.
- 결정: ChatGPT 코드 검수는 승인됐다.
- 결정: 승인된 6단계 작업을 `main`에 반영한다.
- 결정: 6단계를 완료 확정한다.
- 결정: `favicon.ico` 404는 비차단 알려진 문제로 기록한다.
- 결정: 7단계는 별도 시작 명령으로 시작한다.
- 상태: 확정

## 7단계 데이터·대형 검수 수정 결정

## 7단계 수동 전투 반응 수정 결정

- 결정: 명령 없는 아군은 전체 전장을 자동 탐색하지 않고 `IDLE`을 유지한다.
- 결정: 집중 공격 대상이 살아 있는 동안 현재 대상을 유지하고, 대상이 사망하면 유효한 가까운 대상을 다시 선택한다.
- 결정: 피격 반격과 공격 이동 중 로컬 교전 탐색은 `RTS_LOCAL_ENGAGEMENT_RANGE` 안에서만 수행한다.
- 결정: 공격 가능 거리는 공격자 반지름과 대상 반지름을 함께 포함하며, 접근 중 대상 위치는 직접 변경하지 않는다.
- 결정: 유닛 분리는 같은 팀끼리만 수행한다.
- 결정: `review-stage-07-v4`는 수정 요청으로 보존하고 `review-stage-07-v5`로 재제출한다.
- 상태: 확정

## 7단계 명령 상태 전환 검수 수정 결정

- 결정: `FOCUS_ATTACK` 대상이 사망하거나 무효화되면 집중 공격을 종료하고 `LOCAL_ENGAGE`로 전환한다.
- 결정: 집중 공격 대상 상실 후 재탐색은 `RTS_LOCAL_ENGAGEMENT_RANGE` 안에서만 수행하며 전장 전체 탐색을 하지 않는다.
- 결정: `ATTACK_MOVE` 중 피격되면 공격자와 교전하되 기존 `commandDestination`을 보존하고, 교전 종료 후 목적지 이동을 재개한다.
- 결정: `NONE`과 `LOCAL_ENGAGE`의 피격 반응은 별도 목적지 없이 지역 교전으로 처리한다.
- 결정: `review-stage-07-v5`는 수정 요청으로 보존하고 재검수 태그 `review-stage-07-v6`를 사용한다.
- 상태: 확정

## 7단계 직접 이동 명령 검수 수정 결정

- 결정: 바닥 우클릭은 `ATTACK_MOVE`가 아닌 순수 `MOVE` 명령으로 처리한다.
- 결정: `MOVE` 중에는 공격·추적·지역 타깃 획득과 피격 반격을 중단하고 목적지 이동을 우선한다.
- 결정: `MOVE` 목적지 도착 시 `NONE`과 `IDLE`로 전환하고 이전 피격 기억을 초기화한다.
- 결정: 적 직접 우클릭은 기존 `FOCUS_ATTACK`을 유지하며 새로운 수동 명령이 기존 명령을 덮어쓴다.
- 결정: `ATTACK_MOVE`는 내부 예약 상태로만 유지하고 7단계 사용자 입력은 제공하지 않는다.
- 결정: Auto Hunt와 공격 이동은 별개 기능이며 이번 작업에서는 구현하지 않는다.
- 결정: `review-stage-07-v6`는 수정 요청으로 보존하고 재검수 태그 `review-stage-07-v7`을 사용한다.
- 상태: 확정

## 7단계 최종 승인 결정

- 결정: 바닥 우클릭은 순수 `MOVE` 명령으로 처리하고 현재 공격·반격·추적보다 우선한다.
- 결정: `MOVE` 중 피격돼도 목적지 도착 전에는 반격하지 않는다.
- 결정: 적 직접 우클릭은 `FOCUS_ATTACK`으로 처리한다.
- 결정: 집중 공격 대상 사망 후에는 지역 교전 범위 안에서 반격 및 재탐색을 허용한다.
- 결정: 전장 전체 자동 탐색은 향후 Auto Hunt가 담당하며 7단계에는 구현하지 않는다.
- 결정: 공격 이동은 추후 A + 클릭 등 별도 입력으로 구현한다.
- 결정: 서로 다른 팀 사이에는 일반 분리 힘이나 넉백을 적용하지 않고, 같은 팀끼리만 약한 겹침 완화를 적용한다.
- 결정: 전투 간격·사거리·스폰 거리·원거리 유닛 수치는 추후 데이터 설정으로 조정할 수 있다.
- 결정: `review-stage-07-v7`을 승인하고 7단계를 `main`에 반영한다.
- 상태: 확정

## 7단계 UI 검수 수정 결정

- 결정: 상태 문구는 오른쪽 끝 좌표를 고정하고 `Return to Field` 버튼과 최소 30px 이상의 수평 간격을 유지한다.
- 결정: `resetBattle()`은 새 전투 데이터를 검증하기 전에 이전 전투의 적 표시 정보를 안전한 초기값으로 초기화한다.
- 결정: 기존 10대10 RTS 전투장과 하단 슬롯 배치는 이번 UI 수정 범위에서 변경하지 않는다.
- 결정: `review-stage-07-v2`는 수정 요청 기록으로 보존하고 재검수 태그 `review-stage-07-v3`를 사용한다.
- 상태: 확정

## 7단계 검수 수정 결정

- 결정: 월드맵 몬스터 ID를 RTS 전투 데이터의 단일 식별 기준으로 사용한다.
- 결정: 알 수 없는 몬스터 ID나 잘못된 전투 payload는 Slime 1로 대체하지 않고 전투를 시작하지 않는다.
- 결정: 검수 수정에서 전투 결과 타입을 `RTSBattleResult`로 통일한다.
- 결정: 대형 배치는 전체 대형을 먼저 배치한 뒤 가장자리에서 이동시키며, 0 거리 겹침과 비유한 좌표를 방지한다.
- 결정: 전투 로그는 하단 아군 슬롯과 분리된 영역에 표시한다.
- 결정: 최초 검수 태그 `review-stage-07-v1`은 보존하고 재검수 태그 `review-stage-07-v2`를 사용한다.
- 상태: 확정

## 7단계 구현 결정

- 결정: 전투 방향은 거상온라인식 소규모 부대 RTS로 한다.
- 결정: 월드맵에서 선택한 몬스터 종류와 전투 적군 종류는 반드시 일치한다.
- 결정: 전투 기본 인원은 아군 10마리와 선택 몬스터 적군 10마리다.
- 결정: 주인공 여부는 `unitRole`로 관리하고 `slotIndex`와 분리한다.
- 결정: 아군은 단일 클릭·드래그 다중 선택·우클릭 이동·우클릭 공격 명령만 수행한다.
- 결정: 적군은 가장 가까운 생존 아군을 찾아 자동으로 추격·공격한다.
- 결정: 주인공만 죽어도 다른 아군이 생존하면 전투를 계속하며, 패배 조건은 아군 전멸이다.
- 결정: 한 전투의 Gold는 적군 개체별이 아니라 월드맵 몬스터 개체 기준으로 한 번 지급한다.
- 결정: 자동사냥은 8단계, 스킬은 9단계, 편성은 10단계, 상점은 11단계, 부대 지정은 12단계로 연기한다.
- 결정: 기존 `favicon.ico` 404는 비차단 알려진 문제로 유지한다.
- 상태: 임시 결정

## 로드맵 17단계 확장

- 결정: 기존 10단계 로드맵을 17단계로 확장한다.
- 결정: 기존 1~6단계 완료 기록과 검수 이력은 보존한다.
- 결정: 7단계 이후 경험치·아이템·저장·온라인 관련 단계는 뒤로 이동한다.
- 상태: 확정

## 8단계 Auto Hunt 및 수동 명령 결정

- 결정: Auto Hunt의 기본값은 OFF로 시작한다.
- 결정: Auto Hunt ON은 전투 중 생존 아군 전체에 적용하고, 전역 적 탐색과 자동 전투를 허용한다.
- 결정: Auto Hunt OFF에서는 자동 명령 유닛만 해제하며 수동 MOVE·FOCUS_ATTACK·ATTACK_MOVE·LOCAL_ENGAGE 명령은 취소하지 않는다.
- 결정: 수동 MOVE 명령은 Auto Hunt보다 우선하고, 목적지 도착 전에는 자동 타깃 획득을 하지 않는다.
- 결정: 수동 FOCUS_ATTACK 명령은 Auto Hunt보다 우선하며 지정 대상 생존 중에는 해당 대상을 우선한다.
- 결정: 수동 명령이 종료된 뒤 Auto Hunt가 ON이면 자동 전투를 재개한다.
- 결정: Auto Hunt 상태는 Phaser 전역 registry에 저장해 필드 왕복 세션에서 유지한다.
- 결정: localStorage 기반 영구 저장은 후속 저장 단계로 연기한다.
- 결정: 월드맵 자동 몬스터 선택, A 키 공격 이동, 스킬·상점·편성·부대 지정·경험치 기능은 이번 단계에서 구현하지 않는다.
- 결정: 사용자 수동 테스트와 ChatGPT 코드 검수 전까지 8단계는 `review_pending`으로 유지한다.
- 상태: 확정

## 8단계 v2 동료 지원 및 근접 범위 결정

- 결정: Auto Hunt OFF에서도 공격받은 아군을 중심으로 `RTS_ALLY_ASSIST_RANGE` 안의 대기 아군이 지역 전투에 참여한다.
- 결정: 동료 지원 범위는 `RTS_ALLY_ASSIST_RANGE = 140`으로 조절 가능하게 관리한다.
- 결정: 지원 대상은 `RTS_LOCAL_ENGAGEMENT_RANGE` 안의 적만 사용하며 전장 전체 탐색으로 확장하지 않는다.
- 결정: `NONE`과 유효한 적 대상이 없는 `LOCAL_ENGAGE`만 동료 지원 대상으로 허용한다.
- 결정: MOVE·FOCUS_ATTACK·ATTACK_MOVE는 동료 지원보다 우선하고, AUTO_HUNT는 기존 자동 전투를 유지한다.
- 결정: 이미 유효한 적과 싸우는 LOCAL_ENGAGE 유닛의 대상은 불필요하게 변경하지 않는다.
- 결정: 지원 대상은 현재 타깃 수, 공격자 우선, 지원 유닛과의 거리, battleUnitId 순으로 결정적으로 분산한다.
- 결정: 현재 모든 전투 유닛은 근접 유닛이며, 원거리 유닛과 투사체는 후속 단계로 연기한다.
- 결정: attackRange는 몸 반지름을 제외한 추가 무기 도달 거리이며 현재 주인공 10px, 일반 유닛 8px, Slime 4 10px로 설정한다.
- 결정: 실제 중심점 공격 판정은 공격자 attackRange와 양쪽 collisionRadius를 합산하고 피해 직전에 다시 확인한다.
- 결정: 정확히 한 명의 생존 아군을 선택했을 때만 `collisionRadius + attackRange` 공격 범위 원과 `Melee reach` 정보를 표시한다.
- 결정: `review-stage-08-v1`은 수정 요청으로 보존하고 `review-stage-08-v2`로 재제출한다.
- 상태: 확정

## 8단계 v3 동료 지원 타깃 기억 결정

- 결정: 실제로 공격받은 `attackedAlly` 본인의 `lastAttackerId`와 `lastAttackedAt`은 반격을 위해 유지한다.
- 결정: 동료 지원으로 참여하는 아군은 실제 피해를 받은 당사자가 아니므로 공격자를 `lastAttackerId`로 기록하지 않는다.
- 결정: 지원 아군 배정 시 `lastAttackerId = null`, `lastAttackedAt = 0`으로 이전 피격 기억을 제거한다.
- 결정: 지원 아군의 최초 타깃이 사망해도 최초 공격자 기억 때문에 하나의 적에게 강제 재집결하지 않는다.
- 결정: 지원 아군은 기존 지역 타깃 분산 규칙으로 `RTS_LOCAL_ENGAGEMENT_RANGE` 안의 다음 적을 탐색한다.
- 결정: `review-stage-08-v2`는 수정 요청으로 보존하고 `review-stage-08-v3`로 재제출한다.
- 상태: 확정

## 8단계 최종 승인 및 main 반영 결정

- 결정: `review-stage-08-v3` 검수 결과를 승인한다.
- 결정: Auto Hunt ON/OFF, 수동 MOVE·FOCUS_ATTACK 우선 처리, 지역 동료 지원과 타깃 분산을 승인한다.
- 결정: 사용자가 Auto Hunt, 수동 명령, 지역 지원, 근접 사거리, 기존 전투 조작을 직접 확인했고 사용자 실행 테스트를 통과로 기록한다.
- 결정: 승인 커밋 `80bb01a6c4857ace14b1ebc619d3082a497f482e`를 `main`에 no-ff 병합한다.
- 결정: 현재 동료 지원 범위는 공통 상수로 유지하고 유닛별 `assistRange`는 후속 유닛 데이터 확장으로 연기한다.
- 결정: 원거리 유닛과 투사체는 아직 구현하지 않는다.
- 결정: 8단계를 `completed`로 확정하고 완료 태그 `stage-08-completed`를 생성한다.
- 결정: 9단계는 별도의 시작 명령 전까지 구현하지 않는다.
- 상태: 확정

## 9단계 v3 주둔 지역 자동 방어 및 최종 승인 결정

- 결정: 각 아군은 생성 위치에서 초기화된 독립적인 `guardPosition`을 가진다.
- 결정: 성공적으로 완료된 MOVE는 도착 위치를 해당 아군의 `guardPosition`으로 갱신한다.
- 결정: 완료되거나 잘못된 MOVE 상태의 정리는 이전 유효 `guardPosition`을 보존한다.
- 결정: Auto Hunt OFF에서는 각 아군의 주둔 위치 140px 안에 있는 적을 피해 여부나 적의 타깃 소유와 무관하게 감지한다.
- 결정: 지역 교전은 주둔 위치 기준 180px guard leash를 벗어나면 추격을 중단하고 주둔 위치로 복귀한다.
- 결정: 기존 AllyAssistThreat 기반 처리 대신 유닛별 주둔 지역 자동 방어를 사용한다.
- 결정: FOCUS_ATTACK과 활성 MOVE는 주둔 지역 자동 방어보다 우선한다.
- 결정: `review-stage-09-v3` 검수 결과를 승인하고 승인 커밋 `40abfb77036d08decfc4369324ca9201ffae38ea`를 `main`에 반영한다.
- 결정: 사용자 전체 수동 테스트는 요청에 따라 `skipped_by_user`로 기록하며 통과로 간주하지 않는다.
- 결정: 9단계를 `completed`로 확정하고 완료 태그 `stage-09-completed`를 생성한다.
- 결정: 10단계는 별도의 시작 명령 전까지 구현하지 않는다.
- 상태: 확정

## 10단계 편성·슬롯 재배치와 주인공 필수 편성 결정

- 결정: 보유 유닛과 전투 슬롯은 `FormationState`의 `ownedUnits`와 `slots`로 분리한다.
- 결정: `OwnedRosterUnit`에는 `slotIndex`를 저장하지 않고, `FormationSlot`에는 유닛 정의나 역할을 복제하지 않는다.
- 결정: Hero의 `unitRole`과 `rosterUnitId`를 슬롯 번호와 독립적인 정체성으로 유지한다.
- 결정: 유효한 편성에는 MAIN_CHARACTER가 정확히 1개 포함되고 반드시 슬롯에 배치되어야 한다.
- 결정: Hero는 1번 슬롯에 고정하지 않으며 1~10번 슬롯으로 이동할 수 있다.
- 결정: 이미 배치된 유닛을 점유 슬롯으로 이동하면 교체하고, 미배치 일반 용병은 점유 일반 용병과 교체할 수 있다.
- 결정: Hero는 Remove from Formation 대상이 아니며, Hero가 없는 편성은 적용하지 않는다.
- 결정: FormationScene의 draft는 registry 원본과 분리하고 Apply & Return 때만 검증 후 저장한다. Cancel은 변경을 폐기한다.
- 결정: Reset Default는 draft만 기본값으로 되돌리고 Apply 전에는 registry를 변경하지 않는다.
- 결정: FieldScene은 유효한 FormationState를 `buildBattleRosterFromFormation()`으로 변환해 BattleScene에 전달한다.
- 결정: 전투 roster는 1~10명의 아군을 허용하고, 빈 슬롯은 전투 하단 UI에 EMPTY로 표시한다.
- 결정: 잘못된 FormationState 또는 roster는 기본 전투 편성으로 대체하지 않고 전투를 시작하지 않는다.
- 결정: 10단계는 `review_pending`으로 기록하고 `review-stage-10-v1`로 검수 제출한다.
- 결정: 11단계 상점·용병 구매 기능은 별도의 시작 명령 전까지 구현하지 않는다.
- 상태: 확정

## 10단계 v2 검수 수정 결정

- 결정: `FormationState.ownedUnits`는 정확히 10명의 보유 유닛을 유지하고, 실제 `slots` 배치만 1~10명을 허용한다.
- 결정: 일반 용병을 Bench로 이동해도 보유 유닛 목록에서는 삭제하지 않는다.
- 결정: Hero 한 명만 남은 손상 registry와 9명 또는 11명의 보유 목록은 무효로 판정하고 기본 10명 편성으로 복구한다.
- 결정: `buildBattleRosterFromFormation()`은 빈 슬롯을 제외하고 `slotIndex` 오름차순으로 roster를 반환한다.
- 결정: FormationScene 슬롯 카드와 보유 유닛 카드에는 역할, Required, Q/W 스킬, Slot/Bench 정보를 표시한다.
- 결정: 선택 유닛 정보는 이름, 역할, Required 여부, Q/W 스킬 여부, 현재 Slot/Bench를 한 줄로 표시한다.
- 결정: Reset Default는 draft만 변경하고 `Default formation restored. Apply to save.` 안내를 표시한다.
- 결정: Apply 성공 때만 registry를 저장하고 FieldScene에 `Formation saved.` 메시지를 전달한다. Cancel은 저장 성공 메시지를 표시하지 않는다.
- 결정: 10단계 v1 검수 결과는 `changes_requested`로 보존하고, 수정 후 `review-stage-10-v2`로 재제출한다.
- 결정: 10단계는 계속 `review_pending`이며 `main` 병합과 11단계 시작은 별도 승인 명령 전까지 하지 않는다.
- 상태: 확정

## 10단계 v3 선택 상태 UX 결정

- 결정: FormationScene 진입 시 `selectedRosterUnitId`를 항상 `null`로 초기화하고 `Selected: None`으로 시작한다.
- 결정: Owned Unit 카드에서 현재 선택된 같은 유닛을 다시 클릭하면 선택을 취소한다.
- 결정: 선택된 유닛이 현재 배치된 같은 슬롯을 다시 클릭하면 선택을 취소하고 슬롯은 변경하지 않는다.
- 결정: 다른 슬롯에 배치하거나 점유 유닛과 교환한 성공 직후 선택 상태를 자동 해제한다.
- 결정: 일반 용병 편성 제외 성공 직후 선택 상태를 자동 해제하고 다음 유닛을 바로 선택할 수 있게 한다.
- 결정: 선택된 유닛과 다른 Owned Unit 카드를 클릭하면 슬롯 변경 없이 선택만 전환한다.
- 결정: Hero 제거 실패와 Bench 유닛 제거 실패에서는 데이터와 선택 상태를 유지한다.
- 결정: 10단계 v2 사용자 테스트 결과는 `failed` 및 `changes_requested`로 보존하고, v3은 `review-stage-10-v3`로 검수 제출한다.
- 결정: v3 제출 당시 10단계는 `review_pending`으로 기록했으며, 최종 승인 후 `main`에 반영한다.
- 상태: 확정

## 10단계 v3 최종 승인 결정

- 결정: `review-stage-10-v3`의 정적 코드 검수를 승인한다.
- 결정: 사용자가 Formation 선택 취소, 슬롯 교환 후 선택 해제, 연속 편성 제외, Apply 유지, EMPTY 슬롯과 Skill Merc Q/W를 직접 확인한 통합 테스트를 통과로 기록한다.
- 결정: 승인 커밋 `c4b13edc4b41e4a9f91010610c853b7924b63065`를 `main`에 no-ff 병합한다.
- 결정: 10단계를 `completed`로 확정하고 `stage-10-completed` 태그를 생성한다.
- 결정: 완료 기준은 `main` 반영 상태이며 작업 브랜치와 v1·v2·v3 검수 태그는 보존한다.
- 결정: 11단계 상점·용병 구매 기능은 별도 시작 명령 전까지 구현하지 않는다.
- 상태: 확정

## 공통 단계 정보

- 전체 단계: 17단계
- 현재 단계: 11단계 — 상점·용병 구매 기능
- 현재 단계 상태: 완료 (`completed`)
- 작업 브랜치: `main`
- 1단계 승인 태그: `review-stage-01-v1`
- 2단계 최초 검수 태그: `review-stage-02-v1` — 수정 요청
- 2단계 승인 태그: `review-stage-02-v2`
- 3단계 현재 검수 태그: `review-stage-03-v1`
- 3단계 완료 태그: `stage-03-completed`
- 4단계 현재 검수 태그: `review-stage-04-v1`
- 4단계 완료 태그: `stage-04-completed`
- 5단계 현재 검수 태그: `review-stage-05-v1`
- 5단계 완료 태그: `stage-05-completed`
- 6단계 최초 검수 태그: `review-stage-06-v1` — 수정 요청
- 6단계 현재 검수 태그: `review-stage-06-v2`
- 6단계 완료 태그: `stage-06-completed`
- 7단계 현재 검수 태그: `review-stage-07-v7`
- 8단계 현재 검수 태그: `review-stage-08-v3`
- 8단계 완료 태그: `stage-08-completed`
- 9단계 현재 검수 태그: `review-stage-09-v3` (완료)
- 10단계 최초 검수 태그: `review-stage-10-v1` — 수정 요청
- 10단계 2차 검수 태그: `review-stage-10-v2` — 사용자 테스트 수정 요청
- 10단계 현재 검수 태그: `review-stage-10-v3` (승인)
- 10단계 완료 태그: `stage-10-completed`
- 11단계 검수 태그: `review-stage-11-v1` (승인)
- 11단계 완료 태그: `stage-11-completed`
- 다음 단계: 12단계 — 부대 지정과 단축키 설정
- 완료된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계
- 검수 승인: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계 승인
- `main` 반영: 1단계부터 11단계까지 반영 완료
## 9단계 유닛 스킬과 단일 선택 전용 스킬 UI 결정

- 결정: 스킬은 슬롯 번호가 아니라 `unitDefinitionId`에 연결한다.
- 결정: 9단계 테스트 편성에는 `trial-skill-mercenary` 정의와 `ally-skill-mercenary` 슬롯을 사용한다.
- 결정: Skill Mercenary는 Q `Whirlwind`와 W `First Aid` 두 스킬만 보유한다.
- 결정: 살아 있는 스킬 보유 아군을 정확히 1개 선택했을 때만 개별 스킬 UI를 표시한다.
- 결정: 다중 선택, 스킬 미보유 유닛, 전투 종료 상태에서는 Q/W UI를 숨긴다.
- 결정: Q/W 스킬은 수동 입력으로만 사용하고 Auto Hunt는 스킬을 자동 사용하지 않는다.
- 결정: Whirlwind는 효과 범위 안의 적에게 피해를 주며, First Aid는 자신만 회복한다.
- 결정: 스킬 쿨다운은 유닛별·스킬별 전투 상태로 관리하고 실제 성공한 사용에만 시작한다.
- 결정: 스킬 피해 사망은 기존 공통 사망 처리와 전투 승패 판정을 사용한다.
- 결정: MOVE·FOCUS_ATTACK 명령과 기존 Auto Hunt, 근접 사거리, 동료 지원 동작은 9단계에서 변경하지 않는다.
- 결정: 9단계는 `review_pending`으로 기록하고 `review-stage-09-v1`로 검수 제출한다.
- 결정: 10단계 편성·슬롯 재배치와 주인공 필수 편성은 이 작업 브랜치에서 구현했으며 최초 제출 태그 `review-stage-10-v1` 이력을 보존한다.
- 상태: 확정
