# 개발 AI 작업 규칙

Stage 17 scope note: the submitted v5 work is limited to online protocol v1 contracts, server-authoritative conflict boundaries, local OnlinePlayerSnapshot and DTO validation, Disabled/Mock gateways, operation idempotency and record-based pending queue with retry/backoff/rejection preservation, revision-guarded sync coordinator lifecycle and cancellation, Retry-After propagation, gateway response protocol validation, OpenAPI/TypeScript request-response alignment, Online Status UI lifecycle documentation, threat model, and automatic tests. It does not implement a real server, HTTP/WebSocket transport, accounts, OAuth, cloud sync, multiplayer, chat, commerce, deployment, or Stage 18.

Post-roadmap visual/UI pass note: `post-roadmap-visual-ui-pass-1` is a non-numbered follow-up after the completed 17-stage roadmap. `review-visual-ui-pass-1-v4` was approved and merged into `main`, then fixed by the immutable `visual-ui-pass-1-completed` tag; v1, v2, and v3 remain immutable as `changes_requested` records. It is limited to original code-generated visual assets, scene backgrounds, shared UI theme/helpers, readability and visual feedback. It does not change game rules, project completion, totalStages, or implement Stage 18.

Post-roadmap ranged combat pass note: `post-roadmap-ranged-combat-pass-1` is a separate follow-up, not Stage 18. Its v1 submission covers data-driven MELEE/PROJECTILE attack profiles, ARROW/MAGIC_BOLT projectiles, Meteor ground targeting, Arcane Burst, and key migration. It does not add auto-kiting, online services, or alter the completed 17-stage roadmap.

Codex 및 다른 개발 AI는 다음 규칙을 반드시 지킨다.

1. 작업을 시작하기 전에 반드시 `README.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `project-status.json`을 읽는다.
2. 현재 단계와 무관한 기능을 임의로 구현하지 않는다.
3. 한 번의 요청에서는 명시된 작업 범위만 구현한다.
4. 각 단계는 별도의 작업 브랜치에서 수행한다.
5. 검수 전에는 작업 브랜치에만 push한다.
6. 검수 전에는 `main`에 직접 커밋하거나 병합하지 않는다.
7. Codex가 스스로 단계를 `completed`로 변경하지 않는다.
8. 검수 전 작업을 마치면 상태를 `review_pending`으로 기록한다.
9. 수정 요청을 받으면 기존 단계의 작업 브랜치에서 수정한다.
10. 사용자의 명시적인 승인 명령을 받은 뒤에만 `main` 병합과 단계 완료 처리를 한다.
11. 작업을 완료하면 `docs/STATUS.md`, `project-status.json`, `docs/CHANGELOG.md`를 갱신한다.
12. 테스트하지 않은 기능을 완료됐다고 기록하지 않는다.
13. 다음 단계 기능을 미리 구현하지 않는다.
14. 프로젝트 문서와 실제 코드가 서로 모순되지 않게 유지한다.
15. 기존 기능을 삭제하거나 구조를 크게 변경했다면 그 이유를 최종 보고에 남긴다.
16. 강제 push는 하지 않는다.
17. 승인 없이 기존 작업 브랜치를 삭제하지 않는다.
18. 검수 대상 버전은 tracked 파일 내부의 현재 커밋 해시로 관리하지 않는다.
19. 각 검수 제출 시 변경되지 않는 Git 태그를 생성한다.
20. 검수 태그 형식은 `review-stage-XX-vN`을 사용한다.
21. 이미 원격에 존재하는 검수 태그를 이동하거나 덮어쓰지 않는다.
22. 수정 후 다시 검수를 요청할 때는 버전 번호를 올린 새 태그를 생성한다.
23. Codex 최종 보고에는 작업 브랜치의 실제 HEAD 커밋 해시와 검수 태그를 함께 보고한다.
24. 문서에 저장된 태그와 실제 원격 태그가 같은 커밋을 가리키는지 확인한다.
25. RTS 전투 데이터에서 `sourceWorldMonsterId`를 몬스터 정의의 단일 기준으로 사용하며, 알 수 없는 ID를 기본 몬스터로 대체하지 않는다.
26. 대형 좌표 계산은 가장자리에서도 중복·비유한 좌표가 발생하지 않도록 검증하고, 전투 결과는 `RTSBattleResult`를 사용한다.
27. Stage 16 상태 검증은 프레임 루프가 아닌 Bootstrap, 씬 진입, 저장·복구, 전투 결과 같은 경계에서 실행한다.
28. 저장 로직은 `StorageLike`와 주입 가능한 시계를 사용하며, quota/스토리지 실패 시 검증된 primary·backup을 훼손하지 않고 성공으로 기록하지 않는다.
29. 자동 저장과 씬 타이머·이벤트는 멱등적으로 설치하고 shutdown 시 disposer로 정리한다.
30. diagnostics 오버레이는 `?diagnostics=1`에서만 표시하고 게임 규칙을 변경하지 않는다.
31. 온라인 queue는 cap 초과·거부 record를 자동 삭제하거나 조용히 잘라내지 않으며, coordinator dispose 이후 stale callback으로 registry/UI를 갱신하지 않는다.
32. 검수 제출은 현재 버전 태그만 갱신하고 과거 검수 태그와 이력을 보존한다.

## 현재 단계 기준

- 전체 단계: 17단계
- 현재 단계: 17단계 — 온라인 확장 준비
- 현재 단계 상태: 완료 (`completed`)
- 현재 작업 브랜치: `main`
- 1단계 승인 태그: `review-stage-01-v1`
- 2단계 최초 검수 태그: `review-stage-02-v1` — 수정 요청
- 2단계 승인 태그: `review-stage-02-v2`
- 3단계 검수 태그: `review-stage-03-v1`
- 3단계 완료 태그: `stage-03-completed`
- 4단계 검수 태그: `review-stage-04-v1`
- 4단계 완료 태그: `stage-04-completed`
- 5단계 검수 태그: `review-stage-05-v1`
- 5단계 완료 태그: `stage-05-completed`
- 6단계 최초 검수 태그: `review-stage-06-v1` — 수정 요청
- 6단계 현재 검수 태그: `review-stage-06-v2`
- 6단계 완료 태그: `stage-06-completed`
- 7단계 검수 태그: `review-stage-07-v7`
- 7단계 완료 태그: `stage-07-completed`
- 8단계 검수 태그: `review-stage-08-v3` (완료)
- 8단계 완료 태그: `stage-08-completed`
- 9단계 검수 태그: `review-stage-09-v3` (완료)
- 9단계 완료 태그: `stage-09-completed`
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
- 14단계 최초 검수 태그: `review-stage-14-v1` — 수정 요청 (보존)
- 14단계 승인 검수 태그: `review-stage-14-v2`
- 14단계 완료 태그: `stage-14-completed`
- 15단계 검수 태그: `review-stage-15-v3` (완료)
- 15단계 완료 태그: `stage-15-completed`
- 16단계 최초 검수 태그: `review-stage-16-v1` — 수정 요청
- 16단계 v2 검수 태그: `review-stage-16-v2` — 수정 요청
- 16단계 현재 검수 태그: `review-stage-16-v4` (승인)
- 16단계 완료 태그: `stage-16-completed`
- 17단계 최초 검수 태그: `review-stage-17-v1` — 수정 요청
- 17단계 현재 검수 태그: `review-stage-17-v5`
- 17단계 완료 태그: `stage-17-completed`
- 사용자 실행 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- 완료된 단계: 1단계~17단계
- 검수 통과된 단계: 1단계~17단계
- 다음 단계: 없음 — 전체 로드맵의 마지막 단계

완료된 단계는 `main`에 반영된 상태를 기준으로 한다. 1단계부터 17단계까지 완료됐고, 17단계는 `stage-17-completed` 태그로 고정한다. 전체 로드맵의 마지막 단계까지 완료했으므로 다음 단계는 없다.

8단계에서는 BattleScene 내부 Auto Hunt ON/OFF, 수동 명령 우선순위, 지역 동료 지원, 근접 사거리와 선택 공격 범위 표시를 구현했다. 9단계에서는 유닛 정의 기반 Skill Mercenary 스킬과 주둔 지역 자동 방어를 구현했다. 10단계에서는 `FormationState`, 보유 유닛과 1~10명의 배치 roster 분리, FormationScene, Hero 필수 편성, 슬롯 교체·제거·초기화와 선택 상태 제어를 구현했다. 11단계에서는 registry Gold, 고정 상점 3종, 한 번만 구매 가능한 용병, 최대 13명 보유 검증, Bench 보존과 ShopScene을 다뤘다. 12단계에서는 session registry에 유지되는 10개 부대, 사용자 지정 키 설정, BattleScene·FieldScene 연동, 점유된 일반 용병 슬롯 승계, Auto Hunt OFF 고정 기준점 지역 방어와 자동 귀환 제거를 다뤘다. 13단계에서는 rosterUnitId 기반 경험치·레벨·최대 HP·공격력 성장과 전투 종료 경험치 보너스를 구현했다. 14단계에서는 ItemInstance 기반 인벤토리, 장비 슬롯, 드롭, 무기 호환, 방어력 피해 감소와 InventoryScene을 구현했다. 15단계에서는 localStorage 저장·복구, Repeat Hunt와 방치 보상을 구현하며 16단계 안정화는 구현하지 않는다.
