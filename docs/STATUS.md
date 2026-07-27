# 현재 개발 상태

## Stage 10 resubmission status

- Submission: `review-stage-10-v1` on `stage-10-formation-roster`
- Stage status: `review_pending`
- Active task: 10단계 구현 완료 — `review-stage-10-v1` 검수 대기 중
- 9단계는 `main`에 반영되어 완료됐고, 10단계는 아직 `main`에 반영하지 않음
- User run test: `not_tested`
- ChatGPT code review: `not_reviewed`
- The 10단계 work adds FormationState, FormationScene, roster ownership, slot rearrangement, Hero-required validation, and battle roster integration.

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
- 현재 단계: 10단계
- 현재 단계 이름: 편성·슬롯 재배치와 주인공 필수 편성
- 현재 단계 상태: 검수 대기 (`review_pending`)
- 상태 코드: `review_pending`
- 현재 작업 브랜치: `stage-10-formation-roster`
- 검수 태그: `review-stage-10-v1`
- 완료된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계
- 검수 통과된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계
- 현재 작업: 10단계 구현 완료 — `review-stage-10-v1` 검수 대기 중
- 다음 단계: 11단계 — 상점·용병 구매 기능
- 사용자 실행 테스트: 미실시 (`not_tested`)
- ChatGPT 코드 검수: 미실시 (`not_reviewed`)
- `main` 정식 반영 여부: 미반영

현재 단계 번호는 10으로 유지한다. 1단계부터 9단계까지 `main`에 반영되어 완료됐고, 10단계는 작업 브랜치에서 검수 대기 중이다. 별도의 승인 명령 전에는 `main` 반영이나 11단계 시작을 하지 않는다.

## 마지막 작업 요약

10단계에서 FormationState와 FormationScene, 보유 유닛·슬롯 분리, Hero 필수 편성, 슬롯 교체·제거·초기화, FieldScene·BattleScene 연동을 구현했다. 자동 검사와 개발 서버, 브라우저 UI 확인은 완료했으며 사용자 수동 테스트와 ChatGPT 코드 검수는 아직 실시하지 않았다.

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
- 10단계 FormationState·FormationScene·슬롯 교체·Hero 필수 편성: 구현 완료, 검수 대기
- 10단계 자동 브라우저 확인: Formation 화면, 교체·제거·Reset·Cancel, Hero 제거 방지, 전투 roster 전달과 복귀 확인
- 10단계 사용자 수동 테스트: 미실시
- 10단계 ChatGPT 코드 검수: 미실시
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
