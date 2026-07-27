# 현재 개발 상태

## Stage 12 부대 지정과 단축키 설정 — 검수 대기

- 현재 검수 태그: `review-stage-12-v1`
- 작업 브랜치: `stage-12-control-groups-keybinds`
- 전체 단계: 17단계
- 현재 단계: 12단계 — 부대 지정과 단축키 설정
- 현재 단계 상태: 검수 대기 (`review_pending`)
- 현재 작업: 12단계 부대 지정과 키 설정 구현 완료 — `review-stage-12-v1` 검수 대기 중
- 완료된 단계: 1단계~11단계
- 검수 통과된 단계: 1단계~11단계
- 다음 단계: 13단계 — 경험치·레벨·능력치 성장
- `main` 정식 반영 여부: 미반영
- 사용자 실행 테스트: 미실시 (`not_tested`)
- ChatGPT 코드 검수: 미실시 (`not_reviewed`)
- 현재 알려진 문제: 기존 `favicon.ico` 404 비차단 경고

### 12단계 구현 요약

- BattleScene에서 Ctrl+1…Ctrl+9·Ctrl+0으로 선택 아군을 저장하고 1…9·0으로 생존 아군을 호출한다.
- 부대는 BattleScene 인스턴스에만 존재하고 전투 시작 때 10개 모두 초기화되며, 사망·무효 ID는 즉시 제거된다.
- KeySettingsScene에서 숫자 부대 키와 Whirlwind·First Aid 키를 registry에 저장하고, 충돌 시 같은 종류의 바인딩을 교환한다.
- FieldScene Keys 진입과 BattleScene 동적 도움말·부대 UI를 추가했으며 기존 명령·스킬 우선순위를 유지한다.

### 12단계 검증 기록

- 순수 부대·키 바인딩 로직 검사 24개: 통과
- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- 브라우저 자동 확인: KeySettingsScene의 10개 그룹·Q/W, 키 교환·초기화·저장, BattleScene 동적 키와 UI 겹침 없음, error/warn 없음 확인
- 실제 부대 저장·호출, 사망 정리, 명령 보존과 사용자 통합 전투 시나리오는 사용자 실행 테스트 대기이며 통과로 기록하지 않음

12단계 사용자 실행 테스트: 미실시 (`not_tested`)
12단계 ChatGPT 코드 검수: 미실시 (`not_reviewed`)
12단계 `main` 반영: 미반영

마지막 갱신: 2026-07-28 (Asia/Seoul)

## Stage 11 shop and recruitment final approval

- 제출 태그: `review-stage-11-v1`
- 작업 브랜치: `main`
- 전체 단계: 17단계
- 현재 단계: 11단계 — 상점·용병 구매 기능
- 단계 상태: 완료 (`completed`)
- 현재 작업: 11단계 완료 — 12단계 시작 명령 대기 중
- 완료된 단계: 1단계~11단계
- 검수 통과된 단계: 1단계~11단계
- 다음 단계: 12단계 — 부대 지정과 단축키 설정
- `main` 정식 반영 여부: 반영 완료
- 사용자 실행 테스트: 사용자 요청에 따라 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- 현재 알려진 문제: 기존 `favicon.ico` 404 비차단 경고

### 11단계 구현 요약

- Phaser registry 기반 Gold를 도입하고 전투 승리 보상과 상점 소비를 같은 잔액에 연결했다.
- Swordsman·Guardian·Scout 고정 상품, 한 번만 구매 가능한 원자 구매, 최대 13명 보유 검증을 추가했다.
- 구매 직후 용병은 Bench에 남으며, Formation의 초기 10슬롯과 전투 roster 최대 10명 규칙을 유지한다.
- ShopScene, FieldScene Shop 버튼·Gold·Owned 표시, 최대 13명 FormationScene 표시와 Reset Default 보존을 추가했다.

### 11단계 검증 기록

- 순수 Gold·Formation·구매 원자성 검사: 통과
- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작 및 종료 (`passed`)
- 브라우저 자동 확인: Stage 11 필드·Shop 카드·Gold 부족 메시지·잔액/보유 수 불변·콘솔 오류 없음 확인
- 자동화로 직접 확인하지 못한 구매 후 편성·실전 전투·세 상품 전체·Reset 시나리오는 통과로 기록하지 않음

마지막 갱신: 2026-07-28 (Asia/Seoul)

## Stage 10 final approval status

- Submission: `review-stage-10-v3` on `stage-10-formation-roster`
- Stage status: `completed`
- Active task: 10단계 완료 — 11단계 시작 명령 대기 중
- 9단계와 10단계는 `main`에 반영되어 완료됨
- User run test: `passed`
- ChatGPT code review: `approved`
- The 10단계 work adds FormationState, exact 10-unit ownership, 1~10-unit deployment, FormationScene identity display, slot ordering, save feedback, Hero-required validation, battle roster integration, and selection reset/toggle behavior.
- v1 정적 코드 검수 결과: 수정 요청 (`changes_requested`)
- v2 사용자 테스트 결과: 실패 (`failed`) — 선택 상태가 슬롯 작업 후 남고 동일 유닛·동일 슬롯·Scene 재진입 취소가 보장되지 않음
- v3 검수 결과: 승인 (`approved`), 사용자 통합 테스트: 통과 (`passed`)

## Stage 9 v2 resubmission history (superseded by v3)

- Submission: `review-stage-09-v2` on `stage-09-unit-skills-ui`
- Stage status: `changes_requested` (historical)
- Historical result: v2 local ally assistance fix was superseded after user testing
- v1 `review-stage-09-v1` remains preserved; `main` is not changed
- User run test: `not_tested`
- ChatGPT code review: `not_reviewed`
- The fix adds pursuit-based threat refresh, 2500ms threat memory, continuous deterministic support assignment, and completed/stale MOVE normalization.

## 단계 정보

- 전체 단계: 17단계
- 현재 단계: 12단계
- 현재 단계 이름: 부대 지정과 단축키 설정
- 현재 단계 상태: 검수 대기 (`review_pending`)
- 상태 코드: `review_pending`
- 현재 작업 브랜치: `stage-12-control-groups-keybinds`
- 검수 태그: `review-stage-12-v1`
- 완료 태그: 없음 (검수 대기)
- 완료된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계
- 검수 통과된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계
- 현재 작업: 12단계 부대 지정과 키 설정 구현 완료 — `review-stage-12-v1` 검수 대기 중
- 다음 단계: 13단계 — 경험치·레벨·능력치 성장
- 사용자 실행 테스트: 미실시 (`not_tested`)
- ChatGPT 코드 검수: 미실시 (`not_reviewed`)
- `main` 정식 반영 여부: 미반영

현재 단계 번호는 12로 유지한다. 1단계부터 11단계까지 `main`에 반영되어 완료됐고, 12단계는 검수 승인 전까지 `review_pending`으로 유지한다. 13단계는 시작하지 않는다.

## 마지막 작업 요약

11단계에서 registry Gold, 고정 상점 상품 3종, 원자적 용병 구매, 10~13명 보유 검증, 구매 유닛 Bench 보존, ShopScene과 최대 13명 Formation 표시를 구현했다. 자동 검사와 제한된 브라우저 기록을 확인하고 정적 코드 검수 승인 후 `main`에 no-ff 병합했다. 사용자 수동 테스트는 요청에 따라 생략했다.

## 검증 기록

- 기준 `main`과 `stage-06-completed`: `9ea5186` 일치
- Slime 1 및 Slime 4 적군 종류 연결: 통과
- 10대10 전투 인원과 하단 10슬롯: 통과
- 드래그 다중 선택과 대형 이동: 통과
- 우클릭 공격 명령과 적군 AI: 통과
- 아군 전멸 `DEFEAT`: 통과
- `npm ci`: 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- 개발 서버 및 브라우저 자동 검사: 통과
- 사용자 수동 실행 테스트: 통과
- 7단계 사용자 실행 테스트: 통과
- 7단계 ChatGPT 코드 검수: 승인
- 7단계 no-ff 병합: `14440469` 반영 완료
- 8단계 Auto Hunt ON/OFF 및 수동 명령 우선순위 코드 구현: 완료
- 8단계 자동 브라우저 확인: 초기 OFF, ON 전역 전투, MOVE 우선, ON/OFF 로그, 콘솔 오류 없음 확인
- 8단계 필드 왕복 세션 유지: 사용자 수동 테스트 필요
- 8단계 v2 지역 동료 지원·사거리 축소 코드: 완료
- 8단계 v2 단일 선택 공격 범위 원과 `Melee reach` 표시: 브라우저 확인
- 8단계 v2 동료 지원 전체 시나리오와 10대10 장시간 전투: 사용자 수동 테스트 필요
- 8단계 v2 브라우저 콘솔 오류·경고: 없음
- 8단계 v3 지원 아군 피격 기억 초기화 코드: 완료
- 8단계 v3 지원 대상 사망 후 분산 재탐색: 사용자 확인 완료
- 8단계 v3 사용자 실행 테스트: 통과
- 8단계 v3 ChatGPT 코드 검수: 승인
- 8단계 v3 no-ff 병합: 완료
- 8단계 완료 태그: `stage-08-completed`
- 9단계 Skill Mercenary 정의·Q/W 스킬·단일 선택 UI: 구현 완료
- 9단계 검수 제출 태그: `review-stage-09-v3` (v1·v2 수정 요청 보존)
- 9단계 자동 브라우저 확인: Stage 9 제목, Skill Mercenary 슬롯·색상, 단일 선택 Q/W 패널과 콘솔 오류 없음 확인
- 9단계 주둔 지역 자동 방어·guardPosition·MOVE 정규화: 구현 완료
- 9단계 검수 승인 및 `main` no-ff 병합: 완료
- 9단계 사용자 전체 수동 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- 9단계 ChatGPT 코드 검수: 승인
- 9단계 완료 태그: `stage-09-completed`
- 10단계 FormationState·FormationScene·슬롯 교체·Hero 필수 편성: 구현 완료
- 10단계 v1 검수: 보유 유닛 검증·roster 정렬·정체성 표시·Reset 저장 안내 수정 요청
- 10단계 v2 검수: 사용자 테스트에서 선택 상태 잔존 문제로 수정 요청 (`failed`)
- 10단계 v3 브라우저 확인: 선택 토글·동일 슬롯 취소·교환 후 해제·연속 제외·재진입 초기화, Apply, 10/10 전투와 Return 확인
- 10단계 사용자 통합 테스트: 사용자 확인 결과 통과 (`passed`)
- 10단계 ChatGPT 코드 검수: 승인 (`approved`)
- 10단계 `main` no-ff 병합: 완료
- 10단계 완료 태그: `stage-10-completed`
- 유닛별 `assistRange`: 미구현, 후속 데이터 확장 대상으로 기록
- v6 초기 10대10 `RUNNING`, 집중 공격 명령, 공격 이동 명령, 콘솔 치명 오류 없음 확인
- v6 피격 후 목적지 복귀와 집중 공격 대상 사망 후 지역 재탐색: 사용자 수동 테스트 필요
- v7 바닥 우클릭 직후 전체 선택 아군 `MOVING`, 이동 명령 로그, 목적지 도착 후 `IDLE` 확인
- v7 이동 중 피격 시 자동 반격하지 않는 코드 경로와 콘솔 오류·경고 없음 확인

## 알려진 문제

- `favicon.ico` 요청이 404로 표시되는 기존 비차단 문제가 있다.
- 게임 기능에는 영향이 없으며, 별도 작업 브랜치에서 처리한다.

## 마지막 갱신

2026-07-27 (Asia/Seoul)
