# 실행 및 테스트 기록

## 포스트 로드맵 시각/UI 1차 패스 — 검수 대기

- 작업 브랜치: `post-roadmap-visual-ui-pass-1`
- 검수 태그: `review-visual-ui-pass-1-v2`
- 상태: `review_pending` (17단계 완료 상태와 별도 관리)
- 코드 검수: `pending`
- 사용자 수동 테스트: `skipped_by_user`

### 자동 검사 및 브라우저 smoke 범위

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run test`: 통과 (`passed`, 83개; v2 visualUi 테스트 2개 추가)
- `npm run build`: 통과 (`passed`)
- `npm run check`: 통과 (`passed`)
- `npm run dev -- --host 127.0.0.1`: 개발 서버 실행 확인 후 종료 (`passed`)
- 브라우저 자동 확인: Field·Formation·Shop·Inventory의 토큰·배경·HP/EXP·공통 버튼 가독성과 콘솔 error/warning 없음 확인 (`partial_passed`)
- 스크린샷: `docs/screenshots/visual-ui-pass-1-v2/field.png`, `formation.png`, `shop.png`, `inventory.png`
- Battle 캔버스 우클릭 진입과 전투 타깃 마커·피격/사망 효과 스크린샷: `not_run` (자동화 표면에서 우클릭 입력 미재현)
- 브라우저에서 수동 전투 조작과 전체 메뉴 전환을 완료한 것으로 간주하지 않는다.

### 별도 미실행 범위

- 사용자 수동 전투·메뉴 통합 테스트: `skipped_by_user`
- 18단계 기능과 실제 온라인 서버: `not_run`

## Stage 17 온라인 확장 준비 — 최종 승인 및 main 반영

- 작업 브랜치: `main`
- 검수 태그: `review-stage-17-v5`
- 완료 태그: `stage-17-completed`
- 상태: `completed`
- 완료된 단계: 1단계~17단계
- 다음 단계: 없음 — 전체 로드맵의 마지막 단계

### 자동 검사

- `tests/stage17.test.ts`: protocol/snapshot, Disabled/Mock Gateway, operation queue, conflict resolver, sync coordinator, DTO/OpenAPI 경계 검사 (50개; 기존 Stage 16 31개 포함 총 81개)
- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run test`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`)
- `npm run check`: 통과 (`passed`)
- `npm run dev -- --host 127.0.0.1`: root·`/favicon.svg` HTTP 200 확인 후 종료 (`passed`)
- OpenAPI JSON: `JSON.parse` 검사 통과
- coordinator RESOLVED snapshot 반환 통합 경로와 gateway signal 무시 시에도 즉시 종료되는 내부 cancellation 경계 검사 통과

### Stage 17 검사 범위

- protocol version 1, snapshot hash, malformed/future protocol, transient/auth field 제외
- Disabled Gateway의 `ONLINE_DISABLED`와 local game 비변경
- Mock bootstrap/pull/push, revision, duplicate operation, conflict 재현
- FIFO queue record, operationId 중복 방지, partial acknowledgement, rejected 상태, serialization, 200개·512 KiB cap과 cap 초과 record 보존
- retry count·nextAttemptAtMs·backoff·jitter·Retry-After 우선순위와 terminal/retryable error 정책
- server-authoritative owned roster/progression/Gold/Inventory/reward 진행과 local slot·유효 Control Group·preference 유지 conflict 정책, resolved hash 재계산·검증
- canonical snapshot deep consistency, unknown field, operation DTO/type/hash/payload size/sensitive/final reward 검증
- sync coordinator의 DISABLED/OFFLINE/ONLINE/SYNCING/CONFLICT 전환, 동시 실행 차단, abort·dispose·stale response·revision guard, REVISION_CONFLICT queue 보존과 Retry-After
- OpenAPI 3.0.3과 TypeScript response 필드·nullable·$ref·오류 응답·Idempotency-Key 계약
- coordinator RESOLVED snapshot 반환, 내부 abort cancellation, gateway response protocolVersion 검증, roster 중복·빈 배열·최대 인원 검증

### 미실행·수동 상태

- 실제 HTTP/WebSocket 서버: `not_run`
- 실제 계정·OAuth·token provider: `not_run`
- 실제 클라우드·DB·멀티플레이어: `not_run`
- 실제 브라우저 전체 전투·장시간 방치 통합: `not_run`
- 실제 Online Status 전체 버튼 흐름·Scene shutdown async callback: `not_run`
- Back 중 active request, Disconnect 후 재진입, mock gateway page-session 유지: `not_run`
- gateway 응답 protocol mismatch의 실제 Scene UI 흐름: `not_run`
- 사용자 수동 테스트: `skipped_by_user`
- 생략·미실행 항목은 통과로 간주하거나 표현하지 않는다.
- ChatGPT 코드 검수: `approved`

## Stage 16 성능 및 안정화 — 최종 승인 및 main 반영

- 작업 브랜치: `stage-16-performance-stability`
- 검수 태그: `review-stage-16-v4`
- 상태: `completed`
- 완료된 단계: 1단계~16단계
- 다음 단계: 없음 — 17단계가 전체 로드맵의 마지막 단계이며 완료됨

### 자동 검사

- `tests/stage16.test.ts`: 31개 테스트
- `npm ci`: 통과
- `npm run typecheck`: 통과 (`passed`)
- `npm run test`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`)
- `npm run check`: 위 typecheck·test·build를 묶은 최종 검사
- `npm run dev -- --host 127.0.0.1`: 서버 HTTP 200 확인 후 종료 (`passed`)
- favicon 요청: `/favicon.svg` 명시 링크와 `public/favicon.svg` 제공

### Stage 16 회귀 시나리오

- 저장 후보 선택, Storage 예외, 오프라인 정산과 상태 정규화 순수 로직 테스트
- autosave controller 설치·제거와 진단 카운터의 순수 경계 검사
- Recovery 재시도 helper가 기존 FATAL을 제거하고 새 FATAL을 다시 감지하는지 검사
- damage, progression, formation destination, MOVE helper 검사

### 수동·브라우저 검사 상태

- 자동 브라우저 확인: Field Stage16 표기, `diagnostics=1` overlay, `diagnostics=0` 비표시, favicon HTTP 200, 콘솔 error/warning 없음 확인 (`partial_passed`)
- 실제 Bootstrap FATAL 통합 UI: `not_run`
- Recovery 버튼과 Scene 전환 전체 흐름: `not_run`
- 메뉴 Scene 반복 전환: `not_run`
- 전체 Battle 조작과 전투 규칙 회귀: `not_run`
- Repeat Hunt 실전 반복과 장시간 방치: `not_run`
- 사용자 수동 테스트: `skipped_by_user`
- 생략된 테스트는 통과로 간주하거나 표현하지 않는다.
- ChatGPT 코드 검수: 승인 (`approved`)
- `main` 반영: 완료
- 완료 태그: `stage-16-completed`

## Stage 16 성능 점검 기준

- Field/Battle 상태 텍스트는 매 프레임 갱신하지 않고 dirty flag 또는 약 100ms 주기를 사용한다.
- diagnostics는 `?diagnostics=1`에서만 표시하고 약 500ms로 갱신한다.
- 성능 목표는 기록·검증하되 60 FPS를 강제 완료 조건으로 허위 기록하지 않는다.

## Stage 15 저장과 오프라인 진행 — 완료

- 현재 작업 브랜치: `main`
- 현재 검수 태그: `review-stage-15-v3`
- 15단계 상태: 완료 (`completed`)
- 완료된 단계: 1단계~15단계
- 다음 단계: 16단계 — 성능 및 안정화
- 사용자 수동 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- `main` 반영: 완료
- 완료 태그: `stage-15-completed`

### 15단계 자동 검사

- `npm ci`: 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과 (비차단 chunk 크기 경고 있음)
- `npm run dev -- --host 127.0.0.1`: HTTP 200 확인 후 종료
- 브라우저 UI: Stage 15 Field, Repeat Hunt OFF, Save Data 화면 확인
- Save Now: `SAVED` 상태 확인
- 새로고침: 저장 후 Field로 복원 확인

### 15단계 승인 기록

- 승인 검수 태그: `review-stage-15-v3`
- 승인 커밋: `ca55144de6e6d2f72e941abb9a11b801c175355a`
- 사용자 수동 테스트: 사용자 요청으로 생략 (`skipped_by_user`), 통과로 기록하지 않음
- `main` no-ff 병합 및 완료 태그 생성: 완료

### 15단계 검증 항목

- [x] SaveEnvelope, schemaVersion 1, checksum과 primary/backup/temp 저장 구조를 구현한다.
- [x] BootstrapScene에서 저장 복원 후 FieldScene을 시작한다.
- [x] Formation·Gold·KeyBinding·Control Group·Inventory·AutoProgress를 저장한다.
- [x] Repeat Hunt 대상 선택, 승리 해금, ON/OFF와 Battle Auto Hunt 연동을 구현한다.
- [x] 최소 60초·최대 8시간 방치 시간 및 대상별 cycle 계산을 구현한다.
- [x] 방치 Gold·EXP·결정적 아이템 드롭·100개 cap과 중복 정산 방지를 구현한다.
- [x] SaveDataScene의 Save Now와 5초 이중 확인 Reset Save를 구현한다.
- [ ] 실제 전투 승리 후 반복 사냥과 장시간 방치 통합 시나리오 — 사용자 수동 테스트 생략
- [x] ChatGPT 코드 검수 승인 및 main 반영

### v2 검수 수정 기록

- Storage 읽기·쓰기·삭제는 예외를 삼키는 `safeGetItem`, `safeSetItem`, `safeRemoveItem`을 거친다.
- 미래 schemaVersion의 backup/temp 후보를 덮어쓰지 않고 `NEWER_VERSION_BLOCKED`로 보존한다.
- 저장 실패 시 기존 `savedAtMs`와 `lastActiveAtMs`를 보존한다.
- `document.visibilitychange`에서 hidden 저장·visible 복귀 정산을 중복 없이 처리한다.
- 사용자 수동 테스트는 계속 `skipped_by_user`이며 통과로 기록하지 않는다.

### v3 검수 수정 기록

- Repeat Hunt ON: 첫 실제 승리 전에도 유효한 선택 몬스터와 Formation이면 활성화된다.
- Offline Rewards: 해당 몬스터의 첫 실제 승리 전에는 잠금 상태로 보상을 지급하지 않는다.
- hidden 진입 저장 후 pagehide/beforeunload 중복 저장: `lastActiveAtMs` 재갱신 없음.
- temp cleanup 실패: 검증된 primary 저장 성공을 유지하고 cleanup warning으로 분리한다.
- `rawElapsedMs`가 60초 미만이면 보상·cycle을 만들지 않고 기존 remainder를 유지한다.

## Stage 14 아이템·인벤토리·장비 — 최종 승인 및 main 반영

- 현재 작업 브랜치: `main`
- 현재 검수 태그: `review-stage-14-v2`
- 완료 태그: `stage-14-completed`
- 14단계 상태: 완료 (`completed`)
- 완료된 단계: 1단계~14단계
- 다음 단계: 15단계 — 저장과 오프라인 진행
- 사용자 수동 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- `main` 반영: no-ff 병합 완료

### 14단계 자동 검사

- `npm ci`: 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과 (비차단 chunk 크기 경고 있음)
- 브라우저 UI 확인: Field Inventory 버튼과 InventoryScene 960×540 레이아웃 확인
- v1 UI 수정 확인: 세 Unequip 버튼이 각 장비 슬롯 카드 내부에 있고 Available Items와 겹치지 않음
- 장비 진입 검증: registry의 실제 FormationState 보유 유닛과 rosterUnitId·unitDefinitionId·unitRole 대조
- Node 직접 순수 실행: 확장자 없는 TypeScript import를 Node가 해석하지 못해 미실시; 통과로 기록하지 않음

### 14단계 검증 항목

- [x] ItemDefinition과 개별 ItemInstance 구조를 분리한다.
- [x] melee/ranged/magic 무기 호환 및 Hero 전용 고유 장비 제한을 코드로 검사한다.
- [x] weapon·armor·accessory 장착·교체·해제 구조와 중복 장착 방지를 구현한다.
- [x] final attack·defense·maxHp와 방어력 물리 피해 계산을 전투에 연결한다.
- [x] 적 사망 시 독립 드롭 판정과 패배 후 인벤토리 보존 구조를 구현한다.
- [x] InventoryScene의 보유 유닛·장비 슬롯·아이템 페이지·Back to Field UI를 확인한다.
- [ ] 실제 드롭·장착·전투 회귀 전체 시나리오 — 사용자 수동 테스트 생략
- [x] ChatGPT 코드 검수 승인 및 main 반영

## Stage 13 경험치·레벨·능력치 성장 — 최종 승인 및 main 반영

- 현재 작업 브랜치: `main`
- 현재 검수 태그: `review-stage-13-v1`
- 완료 태그: `stage-13-completed`
- 13단계 상태: 완료 (`completed`)
- 완료된 단계: 1단계~13단계
- 다음 단계: 14단계 — 아이템·인벤토리·장비
- 사용자 수동 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- `main` 반영: 완료

### 13단계 자동 검사

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- 경험치 순수 로직: 레벨 임계값, 다중 레벨업, HP·공격력 성장 공식, 1,000 직접 EXP의 100 보너스 계산 통과
- 적 정의: Slime 1/2/3/4에 100/120/150/200 EXP 보상 설정
- 적 사망·전투 종료 중복 지급 방어: 코드 검토 대상

### 13단계 검증 항목

- [x] 직접 처치 경험치는 마지막 유효 아군 공격자에게만 지급된다.
- [x] 적 사망과 전투 종료 중복 호출은 경험치를 중복 지급하지 않는다.
- [x] 전투 전체 직접 EXP 합계로 살아 있는 출전 유닛별 보너스를 계산한다.
- [x] 사망 유닛과 Bench 유닛은 종료 보너스를 받지 않는다.
- [x] 직접 처치로 얻은 경험치는 사망 후에도 roster 상태에 유지된다.
- [x] 여러 레벨 연속 상승과 레벨업 HP 증가분 반영을 처리한다.
- [x] 슬롯 이동·교환·Bench·부대 승계 후에도 `rosterUnitId` 성장 상태를 유지한다.
- [x] 새 구매 유닛은 Lv.1·EXP 0으로 시작한다.
- [x] 전투 반복 시 기본 능력치에서 레벨별 실제 능력치를 다시 계산한다.
- [x] Formation·Battle·Field에 성장 정보를 표시한다.
- [ ] 브라우저 새로고침 이후 영구 저장 — 15단계 범위
- [ ] 사용자 수동 통합 테스트 — 사용자 요청으로 생략 (`skipped_by_user`), 통과로 기록하지 않음
- [x] ChatGPT 코드 검수 승인 및 `main` 반영

브라우저 자동화는 이번 제출에서 실행하지 않았으므로 `not_tested`로 기록한다. 사용자 수동 테스트를 통과한 것으로 기록하지 않는다.

## Stage 12 부대 지정과 단축키 설정 — v5 최종 승인

- 현재 작업 브랜치: `main`
- 승인 검수 태그: `review-stage-12-v5`
- 완료 태그: `stage-12-completed`
- 12단계 상태: 완료 (`completed`)
- ChatGPT 정적 코드 검수: 승인 (`approved`)
- 사용자 통합 실행 테스트: 통과 (`passed`)

### 병합 후 자동 검사 기록

- 병합 후 `npm ci`: 통과 (`passed`)
- 병합 후 `npm run typecheck`: 통과 (`passed`)
- 병합 후 `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- 병합 후 `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- `project-status.json` JSON 파싱: 통과 (`valid`)
- 고정 guard anchor 140px·180px 경계와 NaN·음수 방어 순수 검사 10개: 통과
- `updateUnitReturningToGuard` 소스 참조 제거 확인
- guardPosition 기반 140px 최초 감지와 180px LOCAL_ENGAGE 재탐색 코드 확인
- v3 부대 지속·키 바인딩 순수 로직 검사 25개: 통과
- v4 guard anchor 거리·유효성 순수 검사 10개: 통과

### v4 브라우저·사용자 검사 (historical; superseded by v5)

아직 실행하지 못한 검사는 통과로 기록하지 않는다.

- [ ] Auto Hunt OFF에서 M8/M9가 지역 적에게 접근한 뒤 원래 guardPosition으로 귀환하지 않음
- [ ] 현재 타깃 사망·이탈 후 guardPosition 180px 안의 다른 적으로 전환
- [ ] 대체 적이 없을 때 현재 전투 위치에서 정지하고 목적지가 남지 않음
- [ ] Auto Hunt OFF가 적 징검다리처럼 맵 전체를 추적하지 않음
- [ ] MOVE 완료·Auto Hunt OFF 전환 시에만 guardPosition 갱신
- [ ] Auto Hunt ON·FOCUS_ATTACK·반격·ATTACK_MOVE 회귀 확인
- [ ] 부대 지속·편성 교체 승계·Group 10·키 설정·스킬 회귀 확인

### v5 사용자 통합 테스트

- [x] Auto Hunt OFF에서 M8·M9가 적에게 접근한 뒤 원래 위치로 돌아가지 않음
- [x] 첫 타깃 사망 후 근처 다른 적을 탐색함
- [x] 근처 적이 없으면 싸우던 현재 위치에서 멈춤
- [x] 전투 종료 후 다음 전투에서도 기존 부대 구성이 유지됨
- 브라우저 자동화: 이번 병합 과정에서는 실행하지 않음 (`not_tested`)

12단계 v5 사용자 실행 테스트: 통과 (`passed`)
12단계 v5 ChatGPT 코드 검수: 승인 (`approved`)
12단계 v5 `main` 반영: 완료 (`stage-12-completed`)

## Stage 12 부대 지정과 단축키 설정 — v3 검수 기록 (historical)

- 현재 작업 브랜치: `stage-12-control-groups-keybinds`
- 현재 검수 태그: `review-stage-12-v3`
- 12단계 상태: 검수 대기 (`review_pending`)
- v1 결과: `changes_requested` — 중앙 부대 UI 겹침과 Group 10 표기 오류
- v2 결과: `changes_requested` / 사용자 통합 테스트 실패 — BattleScene마다 부대가 초기화되고 사망·UI 조회가 원본을 삭제함

### v3 순수 로직 검사

- [x] PersistentControlGroupState의 빈 상태·10개 그룹·손상 길이 검증
- [x] 그룹 내부 중복·알 수 없는 ID 제거와 정상 그룹 보존
- [x] 서로 다른 그룹의 같은 rosterUnitId 허용
- [x] Bench 유닛 ID 유지와 깊은 복사
- [x] Map↔persistent 변환과 왕복 구성 보존
- [x] recall/UI 조회가 원본 그룹을 변경하지 않음
- [x] 사망·미배치 유닛은 조회에서 제외되지만 persistent 그룹에 유지
- [x] 다음 전투에서 다시 살아난 유닛이 조회에 복귀
- [x] 빈 저장·특정 그룹 교체·다른 그룹 보존
- [x] 직접 Bench 교체 시 부대 구성 승계 및 중복 제거
- 결과: 25개 통과

### v3 자동 검사

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- `project-status.json` JSON 파싱: 통과

### v3 브라우저 자동 확인

- [x] 첫 전투에서 저장한 Group 1이 Field 복귀 후 다음 BattleScene에 `1/1`로 유지된다.
- [x] 다음 전투에서 `1` 호출 시 Group 1의 저장 유닛이 선택되고 `Group 1 recalled: 1 living units.` 로그가 표시된다.
- [x] 전투 중 일부 유닛이 사망해도 Group 원본 삭제 없이 UI가 `0/1`처럼 현재/저장 총원으로 표시된다.
- [x] Bench Swordsman을 Merc 4 슬롯에 직접 배치하고 Apply한 뒤 다음 전투 Group 2가 `1/1`로 유지된다.
- [x] 다음 전투에서 `2` 호출 시 Swordsman이 선택되고 `Group 2 recalled: 1 living units.` 로그가 표시된다.
- [x] 전투장 밖 부대 UI·Group 10 표기·기존 슬롯·스킬 패널 UI가 유지된다.
- [x] 브라우저 console error/warn 로그가 없다.

실행하지 못한 항목은 통과로 기록하지 않는다.

- [ ] 패배 후 복귀와 세 번째 연속 전투까지 모든 그룹 유지
- [ ] 여러 유닛·여러 그룹·Skill Merc 스킬 UI의 전체 사용자 통합 시나리오
- [ ] Bench 이동 후 재편성, 빈 슬롯 배치, 단순 배치 유닛 슬롯 교환의 전체 회귀 시나리오
- [ ] 새로고침 이후 저장 — 15단계 범위

12단계 v3 사용자 실행 테스트: 미실시 (`not_tested`)
12단계 v3 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
12단계 v3 `main` 반영: 미반영

## Stage 12 부대 지정과 단축키 설정 — v2 검수 기록 (historical; superseded by v3)

- 현재 작업 브랜치: `stage-12-control-groups-keybinds`
- 현재 검수 태그: `review-stage-12-v2`
- 12단계 상태: 검수 대기 (`review_pending`)
- v1 결과: `changes_requested` — 중앙 부대 상태 패널이 적군 초기 대형을 가리고 Group 10이 Group 0으로 표시됨

### v2 자동 검사

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- 기존 순수 부대·키 바인딩 로직 검사 24개: 통과
- `project-status.json` JSON 파싱: 통과

### v2 브라우저 자동 확인

- [x] 전투 시작 직후 초기 적 대형이 부대 UI에 가려지지 않는다.
- [x] 부대 UI 배경과 텍스트가 `RTS_ARENA_BOUNDS` 아래의 좌측 하단에 표시된다.
- [x] 부대 UI가 아군 초기 대형·전투 이동 영역·선택 드래그 영역·적 우클릭 영역을 덮지 않는다.
- [x] 하단 10개 슬롯 및 Skill Merc 스킬 패널과 겹치지 않는다.
- [x] KeySettingsScene에 `Group 10`, `Recall: 0 · Save: Ctrl + 0`이 표시된다.
- [x] `Ctrl+0` 빈 선택 저장 로그가 `Group 10 cleared.`로 표시된다.
- [x] 브라우저 console error/warn 로그가 없다.

실행하지 못한 항목은 통과로 기록하지 않는다.

- [ ] 살아 있는 유닛을 Ctrl+0으로 저장한 뒤 성공 로그를 확인
- [ ] 0 호출 로그가 `Group 10 recalled: N living units.`로 표시되는지 확인
- [ ] Group 10 호출 후 선택 상태·동적 Skill UI·기존 MOVE/FOCUS/Auto Hunt/guard 동작 확인

12단계 v2 사용자 실행 테스트: 미실시 (`not_tested`)
12단계 v2 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
12단계 v2 `main` 반영: 미반영

## Stage 12 부대 지정과 단축키 설정 — v1 검수 기록 (historical; superseded by v3)

- 현재 작업 브랜치: `stage-12-control-groups-keybinds`
- 현재 검수 태그: `review-stage-12-v1`
- 12단계 상태: 검수 대기 (`review_pending`)

### 순수 로직 검사

- [x] 기본 키 설정이 숫자 10개와 서로 다른 Q/W 기본 스킬 키를 사용한다.
- [x] 잘못된 키·중복 키·손상된 registry는 전체 기본값으로 복구된다.
- [x] registry 읽기·쓰기에서 deep clone을 사용한다.
- [x] 그룹·스킬 키 충돌은 같은 종류 설정을 교환한다.
- [x] 그룹 저장은 생존 ALLY만 slotIndex와 battleUnitId 기준으로 정렬하고 중복을 제거한다.
- [x] 그룹 교체·복수 그룹·빈 그룹 저장을 확인한다.
- [x] 그룹 호출은 생존 유닛만 남기고 오래된 ID·사망 유닛을 제거한다.
- [x] 모든 그룹에서 사망 유닛을 제거하고 결정적 정렬을 확인한다.
- 결과: 24개 통과

### 자동 검사

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- `project-status.json` JSON 파싱: 통과

### 브라우저 자동 확인

- [x] Field에 Stage 12 제목, Formation·Shop·Keys 버튼, Gold·Owned·Formation 정보가 겹치지 않게 표시된다.
- [x] KeySettingsScene에 그룹 1~9·0과 Whirlwind·First Aid가 표시된다.
- [x] Group 1 키를 2로 변경하면 Group 2와 교환되고 상태 메시지가 표시된다.
- [x] Whirlwind 키를 W로 변경하면 First Aid와 교환되고 상태 메시지가 표시된다.
- [x] Cancel은 draft 변경을 버리고, Apply는 사용자 지정 키를 저장한다.
- [x] Reset Defaults는 draft만 기본값으로 되돌리고 Cancel 시 저장된 설정을 보존한다.
- [x] BattleScene에 Stage 12 제목, 실제 그룹·스킬 키 도움말, 10개 그룹 UI가 표시되고 하단 슬롯·스킬 패널과 겹치지 않는다.
- [x] 브라우저 error/warn 로그가 없다.

다음 항목은 브라우저 자동 확인에서 실행하지 않았으며 통과로 기록하지 않는다.

- [ ] 실제 전투에서 Ctrl+1~0 저장과 1~0 호출
- [ ] 부대 호출 시 선택 상태·스킬 패널·동적 스킬 키 갱신
- [ ] 유닛 사망·전투 종료·다음 전투 시작 시 그룹 정리와 초기화
- [ ] MOVE·FOCUS_ATTACK·AUTO_HUNT·Guard·스킬 쿨다운이 부대 호출로 변경되지 않는지
- [ ] 반복 keydown·Shift/Alt/Meta·Escape·Scene 재진입에서 중복 리스너가 없는지
- [ ] 전투 중 KeySettings 진입 차단과 이동 중 안내
- [ ] 모든 구매 용병과 10명 roster의 실제 통합 동작

12단계 사용자 실행 테스트: 미실시 (`not_tested`)
12단계 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
12단계 `main` 반영: 미반영

## Stage 11 상점·용병 구매 기능 — v1 최종 승인

- 현재 작업 브랜치: `main`
- 현재 검수 태그: `review-stage-11-v1`
- 11단계 상태: 완료 (`completed`)

### 순수 로직 검사

- [x] 초기 Gold 0 및 유효한 Gold 유지
- [x] 음수·소수·문자열·손상된 Gold의 안전한 복구 또는 구매 거부
- [x] Gold 추가·차감과 안전한 정수 범위 검증
- [x] 기본 FormationState 10명, Hero 필수 배치, 슬롯 10개 검증
- [x] Swordsman·Guardian·Scout 구매 후 13명까지 유효
- [x] 기본 유닛 누락·구매 정보 변조·중복·14명 상태 거부
- [x] Gold 부족 구매 시 Gold와 FormationState 불변
- [x] 정상 구매 시 가격 한 번 차감, 동일 상품 재구매 거부
- [x] 구매 직후 슬롯 불변 및 구매 유닛 Bench 유지
- [x] Reset Default가 구매 유닛을 보존하고 초기 슬롯만 복원
- [x] 배치 roster에는 배치된 구매 유닛만 포함되고 Bench 유닛은 제외

### 자동 검사

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 정상 시작 확인 후 종료 (`passed`)

### 브라우저 자동 확인

- [x] Field에 Stage 11 제목 표시
- [x] Formation과 Shop 버튼 표시 및 버튼 영역 분리
- [x] Field에 Gold 0, Owned 10/13, Formation 10/10 표시
- [x] ShopScene에 상품 카드 3개, 이름·설명·가격·핵심 능력치 표시
- [x] Gold 0 상태에서 Swordsman 구매 시 `Not enough Gold.` 표시
- [x] Gold 부족 구매 후 Gold 0과 Owned 10/13 유지
- [x] 콘솔 error/warn 로그 없음

다음 항목은 이번 브라우저 자동 확인에서 실행하지 않았으며 통과로 기록하지 않는다.

- [ ] 전투 승리 보상·Return 후 Gold 갱신과 중복 결과 방지
- [ ] 20 Gold 이상 확보 후 Swordsman 구매·중복 클릭·정확한 차감
- [ ] 구매 용병의 Formation Bench 표시와 슬롯 교체·Apply 유지
- [ ] 구매 용병의 실제 전투 위치·능력치·Auto Hunt·MOVE 연결
- [ ] 세 상품 전부 구매한 13명 화면과 Roster full 처리
- [ ] 구매 용병 배치 후 Reset Default 보존 및 Apply

11단계 사용자 수동 테스트: 사용자 요청에 따라 생략 (`skipped_by_user`)

사유: 사용자 요청에 따라 단계별 수동 테스트를 생략하고 12단계 주요 마일스톤에서 통합 테스트 예정

11단계 ChatGPT 코드 검수: 승인 (`approved`)
11단계 `main` 반영: 완료 (`stage-11-completed`)
11단계 사용자 테스트: 사용자 요청으로 생략 (`skipped_by_user`)

11단계 최종 승인 기록:

- 승인 태그: `review-stage-11-v1`
- 승인 커밋: `c63369ce05e19b23d43eff5d753b8f9159736bdc`
- no-ff 병합 후 완료 문서 커밋 및 `stage-11-completed` 태그 생성 완료
- 사용자 수동 테스트 생략은 통과를 의미하지 않음

## Stage 9 v3 local guard defense regression checklist

- [ ] Each ally starts with an independent guard position copied from its spawn position.
- [ ] A successful MOVE updates only that unit's guard position to the constrained arrival point.
- [ ] Invalid or stale MOVE cleanup preserves the previous guard position.
- [ ] Auto Hunt OFF detects nearby enemies within 140px of the unit's own guard position.
- [ ] Guard aggro does not require real damage or the enemy to target another ally.
- [ ] A local target is released after moving beyond 180px from the guard position.
- [ ] With no local enemies, the ally returns to its guard position.
- [ ] Multiple local enemies are distributed deterministically.
- [ ] Active MOVE remains higher priority than guard defense.
- [ ] FOCUS_ATTACK ignores guard leash and retains its manually selected target.
- [ ] Auto Hunt ON keeps global enemy search; switching OFF adopts current positions as guard positions.
- [ ] A single selected ally shows a 140px guard range centered on guardPosition only when Auto Hunt is OFF.
- [ ] Skill Merc Q/W, melee range, victory, defeat, Gold, and Return to Field remain functional.
- [ ] No fatal browser console error occurs.

The v3 user-run checklist remains `not_tested` until the manual scenarios A-G are performed.

## Stage 9 v2 local ally assistance regression checklist (historical; superseded by v3)

- [ ] Nearby enemy pursuit creates a local threat before real damage is dealt.
- [ ] An ally that enters the support range later can join while the threat is remembered.
- [ ] Threat memory refreshes while pursuit continues and expires after 2.5 seconds when it stops.
- [ ] Distant enemy target assignment alone does not trigger support.
- [ ] Support is limited to `RTS_ALLY_ASSIST_RANGE` and local enemies.
- [ ] An actually moving ally keeps its MOVE command and is not reassigned.
- [ ] A completed or stale MOVE is normalized and can support afterward.
- [ ] Completed MOVE retaliates normally after Auto Hunt OFF normalization.
- [ ] Multiple threats and support targets are selected deterministically and distributed.
- [ ] Existing `LOCAL_ENGAGE`, `FOCUS_ATTACK`, and `AUTO_HUNT` behavior is preserved.
- [ ] Skill Merc Q/W, multi-selection skill blocking, melee attacks, victory, defeat, and Gold remain functional.
- [ ] No fatal browser console error occurs during the scenarios.

The v2 user-run checklist remains `not_tested` and is retained only as review history; v3 guard-defense scenarios are listed above.

## 설치

```bash
node --version
npm --version
npm install
```

Node.js는 `20.19.0 이상 또는 22.12.0 이상`이어야 한다. 요구 버전보다 낮으면 Node.js를 갱신한다.

```bash
npm run dev
```

## 접속

터미널에 표시되는 로컬 주소를 브라우저에서 연다.

기본 주소 예시:

```text
http://localhost:5173
```

포트가 사용 중이면 Vite가 다른 포트를 사용할 수 있으므로 터미널에 실제 표시된 주소를 사용한다.

## 2단계 수동 테스트 목록

```text
[x] 브라우저에서 게임 화면이 열린다.
[x] 960:540 비율의 필드 화면이 보인다.
[x] 플레이어 1명이 보인다.
[x] 플레이어 이름표가 보인다.
[x] 몬스터가 4마리 이상 보인다.
[x] 몬스터 이름표가 각각 보인다.
[x] 플레이어와 몬스터가 서로 겹치지 않는다.
[x] 브라우저 크기를 바꿔도 게임 비율이 유지된다.
[x] 불필요한 페이지 스크롤바가 생기지 않는다.
[x] 아무 조작을 하지 않아도 오브젝트가 움직이지 않는다.
[x] 브라우저 개발자 도구 콘솔에 빨간 오류가 없다.
[x] 클릭하거나 우클릭해도 아직 게임 기능이 작동하지 않는다.
```

사용자 실행 테스트 상태: 통과

콘솔 오류: 없음

비차단 경고: 사용자 조작 전에 Phaser AudioContext 자동재생 경고가 나타날 수 있다. 현재 게임에는 소리 기능이 없으며 기능 동작에는 영향이 없다.

## 작은 브라우저 창 확인 크기

다음 크기에서 게임 화면 전체가 보이고 16:9 비율이 유지되는지 확인한다.

- `1200 × 800`
- `800 × 600`
- `800 × 400`
- `400 × 800`

자동 확인 결과:

- `npm ci`: 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- 개발 서버 시작 및 브라우저 렌더링: 통과
- 반응형 viewport (`1200×800`, `800×600`, `800×400`, `400×800`): 통과
- 네 viewport 모두 16:9, 화면 내 맞춤, 스크롤 없음
- 콘솔 빨간 오류 없음, AudioContext 자동재생 경고는 비차단 경고

## 3단계 수동 테스트 목록 — 사용자 요청으로 생략

```text
[ ] 게임이 정상적으로 열린다.
[ ] 빨간 콘솔 오류가 없다.
[ ] 몬스터를 우클릭하면 선택 표시가 나타난다.
[ ] 브라우저 우클릭 메뉴가 나타나지 않는다.
[ ] 좌클릭은 아무 기능도 수행하지 않는다.
[ ] 선택된 몬스터가 목표 이름으로 표시된다.
[ ] 플레이어가 선택한 몬스터 방향으로 이동한다.
[ ] 플레이어가 몬스터 접촉 거리에서 멈춘다.
[ ] 도착 후 선택 표시는 유지된다.
[ ] 이동 중 다른 몬스터를 우클릭하면 즉시 방향을 바꾼다.
[ ] 기존 선택 표시는 사라지고 새 목표에만 표시된다.
[ ] 빈 바닥 우클릭은 현재 목표와 이동을 바꾸지 않는다.
[ ] 플레이어가 목표를 지나쳐 왕복하지 않는다.
[ ] 창 크기를 바꿔도 16:9 화면이 유지된다.
[ ] 전투 화면으로 전환되지 않는다.
[ ] 체력·공격·보상 기능이 나타나지 않는다.
```

## 3단계 브라우저 자동 확인 결과

- 우클릭 선택, 선택 링, 목표 이름 표시, `MOVING` 상태 전환: 통과
- 접촉 거리 정지와 도착 후 선택 링 유지: 통과
- 이동 중 다른 몬스터로 대상 변경 및 기존 링 제거: 통과
- 빈 필드 우클릭과 몬스터 좌클릭 무시: 통과
- 캔버스 브라우저 우클릭 메뉴 차단: 통과
- 브라우저 콘솔 오류·경고: 없음

3단계 자동 브라우저 검사: 통과
3단계 사용자 수동 실행 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
생략된 수동 항목은 실제 통과로 간주하거나 표현하지 않는다.
3단계 ChatGPT 코드 검수: 승인
3단계 `main` 반영: 완료

## 4단계 수동 테스트 목록

```text
[x] 게임이 정상적으로 열린다.
[x] 빨간 콘솔 오류가 없다.
[x] 몬스터를 우클릭하면 선택 표시가 나타난다.
[x] 플레이어가 선택한 몬스터에게 이동한다.
[x] 접촉 시 전투 화면으로 전환된다.
[x] 전투 화면이 한 번만 열린다.
[x] 전투 화면에 Player 이름이 표시된다.
[x] 전투 화면에 선택한 몬스터 이름이 정확히 표시된다.
[x] Player HP가 정적으로 표시된다.
[x] 몬스터 HP가 정적으로 표시된다.
[x] HP가 자동으로 감소하지 않는다.
[x] 공격 또는 피해 메시지가 나타나지 않는다.
[x] Return to Field 버튼이 동작한다.
[x] 필드 복귀 후 플레이어 위치가 유지된다.
[x] 필드 복귀 후 몬스터 위치가 유지된다.
[ ] 필드 복귀 후 기존 선택 표시가 유지된다.
[x] 필드 복귀 직후 전투 화면에 자동 재진입하지 않는다.
[ ] 같은 몬스터를 다시 우클릭하면 전투 화면에 다시 들어간다.
[ ] 다른 몬스터를 선택하면 해당 몬스터 이름이 전투 화면에 표시된다.
[ ] 이동 중 목표 변경이 계속 정상 작동한다.
[ ] 빈 바닥 우클릭은 현재 동작을 바꾸지 않는다.
[ ] 좌클릭으로 몬스터가 선택되지 않는다.
[ ] 창 크기를 바꿔도 화면 비율이 유지된다.
[x] 실제 공격, 승패, 보상 기능이 없다.
```

## 4단계 브라우저 자동 확인 결과

- 페이지 로드 및 4단계 안내 표시: 통과
- 몬스터 우클릭, 이동, 접촉 후 `BattleScene` 표시: 통과
- `BattleScene` 단일 표시와 정확한 `Slime 1`·`Slime 2` 대상 전달: 통과
- Player HP `100 / 100`, 몬스터 HP `50 / 50` 정적 표시: 통과
- `Return to Field` 동작 및 플레이어·몬스터 위치 보존: 통과
- 복귀 직후 `IDLE` 상태·선택 표시 유지·자동 재진입 없음: 통과
- 같은 몬스터 재우클릭 즉시 재진입: 통과
- 빈 필드 우클릭·좌클릭 무반응: 통과
- 공격·피해·HP 감소 없음: 통과
- 브라우저 콘솔 오류·경고: 없음

사용자가 직접 확인하지 않은 세부 항목은 체크하지 않고 자동 검사 결과와 구분한다.

4단계 사용자 실행 테스트 상태: 통과
4단계 ChatGPT 코드 검수: 승인
4단계 `main` 반영: 완료

## 5단계 수동 테스트 목록

```text
[x] 게임이 정상적으로 열린다.
[x] 몬스터 우클릭 후 전투 화면에 진입한다.
[x] 전투 화면 진입 직후 양쪽 HP가 최대치다.
[ ] 플레이어가 약 1초 간격으로 공격한다.
[ ] 몬스터가 약 1.4초 간격으로 공격한다.
[x] 플레이어 공격마다 몬스터 HP가 10 감소한다.
[x] 몬스터 공격마다 플레이어 HP가 8 감소한다.
[x] HP 텍스트가 공격 직후 갱신된다.
[x] HP 바가 HP 비율에 맞게 감소한다.
[x] 최근 공격 기록이 표시된다.
[ ] 공격 기록이 무한히 쌓이지 않는다.
[x] 몬스터 HP가 0 미만으로 내려가지 않는다.
[x] 플레이어 HP가 0 미만으로 내려가지 않는다.
[x] 한쪽 HP가 0이 되면 모든 공격이 멈춘다.
[x] HP가 0이 된 뒤 공격 기록이 추가되지 않는다.
[x] Victory 또는 Defeat 결과가 표시되지 않는다.
[x] 보상과 경험치가 지급되지 않는다.
[x] Return to Field 버튼이 전투 도중 작동한다.
[ ] Return to Field 버튼이 전투 정지 후에도 작동한다.
[ ] 필드 복귀 후 위치와 선택 표시가 유지된다.
[ ] 필드 복귀 직후 자동 재진입하지 않는다.
[x] 다시 전투에 들어가면 HP와 전투 로그가 초기화된다.
[x] 브라우저 콘솔에 빨간 오류가 없다.
[ ] 창 크기를 바꿔도 화면이 잘리지 않는다.
```

## 5단계 브라우저 자동 확인 결과

- 전투 화면 진입 및 `RUNNING` 상태 표시: 통과
- 플레이어·몬스터 공격 로그와 고정 피해량: 통과
- 양쪽 HP 텍스트 및 HP 바 감소: 통과
- HP 0 도달 시 `STOPPED_PENDING_RESULT` 전환 및 공격 정지: 통과
- 정지 후 추가 공격 로그 없음: 통과
- `Return to Field` 동작 및 전투 재진입 초기화: 통과
- 승패·보상 화면 없음: 통과
- 브라우저 콘솔 오류·경고: 없음

사용자가 직접 확인하지 않은 세부 항목은 체크하지 않고 자동 검사 결과와 구분한다.
필드 단계 안내 문구 문제는 기능 테스트와 구분해 비차단 알려진 문제로 기록한다.

5단계 사용자 실행 테스트 상태: 통과
5단계 ChatGPT 코드 검수: 승인
5단계 `main` 반영: 완료

## 6단계 수동 테스트 목록 — 사용자 실행 테스트 통과

```text
[ ] 게임이 정상적으로 열린다.
[ ] 몬스터 우클릭 후 자동 접근과 전투 진입이 동작한다.
[ ] 플레이어 공격으로 몬스터 HP가 0이 되면 VICTORY 결과가 표시된다.
[ ] 승리 결과에서 Slime별 Gold 보상이 표시된다.
[ ] 승리 결과에서 추가 공격이나 중복 보상이 발생하지 않는다.
[ ] Return to Field 후 Gold가 누적되고 처치 몬스터가 숨겨진다.
[ ] 3초 후 같은 위치·색상·이름의 몬스터가 재생성된다.
[ ] 재생성 후 자동 선택·이동·전투가 시작되지 않는다.
[ ] Slime 4 패배 시 DEFEAT 결과와 보상 0 Gold가 표시된다.
[ ] 패배 후 몬스터가 필드에 남고 Gold가 증가하지 않는다.
[ ] 전투 중 Return to Field는 결과·보상·삭제·재생성을 만들지 않는다.
[ ] 7단계 기능(경험치·레벨·능력치)은 나타나지 않는다.
```

사용자 실행 테스트 상태: 통과 (`passed`)
사용자 확인 내용: 로컬에서 게임을 실행하고 6단계 기능이 정상 작동함을 확인함

## 6단계 브라우저 자동 확인 결과

- Stage 6 필드 안내 문구 및 Gold 0 표시: 통과
- Slime 1 승리 결과, HP 0, `+10 Gold`: 통과
- 승리 후 필드 Gold 10, 처치 몬스터 숨김: 통과
- 3초 후 Slime 1 동일 위치 재생성 및 자동 행동 없음: 통과
- Slime 4 패배 결과, HP 0, `Reward: 0 Gold`: 통과
- 패배 후 Slime 4 유지, Gold 유지, 선택 대상 유지: 통과
- 치명적인 게임 코드 오류: 없음
- 비차단 리소스 404: `/favicon.ico` 요청 1건

6단계 자동 브라우저 검사: 통과
6단계 사용자 실행 테스트: 통과 (`passed`)
6단계 ChatGPT 코드 검수: 승인 (`approved`)
6단계 `main` 반영: 완료

## 6단계 검수 수정 확인

- 현재 검수 태그: `review-stage-06-v2`
- `VICTORY`는 몬스터 정의의 공식 `goldReward`와 전달값이 일치할 때만 적용
- 공식 보상과 전달값이 다르면 Gold·몬스터 상태·재생성 상태를 변경하지 않음
- `DEFEAT`는 전달 보상이 정확히 0일 때만 적용
- 위 검증은 코드 경로와 TypeScript 검사로 확인했으며, 사용자 실행 테스트도 통과함

## 6단계 최종 승인 기록

- 최종 검수 태그: `review-stage-06-v2`
- 사용자 실행 테스트: 통과
- ChatGPT 코드 재검수: 통과
- `main` 반영: 완료
- 치명적인 게임 코드 오류: 없음
- 비차단 리소스 404: `favicon.ico` 1건

## 7단계 수동 테스트 목록 — 사용자 테스트 미실시

```text
[ ] 게임이 정상 실행된다.
[ ] Slime 1 선택 시 Slime 1 적군만 10마리 등장한다.
[ ] Slime 2 선택 시 Slime 2 적군만 10마리 등장한다.
[ ] Slime 3 선택 시 Slime 3 적군만 10마리 등장한다.
[ ] Slime 4 선택 시 Slime 4 적군만 10마리 등장한다.
[ ] 아군 10마리와 적군 10마리가 서로 다른 진영으로 배치된다.
[ ] 하단에 1~0 슬롯 10개와 유닛명·상태·HP가 표시된다.
[ ] 아군 하나를 클릭하면 단일 선택된다.
[ ] 빈 전장 드래그로 살아 있는 아군만 다중 선택된다.
[ ] 적군과 죽은 유닛이 다중 선택에 포함되지 않는다.
[ ] 빈 전장 우클릭으로 선택 아군이 대형을 유지하며 이동한다.
[ ] 적군 우클릭으로 선택 아군이 해당 적을 추격하고 공격한다.
[ ] 사거리 밖에서는 피해가 발생하지 않는다.
[ ] 적군이 가까운 아군을 찾아 자동으로 추격·공격한다.
[ ] HP 0 유닛은 사망하고 선택에서 제거된다.
[ ] 적군 전멸 시 VICTORY가 표시된다.
[ ] 아군 전멸 시 DEFEAT가 표시된다.
[ ] 주인공만 사망하고 다른 아군이 생존하면 전투가 계속된다.
[ ] 승리 Gold는 전투당 한 번만 지급된다.
[ ] 승리 후 월드맵의 선택한 몬스터만 제거되고 약 3초 후 재생성된다.
[ ] 전투 중 Return to Field 시 보상과 제거가 없다.
[ ] 자동사냥·스킬·상점·부대 단축키가 아직 없다.
[ ] 콘솔에 치명적인 게임 오류가 없다.
[ ] favicon.ico 404 외 새로운 리소스 오류가 없다.
```

7단계 자동 브라우저 검사: 통과
7단계 사용자 실행 테스트: 통과 (`passed`)
7단계 ChatGPT 코드 검수: 승인 (`approved`), 승인 태그: `review-stage-07-v7`

## Stage 7 manual combat response checks — v5

```text
[ ] Selecting all 10 allies and directly right-clicking one enemy focuses the attack on that enemy.
[ ] A focused target remains selected while it is alive.
[ ] When the focused target dies, a nearest valid target is selected again.
[ ] An ally retaliates against the enemy that just attacked it when the attacker is locally valid.
[ ] Local engagement search is limited to the configured range around the unit.
[ ] Attack-move orders move toward the destination and scan only nearby enemies while moving.
[ ] If the attack-move target disappears, the unit resumes its original destination.
[ ] Without a command, an ally does not scan the entire field for enemies.
[ ] Multiple allies distribute local targets deterministically when possible.
[ ] Allies and enemies are not pushed apart by the same-team separation routine.
[ ] Attack distance includes attacker radius and target radius.
[ ] Only the attacker moves during approach; the target position is not directly changed.
[ ] No NaN or Infinity positions occur during movement or combat.
[ ] VICTORY and DEFEAT still work with one Gold reward or zero Gold.
[ ] Auto Hunt, skills, shop, formation editing, squads, and experience remain absent.
```

## Stage 7 command state transition checks — v6

```text
[ ] A focused attack keeps the explicitly selected enemy while it is alive.
[ ] When the focused target dies, FOCUS_ATTACK ends before any retargeting occurs.
[ ] Focus-target loss searches only within RTS_LOCAL_ENGAGEMENT_RANGE.
[ ] No focused-target loss causes an immediate full-field enemy search.
[ ] If no local enemy remains after focus loss, the ally becomes IDLE.
[ ] An attack-move unit keeps its original commandDestination after being hit.
[ ] An attack-move unit temporarily stops movement to engage its attacker.
[ ] After the attacker dies or disappears, the attack-move destination is resumed.
[ ] A NONE unit changes to LOCAL_ENGAGE when it is attacked.
[ ] A LOCAL_ENGAGE unit can retaliate without acquiring a full-field target.
[ ] FOCUS_ATTACK does not switch to a retaliating attacker while its focus target is alive.
[ ] Cross-team separation and target-position immobility remain unchanged.
[ ] Attack distance still includes attacker and target collision radii.
[ ] No NaN or Infinity positions occur during the command transitions.
[ ] Auto Hunt, skills, shops, formations, squads, and experience remain absent.
[ ] Browser console has no new fatal errors during the command checks.
```

v6 자동 브라우저 확인:

- 초기 전투에서 Allies 10/10, Enemies 10/10, `RUNNING` 상태 확인
- 집중 공격 명령 로그와 공격 이동 명령 로그 확인
- 브라우저 콘솔 오류·경고 없음 확인
- 집중 공격 대상 사망 후 지역 재탐색, 공격 이동 중 피격 후 목적지 복귀는 사용자 수동 테스트 필요

v6 사용자 수동 실행 테스트: 미실시 (`not_tested`)
7단계 `main` 반영: 미반영

## Stage 7 direct movement controls — v7

```text
[x] A selected ally stops its current attack immediately after a floor right-click.
[x] The previous attack target is cleared immediately.
[x] The selected squad moves to the formation-adjusted destination.
[x] An ally keeps moving toward the destination after taking damage.
[x] A MOVE ally does not automatically pursue its attacker.
[x] A MOVE ally does not acquire nearby enemies before reaching the destination.
[x] A MOVE ally becomes IDLE after reaching the destination.
[x] After arrival, a newly received attack can use the existing NONE retaliation rule.
[x] A floor right-click cancels FOCUS_ATTACK and starts MOVE.
[x] An enemy right-click cancels MOVE and starts FOCUS_ATTACK.
[x] Direct enemy focus attack remains available.
[x] Focus-target loss still uses local engagement rules only.
[x] A floor right-click never creates ATTACK_MOVE.
[x] No A-key or attack-move UI input is implemented in Stage 7.
[x] Auto Hunt remains absent.
[x] Allies and enemies are not pushed apart by cross-team separation.
```

v7 자동 브라우저 확인:

- 바닥 우클릭 직후 전체 선택 아군 슬롯이 `MOVING`으로 표시됨
- 기존 공격 로그 뒤에 `Move order issued to 10 allied units.`가 기록됨
- 목적지 도착 후 `IDLE` 상태와 도착 후 새 피격 반응 확인
- 브라우저 콘솔 오류·경고 없음

v7 사용자 수동 실행 테스트: 통과 (`passed`)

자동 브라우저 확인 내용:

- 10대10 전투장, 하단 슬롯 10개, Slime 1·Slime 4 종류 연결: 통과
- 드래그 10마리 선택과 대형 이동: 통과
- 우클릭 공격 명령, 적군 AI, 아군 전멸 `DEFEAT`: 통과
- 브라우저 콘솔 치명적 오류·경고: 없음

## Stage 7 final user execution — passed

```text
[x] Game starts normally.
[x] Ten allies and ten enemies appear.
[x] The selected world-map Slime type matches the enemy type.
[x] Single selection works.
[x] Drag multi-selection works.
[x] Direct enemy right-click focus attack works.
[x] Focus-target death allows local enemy retaliation.
[x] No unlimited pursuit of enemies across the field occurs.
[x] Floor right-click is a pure MOVE command.
[x] MOVE cancels the previous attack and pursuit.
[x] MOVE keeps priority after taking damage.
[x] MOVE does not auto-retaliate before arrival.
[x] Direct enemy right-click during MOVE switches to FOCUS_ATTACK.
[x] Allies and enemies are not pushed apart.
[x] Attack damage has no knockback.
[x] Victory and defeat handling works.
[x] Gold is paid once per battle.
[x] World-map monster removal and respawn remain connected.
[x] Auto Hunt is not present.
[x] Skills and squad assignment are not present.
```

## 8단계 Auto Hunt ON/OFF와 수동 명령 우선 처리 — v1

- 현재 작업 브랜치: `stage-08-auto-hunt-controls`
- 현재 검수 태그: `review-stage-08-v1`
- 8단계 상태: 검수 대기 (`review_pending`)

자동 브라우저 확인:

- [x] 기본 Auto Hunt가 OFF로 시작한다.
- [x] Auto Hunt ON 상태에서 생존 아군 전체가 전역 자동 전투를 수행한다.
- [x] 수동 MOVE 명령이 Auto Hunt보다 우선 처리된다.
- [x] Auto Hunt ON/OFF UI와 활성화·비활성화 로그가 표시된다.
- [x] 브라우저 콘솔에 치명적인 오류·경고가 없다.

사용자 수동 테스트 대기:

```text
[ ] 필드로 돌아갔다가 다시 전투에 들어와도 Auto Hunt 상태가 유지된다.
[ ] Auto Hunt OFF에서 수동 MOVE 명령이 정상적으로 유지된다.
[ ] Auto Hunt OFF에서 수동 FOCUS_ATTACK 명령이 정상적으로 유지된다.
[ ] Auto Hunt ON에서 수동 MOVE 후 자동 전투가 재개된다.
[ ] Auto Hunt ON에서 수동 FOCUS_ATTACK 후 지정 대상 우선순위가 유지된다.
[ ] Auto Hunt ON/OFF 전환 시 수동 명령이 임의로 취소되지 않는다.
[ ] Auto Hunt OFF에서 자동 유닛만 해제되고 주변 반격은 유지된다.
[ ] 전투 종료 상태에서 Auto Hunt 버튼이 잘못된 명령을 만들지 않는다.
[ ] 작은 창에서도 Auto Hunt UI와 전투 화면이 정상적으로 보인다.
[ ] 게임에 Auto Hunt 외 9단계 스킬 기능이 추가되지 않았다.
[ ] 브라우저에 치명적인 콘솔 오류가 없다.
```

8단계 사용자 실행 테스트: 미실시 (`not_tested`)
8단계 ChatGPT 코드 검수: 미실시 (`not_reviewed`), 제출 태그: `review-stage-08-v1`
8단계 `main` 반영: 미반영

## 8단계 검수 피드백 수정 — v2

- 현재 작업 브랜치: `stage-08-auto-hunt-controls`
- 현재 검수 태그: `review-stage-08-v2`
- 8단계 상태: 검수 대기 (`review_pending`)

자동 검사:

- [x] `npm ci` 통과
- [x] `npm run typecheck` 통과
- [x] `npm run build` 통과
- [x] 개발 서버 HTTP 200 응답 확인 후 종료

브라우저에서 확인한 항목:

- [x] 10대10 전투 화면 진입과 `RUNNING` 상태
- [x] Auto Hunt 기본값 OFF
- [x] VICTORY와 DEFEAT 화면 표시
- [x] 단일 Hero 선택 시 `Hero · Melee reach: 10px` 표시
- [x] 단일 선택 시 얇은 공격 범위 원 표시
- [x] 브라우저 콘솔 치명적 오류·경고 없음

사용자 수동 테스트 대기:

```text
[ ] Auto Hunt OFF에서 한 아군이 공격받으면 주변 대기 아군이 지원한다.
[ ] 공격받은 아군만 혼자 싸우지 않는다.
[ ] 지원 범위 밖의 먼 아군은 가만히 있는다.
[ ] 지원 아군은 지역 전투 범위를 벗어나 전장 전체를 추적하지 않는다.
[ ] 여러 지원 아군의 대상이 가능한 범위에서 분산된다.
[ ] MOVE 중인 아군은 동료 지원 때문에 이동을 취소하지 않는다.
[ ] FOCUS_ATTACK 중인 아군은 동료 지원 때문에 대상을 바꾸지 않는다.
[ ] 이미 다른 적과 싸우는 아군은 불필요하게 대상을 바꾸지 않는다.
[ ] Auto Hunt ON 상태의 유닛은 기존 자동전투를 유지한다.
[ ] 일반 용병과 슬라임이 몸 표면 약 8px 거리에서만 공격한다.
[ ] 주인공과 Slime 4가 몸 표면 약 10px 거리에서만 공격한다.
[ ] 사거리 밖에서는 HP가 감소하지 않는다.
[ ] 공격자가 실제 근접 거리까지 접근한 후 피해가 발생한다.
[ ] 단일 아군 선택 시 공격 범위 원이 표시된다.
[ ] 공격 범위 원이 유닛 이동을 따라간다.
[ ] 다중 선택 시 공격 범위 원이 숨겨진다.
[ ] 선택 정보에 Melee reach가 표시된다.
[ ] 공격 범위 원이 마우스 입력을 방해하지 않는다.
[ ] 10대10 근접 전투가 멈추거나 교착되지 않고 승패까지 진행된다.
[ ] 아군과 적군이 서로 밀려나지 않는다.
[ ] Auto Hunt ON/OFF와 수동 명령 우선순위가 계속 정상 작동한다.
[ ] 필드 왕복 후 Auto Hunt 설정이 유지된다.
[ ] 콘솔 치명 오류가 없다.
```

8단계 v2 사용자 실행 테스트: 미실시 (`not_tested`)
8단계 v2 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
8단계 v2 `main` 반영: 미반영

브라우저에서 직접 확인하지 못한 항목은 통과로 추정하지 않고 사용자 수동 테스트 대기로 유지한다.

## 8단계 동료 지원 타깃 기억 수정 — v3

- 현재 작업 브랜치: `stage-08-auto-hunt-controls`
- 현재 검수 태그: `review-stage-08-v3`
- 8단계 상태: 검수 대기 (`review_pending`)

자동 검사:

- [x] `npm ci` 통과
- [x] `npm run typecheck` 통과
- [x] `npm run build` 통과
- [x] 개발 서버 HTTP 200 응답 확인 후 종료

코드 확인:

- [x] 실제 공격받은 `attackedAlly`의 `lastAttackerId`·`lastAttackedAt` 기록은 유지한다.
- [x] 지원 아군 배정 시 `lastAttackerId = null`, `lastAttackedAt = 0`으로 초기화한다.
- [x] 지원 아군의 최초 타깃 분산 규칙과 지역 탐색 범위를 유지한다.
- [x] MOVE·FOCUS_ATTACK·AUTO_HUNT 보호 규칙을 유지한다.

사용자 수동 테스트 대기:

```text
[ ] Auto Hunt OFF에서 한 아군이 공격받는다.
[ ] 주변 지원 아군들이 여러 지역 적에게 분산된다.
[ ] 각 지원 아군의 최초 대상이 사망한다.
[ ] 지원 아군들이 최초 공격자 하나로 강제 집결하지 않는다.
[ ] 지원 아군들이 지역 범위 안에서 결정적으로 다음 적을 탐색한다.
[ ] MOVE 중인 아군은 지원 요청으로 명령을 취소하지 않는다.
[ ] FOCUS_ATTACK 중인 아군은 지원 요청으로 대상을 바꾸지 않는다.
[ ] 사거리 밖에서 HP가 감소하지 않는다.
[ ] 치명적인 콘솔 오류가 없다.
```

8단계 v3 사용자 실행 테스트: 미실시 (`not_tested`)
8단계 v3 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
8단계 v3 `main` 반영: 미반영

## 8단계 최종 승인 및 main 반영

- 승인 검수 태그: `review-stage-08-v3`
- 승인 커밋: `80bb01a6c4857ace14b1ebc619d3082a497f482e`
- 사용자 실행 테스트: 통과 (`passed`)
- ChatGPT 코드 검수: 승인 (`approved`)
- `main` 반영: 완료

사용자가 직접 확인한 내용:

```text
[x] Auto Hunt ON/OFF가 작동한다.
[x] Auto Hunt ON 상태에서 아군 전체 자동 전투가 작동한다.
[x] 수동 MOVE가 자동사냥보다 우선한다.
[x] 수동 집중 공격이 자동사냥보다 우선한다.
[x] Auto Hunt OFF에서도 가까운 대기 아군이 동료를 지원한다.
[x] 공격받은 한 명만 혼자 싸우는 현상이 개선됐다.
[x] 근접 유닛이 이전보다 적에게 가까이 접근한 뒤 공격한다.
[x] 동료 지원 타깃 분산 수정 후 특별한 이상 없이 작동한다.
[x] 기존 전투 조작이 정상 작동한다.
```

추가 기록:

- 현재 동료 지원 범위는 공통 설정값을 사용한다.
- 유닛별 `assistRange`는 아직 구현하지 않았으며 후속 유닛 데이터 확장 대상으로 남긴다.
- 원거리 유닛과 투사체는 아직 구현하지 않았다.
## 9단계 유닛 스킬과 단일 선택 전용 스킬 UI — v1

- 현재 작업 브랜치: `stage-09-unit-skills-ui`
- 현재 검수 태그: `review-stage-09-v1`
- 9단계 상태: 검수 대기 (`review_pending`)

자동 검사:

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`)
- `npm run dev`: 개발 서버 실행 및 HTTP 응답 확인 후 종료 (`passed`)

브라우저 자동 확인:

- [x] 필드 화면에서 Stage 9 제목과 스킬 안내 문구가 표시된다.
- [x] 10대10 전투가 `RUNNING`으로 표시되고 기존 전투 화면이 열린다.
- [x] 두 번째 슬롯이 `Skill Merc`로 표시되고 전용 색상이 적용된다.
- [x] Skill Merc 단일 선택 시 `Skill Merc Skills` 패널이 표시된다.
- [x] 단일 선택 패널에서 Q Whirlwind와 W First Aid가 표시된다.
- [x] 초기 상태에서 Q는 `READY`, W는 체력이 가득 차 `FULL HP`로 표시된다.
- [x] 전투 종료 시 개별 스킬 패널이 숨겨지는 것을 확인했다.
- [x] 브라우저 치명적 콘솔 오류가 없다.

브라우저에서 직접 확정하지 못한 항목은 통과로 기록하지 않는다.

- [ ] Whirlwind의 실제 범위 피해와 다중 적중
- [ ] Whirlwind 성공 후 쿨다운과 재사용 제한
- [ ] First Aid의 실제 회복과 회복 후 쿨다운
- [ ] 체력이 가득 찬 First Aid가 쿨다운을 소비하지 않는지
- [ ] 다중 선택 시 개별 스킬 패널이 숨겨지는지
- [ ] MOVE·FOCUS_ATTACK 중 스킬이 수동 명령을 덮어쓰지 않는지
- [ ] Auto Hunt가 스킬을 자동 사용하지 않는지
- [ ] 스킬로 마지막 적을 처치할 때 전투 결과가 정상 전환되는지

9단계 사용자 실행 테스트: 미실시 (`not_tested`)
9단계 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
9단계 `main` 반영: 미반영

## 10단계 편성·슬롯 재배치와 주인공 필수 편성 — v1

- 현재 작업 브랜치: `stage-10-formation-roster`
- 현재 검수 태그: `review-stage-10-v1`
- 10단계 v1 상태: 수정 요청 (`changes_requested`)

자동 검사:

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`)
- `npm run dev`: 개발 서버 HTTP 200 확인 후 종료 (`passed`)

브라우저 자동 확인:

- [x] Field 화면의 Stage 10 제목, Formation 버튼, 10/10 및 Hero Slot 1 표시
- [x] FormationScene의 10개 슬롯과 보유 유닛 목록 표시
- [x] Skill Merc를 5번 슬롯으로 교체하고 기존 Merc4가 2번 슬롯으로 이동
- [x] 일반 용병 제거 시 EMPTY/UNDEPLOYED 표시
- [x] Hero 제거 시도 차단 및 안내 문구 표시
- [x] Reset Default로 기본 편성 복원
- [x] Cancel로 draft 변경 폐기
- [x] 적용된 편성이 BattleScene에 전달되고 Skill Merc 5번, Merc4 2번으로 표시
- [x] Return to Field 후 편성 요약 유지
- [x] 브라우저 콘솔 error/warn 로그 없음

사용자 수동 테스트 대기:

- [ ] 전체 사용자 수동 테스트는 아직 실행하지 않음
- [ ] 장시간 전투와 추가 편성 시나리오는 사용자 확인 대기

10단계 사용자 실행 테스트: 미실시 (`not_tested`)
10단계 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
10단계 `main` 반영: 미반영

10단계 v1 정적 코드 검수 결과: 수정 요청 (`changes_requested`)

- 보유 유닛 1~10명 허용, roster 정렬, 편성 정체성 표시, Reset 저장 안내가 미흡해 수정 요청됨

## 10단계 편성·슬롯 재배치와 주인공 필수 편성 — v2

- 현재 작업 브랜치: `stage-10-formation-roster`
- 현재 검수 태그: `review-stage-10-v2`
- 10단계 상태: 검수 대기 (`review_pending`)

순수 함수 검사:

- [x] 기본 FormationState는 valid
- [x] ownedUnits 10명, Hero만 배치된 상태는 valid
- [x] Hero 한 명만 보유, ownedUnits 9명·11명은 invalid
- [x] Hero 미배치, Hero 중복 슬롯, 슬롯 rosterUnitId 중복은 invalid
- [x] 슬롯 배열 순서가 섞여도 valid
- [x] buildBattleRosterFromFormation() 결과는 slotIndex 오름차순
- [x] 빈 슬롯은 전투 roster에서 제외
- [x] draft 수정은 registry 원본에 영향을 주지 않음
- [x] 잘못된 registry는 기본 10명 상태로 복구

자동 검사:

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 개발 서버 정상 시작 및 HTTP 200 확인 후 종료 (`passed`)

브라우저 자동 확인:

- [x] Hero 카드에 Main Character · Required 표시
- [x] Skill Merc 카드에 Mercenary · Skills Q/W 표시
- [x] 일반 용병 카드에 Mercenary 표시
- [x] 선택 정보에 이름·역할·Required/스킬·Slot/Bench 표시
- [x] 일반 용병 Remove 후 EMPTY와 Bench 표시
- [x] Reset Default 후 `Default formation restored. Apply to save.` 표시
- [x] Apply 후 FieldScene에 `Formation saved.` 표시
- [x] Hero만 배치하고 나머지를 Bench로 둔 편성 적용
- [x] Hero 한 명 전투 진입과 빈 슬롯 EMPTY UI 확인
- [x] 브라우저 error/warn 로그 없음

10단계 v2 사용자 실행 테스트: 실패 (`failed`)
10단계 v2 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
10단계 v2 `main` 반영: 미반영

10단계 v2 사용자 테스트 결과: 실패 (`failed`)

- 선택된 유닛이 슬롯 이동·교환 후에도 남고, 동일 유닛·동일 슬롯·Scene 재진입 선택 취소가 보장되지 않아 v3 수정 요청됨

## 10단계 편성·슬롯 재배치와 주인공 필수 편성 — v3 최종 승인

- 현재 작업 브랜치: `main`
- 현재 검수 태그: `review-stage-10-v3`
- 10단계 상태: 완료 (`completed`)

선택 상태 브라우저 재현:

- [x] 최초 FormationScene 진입 시 `Selected: None`, 선택 강조 없음, Remove 비활성
- [x] 같은 Owned Unit 카드 재클릭 시 `Selection cleared.`와 `Selected: None`
- [x] 같은 유닛의 현재 슬롯 재클릭 시 선택 취소 및 슬롯 유지
- [x] Hero와 일반 용병 슬롯 교환 후 `Selected: None` 및 강조 해제
- [x] 교환 직후 다른 슬롯 클릭 시 해당 용병만 선택되고 추가 교환 없음
- [x] 일반 용병 두 명 연속 Remove 후 각각 Bench 이동, 선택 자동 해제
- [x] 선택 후 Cancel로 복귀하고 FormationScene 재진입 시 `Selected: None`

기존 기능 회귀 확인:

- [x] Apply 후 `Formation saved.` 표시
- [x] Hero Required·Skill Merc Q/W·빈 슬롯 표시 유지
- [x] 기본 10/10 BattleScene roster 및 Return to Field 확인
- [ ] Auto Hunt·MOVE·FOCUS_ATTACK·Skill 사용 전체 수동 흐름은 v3에서 재실행하지 않음 (`not_tested`)
- [x] 브라우저 error/warn 로그 없음

자동 검사:

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 개발 서버 정상 시작 및 HTTP 200 확인 후 종료 (`passed`)

사용자 통합 테스트:

- [x] 최초 진입 `Selected: None` 및 Hero 자동 선택 없음
- [x] 동일 유닛 재클릭 선택 취소
- [x] Hero 슬롯 교환 후 선택 자동 해제
- [x] 일반 용병 연속 편성 제외
- [x] Apply 후 편성 유지
- [x] 전투 EMPTY 슬롯 확인
- [x] Skill Merc Q/W 유지

10단계 v3 사용자 실행 테스트: 통과 (`passed`)
10단계 v3 사용자 테스트 근거: 사용자가 Formation 선택 취소, 슬롯 교환 후 선택 해제, 일반 용병 연속 편성 제외, Apply 유지, EMPTY 슬롯 및 Skill Merc Q/W를 직접 확인함
10단계 v3 ChatGPT 코드 검수: 승인 (`approved`)
10단계 v3 `main` 반영: 완료
10단계 완료 태그: `stage-10-completed`

## 9단계 v3 최종 승인 및 main 반영

- 승인 검수 태그: `review-stage-09-v3`
- 승인 커밋: `40abfb77036d08decfc4369324ca9201ffae38ea`
- 자동 검사: `npm ci`, `npm run typecheck`, `npm run build`, 개발 서버 HTTP 200 확인 — 통과
- 브라우저 자동 검사: 기존 실제 기록 유지
- 사용자 전체 수동 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- 생략된 수동 테스트는 통과로 간주하지 않음
- ChatGPT 코드 검수: 승인 (`approved`)
- 주둔 지역 자동 방어, `guardPosition`, MOVE 정규화, guard leash와 시각화 반영
- 승인 작업을 `main`에 no-ff 병합
- `main` 반영: 완료
