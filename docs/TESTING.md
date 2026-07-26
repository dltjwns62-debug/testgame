# 2단계 실행 및 수동 테스트

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
7단계 사용자 실행 테스트: 미실시 (`not_tested`)
7단계 ChatGPT 코드 검수: 미실시 (`not_reviewed`), 재검수 태그: `review-stage-07-v6`

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

자동 브라우저 확인 내용:

- 10대10 전투장, 하단 슬롯 10개, Slime 1·Slime 4 종류 연결: 통과
- 드래그 10마리 선택과 대형 이동: 통과
- 우클릭 공격 명령, 적군 AI, 아군 전멸 `DEFEAT`: 통과
- 브라우저 콘솔 치명적 오류·경고: 없음
