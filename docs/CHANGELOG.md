# 변경 이력

## 2026-07-28 — 12단계 v4 문서 불일치 수정 및 v5 재제출 — 검수 대기

- v4 소스 코드의 지역 방어 수정은 정적 검수 승인 가능 상태였으나 `docs/STATUS.md`에 부대가 전투마다 초기화되고 사망 ID가 제거된다는 오래된 설명이 남아 있음을 확인
- 현재 구현 요약을 `CONTROL_GROUPS_REGISTRY_KEY`와 `rosterUnitId` 기반 세션 지속 부대 설계에 맞게 정정
- v3 부대 지속·키 바인딩 순수 검사 25개와 v4 guard anchor 거리·유효성 순수 검사 10개의 실제 결과를 문서에 반영
- v4 제출 결과는 `changes_requested`로 보존하고 v4 사용자 실행 테스트는 `not_tested`로 유지
- 새 검수 태그는 `review-stage-12-v5`
- 이번 수정은 문서만 변경했으며 `main`에 병합하지 않았고 13단계는 구현하지 않음

## 2026-07-28 — 12단계 v3 사용자 테스트 수정 및 v4 재제출 — 검수 대기

- v3 사용자 실행 테스트에서 Auto Hunt OFF 아군, 특히 M8·M9가 지역 적에게 접근한 뒤 기존 guardPosition으로 자동 귀환하는 문제를 확인
- `updateUnitReturningToGuard`와 동일 역할의 자동 귀환 흐름을 제거
- guardPosition을 자동 복귀 목적지가 아닌 고정 defense anchor로 사용
- NONE 최초 감지는 guardPosition 기준 140px, LOCAL_ENGAGE 재탐색·추적 제한은 180px로 분리
- 타깃을 잃으면 180px 안의 다른 적을 재탐색하고, 없으면 현재 위치에서 IDLE로 정지
- MOVE 성공 완료와 Auto Hunt OFF 전환에서만 guardPosition을 갱신
- Auto Hunt ON, FOCUS_ATTACK, 반격, ATTACK_MOVE와 전투맵 크기는 기존 범위 유지
- v3 `changes_requested` 및 `userRunTest: failed` 기록을 보존
- 새 검수 태그는 `review-stage-12-v4`
- v4 사용자 실행 테스트는 아직 미실시 (`not_tested`), main 미병합, 13단계 미구현

## 2026-07-28 — 12단계 v2 사용자 테스트 수정 및 v3 재제출 — 검수 대기

- v2 사용자 통합 테스트에서 BattleScene마다 부대 구성이 초기화되는 치명적 설계 문제를 확인
- `CONTROL_GROUPS_REGISTRY_KEY` 기반 세션 지속 `PersistentControlGroupState`를 추가
- 부대 저장 ID를 `rosterUnitId`로 유지하고 FormationState의 전체 ownedUnits를 기준으로 검증
- 전투 사망·Bench·UI 조회에서 persistent 원본을 삭제하지 않도록 수정
- recall은 현재 생존·편성 유닛만 반환하고 UI는 현재/저장 총원으로 표시
- Bench 유닛이 일반 용병 슬롯을 직접 대체하면 Apply 시 기존 부대 지정을 승계
- 첫 전투 Group 1 유지·호출 및 Swordsman의 Merc 4 슬롯 대체 후 Group 2 승계를 브라우저에서 확인
- `review-stage-12-v2`는 `changes_requested`, 사용자 통합 테스트 실패 이력으로 보존
- 새 검수 태그 `review-stage-12-v3`로 작업 브랜치에 재제출
- 사용자 실행 테스트 상태는 `not_tested`, 13단계는 구현하지 않음
- 12단계는 아직 `main`에 병합하지 않음

## 2026-07-28 — 12단계 v1 UI 수정 및 v2 재제출 — 검수 대기

- v1 정적 코드 검수에서 중앙 부대 상태 패널이 적군 초기 대형과 겹치는 문제를 수정 요청받음
- 238×132 중앙 패널을 제거하고 `RTS_ARENA_BOUNDS` 아래 좌측의 소형 5×2 부대 UI로 이동
- 부대 UI가 전투 유닛·선택 영역·적 우클릭·하단 슬롯·Skill 패널을 가리지 않도록 조정
- Group 10의 정식 이름과 실제 호출키를 분리하고 `G10 [0]` 및 `Group 10` 로그를 적용
- KeySettingsScene에 `Group 10`, `Recall: 0 · Save: Ctrl + 0` 표시를 적용
- `review-stage-12-v1`은 `changes_requested` 이력으로 보존
- 새 검수 태그 `review-stage-12-v2`로 작업 브랜치에 재제출
- 사용자 실행 테스트는 미실시 (`not_tested`), 13단계는 구현하지 않음
- 12단계는 아직 `main`에 병합하지 않음

## 2026-07-28 — 12단계 부대 지정과 단축키 설정 — 검수 대기

- BattleScene에 10개 임시 부대의 Ctrl+숫자 저장과 숫자 호출을 추가
- 저장·호출 시 생존 ALLY, 중복 제거, 결정적 정렬과 사망 유닛 정리를 적용
- registry 기반 숫자 그룹 키와 Whirlwind·First Aid 사용자 지정 키를 추가
- KeySettingsScene, FieldScene Keys 진입, BattleScene 동적 키 도움말·그룹 UI를 추가
- 순수 로직 24개와 자동 검사, 제한된 브라우저 자동 확인을 실행
- 사용자 실행 테스트는 아직 미실시 (`not_tested`), ChatGPT 코드 검수는 미실시 (`not_reviewed`)
- 검수 태그 `review-stage-12-v1`로 작업 브랜치에 제출
- 12단계는 아직 `main`에 병합하지 않았고 `stage-12-completed` 태그도 생성하지 않음
- 13단계 경험치·레벨·능력치 성장 기능은 구현하지 않음

## 2026-07-28 — 11단계 검수 승인 및 main 반영 — 완료

- 검수 태그 `review-stage-11-v1`과 승인 커밋 `c63369ce05e19b23d43eff5d753b8f9159736bdc` 확인
- registry 기반 세션 Gold, ShopScene, Swordsman·Guardian·Scout 구매 기능 승인
- 구매 중복·이중 차감 방지, 구매 직후 Bench, 최대 13명 보유와 최대 10명 전투 편성 승인
- Reset Default 구매 유닛 보존과 FormationScene 최대 13명 표시 승인
- 승인 작업을 `main`에 no-ff 병합
- 11단계를 `completed`로 확정하고 `stage-11-completed` 태그 생성
- 사용자 수동 테스트는 사용자 요청으로 생략 (`skipped_by_user`), 통과로 기록하지 않음
- 다음 단계는 12단계 부대 지정과 단축키 설정이며 아직 시작하지 않음
- 반복 구매·판매·환불·원거리·투사체·경험치·아이템·영구 저장·온라인 기능은 아직 구현하지 않음

## 2026-07-27 — 11단계 상점·용병 구매 기능 — 검수 대기

- registry 기반 세션 Gold와 전투 보상 연결
- Swordsman·Guardian·Scout 고정 상품과 정확한 가격·능력치 추가
- Gold·Formation을 함께 검증하는 동기식 원자 구매와 중복 구매 방지
- 신규 용병을 `ownedUnits`에 추가하고 구매 직후 Bench로 유지
- 기본 10명 필수 보존, 최대 13명 보유 검증, 전투 roster 최대 10명 유지
- 최대 13명 FormationScene 표시와 구매 유닛을 삭제하지 않는 Reset Default
- FieldScene Shop 버튼·Gold·Owned 표시 및 ShopScene 추가
- 순수 로직 검사, npm 검사, 개발 서버와 제한된 브라우저 자동 확인 완료
- 사용자 수동 테스트는 사용자 요청으로 생략 (`skipped_by_user`), 통과로 기록하지 않음
- ChatGPT 코드 검수는 `not_reviewed`, `main`은 미반영
- 검수 태그 `review-stage-11-v1` 제출
- 12단계 부대 지정·단축키 기능은 구현하지 않음

## 2026-07-27 — 10단계 v3 최종 승인 및 main 반영 — 완료

- `review-stage-10-v3` 승인 및 사용자 통합 테스트 통과
- `FormationState`와 `FormationScene`, 정확히 10명의 보유 유닛과 1~10명 실제 편성 완료
- Hero 필수 편성과 자유 슬롯 이동, 일반 용병 Bench, 빈 슬롯, 고정 10슬롯 전투 위치 완료
- Hero와 Skill Merc 정체성 및 Q/W 스킬 유지
- 동일 유닛 재클릭 선택 취소, 슬롯 이동·교환 후 선택 해제, 편성 제외 후 선택 해제 완료
- 승인 작업을 `main`에 no-ff 병합
- 완료 태그 `stage-10-completed` 생성
- 다음 단계는 11단계 상점·용병 구매 기능이며 별도 시작 명령 전까지 구현하지 않음

## 2026-07-27 — 10단계 v2 선택 상태 UX 수정 및 v3 재제출 — 검수 대기

- v2 사용자 테스트에서 선택 유닛이 슬롯 교환·이동 후에도 남는 문제를 발견해 수정 요청됨
- FormationScene 진입 시 `selectedRosterUnitId`를 초기화
- 같은 유닛 카드 재클릭과 같은 슬롯 재클릭 시 `Selection cleared.`로 선택 취소
- 슬롯 배치·교환 성공 후 선택 상태 자동 해제
- 일반 용병 편성 제외 성공 후 선택 상태 자동 해제
- v2 검수 결과 `changes_requested`, 사용자 테스트 결과 `failed`를 보존
- v1·v2 태그는 보존하고 새 검수 태그는 `review-stage-10-v3`
- 사용자 수동 테스트는 v3에서도 미실시 (`not_tested`), 10단계는 아직 `main`에 병합하지 않음
- 11단계 상점·용병 구매 기능은 구현하지 않음

## 2026-07-27 — 10단계 v1 수정 요청 반영 및 v2 재제출 — 검수 대기

- v1 정적 코드 검수에서 `ownedUnits` 1~10명 허용, roster 정렬, 편성 정체성 표시와 Reset 저장 안내가 수정 요청됨
- `ownedUnits`를 정확히 10명으로 강제하고, 일반 용병 Bench는 보유 유닛 삭제가 아님을 명확히 함
- 잘못된 Hero 단독 registry를 기본 10명 편성으로 복구
- 배치 전투 roster를 `slotIndex` 오름차순으로 정렬하고 빈 슬롯은 제외
- Formation 화면에 역할·Required·Q/W 스킬·Slot/Bench 정보를 표시
- Reset 안내를 `Default formation restored. Apply to save.`로 변경하고 Apply 성공 시 `Formation saved.` 표시
- v1 태그 `review-stage-10-v1`과 수정 요청 이력을 보존하고 새 검수 태그는 `review-stage-10-v2`
- 사용자 수동 테스트는 아직 미실시 (`not_tested`), 10단계는 아직 `main`에 병합하지 않음
- 11단계 상점·용병 구매 기능은 구현하지 않음

## 2026-07-27 — 10단계 편성·슬롯 재배치와 주인공 필수 편성 — 검수 대기

- `FormationState`로 보유 유닛과 전투 슬롯을 분리
- Hero의 `unitRole`·`rosterUnitId`를 슬롯 번호와 독립적으로 유지
- Hero 필수 1개 편성과 1~10번 슬롯 이동, 슬롯 교체와 빈 슬롯 배치 구현
- 일반 용병 Remove from Formation, Reset Default, Cancel과 Apply & Return 구현
- registry 기반 편성 저장과 FieldScene·BattleScene roster 전달 구현
- 빈 슬롯 전투 UI와 잘못된 roster 전투 시작 차단 구현
- `npm ci`, typecheck, build, 개발 서버 HTTP 200 및 Formation 브라우저 확인 완료
- 사용자 수동 테스트는 아직 미실시 (`not_tested`)
- ChatGPT 코드 검수는 아직 미실시 (`not_reviewed`)
- 현재 상태는 `review_pending`
- 검수 태그는 `review-stage-10-v1`
- 11단계 상점·용병 구매 기능은 구현하지 않음

## 2026-07-27 — 9단계 v3 검수 승인 및 main 반영 — 완료

- 검수 태그 `review-stage-09-v3`와 승인 커밋 `40abfb77036d08decfc4369324ca9201ffae38ea` 확인
- Skill Mercenary, Whirlwind·First Aid, 단일 선택 전용 스킬 UI를 승인
- 각 아군 `guardPosition` 기반 주둔 지역 자동 방어와 MOVE 정규화를 승인
- 140px guard aggro, 180px guard leash, 주둔 위치 복귀와 범위 표시를 승인
- 기존 Skill Q/W, Auto Hunt, 수동 명령 우선순위를 유지
- 사용자 전체 수동 테스트는 요청에 따라 생략 (`skipped_by_user`)
- 생략된 수동 테스트는 통과로 기록하지 않음
- 자동 검사와 ChatGPT 코드 검수 승인 후 작업 브랜치를 `main`에 no-ff 병합
- 9단계를 `completed`로 확정하고 완료 태그 `stage-09-completed` 생성
- 다음 단계는 10단계이며 아직 시작하지 않음

## 2026-07-27 — Stage 9 v3 per-unit guard defense resubmission

- Adds independent `guardPosition` data for every battle unit.
- Stores successful MOVE arrival positions as new guard positions.
- Detects nearby enemies around each guard position without damage or enemy target ownership.
- Adds 140px guard aggro and 180px guard leash behavior.
- Returns units to guard positions after local enemies disappear or leave leash range.
- Replaces persistent AllyAssistThreat processing with per-unit guard defense.
- Adds the single-selection guard range visualization while Auto Hunt is OFF.
- Preserves Skill Merc Q/W and existing command priorities.
- Records `review-stage-09-v2` as `changes_requested` and submits `review-stage-09-v3`.

## 2026-07-27 — Stage 9 v2 persistent local ally assistance resubmission

- Detects nearby enemy pursuit as a local assistance threat before real damage.
- Adds 2500ms threat memory and refreshes it while pursuit continues.
- Rechecks support candidates continuously, including allies entering range later.
- Normalizes completed and malformed MOVE commands; active MOVE retains priority.
- Uses deterministic threat and target selection without overwriting protected commands.
- Preserves Skill Merc Q/W behavior and all deferred stage boundaries.
- Records v1 as `changes_requested` and submits `review-stage-09-v2`.

변경 이력은 누적해서 기록한다. 기존 기록은 삭제하지 않으며, 새 기록은 최신 항목이 위에 오도록 추가한다. 검수 대기 중인 작업은 완료 이력과 구분해서 표시한다.

## 2026-07-26 — 8단계 Auto Hunt 및 지역 동료 지원 최종 승인·main 반영 — 완료

- `review-stage-08-v3` 코드 검수 통과
- 사용자 실행 테스트 통과
- Auto Hunt ON/OFF와 전장 전체 자동 타깃 탐색 유지
- 수동 MOVE와 FOCUS_ATTACK 우선 처리 유지
- Auto Hunt OFF 지역 동료 지원과 결정적 타깃 분산 유지
- 근접 사거리 축소와 단일 선택 공격 범위 표시 유지
- 지원 아군의 타깃 기억 수정 반영
- 승인 작업을 `main`에 no-ff 병합
- 8단계를 `completed`로 확정
- 완료 태그 `stage-08-completed` 생성
- 다음 단계는 9단계 스킬 기능이며 아직 시작하지 않음
- 유닛별 `assistRange`는 구현하지 않고 미래 데이터 확장 사항으로 기록

## 2026-07-26 — 8단계 동료 지원 타깃 기억 수정 및 v3 재제출 — 검수 대기

- 지원 아군에게 최초 공격자를 `lastAttackerId`로 기록하던 문제를 수정
- 지원 아군 배정 시 `lastAttackerId = null`, `lastAttackedAt = 0`으로 이전 피격 기억을 초기화
- 실제 피해를 받은 아군 본인의 공격자 기억과 반격 동작은 유지
- 지원 대상 사망 후 반격 우선순위 때문에 최초 공격자에게 재집결하는 경로를 차단
- 기존 지역 타깃 분산, Auto Hunt, MOVE·FOCUS_ATTACK 우선순위와 8~10px 근접 사거리를 유지
- `review-stage-08-v2`는 changes_requested 기록으로 보존
- 새 검수 태그는 `review-stage-08-v3`
- 사용자 수동 테스트와 ChatGPT 코드 검수는 아직 실시하지 않음
- 8단계는 아직 완료되지 않았으며 현재 상태는 `review_pending`

## 2026-07-26 — 8단계 검수 피드백 수정 및 v2 재제출 — 검수 대기

- Auto Hunt OFF에서 공격받은 아군 주변의 대기 아군이 지역 전투를 지원하도록 추가
- 동료 지원 범위를 `RTS_ALLY_ASSIST_RANGE = 140`으로 분리해 조절 가능하게 구성
- MOVE·FOCUS_ATTACK·ATTACK_MOVE·AUTO_HUNT와 유효한 기존 LOCAL_ENGAGE 명령은 지원으로 덮어쓰지 않음
- 지역 적 후보의 공격자 우선·현재 타깃 수·거리·ID 정렬로 지원 대상을 결정적으로 분산
- 동료 지원 전투는 `RTS_LOCAL_ENGAGEMENT_RANGE`를 벗어나 전장 전체 추적으로 확장하지 않음
- 주인공 10px, 시험용 용병 8px, Slime 1~3 8px, Slime 4 10px로 근접 추가 사거리를 축소
- 실제 공격 판정은 기존처럼 공격자 사거리와 양쪽 collisionRadius를 합산하고 피해 직전에 재검사
- 단일 아군 선택 시 실제 근접 도달 경계를 얇은 공격 범위 원으로 표시하고 `Melee reach`를 표시
- `review-stage-08-v1`은 changes_requested 기록으로 보존
- 새 검수 태그는 `review-stage-08-v2`
- 사용자 수동 테스트와 ChatGPT 코드 검수는 아직 실시하지 않음
- 8단계는 아직 완료되지 않았으며 현재 상태는 `review_pending`

## 2026-07-26 — 8단계 Auto Hunt 제어 및 수동 명령 우선순위 구현 — 검수 대기

- 전투 화면에 Auto Hunt ON/OFF 버튼을 추가하고 기본값을 OFF로 유지
- Auto Hunt ON에서 생존 아군 전체가 전역 적 탐색과 자동 전투를 수행하도록 구현
- 수동 MOVE와 FOCUS_ATTACK 명령을 Auto Hunt보다 우선 처리
- 수동 명령 종료 후 Auto Hunt가 ON이면 자동 전투를 재개
- Auto Hunt OFF에서는 자동 유닛만 해제하고 수동 명령과 로컬 반격을 보존
- Phaser 전역 registry로 필드 왕복 세션의 Auto Hunt 상태를 저장
- 기존 1~7단계 구현과 검수 이력은 보존
- 현재 검수 태그는 `review-stage-08-v1`
- 사용자 수동 테스트는 아직 실시하지 않음 (`not_tested`)
- ChatGPT 코드 검수는 아직 실시하지 않음 (`not_reviewed`)
- 8단계는 아직 완료되지 않았으며 현재 상태는 `review_pending`

## 2026-07-26 — 7단계 10대10 RTS 핵심 전투 최종 승인 및 main 반영 — 완료

- `review-stage-07-v7` 코드 검수 통과
- 사용자 실행 테스트 통과
- 월드맵 선택 몬스터와 전투 적군 종류 연결
- 아군 10명과 적군 10명 생성
- 단일 선택과 드래그 다중 선택
- 적 직접 우클릭 집중 공격
- 집중 공격 대상 사망 후 지역 반격
- 바닥 우클릭 순수 `MOVE` 명령
- 전투 중 수동 이동 명령 우선
- 팀 간 밀림 제거
- 기존 Gold 지급과 몬스터 재생성 연결 유지
- 7단계를 `completed`로 확정하고 `main`에 no-ff 병합
- 다음 단계는 8단계 Auto Hunt ON/OFF이며 아직 시작하지 않음

## 2026-07-26 — 7단계 순수 MOVE 명령 수정 및 v7 재제출 — 검수 대기

- `review-stage-07-v6` 사용자 테스트에서 바닥 우클릭 이동 우선순위 수정 요청을 확인
- 바닥 우클릭을 `ATTACK_MOVE`가 아닌 순수 `MOVE` 명령으로 변경
- `MOVE` 중 공격·추적·자동 타깃 획득·피격 반격을 차단
- 목적지 도착 시 `NONE`·`IDLE` 전환과 이전 피격 기억 초기화
- 적 직접 우클릭의 `FOCUS_ATTACK`과 새 명령 우선순위 유지
- `ATTACK_MOVE` 입력, Auto Hunt, A 키 입력은 구현하지 않음
- `review-stage-07-v6`는 수정 요청 기록으로 보존
- 새 검수 태그는 `review-stage-07-v7`
- 사용자 수동 테스트는 아직 미실시 (`not_tested`)
- 7단계는 아직 완료되지 않음 (`review_pending`)

## 2026-07-26 — 7단계 RTS 명령 상태 전환 수정 및 v6 재제출 — 검수 대기

- `review-stage-07-v5` 검수에서 집중 공격 종료와 공격 이동 복귀에 대한 수정 요청을 확인
- 집중 공격 대상 사망 시 `FOCUS_ATTACK`을 종료하고 지역 교전으로 전환
- 집중 공격 대상 상실 후 `RTS_LOCAL_ENGAGEMENT_RANGE` 안에서만 재탐색
- 공격 이동 중 피격돼도 기존 `commandDestination`을 보존하고 교전 후 이동 재개
- `NONE`과 `LOCAL_ENGAGE`의 반격 상태 전환을 명확히 분리
- `review-stage-07-v5`는 보존하고 새 검수 태그는 `review-stage-07-v6`
- 사용자 수동 테스트는 아직 미실시 (`not_tested`)
- 7단계는 아직 완료되지 않음 (`review_pending`)
- Auto Hunt 및 8단계 기능은 구현하지 않음

## 2026-07-26 — 7단계 수동 전투 반응 수정 및 v5 재제출 — 검수 대기

- 집중 공격 대상이 사망하거나 무효화될 때 유효한 가까운 대상을 다시 선택하도록 수정
- 피격 아군의 로컬 반격과 공격 이동 중 로컬 교전 탐색을 수정
- 명령 없는 아군이 전체 전장을 자동 탐색하지 않도록 제한
- 공격 가능 거리에 공격자·대상 반지름을 모두 반영
- 같은 팀만 분리하고 적군과 아군을 서로 밀어내지 않도록 수정
- `review-stage-07-v4`는 수정 요청 기록으로 보존
- 새 검수 태그는 `review-stage-07-v5`
- 사용자 실행 테스트는 아직 미실시 (`not_tested`)
- Auto Hunt 및 8단계 기능은 구현하지 않음

## 2026-07-26 — 7단계 검수 이력 복구 및 v4 재제출 — 검수 대기

- `review-stage-07-v3` 코드 검수 이후 게임 코드 수정 사항 없음
- `project-status.json`에서 누락된 `review-stage-07-v1` 검수 이력을 발견
- `review-stage-07-v1`, v2, v3 검수 이력을 모두 보존하도록 복구
- 새 검수 제출 태그는 `review-stage-07-v4`
- 게임 코드는 변경하지 않음
- 사용자 실행 테스트는 아직 미실시 (`not_tested`)
- 7단계는 아직 승인 또는 완료 상태가 아님
- `main`에는 아직 반영하지 않음

## 2026-07-26 — 7단계 RTS UI 검수 수정 및 v3 재제출 — 검수 대기

- `review-stage-07-v2` 재검수에서 우측 상단 상태 문구와 Return to Field 버튼의 겹침 가능성이 확인됨
- 상태 문구를 오른쪽 정렬하고 우측 경계를 고정해 Return 버튼과 분리
- `resetBattle()` 시작 시 이전 전투의 적 표시 정보를 안전한 초기값으로 초기화
- `review-stage-07-v1`과 `review-stage-07-v2`는 보존
- 새 검수 태그는 `review-stage-07-v3`
- 사용자 실행 테스트는 아직 미실시 (`not_tested`)
- 7단계는 아직 완료되지 않음 (`review_pending`)

## 2026-07-26 — 7단계 검수 지적 사항 수정 및 재제출 — 검수 대기

- 7단계 최초 코드 검수에서 수정 요청됨
- `sourceWorldMonsterId`를 전투 적군 정의의 단일 기준으로 변경
- 잘못된 ID를 기본 Slime 1로 대체하지 않고 전투를 시작하지 않도록 수정
- `RTSBattleResult`로 전투 결과 타입을 통일
- 가장자리 대형 좌표 중복과 0 거리 겹침을 방지하고 비유한 좌표를 차단
- 전투 로그를 하단 슬롯과 분리해 슬롯이 겹치지 않도록 수정
- `review-stage-07-v1`은 보존
- 새 검수 태그는 `review-stage-07-v2`
- 사용자 실행 테스트는 아직 미실시 (`not_tested`)
- 7단계는 아직 완료되지 않음 (`review_pending`)

## 2026-07-26 — 7단계 검수 제출 — 검수 대기

- 로드맵을 17단계로 개편
- 거상온라인식 소규모 부대 RTS 방향 확정
- 선택한 월드맵 몬스터 종류의 적군 10마리 생성
- 시험용 아군 10마리 생성
- 주인공과 슬롯 정체성 분리
- 단일 선택 및 드래그 다중 선택
- 우클릭 이동과 다중 유닛 대형 이동
- 우클릭 공격 명령과 공격 사거리 접근
- 적군 AI의 가까운 아군 탐색·추격·공격
- 다수 유닛 HP·사망 및 전멸 승패
- 기존 Gold와 월드맵 몬스터 재생성 연결
- 자동사냥과 스킬은 이후 단계로 연기
- 사용자 실행 테스트 미실시 (`not_tested`)
- ChatGPT 코드 검수 미실시 (`not_reviewed`)
- 검수 태그 `review-stage-07-v1`

## 2026-07-26 — 6단계 재검수 승인 및 main 반영 — 완료

- `review-stage-06-v1`에서 Gold 검증 문제로 수정 요청
- `review-stage-06-v2`에서 수정 확인
- 승인 커밋 `d5fe39174aaf1d96e194f858992253f8f311f4be` 확인
- 사용자 실행 테스트 통과
- ChatGPT 코드 재검수 통과
- 승리·패배 판정, 공식 Gold 보상 검증, 누적 Gold 표시 확인
- 승리 몬스터 제거와 3초 후 재생성 확인
- 패배 시 보상과 제거가 없음을 확인
- 작업 브랜치를 `main`에 병합
- 6단계를 `completed`로 확정
- `favicon.ico` 비차단 404를 알려진 문제로 기록
- 7단계는 아직 시작하지 않음

## 2026-07-26 — 6단계 최초 코드 검수 수정 요청 및 재제출 — 검수 대기

- 6단계 최초 코드 검수에서 수정 요청됨
- Gold 지급 기준을 몬스터 정의의 공식값으로 변경
- 전달된 보상과 공식 보상이 다르면 지급하지 않도록 수정
- 패배 보상은 정확히 0일 때만 결과를 적용하도록 수정
- `review-stage-06-v1`은 보존
- 새 검수 태그는 `review-stage-06-v2`
- 사용자 실행 테스트는 아직 미실시 (`not_tested`)
- 6단계는 아직 완료되지 않음

## 2026-07-26 — 6단계 검수 제출 — 검수 대기

- 승리·패배 결과를 `VICTORY`와 `DEFEAT`로 구분
- 결과 중복 방지 및 결과 화면 구현
- Slime별 Gold 보상과 승리 1회 지급 구현
- 승리한 몬스터 숨김 및 3초 후 동일 위치 재생성 구현
- 패배 시 무보상·몬스터 유지 구현
- 필드 Gold 누적 및 Stage 6 안내 문구 반영
- `npm ci`, TypeScript 검사, 빌드, 브라우저 자동 검사 통과
- 사용자 실행 테스트 미실시 (`not_tested`)
- ChatGPT 코드 검수 미실시 (`not_reviewed`)
- 상태 `review_pending`
- 검수 태그 `review-stage-06-v1`
- 7단계 기능은 아직 구현하지 않음

## 2026-07-26 — 5단계 검수 승인 및 main 반영 — 완료

- `review-stage-05-v1` 승인
- 승인 커밋 `02f6c49bf11f902d757f62a639ec4be4656351b7` 확인
- 사용자 실행 테스트 통과
- ChatGPT 코드 검수 통과
- 기본 자동전투, HP 텍스트·HP 바, 공격 기록 확인
- HP 0에서 전투 정지 확인
- `Return to Field` 및 재전투 초기화 확인
- 승리·패배·보상 기능이 없음을 확인
- 작업 브랜치를 `main`에 병합
- 5단계를 `completed`로 확정
- 필드 안내 문구가 `Stage 4`로 남아 있는 비차단 문제 기록
- 해당 문제는 6단계 작업 브랜치에서 수정 예정
- 6단계는 아직 시작하지 않음

## 2026-07-26 — 5단계 검수 제출 — 검수 대기

- 기본 자동전투 구현
- 플레이어와 몬스터 독립 공격 주기 구현
- 고정 피해량 적용
- HP 텍스트 및 HP 바 갱신
- 최근 공격 기록 표시
- HP 0에서 전투 정지
- `Return to Field` 유지
- 승리·패배·보상은 구현하지 않음
- 자동 TypeScript 검사, 빌드 및 브라우저 자동 검사 결과 기록
- 사용자 실행 테스트 미실시
- ChatGPT 코드 검수 미실시
- 상태 `review_pending`
- 검수 태그 `review-stage-05-v1`

## 2026-07-26 — 4단계 검수 승인 및 main 반영 — 완료

- `review-stage-04-v1` 승인
- 승인 커밋 `0fd7e3c88d35350ada4050ae6c9448ec5a9e02c2` 확인
- 사용자 실행 테스트 통과
- ChatGPT 코드 검수 통과
- 접촉 시 `BattleScene` 전환 확인
- 정확한 몬스터 이름과 정적 플레이어·몬스터 HP 표시 확인
- `Return to Field` 정상 동작 및 필드 상태 보존 확인
- 실제 공격과 HP 감소가 없음을 확인
- 작업 브랜치를 `main`에 병합
- 4단계를 `completed`로 확정
- 5단계는 아직 시작하지 않음

## 2026-07-26 — 4단계 검수 제출 — 검수 대기

- `BATTLE` 상태 추가
- 접촉 시 `BattleScene` 전환 구현
- 전환 중복 방지 guard 구현
- 선택된 몬스터 정보와 정적 플레이어·몬스터 HP 전달
- `Return to Field` 버튼 구현
- `FieldScene` pause/resume 방식으로 필드 위치 보존
- 복귀 후 자동 전투 재진입 방지
- 실제 공격, 피해량, HP 감소, 승패는 구현하지 않음
- `npm ci`, TypeScript 검사, 빌드 및 브라우저 자동 검사 결과 기록
- 사용자 실행 테스트 미실시
- ChatGPT 코드 검수 미실시
- 상태 `review_pending`
- 검수 태그 `review-stage-04-v1`

## 2026-07-26 — 3단계 검수 승인 및 main 반영 — 완료

- 검수 태그 `review-stage-03-v1` 승인
- 승인 커밋 `d4acc8dab457cc23f3fa2993143b421c5b599aab` 확인
- 코드 검수 승인
- 사용자 수동 실행 테스트는 사용자의 명시적 요청으로 생략 (`skipped_by_user`)
- 생략을 테스트 통과로 기록하지 않음
- 작업 브랜치를 `main`에 `--no-ff` 방식으로 반영
- 3단계를 `completed`로 확정
- 완료 태그 `stage-03-completed` 생성
- 4단계는 아직 시작하지 않음
- 전투 화면, 공격, 체력 기능은 아직 구현하지 않음

## 2026-07-26 — 3단계 검수 제출 — 검수 대기

- 몬스터 우클릭 선택 구현
- 선택 표시 구현
- 플레이어 자동 접근 구현
- 이동 중 목표 변경 구현
- 접촉 거리 정지 구현
- 빈 바닥 우클릭 무반응
- 전투 기능은 구현하지 않음
- 자동 TypeScript 검사와 빌드 결과 기록
- 사용자 실행 테스트 미실시
- ChatGPT 코드 검수 미실시
- 상태 `review_pending`
- 검수 태그 `review-stage-03-v1`

## 2026-07-26 — 2단계 검수 승인 및 main 반영 — 완료

- `review-stage-02-v2` 승인
- 승인 커밋 `98da2757670ab2502b1edc2dc6ecf0b1d427cb7f` 확인
- 사용자 실행 테스트 통과
- ChatGPT 코드 재검수 통과
- 반응형 화면 수정 확인
- 플레이어 1명과 몬스터 4마리 표시 확인
- 콘솔 빨간 오류 없음
- AudioContext 자동재생 경고는 비차단 경고임
- 작업 브랜치를 `main`에 병합함
- 2단계를 `completed`로 확정함
- 3단계는 아직 시작하지 않음

## 2026-07-26 — 2단계 검수 수정 및 재제출 — 검수 대기

- 2단계 최초 코드 검수에서 수정 요청됨
- 작은 브라우저 창에서 화면이 잘릴 가능성을 수정함
- README와 로드맵의 오래된 단계 설명을 수정함
- Node.js 최소 버전을 명시함
- 최초 검수 태그 `review-stage-02-v1`은 보존함
- 새 검수 태그는 `review-stage-02-v2`임
- 사용자 실행 테스트는 아직 미실시
- 2단계는 아직 완료 또는 승인 상태가 아님

## 2026-07-26 — 2단계 검수 제출 — 검수 대기

- Phaser, TypeScript, Vite 프로젝트 구성
- 필드 장면 생성
- 플레이어 1명 표시
- 몬스터 4마리 이상 표시
- 플레이어·몬스터 이름표와 단계 안내 표시
- `npm install`, `npm run typecheck`, `npm run build` 실행 명령 추가
- 자동 TypeScript 검사와 프로덕션 빌드 통과
- 개발 서버 시작 및 브라우저 렌더링 확인
- 사용자 실행 테스트는 아직 미실시
- ChatGPT 검수는 아직 미실시
- 상태는 `review_pending`
- 다음 단계 기능은 구현하지 않음

## 2026-07-26 — 1단계 검수 승인 및 main 반영 — 완료

- 검수 태그 `review-stage-01-v1` 승인
- 검수 커밋 `87edf1f8fad331e79a17dc60e698daae9814fb58` 확인
- 작업 브랜치를 `main`에 반영
- 1단계를 `completed`로 확정
- 현재 단계: 1단계 — 프로젝트 기반 및 개발단계 관리
- 현재 상태: `completed`
- 현재 작업 브랜치: `main`
- 다음 단계: 2단계 — 필드 화면에 플레이어와 몬스터 표시 (`not_started`)
- 2단계는 아직 시작하지 않음
- 실제 게임 기능은 아직 구현되지 않음

## 2026-07-26 — 1단계 검수 메타데이터 수정 — 검수 대기

- 1단계 최초 작업 중 검수 전에 `main` 브랜치가 생성되고 초기 문서가 반영됐음
- 해당 반영은 정식 검수 승인을 의미하지 않음
- Git 기록을 강제로 재작성하지 않고 일회성 부트스트랩 예외로 보존함
- 이후에는 검수 전 작업 브랜치에만 push함
- 앞으로 `main`은 검수 승인 후에만 변경함
- 커밋 해시 자기참조를 방지하기 위해 검수 기준을 `review-stage-01-v1` Git 태그로 관리함
- 현재 1단계는 계속 `review_pending` 상태임

## 2026-07-26 — 1단계: 프로젝트 기반 및 개발단계 관리 — 검수 대기

- 프로젝트 저장소 초기 작업
- 10단계 개발 로드맵 생성
- 현재 개발상태 추적 체계 생성
- 개발 AI 작업 규칙 생성
- Git 브랜치 검수 절차 도입
- 실제 게임 기능은 아직 구현하지 않았음
- 현재 상태는 1단계 검수 대기임

### 단계 정보

- 전체 단계: 10단계
- 현재 단계: 1단계 — 프로젝트 기반 및 개발단계 관리
- 상태 코드: `review_pending`
- 작업 브랜치: `stage-01-project-setup`
- 검수 기준 태그: `review-stage-01-v1`
- 다음 단계: 2단계 — 필드 화면에 플레이어와 몬스터 표시
- 완료된 단계: 없음
- 검수 승인: 미승인
- `main` 반영: 미반영
## 2026-07-26 — 9단계 유닛 스킬과 단일 선택 전용 스킬 UI — 검수 대기

- 유닛 정의에 `UnitSkillId`와 스킬 목록을 연결하고 Skill Mercenary를 추가
- Skill Mercenary에 Q `Whirlwind`와 W `First Aid`를 정의
- 생존 스킬 유닛을 정확히 1개 선택했을 때만 스킬 패널을 표시
- 수동 Q/W 입력과 유닛별·스킬별 전투 쿨다운을 추가
- Auto Hunt가 스킬을 자동으로 사용하지 않으며 MOVE·FOCUS_ATTACK 우선순위를 유지
- 공통 사망 처리를 사용해 스킬 처치도 기존 전투 결과 처리를 따름
- 자동 검사와 개발 서버, 일부 브라우저 UI 확인 완료
- 사용자 수동 테스트는 아직 미실시 (`not_tested`)
- ChatGPT 코드 검수는 아직 미실시 (`not_reviewed`)
- 현재 상태는 `review_pending`
- 새 검수 태그는 `review-stage-09-v1`
- 9단계는 아직 `main`에 반영되지 않았고 10단계 기능은 구현하지 않음
