# Test Game 개발 로드맵

## 포스트 로드맵 후속 작업 — 원거리 공격·투사체·범위 마법 1차 패스 (`review_pending`)

17단계와 `visual-ui-pass-1-completed`를 완료 상태로 유지한다. 이 작업은 Stage 18이 아닌 `post-roadmap-ranged-combat-pass-1` 별도 후속 패스다.

- 목표: 근접·화살·마법탄 기본 공격을 구분하고 투사체와 지면 지정 Meteor 범위 마법을 추가한다.
- 주요 구현 항목: 공격 프로필, ARROW/MAGIC_BOLT 투사체, 고정 targetUnitId, stale 투사체 정리, Meteor preview/cast/impact, Arcane Burst proc, Meteor 키 마이그레이션.
- 구현하지 않을 항목: 자동 카이팅, 실제 온라인 서버, Stage 18, UI 전체 재디자인, 전투 밀어내기 규칙 변경.
- 검수 상태: `review_pending` / `review-ranged-combat-pass-1-v1`
- 사용자 수동 테스트: `skipped_by_user`

## 포스트 로드맵 후속 작업 — 시각/UI 1차 패스 (`completed`)

17단계까지의 전체 로드맵과 `stage-17-completed` 상태는 완료로 유지한다. 이 작업은 번호가 매겨진 18단계가 아니라 `post-roadmap-visual-ui-pass-1`에서 진행한 별도 시각/UI 후속 패스이며, `review-visual-ui-pass-1-v4` 승인 후 `main`에 반영하고 `visual-ui-pass-1-completed`로 고정했다. v1·v2·v3은 `changes_requested` 이력과 불변 태그로 보존하며 사용자 수동 테스트는 `skipped_by_user`로 기록한다.

- 목표: 게임 규칙을 변경하지 않고 Field/Battle과 주요 메뉴의 시각적 일관성·가독성·상태 피드백을 개선한다.
- 주요 구현 항목: 코드 생성 Slime/아군 토큰, 필드·전투 배경, 공통 색상·패널·버튼·진행 바 helper, HP/EXP·선택·타깃·쿨다운·비활성 상태 표시, 간단한 시각 효과.
- 구현하지 않을 항목: 18단계, 새 게임 규칙, 외부 이미지·에셋, 실제 서버·네트워크 기능.
- 검수 상태: `completed` / `review-visual-ui-pass-1-v4`
- v1 검수 결과: `changes_requested` — 공통 버튼·진행 바 실제 적용, 전투 피드백·타깃 마커, 메뉴 스프라이트와 브라우저 검증 보완 요청
- v2 검수 결과: `changes_requested` — 공통 ButtonVisual 상태 API와 Scene 직접 조작 충돌, 토큰 setScale 복구, 공격·피격 tween 분리와 정리, 타깃 링 갱신, PNG 바이트 형식 보완 요청
- v3 검수 결과: `changes_requested` — hover 내부 상태 보존, disable·busy·hide 시 pressed 초기화, Skill cooldown 재활성화 안정성, NaN·Infinity ProgressBar 정규화 보완 요청
- v4 검수 결과: `approved` — 86개 자동검사 통과 후 `main` 반영 및 `visual-ui-pass-1-completed` 생성 완료

## Stage 17 온라인 확장 준비 — `completed`

- 전체 단계: 17단계
- 현재 단계: 17단계 — 온라인 확장 준비
- 작업 브랜치: `main`
- 검수 태그: `review-stage-17-v5`
- 완료 태그: `stage-17-completed`
- 목표: 실제 서버 없이 미래 온라인 연결을 위한 protocol, snapshot, gateway, operation, conflict와 보안 경계를 준비한다.
- 주요 구현 항목: `OnlinePlayerSnapshot`, protocol v1, server-authoritative conflict policy, Disabled/Mock Gateway, record-based pending operation queue와 retry/backoff/rejection, revision conflict 보존, canonical snapshot·Battle/Offline DTO validation, resolved snapshot 반환과 coordinator 통합 검증, abort cancellation, gateway protocol validation, OpenAPI·TypeScript request/response contract·threat model 문서.
- 완료 조건: 기존 local game 유지; 실제 네트워크 없는 Disabled/Mock adapter; protocol/snapshot/queue/conflict/sync 자동 테스트; `npm ci`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run check` 통과; 개발 서버 HTTP 200; ChatGPT 검수 승인; `main` 반영과 `stage-17-completed` 생성.
- 이 단계에서 구현하지 않을 항목: 실제 서버·fetch/WebSocket·계정·OAuth·클라우드 저장·DB·PvP·멀티플레이어·거래·채팅·결제·운영 페이지·provider 확정.
- 사용자 실행 테스트: 사용자 요청에 따라 `skipped_by_user`로 유지한다.

17단계는 실제 온라인 서비스를 제공하지 않으며, 승인된 v5를 `main`에 반영하고 `stage-17-completed`로 완료했다. v1·v2·v3·v4 검수의 `changes_requested` 이력과 태그는 보존한다. Stage 18은 로드맵에 없다.

## Stage 16 성능 및 안정화 — `completed`

- 전체 단계: 17단계
- 현재 단계: 16단계 — 성능 및 안정화
- 작업 브랜치: `main`
- 검수 태그: `review-stage-16-v4`
- 완료 태그: `stage-16-completed`
- 목표: 1~15단계 통합 회귀 안전성, 런타임 상태 복구, 저장·씬 수명주기 안정성, UI 갱신 비용과 진단 가시성을 확보한다.
- 주요 구현 항목: Node `node:test` 기반 순수 로직 회귀 테스트, `StorageLike`·시계 주입, 경계 상태 검증·복구, 멱등 자동 저장 disposer, Field/Battle UI dirty/throttle, 런타임 오류 최근 20개 기록, `?diagnostics=1` 오버레이, quota 메타데이터, favicon, Recovery Try Again의 FATAL 제거·씬 정리·Bootstrap 재검증, 아키텍처·감사 문서.
- 완료 조건: `npm ci`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run check` 통과; 개발 서버 HTTP 200 확인; ChatGPT 검수 승인; `main` 반영 및 `stage-16-completed` 생성. 사용자 수동 테스트는 `skipped_by_user`로 기록한다.
- 이 단계에서 구현하지 않을 항목: 17단계 온라인 확장, 계정·클라우드·멀티플레이어·서비스 워커, 새 게임 규칙과 신규 아이템/스킬.
- 사용자 실행 테스트: 사용자 요청에 따라 `skipped_by_user`로 유지한다.

16단계 v4는 승인되어 `main`에 반영됐고 `stage-16-completed`로 완료됐다. 이후 17단계 온라인 확장 준비도 승인되어 `stage-17-completed`로 완료됐다.

## Stage 15 저장과 오프라인 진행 — 완료

- 전체 단계: 17단계
- 현재 단계: 15단계 — 저장과 오프라인 진행
- 단계 상태: `completed`
- 작업 브랜치: `main`
- 검수 태그: `review-stage-15-v3`
- 완료 태그: `stage-15-completed`
- 완료된 단계: 1단계~15단계
- 다음 단계: 16단계 — 성능 및 안정화
- 사용자 실행 테스트: `skipped_by_user`
- ChatGPT 코드 검수: `approved`
- `main` 반영 여부: 완료

15단계 v1·v2 검수 지적을 수정한 v3가 승인되어 `main`에 반영됐으며, 16단계는 시작하지 않는다.

## Stage 14 final approval and main integration

- 전체 단계: 17단계
- 현재 단계: 14단계 — 아이템·인벤토리·장비
- 단계 상태: `completed`
- 작업 브랜치: `main`
- 검수 태그: `review-stage-14-v2`
- 완료 태그: `stage-14-completed`
- 완료된 단계: 1단계~14단계
- 다음 단계: 15단계 — 저장과 오프라인 진행
- `main` 반영 여부: 1단계부터 14단계까지 반영 완료
- 사용자 실행 테스트: `skipped_by_user`
- ChatGPT 코드 검수: `approved`
- v1 결과 (historical): `changes_requested` — 중앙 부대 패널이 전투 유닛을 가리고 Group 10이 Group 0으로 표시됨
- v2 결과 (historical): `changes_requested` — 부대가 BattleScene마다 초기화되고 사망·UI 조회가 부대 원본을 삭제함
- v3 결과 (historical): `changes_requested` / 사용자 실행 테스트 `failed` — Auto Hunt OFF에서 M8·M9가 전투 후 guardPosition으로 자동 귀환함
- v4 제출: 고정 guardPosition 기준 지역 방어와 자동 귀환 제거, 소스 검수 승인 가능
- 12단계 v5 결과 (historical): `approved` — ChatGPT 정적 검수와 사용자 통합 실행 테스트 통과
- 13단계 v1 결과: `approved` — 승인 커밋을 `main`에 no-ff 병합하고 완료 태그 생성
- 14단계 v1 제출: 인벤토리·장비·드롭·방어력 구현, `changes_requested` — Unequip UI 겹침 가능성과 실제 보유 유닛 검증 보완 필요
- 14단계 v2 결과: `approved` — Unequip 버튼 위치와 registry 기반 실제 보유 유닛 검증을 보완한 뒤 정적 코드 검수를 통과했고 `main`에 no-ff 병합함

## Stage 9 v3 resubmission scope

- Each ally stores an independent `guardPosition` initialized from its spawn position.
- Successful MOVE completion updates `guardPosition`; malformed MOVE cleanup preserves it.
- Auto Hunt OFF detects any nearby enemy within 140px of the guard position without requiring damage or enemy target ownership.
- Local engagements leash at 180px and return to the guard position when no local enemy remains.
- Auto Hunt ON keeps global search, while FOCUS_ATTACK and active MOVE retain priority.
- The v2 AllyAssistThreat system is removed from combat decisions.
- The current review tag is `review-stage-09-v3`; v1 and v2 remain immutable.

## Stage 9 v2 resubmission history (superseded by v3)

- Nearby enemy pursuit is a local threat even before the first successful hit.
- Threats are stored for 2500ms and refreshed while the enemy keeps the ally as its local target.
- Support candidates are re-evaluated during the threat window, including allies that enter range later.
- Completed and malformed MOVE commands are normalized; only active MOVE retains movement priority.
- Support remains local and does not expand Auto Hunt OFF into whole-field searching.
- v1 is preserved; the historical v2 review tag is `review-stage-09-v2`.

## 로드맵 기준

- 전체 단계: 17단계
- 현재 단계: 15단계
- 현재 단계 이름: 저장과 오프라인 진행
- 현재 단계 상태: 완료 (`completed`)
- 현재 작업 브랜치: `main`
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
- 7단계 완료 태그: `stage-07-completed`
- 8단계 현재 검수 태그: `review-stage-08-v3` (완료)
- 8단계 완료 태그: `stage-08-completed`
- 9단계 현재 검수 태그: `review-stage-09-v3` (완료)
- 10단계 최초 검수 태그: `review-stage-10-v1` — 수정 요청
- 10단계 2차 검수 태그: `review-stage-10-v2` — 사용자 테스트 수정 요청
- 10단계 현재 검수 태그: `review-stage-10-v3` (승인)
- 10단계 완료 태그: `stage-10-completed`
- 11단계 검수 태그: `review-stage-11-v1` (승인, 과거 이력)
- 11단계 완료 태그: `stage-11-completed`
- 12단계 최초 검수 태그: `review-stage-12-v1` — UI 수정 요청
- 12단계 2차 검수 태그: `review-stage-12-v2` — 사용자 통합 테스트 수정 요청
- 12단계 v3 검수 태그: `review-stage-12-v3` — 사용자 테스트 수정 요청
- 12단계 승인 검수 태그: `review-stage-12-v5`
- 12단계 완료 태그: `stage-12-completed`
- 13단계 검수 태그: `review-stage-13-v1` (승인)
- 13단계 완료 태그: `stage-13-completed`
- 14단계 최초 검수 태그: `review-stage-14-v1` — 수정 요청
- 14단계 승인 검수 태그: `review-stage-14-v2`
- 14단계 완료 태그: `stage-14-completed`
- 15단계 검수 태그: `review-stage-15-v3`
- 다음 단계: 16단계 — 성능 및 안정화
- 완료된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계, 12단계, 13단계, 14단계, 15단계
- 검수 승인된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계, 12단계, 13단계, 14단계, 15단계
- `main` 반영 여부: 1단계부터 15단계까지 반영 완료

현재 단계 번호는 15이며, 1단계부터 15단계까지 `main`에 반영되어 완료됐다. 15단계 완료 태그는 `stage-15-completed`이며, 16단계는 아직 시작하지 않았다.

각 단계의 상태는 다음 값으로 관리한다.

- `not_started`: 시작 전
- `in_progress`: 작업 중
- `review_pending`: 구현 후 검수 대기
- `changes_requested`: 검수 후 수정 필요
- `approved`: 검수 통과, 병합 대기
- `completed`: `main` 반영까지 완료

각 단계는 목표와 완료 조건을 검수한 뒤 진행한다. 현재 단계 번호는 15이며, 1단계부터 15단계까지 `main` 반영이 완료됐다. 15단계는 `completed` 상태이고, 16단계는 시작하지 않는다.

검수 대상 버전은 tracked 파일 안의 현재 커밋 해시가 아니라 변경되지 않는 Git 태그로 관리한다. 검수 태그는 `review-stage-XX-vN` 형식을 사용하고, 기존 원격 태그는 이동하거나 덮어쓰지 않는다. 1단계 승인 태그는 `review-stage-01-v1`이며, 2단계 최초 검수 태그 `review-stage-02-v1`은 수정 요청 기록으로 보존하고 현재 재검수 태그는 `review-stage-02-v2`다.

최초 저장소 생성 과정에서 검수 전에 `main`에 초기 문서 커밋이 반영된 사실은 일회성 부트스트랩 예외로 기록했다. 해당 당시 반영은 정식 검수 승인을 의미하지 않았으며, 이후 승인된 `review-stage-01-v1`을 `main`에 반영해 1단계를 완료 확정했다.

## 1단계: 프로젝트 기반 및 개발단계 관리

### 목표

프로젝트의 방향, 개발 규칙, 17단계 로드맵, 현재 상태, 결정 사항을 문서화하고 이후 작업이 현재 개발 위치를 벗어나지 않도록 기준을 만든다.

### 주요 구현 항목

- 프로젝트 소개와 현재 단계를 담은 `README.md` 생성
- 개발 AI 작업 규칙을 담은 `AGENTS.md` 생성
- `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md` 생성
- 프로그램과 AI가 읽을 수 있는 `project-status.json` 생성
- 문서 간 단계 번호와 이름 일치 여부 검증

### 완료 조건 — 모두 충족

- [x] `README.md` 생성
- [x] `AGENTS.md` 생성
- [x] `docs/ROADMAP.md` 생성
- [x] `docs/STATUS.md` 생성
- [x] `docs/CHANGELOG.md` 생성
- [x] `docs/DECISIONS.md` 생성
- [x] `project-status.json` 생성
- [x] 모든 문서의 단계 정보가 서로 일치함
- [x] 검수 대상 작업 브랜치에 정상적으로 커밋됨
- [x] 원격 작업 브랜치에 정상적으로 push됨
- [x] 사용자 검수 통과
- [x] 승인 후 `main`에 반영됨

### 해당 단계에서 구현하지 않을 항목

- 게임 화면, 플레이어, 몬스터 구현
- 이동, 몬스터 선택, 전투 구현
- 프레임워크 및 패키지 설치
- 기술 스택 확정
- 이미지·에셋 추가

1단계부터 4단계까지의 완료 조건이 충족되어 모두 `completed`로 확정했다. 현재 다음 예정 단계는 5단계이며, 5단계는 별도 시작 명령 전까지 `not_started`로 유지한다.

## 2단계: 필드 화면에 플레이어와 몬스터 표시

### 단계 상태

`completed` — 사용자 실행 테스트·ChatGPT 코드 재검수·main 반영 완료

### 목표

게임의 첫 화면인 필드를 만들고 플레이어와 몬스터가 화면에 보이도록 한다.

### 주요 구현 항목

- [x] Phaser·TypeScript·Vite 프로젝트 구성
- [x] 960×540 필드 화면과 반응형 비율 표시
- [x] 플레이어 1명 표시
- [x] 몬스터 4마리 표시
- [x] 플레이어·몬스터 이름표와 단계 안내 표시

### 완료 조건

- [x] Phaser, TypeScript, Vite 프로젝트가 구성됨
- [x] `npm install` 성공
- [x] `npm run typecheck` 성공
- [x] `npm run build` 성공
- [x] 브라우저에서 필드 장면 실행 가능
- [x] 플레이어 1명 표시
- [x] 몬스터 4마리 이상 표시
- [x] 플레이어와 몬스터 이름표 표시
- [x] 사용자 실행 테스트
- [x] ChatGPT 코드 검수
- [x] 승인 후 `main` 반영

### 해당 단계에서 구현하지 않을 항목

- 몬스터 우클릭 선택
- 자동 접근 및 이동
- 전투 화면과 전투 로직
- 보상, 성장, 인벤토리, 저장

자동 검사, 사용자 실행 테스트, ChatGPT 재검수와 `main` 반영이 모두 완료되어 2단계를 `completed`로 확정했다. Phaser AudioContext 자동재생 경고는 비차단 경고이며 현재 기능에 영향이 없다.

## 3단계: 몬스터 우클릭 선택 및 자동 접근

### 단계 상태

`completed` — 코드 검수 승인 및 `main` 반영 완료. 사용자 수동 실행 테스트는 사용자의 명시적 요청으로 생략

### 목표

플레이어가 몬스터를 우클릭으로 선택하면 플레이어가 해당 몬스터를 향해 자동으로 접근하도록 한다.

### 주요 구현 항목

- [x] 몬스터 우클릭 이벤트 처리
- [x] 선택된 몬스터의 단일 선택 표시
- [x] 플레이어의 delta 기반 자동 접근 및 정지 조건
- [x] 이동 중 목표 변경
- [x] 빈 바닥 우클릭 무반응
- [x] 캔버스 범위 브라우저 contextmenu 차단

### 완료 조건

- [x] 우클릭으로 몬스터 선택 가능
- [x] 브라우저 contextmenu 차단
- [x] 선택 표시
- [x] 플레이어 자동 이동
- [x] 프레임 독립적인 이동
- [x] 접촉 거리에서 정지
- [x] 이동 중 목표 변경
- [x] 빈 바닥 우클릭 무반응
- [x] TypeScript 검사 통과
- [x] 빌드 통과
- [ ] 사용자 실행 테스트 — 사용자 요청으로 생략 (`skipped_by_user`)
- [x] ChatGPT 코드 검수 승인
- [x] 승인 후 `main` 반영

### 해당 단계에서 구현하지 않을 항목

- 접촉 시 전투 화면 전환
- 공격력·방어력 계산
- 승리·패배 및 보상
- 경험치와 아이템

자동 검사와 브라우저 상호작용 확인은 완료했고, 사용자 수동 실행 테스트는 사용자 요청으로 생략했다. 코드 검수 승인 후 `main` 반영까지 완료되어 3단계를 `completed`로 확정했다. 사용자 테스트 생략은 테스트 통과를 의미하지 않는다.

## 4단계: 플레이어와 몬스터 접촉 시 전투 화면 전환

### 단계 상태

`completed` — 사용자 실행 테스트·ChatGPT 코드 검수·main 반영 완료

### 목표

플레이어가 선택한 몬스터에 접촉하면 필드에서 전투 화면으로 전환되도록 한다.

### 주요 구현 항목

- [x] 접촉 판정과 `BATTLE` 상태 전환
- [x] 전투 화면 전환 및 중복 전환 방지
- [x] 전투 대상 전달과 정적 HP 표시
- [x] 필드 pause/resume 기반 상태 보존
- [x] Return to Field 복귀

### 완료 조건

- [x] BATTLE 상태 추가
- [x] 접촉 시 전투 진입
- [x] 전환 중복 방지
- [x] BattleScene 생성
- [x] 정확한 몬스터 정보 전달
- [x] 정적 플레이어 및 몬스터 HP 표시
- [x] Return to Field 버튼
- [x] 필드 위치 보존
- [x] 복귀 후 자동 재진입 방지
- [x] TypeScript 검사
- [x] 빌드 검사
- [x] 사용자 실행 테스트
- [x] ChatGPT 코드 검수
- [x] 승인 후 main 반영

### 해당 단계에서 구현하지 않을 항목

- 실제 자동 공격
- 피해량 계산
- 승리·패배 처리
- 보상 및 몬스터 재생성

자동 검사와 브라우저 상호작용 확인, 사용자 실행 테스트, ChatGPT 코드 검수, `main` 반영이 모두 완료되어 4단계를 `completed`로 확정했다. 실제 자동전투는 아직 구현하지 않았으며 5단계는 `not_started`로 유지한다.

## 5단계: 기본 자동전투

### 단계 상태

`completed` — 사용자 실행 테스트·ChatGPT 코드 검수·main 반영 완료

### 목표

전투 화면에서 플레이어와 몬스터가 정해진 규칙에 따라 자동으로 공격하도록 한다.

### 주요 구현 항목

- [x] `RUNNING` / `STOPPED_PENDING_RESULT` 전투 상태
- [x] 플레이어와 몬스터 독립 공격 주기
- [x] 고정 피해량 계산
- [x] 플레이어와 몬스터 HP 텍스트·HP 바
- [x] 최근 공격 기록 제한 표시

### 완료 조건

- [x] 전투 상태 구현
- [x] 플레이어 자동 공격
- [x] 몬스터 자동 공격
- [x] delta 기반 공격 주기
- [x] 고정 피해량 처리
- [x] HP 0 미만 방지
- [x] HP 텍스트 실시간 갱신
- [x] HP 바 실시간 갱신
- [x] 최근 공격 기록 표시
- [x] HP 0에서 공격 중단
- [x] Return to Field 유지
- [x] TypeScript 검사
- [x] 빌드 검사
- [x] 사용자 실행 테스트
- [x] ChatGPT 코드 검수
- [x] 승인 후 main 반영

### 해당 단계에서 구현하지 않을 항목

- 승리·패배 후속 처리
- 보상 지급
- 몬스터 재생성
- 레벨·경험치·아이템

자동 검사와 브라우저 상호작용 확인, 사용자 실행 테스트, ChatGPT 코드 검수, `main` 반영이 모두 완료되어 5단계를 `completed`로 확정했다. 6단계 작업에서 필드 상단 안내 문구를 현재 단계에 맞게 수정했다.

## 6단계: 승리·패배, 보상, 몬스터 재생성

### 단계 상태

`completed` — 사용자 실행 테스트·ChatGPT 코드 검수·main 반영 완료

### 목표

전투 결과를 처리하고 승리 보상과 패배 결과를 제공하며 필드의 몬스터를 다시 생성한다.

### 주요 구현 항목

- [x] `RUNNING` / `VICTORY` / `DEFEAT` 전투 상태
- [x] 같은 프레임에서 플레이어 공격 우선 및 결과 확정 guard
- [x] 승리·패배 결과 화면과 Return to Field
- [x] Slime별 Gold 보상과 승리 1회 지급
- [x] 패배 시 무보상 및 몬스터 유지
- [x] 처치 몬스터 숨김과 3초 후 동일 위치 재생성
- [x] 필드 Gold 누적 및 선택·자동진입 상태 정리
- [x] 필드 상단 단계 안내를 Stage 6으로 수정

### 완료 조건

- [x] 승리와 패배가 정확히 구분된다.
- [x] 승리 시 보상이 한 번만 지급된다.
- [x] 패배 시 Gold 없이 몬스터가 유지된다.
- [x] 처치된 몬스터가 3초 후 같은 위치에 재생성된다.
- [x] 결과 처리가 중복되지 않는다.
- [x] `npm ci`, TypeScript 검사, 빌드가 통과한다.
- [x] 브라우저 자동 검사에서 승리·패배·보상·재생성을 확인한다.
- [x] 사용자 수동 실행 테스트
- [x] ChatGPT 코드 검수
- [x] 승인 후 `main` 반영

### 해당 단계에서 구현하지 않을 항목

- 복잡한 성장 트리
- 장비·인벤토리 시스템
- 장기 방치 진행
- 온라인 동기화

## 7단계: 10대10 RTS 핵심 전투

### 단계 상태

`completed` — 코드 검수 승인, 사용자 실행 테스트 통과, no-ff 병합 완료. 작업 브랜치: `main`, 승인 태그: `review-stage-07-v7`

### 목표

선택한 월드맵 몬스터 종류를 적군 10마리로 연결하고, 시험용 아군 10마리가 수동 명령과 적군 AI로 교전하는 소규모 부대 RTS 핵심 흐름을 제공한다.

### 주요 구현 항목

- [x] 선택한 월드맵 몬스터와 동일한 적군 10마리 생성
- [x] 주인공 1명과 시험용 용병 9명 생성
- [x] 주인공 역할과 슬롯 위치 분리
- [x] 하단 1~0 슬롯 10개와 유닛명·상태·HP 표시
- [x] 아군 단일 선택 및 드래그 다중 선택
- [x] 우클릭 이동과 다중 유닛 대형 배치
- [x] 적 우클릭 공격 명령과 사거리 접근
- [x] 적군 자동 AI의 가장 가까운 아군 탐색·추격·공격
- [x] 다수 유닛 HP·사망·선택 해제
- [x] 아군 전멸 DEFEAT 및 적군 전멸 VICTORY
- [x] 기존 Gold 1회 지급과 월드맵 제거·3초 재생성 연결

### 완료 조건

- [x] 선택한 몬스터 종류가 전투 적군에 정확히 연결된다.
- [x] 적군 10마리와 아군 시험 편성 10마리가 생성된다.
- [x] 단일 선택·드래그 다중 선택·우클릭 이동·공격이 동작한다.
- [x] 적군 AI와 사거리 기반 공격이 동작한다.
- [x] 유닛 사망과 전멸 승패가 처리된다.
- [x] Gold는 적 개체별이 아니라 전투당 한 번 지급된다.
- [x] Return to Field와 기존 몬스터 제거·재생성이 유지된다.
- [x] TypeScript 검사와 빌드가 통과한다.
- [x] 브라우저 자동 확인이 통과한다.
- [x] 사용자 실행 테스트
- [x] ChatGPT 코드 검수
- [x] 승인 후 `main` 반영

### 해당 단계에서 구현하지 않을 항목

- 자동사냥 ON/OFF
- 실제 스킬과 스킬 UI
- 상점·용병 구매
- 편성 재배치와 주인공 슬롯 이동
- 부대 지정·단축키
- 경험치·레벨·능력치·아이템·저장·온라인 기능

## 8단계: 자동사냥 ON/OFF와 수동 명령 우선 처리

### 단계 상태

`completed` — `review-stage-08-v3` 승인 및 `main` no-ff 병합 완료. 완료 태그: `stage-08-completed`

### 목표

자동사냥과 사용자의 수동 명령 우선순위를 연결한다.

### 주요 구현 항목

- [x] 전투 화면의 Auto Hunt ON/OFF 버튼과 세션 상태 저장
- [x] Auto Hunt ON 상태에서 생존 아군 전체의 전역 적 탐색·자동 전투
- [x] 수동 MOVE 명령이 Auto Hunt보다 우선 처리
- [x] 수동 FOCUS_ATTACK 명령이 Auto Hunt보다 우선 처리
- [x] 수동 명령 종료 후 Auto Hunt ON 상태에서 자동 전투 재개
- [x] Auto Hunt OFF 시 자동 유닛만 해제하고 수동 명령은 보존
- [x] Auto Hunt OFF에서 140px 내 대기 아군의 지역 동료 지원
- [x] MOVE·FOCUS_ATTACK·ATTACK_MOVE·AUTO_HUNT와 기존 유효 LOCAL_ENGAGE 보호
- [x] 지원 대상의 결정적 분산과 지역 교전 종료 후 상태 복귀
- [x] 지원 아군 배정 시 이전 `lastAttackerId`·`lastAttackedAt` 기억 초기화
- [x] 모든 근접 유닛의 추가 attackRange를 8~10px로 조정
- [x] 단일 아군 선택 시 공격 범위 원과 `Melee reach` 정보 표시

### 완료 조건

- [x] 명령 우선순위와 자동사냥 상태가 일관되게 동작한다.
- [x] `npm ci`, TypeScript 검사, 빌드가 통과한다.
- [x] 자동 브라우저 확인에서 초기 OFF, ON 전역 전투, 수동 MOVE 우선, ON/OFF 로그, 치명적 콘솔 오류 없음이 확인된다.
- [x] 실제 피해 직후 지역 동료 지원 코드와 공격 거리 재검사 코드가 확인된다.
- [x] 단일 선택 Hero의 `Melee reach: 10px`와 공격 범위 원을 브라우저에서 확인한다.
- [ ] 필드 왕복 후 전투 재진입 시 Auto Hunt 세션 유지 사용자 테스트
- [x] 지역 동료 지원의 수동 전투 시나리오와 지원 대상 분산
- [x] 지원 대상 사망 후 최초 공격자 강제 재집결 없음 확인
- [x] 모든 축소 근접 사거리와 사거리 밖 피해 방지 수동 테스트
- [x] 10대10 전투의 교착 없는 종료 수동 테스트
- [x] ChatGPT 코드 검수
- [x] 승인 후 `main` 반영

### 해당 단계에서 구현하지 않을 항목

- 스킬·상점·편성 재배치
- 유닛 스킬과 단일 선택 전용 스킬 UI
- 상점·편성 재배치·부대 지정
- 경험치·레벨·아이템·저장·온라인 기능

## 9단계: 유닛 스킬과 단일 선택 전용 스킬 UI

### 단계 상태

`completed` — `review-stage-09-v3` 승인 및 `main` no-ff 병합 완료. 완료 태그: `stage-09-completed`

### 목표

단일 선택 유닛에 한해 실제 스킬과 스킬 UI를 제공한다.

### 주요 구현 항목

- 유닛 정의 기반 스킬 데이터와 `UnitSkillId` 타입
- Skill Mercenary의 `Whirlwind`와 `First Aid` 정의
- 단일 생존 스킬 유닛 선택 시에만 표시되는 Q/W 스킬 UI
- 수동 Q/W 입력, 스킬별·유닛별 전투 쿨다운, 성공 시에만 쿨다운 시작
- Auto Hunt와 MOVE·FOCUS_ATTACK 명령이 스킬을 자동 사용하지 않도록 유지

### 완료 조건

- [x] 유닛 정의에 스킬이 연결되고 Skill Mercenary가 정확한 정의로 생성된다.
- [x] 스킬 보유 생존 유닛 1마리 선택 시에만 Q/W 스킬 UI가 표시된다.
- [x] 다중 선택·스킬 미보유·전투 종료 상태에서는 개별 스킬 UI가 숨겨진다.
- [x] Whirlwind와 First Aid가 수동 입력으로만 사용되고 유효한 성공에만 쿨다운이 적용된다.
- [x] 주둔 지역 자동 방어, guardPosition, MOVE 정규화와 기존 Auto Hunt 우선순위가 유지된다.
- [x] `npm ci`, typecheck, build, dev 확인과 코드 검수가 완료됐다.
- [x] 사용자 전체 수동 테스트는 요청에 따라 `skipped_by_user`로 기록했으며 통과로 간주하지 않는다.
- [x] 승인 후 `main`에 no-ff 방식으로 반영됐다.

### 해당 단계에서 구현하지 않을 항목

- 상점·편성·부대 단축키

## 10단계: 편성, 주인공 필수 참가, 슬롯 재배치

### 단계 상태

`completed` — `review-stage-10-v3` 승인, `main` no-ff 병합 및 `stage-10-completed` 생성 완료

### 목표

전투 편성을 관리하고 주인공 필수 참가와 슬롯 재배치를 지원한다.

### 주요 구현 항목

- 보유 유닛과 전투 슬롯이 분리된 `FormationState`
- 보유 유닛은 정확히 10명으로 유지하고, 실제 슬롯 배치는 1~10명으로 허용
- Hero의 `unitRole`과 `rosterUnitId`를 슬롯 번호와 독립적으로 유지
- Hero 필수 1개 배치와 1~10번 슬롯 이동
- 슬롯 교체, 빈 슬롯 배치, 일반 용병 제거와 Reset Default
- FormationScene의 Apply, Cancel, Reset Default 및 registry 저장
- 역할·Required·Q/W 스킬·Slot/Bench 정체성 표시와 Apply 저장 피드백
- Scene 진입 선택 초기화, 동일 유닛·동일 슬롯 재클릭 토글 취소, 작업 성공 후 선택 자동 해제
- 적용된 FormationState의 FieldScene·BattleScene roster 전달
- 전투 roster의 `slotIndex` 오름차순 정렬
- 빈 슬롯 전투 UI와 잘못된 roster 전투 시작 차단

### 완료 조건

- [x] 보유 유닛과 전투 슬롯이 분리된 `FormationState`로 관리된다.
- [x] 보유 유닛은 정확히 10명이며, 일반 용병 Bench 이동은 보유 목록 삭제가 아니다.
- [x] Hero의 `unitRole`과 `rosterUnitId`가 슬롯 번호와 독립적으로 유지된다.
- [x] Hero가 정확히 1개 배치되고 슬롯 1 고정 없이 1~10번 슬롯으로 이동할 수 있다.
- [x] 슬롯 교체·빈 슬롯 배치·일반 용병 제거·Reset Default가 동작한다.
- [x] FormationScene의 Apply, Cancel, Reset Default와 registry 저장 흐름이 구현됐다.
- [x] 적용된 FormationState가 FieldScene을 거쳐 BattleScene roster로 전달된다.
- [x] 배치 roster가 `slotIndex` 오름차순으로 정렬되어 전달된다.
- [x] Formation 화면에서 역할·Required·Q/W 스킬·Slot/Bench 정보와 Apply 저장 피드백이 표시된다.
- [x] Scene 진입·동일 유닛·동일 슬롯·슬롯 작업·편성 제외 후 선택 상태가 요구대로 초기화·해제된다.
- [x] 비어 있는 슬롯은 전투 하단 UI에 EMPTY로 표시되고 잘못된 roster는 전투를 시작하지 않는다.
- [x] `npm ci`, typecheck, build, dev 확인과 브라우저 UI 검증을 완료했다.
- [x] ChatGPT 코드 검수 승인, 사용자 통합 테스트 통과, `main` no-ff 병합과 완료 태그 생성을 완료했다.

### 해당 단계에서 구현하지 않을 항목

- 상점 구매·부대 단축키

## 11단계: 상점·용병 구매 기능

### 단계 상태

`completed` — `review-stage-11-v1` 승인, `main` no-ff 병합 및 `stage-11-completed` 생성 완료

### 목표

Gold를 사용해 시험용이 아닌 용병을 구매하고, 구매한 용병을 보유 목록과 실제 전투 편성에 연결한다.

### 주요 구현 항목

- registry 기반 Gold 세션 상태와 전투 보상 연결
- Swordsman·Guardian·Scout 고정 상품 목록과 능력치 정의
- 가격·잔액 검증, 한 번만 구매 가능한 동기식 원자 구매
- 구매 용병의 `ownedUnits` 추가와 최대 13명 검증
- 구매 직후 Bench 유지와 Reset Default 시 구매 유닛 보존
- ShopScene, FieldScene Shop 버튼, Gold·Owned 상태 표시
- 최대 13명 FormationScene 표시와 배치 roster 연동

### 완료 조건

- [x] 초기 Gold가 0이고 손상된 registry 값이 안전하게 복구된다.
- [x] 세 상품 구매와 Gold 차감이 중복 없이 원자적으로 반영된다.
- [x] 기본 10명과 구매 유닛 최대 3명이 검증되며 임의·중복 데이터가 거부된다.
- [x] 구매 직후 유닛이 Bench에 남고 슬롯은 자동 변경되지 않는다.
- [x] Reset Default가 구매 유닛을 삭제하지 않고 초기 슬롯만 복원한다.
- [x] 배치된 구매 유닛은 최대 10명 전투 roster에 정의 능력치로 참가한다.
- [x] `npm ci`, typecheck, build, dev 및 가능한 브라우저 검증을 완료한다.
- [x] 사용자 수동 테스트는 요청에 따라 생략했음을 정확히 기록한다.
- [x] ChatGPT 코드 검수 승인과 `main` 반영 및 완료 태그 생성을 완료한다.

### 해당 단계에서 구현하지 않을 항목

- 반복 구매·판매·환불·재고 갱신·랜덤 상품
- 경험치·레벨·아이템·인벤토리·저장·온라인 기능
- 부대 지정·단축키 설정과 12단계 기능

## 12단계: 부대 지정과 단축키 설정

### 단계 상태

`completed` — `review-stage-12-v5` 승인 및 `stage-12-completed` 생성, `main` 반영 완료

### 목표

선택 유닛을 부대로 저장하고 단축키로 호출한다.

### 주요 구현 항목

- Ctrl+1~0으로 생존한 선택 아군을 10개 부대에 저장하고 기존 그룹을 교체
- 1~0으로 현재 전투의 생존 아군만 호출하고 선택 UI를 갱신
- 부대 멤버를 `slotIndex`와 `battleUnitId`로 결정적으로 정렬하고 조회 결과에서 중복·사망·오래된 ID를 제외
- 전투 시작 시 Registry의 그룹을 로드하고 유닛 사망 시 persistent 원본에서 제거하지 않음
- 숫자 그룹 키와 Whirlwind·First Aid 키를 registry에 저장하는 KeySettingsScene 추가
- 동일 종류 키 충돌 교환, 잘못된 키·반복 입력·Escape 취소와 draft 저장/취소/기본값 복원
- FieldScene Keys 진입, BattleScene 동적 도움말·그룹 목록·동적 스킬 키 표시
- Auto Hunt OFF는 고정 guardPosition 기준 140px 최초 감지와 180px LOCAL_ENGAGE 재탐색을 사용
- 지역 교전 종료 시 guardPosition으로 자동 귀환하지 않고 현재 위치에서 정지
- 사용자 MOVE 완료와 Auto Hunt OFF 전환에서만 guardPosition을 갱신

### 완료 조건

- [x] v3 부대 지속·키 바인딩 순수 로직 검사 25개가 통과한다.
- [x] v4 guard anchor 거리·유효성 순수 검사 10개가 통과한다.
- [x] Ctrl 저장과 숫자 호출은 RUNNING·수식어·반복 입력 규칙을 지킨다.
- [x] recall/UI는 생존·편성 ALLY만 사용하고, 사망·오래된 ID는 persistent 원본에서 삭제하지 않는다.
- [x] 부대 데이터는 session Registry에 유지되며 새 전투에서도 10개 구성을 로드한다.
- [x] 사용자 지정 키가 유효성·고유성 검증을 통과하고 충돌 시 같은 종류 설정을 교환한다.
- [x] KeySettingsScene draft와 Apply·Cancel·Reset Defaults 동작을 구현한다.
- [x] FieldScene과 BattleScene UI에 실제 키가 표시되고 기존 하단 슬롯·스킬 패널과 겹치지 않는다.
- [x] 부대 상태 UI는 `RTS_ARENA_BOUNDS` 밖의 좌측 하단 소형 5×2 표시이며 선택 정보·하단 슬롯·Skill 패널과 겹치지 않는다.
- [x] 정식 부대 이름은 Group 1~Group 10이고, 실제 호출키는 1~9·0이며 Group 10의 기본키는 0이다.
- [x] `CONTROL_GROUPS_REGISTRY_KEY`에 10개 부대를 `rosterUnitId` 기준으로 깊은 복사 저장·로드한다.
- [x] BattleScene마다 부대 구성을 초기화하지 않고, 현재 편성된 생존 유닛만 호출한다.
- [x] 사망·Bench 유닛은 부대 원본에 유지하고, UI는 생존/저장 총원으로 표시한다.
- [x] Bench 유닛의 일반 용병 슬롯 직접 대체 시 기존 부대 지정을 새 유닛에게 승계한다.
- [x] 승리·패배·Field·Formation·Shop 이동 후 부대 구성을 유지한다.
- [x] Auto Hunt OFF 최초 감지는 guardPosition 기준 140px, LOCAL_ENGAGE 재탐색은 guardPosition 기준 180px이다.
- [x] 지역 교전 종료 후 guardPosition으로 자동 이동하지 않고 현재 위치에서 IDLE 상태로 멈춘다.
- [x] MOVE 성공 완료와 Auto Hunt OFF 전환에서만 guardPosition을 갱신한다.
- [x] 새로고침 이후 영구 저장은 구현하지 않는다.
- [x] `npm ci`, typecheck, build, dev 및 제한된 브라우저 자동 확인을 완료한다.
- [x] 사용자 통합 테스트를 실행하고 통과한다.
- [x] ChatGPT 코드 검수를 승인받고 `main`에 반영한다.

### 해당 단계에서 구현하지 않을 항목

- 경험치·레벨·능력치 성장과 13단계 기능
- 반복 구매·판매·환불, 인벤토리·저장·온라인 기능

## 13단계: 경험치, 레벨, 능력치 성장

### 단계 상태

`completed` — `review-stage-13-v1` 승인, `main` 반영 완료, `stage-13-completed` 태그 생성

### 목표

전투 결과를 기반으로 경험치와 레벨을 관리하고 플레이어 능력치가 성장하도록 한다.

### 주요 구현 항목

- 경험치 획득
- 레벨업 조건과 처리
- 능력치 성장 규칙
- 성장 정보 표시
- 레벨업 경계값 검증
- 직접 처치 경험치와 적 사망 중복 지급 방지
- 전투 전체 직접 경험치 합계 기반 생존 출전 유닛 보너스
- `rosterUnitId` 기준 세션 성장 상태 유지
- Formation·Battle·Field 성장 정보 표시

### 완료 조건

- [x] 전투 보상으로 직접 처치·종료 보너스 경험치가 누적된다.
- [x] 조건 충족 시 여러 레벨을 연속으로 상승한다.
- [x] 레벨 상승에 따라 최대 HP와 공격력이 기본 능력치에서 계산된다.
- [x] 성장 상태가 Formation·Battle·Field 및 전투 간 흐름에서 `rosterUnitId` 기준으로 유지된다.
- [x] 적 사망·전투 종료 중복 호출에서 경험치 중복 지급을 방지한다.
- [x] 새 구매 유닛은 Lv.1·EXP 0으로 시작하고 Bench 유닛은 전투 경험치를 받지 않는다.
- [x] `npm ci`, typecheck, build 및 개발 서버 응답을 확인한다.
- [x] 사용자 수동 통합 테스트는 사용자 요청으로 생략하고 `skipped_by_user`로 기록한다. 통과로 기록하지 않는다.
- [x] ChatGPT 코드 검수를 승인받고 `main`에 반영한다.

### 해당 단계에서 구현하지 않을 항목

- 아이템 드롭 및 장비
- 인벤토리 정렬·사용
- 서버 저장
- 멀티플레이어 기능

## 14단계: 아이템, 인벤토리, 장비

### 단계 상태

`completed` — `review-stage-14-v2` 승인 및 `main` no-ff 반영 완료, `review-stage-14-v1`은 수정 요청 이력으로 보존

### 목표

아이템을 획득하고 인벤토리에서 관리하며 장비를 장착해 유닛 상태와 전투에 반영한다.

### 주요 구현 항목

- ItemDefinition·개별 ItemInstance·무제한 세션 인벤토리
- weapon·armor·accessory 슬롯 정의, melee/ranged/magic 호환, COMMON/UNIQUE 제한
- Slime별 독립 드롭 판정과 패배 후 유지
- InventoryScene 장착·해제와 Bench 포함 rosterUnitId 장비 유지
- attack·defense·maxHp modifier와 방어력 물리 피해 감소

### 완료 조건

- [x] 아이템이 정의된 규칙에 따라 적 사망 시 즉시 획득된다.
- [x] 인벤토리에서 개별 아이템을 확인하고 장착·해제할 수 있다.
- [x] 무기 호환·고유 장비 제한·인스턴스 이중 장착을 검사한다.
- [x] 장비 효과와 표시 능력치·방어력 피해 감소가 연결된다.
- [x] typecheck와 build가 통과한다.
- [ ] 사용자 수동 테스트 — 사용자 요청으로 생략 (`skipped_by_user`)
- [ ] ChatGPT 코드 검수 및 `main` 반영

### 해당 단계에서 구현하지 않을 항목

- 자동사냥 중 장기 방치 보정
- 계정·로그인 시스템
- 온라인 거래 및 서버 기능
- 확정되지 않은 기술 스택 도입

## 15단계: 저장과 오프라인 진행

### 단계 상태

`completed` — `review-stage-15-v3` 승인, `main` 반영 및 `stage-15-completed` 생성 완료

### 목표

게임의 자동사냥 흐름과 저장 기능을 연결하고 게임을 실행하지 않는 동안의 방치 진행을 지원한다.

### 주요 구현 항목

- Repeat Hunt 대상 선택·ON/OFF와 Battle Auto Hunt 연동
- localStorage primary/backup/temp/recovery 안전 저장과 checksum
- BootstrapScene 자동 복원 및 SaveEnvelope schemaVersion 1
- 최소 60초·최대 8시간 방치 시간과 대상별 cycle
- 방치 Gold·출전 유닛 EXP·결정적 아이템 보상
- SaveDataScene 수동 저장·5초 이중 확인 초기화·상태 표시

### 완료 조건

- Repeat Hunt가 실제 승리한 대상만 반복하고 Defeat·메뉴·Battle Auto Hunt OFF에서 중단된다.
- 허용 목록 핵심 진행 상태가 저장되고 Bootstrap에서 복원된다.
- 미실행 시간에 대한 Gold·EXP·아이템 정산이 결정적으로 계산되고 중복 지급되지 않는다.
- 손상·백업·temp·미래 버전 저장 데이터가 안전하게 처리된다.
- typecheck, build, 개발 서버 응답을 확인한다.
- 사용자 수동 테스트는 `skipped_by_user`로 기록하고 통과로 기록하지 않는다.

### 해당 단계에서 구현하지 않을 항목

- 온라인 계정 동기화
- 실시간 멀티플레이어
- 결제 및 운영 기능
- 최종 확장 구조 외의 대규모 리팩터링

## 16단계: 성능 및 안정화

### 단계 상태

`review_pending`

### 목표

1~15단계 게임 흐름을 회귀 검증하고 런타임 상태·저장·씬 수명주기·UI 갱신 비용을 안정화한다.

### 주요 구현 항목

- Node `node:test` 기반 순수 로직 회귀 테스트
- `StorageLike`·시계 주입과 quota-safe primary/backup/temp 저장
- 런타임 상태 검증·경계 복구와 최근 오류 기록
- 멱등 autosave disposer, scene timer/listener cleanup
- Field/Battle UI dirty/throttle, diagnostics overlay, favicon

### 완료 조건

- 1~15단계 핵심 로직의 자동 회귀 테스트가 통과한다.
- 주요 오류와 데이터 손상 위험이 경계에서 복구된다.
- 실행·저장·복원 흐름의 typecheck/test/build가 통과한다.
- 성능·안정화 감사와 아키텍처 경계가 문서화된다.
- 사용자 수동 테스트와 ChatGPT 검수는 승인 전까지 미완료로 기록된다.

### 해당 단계에서 구현하지 않을 항목

- 검증되지 않은 신규 대규모 게임 기능
- 사용자가 요청하지 않은 서비스 출시
- 17단계 온라인 확장의 실제 구현 또는 운영 전환
- 문서화되지 않은 외부 시스템 연동

## 17단계: 온라인 확장 준비

### 단계 상태

`not_started`

### 목표

온라인 확장을 위한 경계와 준비 사항을 정리한다.

### 주요 구현 항목

- 온라인 확장 경계 문서화
- 서버 연동 후보와 데이터 경계 정리
- 멀티플레이어 확장 위험 점검

### 완료 조건

- 온라인 확장 시 필요한 경계와 위험이 문서화된다.

### 해당 단계에서 구현하지 않을 항목

- 사용자가 요청하지 않은 실제 온라인 서비스 운영
