# 현재 개발 상태

## Stage 15 저장과 오프라인 진행 — 완료

- 현재 검수 태그: `review-stage-15-v3`
- 완료 태그: `stage-15-completed`
- 작업 브랜치: `main`
- 전체 단계: 17단계
- 현재 단계: 15단계 — 저장과 오프라인 진행
- 현재 단계 상태: 완료 (`completed`)
- 현재 작업: 15단계 완료 — 16단계 성능 및 안정화 시작 명령 대기 중
- 완료된 단계: 1단계~15단계
- 검수 통과된 단계: 1단계~15단계
- 다음 단계: 16단계 — 성능 및 안정화
- `main` 정식 반영 여부: 반영 완료
- 사용자 실행 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- 승인 검수 커밋: `ca55144de6e6d2f72e941abb9a11b801c175355a`
- 브라우저 자동화: Field·Save Data 화면과 Save Now·새로고침 복원 확인
- 현재 알려진 문제: 기존 `favicon.ico` 404 비차단 경고

### 15단계 구현 요약

- BootstrapScene에서 저장을 먼저 불러오고 정규화한 뒤 FieldScene을 시작한다.
- SaveEnvelope, schemaVersion 1, FNV-1a checksum과 primary/backup/temp/recovery 저장 키를 추가했다.
- Formation, Gold, KeyBinding, Control Group, Inventory, Battle Auto Hunt와 AutoProgress를 허용 목록으로 저장한다.
- Repeat Hunt 대상 선택·승리 해금·전투 자동 복귀·Defeat 중단·메뉴 일시정지를 연결했다.
- 방치 시간은 최소 60초·최대 8시간 cap과 대상별 cycle로 계산하며 Gold·출전 유닛 EXP·아이템을 정산한다.
- 방치 아이템 결과는 saveId·claim sequence·monsterId·cycle index 기반 결정적 난수를 사용하고 100개 cap을 둔다.
- SaveDataScene에서 Save Now, 5초 이중 확인 Reset Save, 저장 상태와 Repeat Hunt 상태를 표시한다.
- 사용자 수동 전투·장시간 방치 통합 테스트는 사용자 요청으로 생략한다.

### 15단계 검증 기록

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- 브라우저 확인: Stage 15 Field, Save Data, Save Now `SAVED`, 새로고침 후 Field 복원 확인
- 사용자 수동 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- `main` 반영: 완료

마지막 갱신: 2026-07-30 16:49 (Asia/Seoul)

### 15단계 승인 반영

- `review-stage-15-v3` 승인 확인
- `main` no-ff 병합 완료
- `stage-15-completed` 생성 완료
- 사용자 수동 테스트: `skipped_by_user`
- 16단계: 시작하지 않음

### v3 검수 수정 요약

- Repeat Hunt ON은 첫 실제 승리 전에도 허용하고, 오프라인 보상은 몬스터별 첫 승리 후에만 해금한다.
- hidden 진입 저장과 pagehide/beforeunload 중복 저장을 분리해 `lastActiveAtMs` 재갱신을 방지한다.
- primary 검증 성공 후 temp 삭제 실패는 저장 성공과 cleanup warning으로 분리한다.
- 오프라인 최소 60초는 `rawElapsedMs` 기준으로 판정한다.
- v3 검수 결과: 승인 (`approved`), `main` 반영 및 `stage-15-completed` 생성 완료.

## Stage 14 아이템·인벤토리·장비 — 완료 (historical)

- 현재 검수 태그: `review-stage-14-v2`
- 작업 브랜치: `main`
- 전체 단계: 17단계
- 현재 단계: 14단계 — 아이템·인벤토리·장비
- 현재 단계 상태: 완료 (`completed`)
- 현재 작업: 14단계 완료 — 15단계 저장과 오프라인 진행 시작 명령 대기 중
- 완료된 단계: 1단계~14단계
- 검수 통과된 단계: 1단계~14단계
- 다음 단계: 15단계 — 저장과 오프라인 진행
- `main` 정식 반영 여부: 반영 완료
- 사용자 실행 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- 브라우저 자동화: 제한된 UI 확인 완료
- 현재 알려진 문제: 기존 `favicon.ico` 404 비차단 경고

### 14단계 구현 요약

- ItemDefinition과 ItemInstance를 분리하고 같은 정의의 장비도 획득 순서가 다른 개별 인스턴스로 보관한다.
- weapon·armor·accessory 중앙 슬롯 정의를 순회해 rosterUnitId별 장비 상태를 관리한다.
- Slime별 독립 드롭표를 적 사망 전환 시점에 한 번만 판정해 즉시 세션 인벤토리에 넣고, 패배 후에도 유지한다.
- melee/ranged/magic 무기 호환과 ALL_UNITS/SPECIFIC_UNITS 고유 장비 제한을 장착 시 검사한다.
- 장비 modifier는 statId 기반으로 합산하며 현재 attack·defense·maxHp를 최종 능력치에 적용한다.
- 기본 공격과 Whirlwind는 대상의 최종 방어력으로 물리 피해 감소 공식을 사용한다.
- InventoryScene, Field Inventory 버튼, Formation·Battle·Field 방어력 표시와 전투 결과 Loot 요약을 추가했다.
- 브라우저 새로고침 영구 저장과 15단계 저장·오프라인 진행은 구현하지 않는다.

### 14단계 검증 기록

- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- InventoryScene 브라우저 확인: Field 버튼, 보유 유닛·장비 슬롯·빈 인벤토리·Back to Field 표시 확인
- v1 수정 사항: Unequip 버튼을 각 중앙 장비 슬롯 카드 내부로 이동하고 실제 FormationState 보유 유닛 검증을 추가했다.
- 사용자 수동 테스트: 사용자 요청으로 생략 (`skipped_by_user`)
- ChatGPT 코드 검수: 승인 (`approved`)
- `main` 반영: no-ff 병합 완료

마지막 갱신: 2026-07-30 00:40 (Asia/Seoul)

## Stage 12 부대 지정과 단축키 설정 — 완료 (historical)

- 승인 검수 태그: `review-stage-12-v5`
- 완료 태그: `stage-12-completed`
- 작업 브랜치: `main`
- 전체 단계: 17단계
- 현재 단계: 12단계 — 부대 지정과 단축키 설정
- 현재 단계 상태: 완료 (`completed`)
- 현재 작업: 12단계 완료 — 13단계 경험치·레벨·능력치 성장 시작 명령 대기 중
- 완료된 단계: 1단계~12단계
- 검수 통과된 단계: 1단계~12단계
- 다음 단계: 13단계 — 경험치·레벨·능력치 성장
- `main` 정식 반영 여부: 반영 완료
- 사용자 실행 테스트: 통과 (`passed`)
- ChatGPT 코드 검수: 승인 (`approved`)
- 현재 알려진 문제: 기존 `favicon.ico` 404 비차단 경고

### 12단계 구현 요약

- BattleScene에서 Ctrl+1…Ctrl+9·Ctrl+0으로 선택 아군을 저장하고 1…9·0으로 생존 아군을 호출한다.
- 부대 구성은 `CONTROL_GROUPS_REGISTRY_KEY`에 `rosterUnitId` 기준으로 저장되며 같은 세션의 여러 BattleScene 사이에서 유지된다.
- 승리·패배와 Field·Formation·Shop 이동 후에도 persistent 부대 원본은 유지된다. recall/UI는 현재 생존·편성 유닛만 필터링하며, 사망·Bench 유닛을 원본에서 삭제하지 않는다.
- 부대 정의는 사용자가 다시 저장하거나 초기화할 때만 변경되며, 브라우저 새로고침 이후 영구 저장은 아직 구현하지 않는다.
- KeySettingsScene에서 숫자 부대 키와 Whirlwind·First Aid 키를 registry에 저장하고, 충돌 시 같은 종류의 바인딩을 교환한다.
- FieldScene Keys 진입과 BattleScene 동적 도움말·부대 UI를 추가했으며 기존 명령·스킬 우선순위를 유지한다.
- v1에서 중앙 전투장을 덮던 238×132 패널을 제거하고 `RTS_ARENA_BOUNDS` 아래 좌측의 소형 5×2 UI로 이동했다.
- 정식 이름 Group 1~Group 10과 실제 호출키 1~9·0을 분리해 Group 10을 `Recall: 0 · Save: Ctrl + 0`으로 표시한다.
- `CONTROL_GROUPS_REGISTRY_KEY`에 `rosterUnitId` 기반 10개 부대를 저장하고 BattleScene마다 깊은 복사해 로드한다.
- 사망·Bench 유닛은 persistent group에서 삭제하지 않으며, recall/UI는 현재 생존·편성 유닛만 조회한다.
- Formation에서 Bench 유닛이 일반 용병 슬롯을 직접 대체하고 Apply하면 기존 부대 지정을 승계한다.
- Auto Hunt OFF 지역 방어는 고정 `guardPosition`을 기준으로 최초 140px, LOCAL_ENGAGE 재탐색 180px를 사용한다.
- 지역 교전이 끝나도 `guardPosition`으로 자동 귀환하지 않고 현재 위치에서 IDLE로 멈춘다.
- `guardPosition`은 전투 시작, 사용자 MOVE 성공 완료, Auto Hunt OFF 전환 때만 갱신한다.

### 12단계 검증 기록

- v3 부대 지속·키 바인딩 순수 로직 검사 25개: 통과
- v4 guard anchor 거리·유효성 순수 검사 10개: 통과
- `npm ci`: 통과 (`passed`)
- `npm run typecheck`: 통과 (`passed`)
- `npm run build`: 통과 (`passed`, 비차단 chunk 크기 경고 있음)
- `npm run dev`: 서버 정상 시작·HTTP 200 확인 후 종료 (`passed`)
- 브라우저 자동 확인: 이번 병합 과정에서는 실행하지 않음 (`not_tested`)
- v5 ChatGPT 정적 검수: 승인 (`approved`)
- v5 사용자 통합 실행 테스트: 통과 (`passed`) — M8·M9 비귀환, 타깃 상실 후 재탐색, 주변 적 부재 시 현재 위치 정지, 다음 전투 부대 지속 확인
- v1 검수 결과 (historical): `changes_requested` — 중앙 부대 패널 겹침 및 Group 10 표기 오류
- v2 검수 결과 (historical): `changes_requested` — 전투별 초기화와 사망/UI 조회에 의한 원본 삭제
- v3 검수 결과 (historical): `changes_requested` / 사용자 테스트 `failed` — M8·M9가 지역 교전 후 기존 guardPosition으로 자동 귀환
- 실제 부대 저장·호출, 사망 정리, 명령 보존과 사용자 통합 전투 시나리오는 v5 사용자 테스트에서 통과를 확인함

12단계 사용자 실행 테스트: 통과 (`passed`)
12단계 ChatGPT 코드 검수: 승인 (`approved`)
12단계 `main` 반영: 완료 (`stage-12-completed`)

마지막 갱신: 2026-07-28 18:01 (Asia/Seoul)

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
- 현재 단계 상태: 완료 (`completed`)
- 상태 코드: `completed`
- 현재 작업 브랜치: `main`
- 승인 검수 태그: `review-stage-12-v5`
- 완료 태그: `stage-12-completed`
- 완료된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계, 12단계
- 검수 통과된 단계: 1단계, 2단계, 3단계, 4단계, 5단계, 6단계, 7단계, 8단계, 9단계, 10단계, 11단계, 12단계
- 현재 작업: 12단계 완료 — 13단계 경험치·레벨·능력치 성장 시작 명령 대기 중
- 다음 단계: 13단계 — 경험치·레벨·능력치 성장
- 사용자 실행 테스트: 통과 (`passed`)
- ChatGPT 코드 검수: 승인 (`approved`)
- `main` 정식 반영 여부: 반영 완료

현재 단계 번호는 12로 유지한다. 1단계부터 12단계까지 `main`에 반영되어 완료됐고, 13단계는 별도 시작 명령 전까지 시작하지 않는다.

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
