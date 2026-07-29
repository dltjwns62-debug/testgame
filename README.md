# Test Game

## Stage 14 review submission

14단계 **아이템·인벤토리·장비**의 v1 검수 지적을 반영해 `stage-14-items-inventory-equipment`에서 수정하고 `review-stage-14-v2`로 재제출한다. 현재 상태는 `review_pending`이며 `main`에는 병합하지 않았다. 사용자 수동 테스트는 요청하지 않아 `skipped_by_user`로 기록하며 통과로 간주하지 않는다.

장비는 weapon·armor·accessory 중앙 슬롯 정의와 개별 ItemInstance로 관리한다. 몬스터 사망 즉시 독립 드롭 판정을 수행하고, 공용 인벤토리·유닛별 장착 상태·무기 호환·고유 장비 제한·최종 공격력/방어력/최대 HP·방어력 피해 감소를 구현했다. 15단계 저장·오프라인 진행과 브라우저 새로고침 영구 저장은 구현하지 않는다.

## Stage 13 final approval and main integration

13단계 **경험치·레벨·능력치 성장**의 승인 검수 태그 `review-stage-13-v1`과 승인 커밋 `7add577d16d005087d16c23665804f6d3150c616`을 확인하고 `main`에 no-ff 병합했다. 현재 상태는 `completed`이며 완료 태그는 `stage-13-completed`이다. 사용자 수동 테스트는 실행하지 않아 `skipped_by_user`로 유지하며 통과로 기록하지 않는다.

성장 상태는 `rosterUnitId` 기준으로 현재 세션의 Formation registry에 유지한다. 직접 처치 경험치와 전투 종료 보너스, 레벨별 최대 HP·공격력 계산, Formation·Battle·Field 성장 정보 표시를 구현했다. 브라우저 새로고침 영구 저장과 14단계 아이템·인벤토리·장비는 아직 구현하지 않는다.

## Stage 12 final approval and main integration

12단계 **부대 지정과 단축키 설정**의 `review-stage-12-v5`가 ChatGPT 정적 검수와 사용자 통합 실행 테스트를 통과해 `main`에 no-ff 병합됐다. 현재 상태는 `completed`이며 완료 태그는 `stage-12-completed`이다. 승인 검수 태그는 `review-stage-12-v5`다.

부대 구성은 `CONTROL_GROUPS_REGISTRY_KEY` registry에 `rosterUnitId` 기준으로 저장해 같은 게임 세션의 여러 BattleScene·Field·Formation·Shop 이동 사이에서 유지한다. 전투 사망과 Bench 상태는 부대 원본을 삭제하지 않으며, recall과 UI 인원수는 현재 생존·편성 유닛만 조회한다. Bench 유닛이 배치된 일반 용병 슬롯을 직접 대체하면 Apply 시 기존 부대 지정을 새 유닛이 승계한다.

Auto Hunt OFF의 지역 방어는 각 유닛의 고정 `guardPosition`을 탐색 기준점으로 사용한다. 최초 감지는 140px, LOCAL_ENGAGE 재탐색과 추적 제한은 180px이며, 전투가 끝나도 유닛을 guardPosition으로 자동 귀환시키지 않는다. 적이 없으면 현재 위치에서 멈춘다.

자동 검사와 코드 조사를 실행했고, M8/M9 비귀환·타깃 상실 후 재탐색·현재 위치 정지·다음 전투 부대 지속을 포함한 사용자 통합 테스트를 통과했다. ChatGPT 정적 코드 검수도 승인됐다.

## Stage 11 final approval history

11단계 **상점·용병 구매 기능**이 정적 코드 검수를 승인받아 `main`에 no-ff 병합됐다. 승인 검수 태그는 `review-stage-11-v1`, 완료 태그는 `stage-11-completed`다. 이 내용은 이전 단계의 승인 이력이다.

11단계에서는 전투 Gold를 registry 세션 상태로 유지하고, ShopScene에서 Swordsman·Guardian·Scout을 한 번씩 구매하며, 구매한 용병을 Formation의 Bench에 추가하고 최대 10명까지 전투에 배치할 수 있다. 사용자 수동 테스트는 사용자 요청에 따라 생략했으며 통과로 기록하지 않는다. ChatGPT 정적 코드 검수는 승인됐다.

상점·구매 기능은 `main`에 반영됐지만, 12단계 부대 지정·단축키 기능, 경험치·레벨·아이템·저장·온라인 기능은 구현하지 않았다.

## Stage 10 v3 final approval

10단계 v3가 정적 코드 검수와 사용자가 직접 확인한 통합 테스트를 통과해 `main`에 no-ff 병합됐다. 현재 안정 버전은 `main`이며 완료 태그는 `stage-10-completed`다. 다음 예정 단계는 11단계 상점·용병 구매 기능이고, 별도 시작 명령 전까지 구현하지 않는다.

## Stage 10 v3 approval history

10단계 v2 사용자 테스트에서 발견된 FormationScene 선택 상태 잔존 문제를 수정했다. Scene 진입 시 선택을 초기화하고, 같은 유닛·같은 슬롯 재클릭은 선택을 취소하며, 슬롯 이동·교환·일반 용병 편성 제외가 끝나면 선택을 자동 해제한다.

v2 사용자 테스트 결과는 `failed`로 보존하고, v3는 `review-stage-10-v3`로 승인됐다. v1·v2 태그와 수정 요청 이력은 보존하며, 10단계는 `main`에 반영 완료됐다. 11단계 상점·용병 구매 기능은 구현하지 않았다.

## Stage 10 v2 resubmission history

10단계 v1 정적 코드 검수에서 수정 요청된 보유 유닛 검증, roster 정렬, 편성 정보 표시와 저장 안내를 보완했다. `ownedUnits`는 정확히 10명을 보유하고, 실제 슬롯 배치는 1~10명을 허용한다. Bench는 보유 유닛 삭제가 아니며, 전투 roster는 `slotIndex` 오름차순으로 전달된다.

v3 제출 전의 v2 기록은 `review-stage-10-v2` 및 `changes_requested`로 보존한다. v1 태그와 수정 요청 이력도 보존하며, 10단계는 아직 `main`에 병합하지 않았고, 11단계 상점·용병 구매 기능은 구현하지 않았다.

## Stage 9 v3 resubmission

v3 replaces threat-request-based ally assistance with per-unit local guard defense. Every ally owns an independent `guardPosition`; Auto Hunt OFF detects enemies within `RTS_GUARD_AGGRO_RANGE` and stops pursuit beyond `RTS_GUARD_LEASH_RANGE`. Completed MOVE commands update the guard position, while malformed MOVE states preserve the previous guard position.

## Stage 9 v2 resubmission history

The v1 user test found that ally assistance was checked only from `applyDamage()` and that completed MOVE commands could remain active. v2 records both real damage and nearby enemy pursuit as `AllyAssistThreat` entries, remembers them for 2500ms, and continuously evaluates eligible allies within `RTS_ALLY_ASSIST_RANGE`.

Only an actually active MOVE command keeps priority over assistance. Completed or malformed MOVE commands are normalized to `NONE` or `AUTO_HUNT`; `FOCUS_ATTACK`, `AUTO_HUNT`, existing engagements, and distant targets remain protected. The v1 tag is preserved and this work is submitted as `review-stage-09-v2` on the stage branch.

## 프로젝트 개요

- 프로젝트 이름: Test Game
- 장르: 자동사냥 방치형 웹게임
- 전체 개발 단계: 17단계
- 현재 단계: 14단계
- 현재 단계 이름: 아이템·인벤토리·장비
- 현재 상태: 검수 대기 (`review_pending`)
- 현재 작업 브랜치: `stage-14-items-inventory-equipment`
- 검수 태그: `review-stage-14-v2`
- 완료 태그: 없음 (검수 대기)
- 완료된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계, 12단계, 13단계
- 다음 단계: 15단계 — 저장과 오프라인 진행

7단계 10대10 RTS 핵심 전투와 8단계 Auto Hunt·지역 동료 지원 기능은 검수와 사용자 실행 테스트를 통과해 `main`에 반영됐다.

9단계부터 11단계까지 `main`에 반영되어 완료됐다. 10단계에서는 보유 유닛과 전투 슬롯을 분리한 FormationState를 구현했고, 11단계에서는 registry Gold, ShopScene, 세 상품 구매, 최대 13명 보유와 전투 roster 연결을 구현했다.

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

12단계에서는 부대 지정과 단축키 설정을 완료했고, 13단계에서는 경험치·레벨·능력치 성장을 완료했다. 14단계에서는 아이템·인벤토리·장비를 검수 제출했으며, 브라우저 새로고침 이후 영구 저장은 15단계에서 다룬다.

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

1단계부터 13단계까지는 `main`에 반영되어 완료됐다. 14단계는 작업 브랜치에서 검수 대기 중이며, 다음 예정 단계는 15단계다.
