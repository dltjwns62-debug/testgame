# Stage 17 위협 모델

## 현재 경계

현재 구현은 온라인 연결을 하지 않으므로 bearer token, 비밀번호, OAuth code, 개인 정보가 local SaveEnvelope·OnlinePlayerSnapshot·diagnostics에 들어가지 않는다. `NullAuthTokenProvider`만 제공하며 인증 provider는 미구현이다.

## 미래 서버에서 방어할 항목

- client save 조작 및 Gold·EXP·item 위조
- battle result 재전송과 operation 중복 전송
- offline elapsed time과 device clock 조작
- revision rollback 및 stale snapshot
- tampered protocol payload와 future protocol
- 탈취된 인증 token과 로그를 통한 token 노출
- queue flood와 payload 크기 초과

## 필요한 서버 정책

server time, idempotency key, revision compare, rate limit, token rotation, operation validation, server-side reward calculation, audit log, payload size limit, protocol version validation을 미래 서버의 필수 경계로 둔다.

`MANUAL_REQUIRED` conflict는 자동으로 local snapshot을 덮어쓰지 않고 사용자에게 요약만 보여줘야 한다.
