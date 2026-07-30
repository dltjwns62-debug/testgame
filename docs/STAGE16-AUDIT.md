# Stage 16 안정성 감사

기준 브랜치: `main` (`cb04c9ddca566a866d3c0745725719b1041a7b28`)

작업 브랜치: `stage-16-performance-stability`

## 감사 범위

- `TODO`, `FIXME`, 오래된 단계 표기
- localStorage와 window/document/registry 이벤트 경계
- `setInterval`, `setTimeout`, Phaser delayedCall과 Scene 전환
- Scene 재시작·메뉴 재진입·Reset Save 이후 남는 리스너와 타이머
- 매 프레임 `Text.setText`, 배열·Map·Set 생성, 정렬과 시각 객체 전체 갱신
- Gold·EXP·아이템·ItemInstance 중복 적용
- Formation·Control Group·Inventory의 `rosterUnitId` 참조
- Repeat Hunt·respawn·Battle 결과·Reset Save 흐름
- favicon 404와 문서 상태 불일치

## 구현 전 발견 사항

1. `persistence.ts`는 브라우저 Storage에 직접 의존하므로 테스트용 MemoryStorage와 Clock 주입 경계가 필요하다.
2. 자동 저장은 registry와 document/window 이벤트를 사용하므로 idempotent 설치, hidden/pagehide 중복 방지, shutdown 정리가 필요하다.
3. `FieldScene`과 `BattleScene`은 update마다 상태 Text와 전체 visual을 갱신하므로 dirty 상태 또는 100ms 제한 갱신이 필요하다.
4. Formation·Inventory·Control Group·AutoProgress는 외부 registry 입력을 경계에서 정규화해야 한다.
5. Scene 전환과 delayedCall은 명시적 shutdown 정리와 중복 launch/resume 방어가 필요하다.
6. 런타임 예외를 사용자 화면에 안전하게 보고할 공통 최근 오류 기록이 없다.
7. 저장 용량·quota 오류를 진단할 byte 크기와 저장 시간 메타데이터가 없다.
8. `index.html`에 favicon 링크가 없고 `public/favicon.svg`가 없다.

## Stage 16에서 처리할 경계

- persistence adapter 밖으로 직접 Storage 접근을 확장하지 않는다.
- 성능 측정은 동일 환경 비교용으로만 기록하며 무조건적인 60 FPS 완료 판정은 하지 않는다.
- 게임 규칙, 보상 공식, 전투 결과 구조, Stage 17 서버·온라인 기능은 변경하지 않는다.

## v2 검수 보완 결과

- 저장 후보 선택은 primary → backup → temp 순서의 adapter 함수로 분리했고 27개 Node 회귀 테스트가 실제 소스 함수를 검증한다.
- `runtimeErrors.ts`는 named error/rejection handler와 설치 대상 window를 보관하며 `clearRuntimeErrorHandlers()`가 실제 listener를 제거한다.
- 복구 후에도 FATAL issue가 남으면 Bootstrap/Battle의 진입을 차단하고 RuntimeError를 기록한 뒤 RecoveryScene의 Try Again, Return to Field, Save Data, 5초 Reset Save 경로를 제공한다.
- offline summary는 Bootstrap의 최초 전달 또는 registry `changedata` named handler로 한 번만 소비하며 Field update에서는 registry를 읽거나 삭제하지 않는다.
- 활성 Scene의 제목과 부제는 Stage 16으로 정정했다. Stage 17 온라인 기능은 미구현이다.
- Battle transform/HP 갱신과 alive/selection/range state visual 갱신을 분리하고, UI는 100ms 제한·동일 문자열 생략·slot map 재사용을 적용했다.
- diagnostics는 `diagnostics=1`에서만 표시하고 평균/p95 frame time, 활성 유닛, autosave/timer counter, persistence, UI update rate, storage write count를 보여준다.
