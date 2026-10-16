# GEMINI.md

> **★★★ Antigravity(Gemini) 개발·검수 브라우저 지정 — Microsoft Edge(엣지) 전용 사용 (2026-10-16 주인님 지시)**
> **Antigravity는 앞으로 프로그램 개발, 디버깅, 화면 확인, 실제 회원 테스트 등 모든 작업 시 Microsoft Edge 브라우저만 전용으로 사용한다.**
> Chrome은 메인 Claude Code 전용이므로 충돌 방지를 위해 사용하지 않는다. 화면 확인이 필요할 때는 보이는 실제 Edge 창을 띄워 주인님과 함께 확인한다.

Gemini CLI(Antigravity)가 이 저장소(AIMaster)에서 작업할 때 읽는 안내 파일이다. 규칙은 다른 CLI와 똑같다 — 새로 만들지 않고 아래 문서를 그대로 따른다.

1. 루트 [`CLAUDE.md`](CLAUDE.md) — 저장소 불변의 핵심 원칙들과 작업 규칙의 원문(Claude 전용이 아니라 모든 CLI 공통 메인 지침).
2. 루트 [`AGENTS.md`](AGENTS.md) — 같은 규칙의 요약과 프로그램 목록·교훈.
3. **작업 시작 전 반드시**: [`docs/HANDOFF.md`](docs/HANDOFF.md)(멈춘 일·남은 일·다른 CLI가 작업 중인 폴더)와
   [`docs/ERROR_LESSONS.md`](docs/ERROR_LESSONS.md)(에러 해결 기록·작업 전 점검 체크리스트)를 읽는다.
4. 작업 중 에러를 해결했거나 중요 점검 사항을 찾으면 `docs/ERROR_LESSONS.md`에 같은 커밋으로 추가한다(핵심 원칙 7번).
5. 고칠 서브프로젝트의 `<프로그램명>/AGENTS.md`·`README.md`를 먼저 읽는다. 답변은 쉬운 한글 존댓말로 한다.
