# Test Game

## Stage 10 v2 resubmission

10단계 v1 정적 코드 검수에서 수정 요청된 보유 유닛 검증, roster 정렬, 편성 정보 표시와 저장 안내를 보완했다. `ownedUnits`는 정확히 10명을 보유하고, 실제 슬롯 배치는 1~10명을 허용한다. Bench는 보유 유닛 삭제가 아니며, 전투 roster는 `slotIndex` 오름차순으로 전달된다.

현재 제출은 `review-stage-10-v2`이며 상태는 `review_pending`이다. v1 태그와 수정 요청 이력은 보존한다. 10단계는 아직 `main`에 병합하지 않았고, 11단계 상점·용병 구매 기능은 구현하지 않았다.

## Stage 9 v3 resubmission

v3 replaces threat-request-based ally assistance with per-unit local guard defense. Every ally owns an independent `guardPosition`; Auto Hunt OFF detects enemies within `RTS_GUARD_AGGRO_RANGE` and stops pursuit beyond `RTS_GUARD_LEASH_RANGE`. Completed MOVE commands update the guard position, while malformed MOVE states preserve the previous guard position.

## Stage 9 v2 resubmission history

The v1 user test found that ally assistance was checked only from `applyDamage()` and that completed MOVE commands could remain active. v2 records both real damage and nearby enemy pursuit as `AllyAssistThreat` entries, remembers them for 2500ms, and continuously evaluates eligible allies within `RTS_ALLY_ASSIST_RANGE`.

Only an actually active MOVE command keeps priority over assistance. Completed or malformed MOVE commands are normalized to `NONE` or `AUTO_HUNT`; `FOCUS_ATTACK`, `AUTO_HUNT`, existing engagements, and distant targets remain protected. The v1 tag is preserved and this work is submitted as `review-stage-09-v2` on the stage branch.

## 프로젝트 개요

- 프로젝트 이름: Test Game
- 장르: 자동사냥 방치형 웹게임
- 전체 개발 단계: 17단계
- 현재 단계: 10단계
- 현재 단계 이름: 편성·슬롯 재배치와 주인공 필수 편성
- 현재 상태: 검수 대기 (`review_pending`)
- 현재 작업 브랜치: `stage-10-formation-roster`
- 검수 태그: `review-stage-10-v2`
- 완료된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계
- 다음 단계: 11단계 — 상점·용병 구매 기능

7단계 10대10 RTS 핵심 전투와 8단계 Auto Hunt·지역 동료 지원 기능은 검수와 사용자 실행 테스트를 통과해 `main`에 반영됐다.

9단계는 `main`에 반영되어 완료됐다. 10단계에서는 보유 유닛 10명과 전투 슬롯을 분리한 FormationState, FormationScene, Hero 필수 편성, 슬롯 교체·제거·초기화, 역할·Required·Q/W 스킬 표시, 전투 roster 정렬 및 전달을 구현하고 v2 검수 대기 중이다. 11단계 상점·용병 구매 기능은 아직 시작하지 않았다.

프로젝트는 필드에서 몬스터를 선택하고 접근한 뒤 전투를 진행하는 자동사냥 방치형 웹게임을 단계적으로 개발한다. 7단계부터는 거상온라인식 소규모 부대 RTS 방향으로 확장하며, 로드맵은 총 17단계로 관리한다.

## 7단계 구현 범위

- 선택한 월드맵 몬스터 종류와 동일한 적군 10마리 생성
- 주인공 1명과 시험용 용병 9명으로 아군 10마리 생성
- 주인공 정체성과 슬롯 위치 분리
- 하단 1~0 슬롯 10개와 유닛 상태·HP 표시
- 아군 단일 선택 및 전장 드래그 다중 선택
- 빈 전장 우클릭 이동과 대형 목표 위치
- 적 우클릭 공격 명령과 사거리 접근
- 적군의 가장 가까운 아군 탐색·추격·공격 AI
- HP 감소·사망·선택 해제·전멸 승패
- 기존 Gold 1회 지급·월드맵 몬스터 제거·3초 재생성 연결

자동사냥, 실제 스킬, 상점, 용병 구매, 편성 재배치, 부대 단축키, 경험치·레벨·아이템·저장·온라인 기능은 이번 단계에서 구현하지 않았다.

## 알려진 문제

- `favicon.ico`가 없어 브라우저 콘솔에 비차단 404가 표시될 수 있다.
- 게임 기능에는 영향이 없으며, 수정이 필요하면 다음 작업 브랜치에서 별도 검수한다.

## 문서

- [개발 로드맵](docs/ROADMAP.md)
- [현재 개발 상태](docs/STATUS.md)
- [프로젝트 결정 사항](docs/DECISIONS.md)
- [변경 이력](docs/CHANGELOG.md)
- [실행 및 테스트](docs/TESTING.md)

## 기술 및 실행

현재 사용 중인 기술은 Phaser, TypeScript, Vite이며 패키지는 npm으로 관리한다. Node.js `20.19.0 이상 또는 22.12.0 이상`이 필요하다.

```bash
node --version
npm --version
npm ci
npm run dev
```

검증 명령:

```bash
npm run typecheck
npm run build
```

7단계부터 9단계까지는 `main`에 반영됐다. 10단계 v2 자동 검사와 브라우저 확인은 완료했지만 사용자 수동 테스트와 ChatGPT 코드 검수는 아직 미실시다. 다음 예정 단계는 11단계이며, 10단계 승인 전에는 시작하지 않는다.
