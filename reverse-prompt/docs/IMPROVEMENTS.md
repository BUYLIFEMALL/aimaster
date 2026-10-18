# AI 리버스 프롬프트 (`reverse-prompt`) — 개선 제안서

> 미구현 제안은 승인 전까지 구현하지 않는다. 처리하면 상태를 바꾸고 버전을 적는다. 기존 인수인계: `docs/CLI_HANDOFF.md`, 계획: `docs/DEVELOPMENT_PLAN.md`.

## 2026-10-19 Claude Code(윈도우) — 브라우저 테스트 실패 판정
- **증상**: 플랫폼 일괄 점검에서 `npm run test:browser`가 키 미등록 안내(alert)를 찾지 못해 실패.
- **원인**: 테스트 번들(esbuild) `define`에 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 빠져 있었다. 2026-10-16 새·기존 변수 호환 이후 클라이언트가 이 이름을 먼저 읽으므로, 테스트 화면에서만 `process` 미정의 오류가 났다. **운영 화면은 Next가 값을 채워 넣어 정상**이다.
- **처리**: `tests/browser.mjs`에 정의를 추가해 16/16 통과(크롬 포그라운드, 모의 API, AI 비용 없음). 앱 코드·버전·배포는 바꾸지 않았다.

| 구분 | 내용 | 상태 |
|---|---|---|
| 1. 로직·기능 | 테스트 번들 변수 정의 누락 | **처리(테스트만)** |
| 2. UI·UX | 이번 판정에서 새로 발견한 화면 문제 없음 | — |
| 3. 다른 프로그램 연계 | 같은 원인이 `banana-canvas`에도 있었음(v1.09에서 함께 처리). esbuild 테스트를 쓰는 프로그램은 변수 이름을 늘릴 때 `define`도 함께 고칠 것 — `docs/ERROR_LESSONS.md` 2026-10-19 | 기록 |
