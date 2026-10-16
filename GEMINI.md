# GEMINI.md

> **★★★ Antigravity(Gemini) 개발·검수 브라우저 지정 — Microsoft Edge(엣지) 전용 사용 (2026-10-16 주인님 지시)**
> **Antigravity는 앞으로 프로그램 개발, 디버깅, 화면 확인, 실제 회원 테스트 등 모든 작업 시 Microsoft Edge 브라우저만 전용으로 사용한다.**
> Chrome은 메인 Claude Code 전용이므로 충돌 방지를 위해 사용하지 않는다. 화면 확인이 필요할 때는 보이는 실제 Edge 창을 띄워 주인님과 함께 확인한다.
> **두 PC 멀티 작업(2026-10-16)**: 윈도우 PC와 맥미니 모두 Antigravity·Codex·Claude Code가 등록돼 동시에 작업할 수 있다. 맥미니에서 실행 중이면 [`docs/MAC_MINI_WORK_GUIDE.md`](docs/MAC_MINI_WORK_GUIDE.md)를 먼저 읽고, 브라우저는 그 장비의 엣지만 쓴다(크롬은 Claude Code 전용). 규칙 원문: `CLAUDE.md` 원칙 18.
> **★★★ 동시 작업 금지(2026-10-16)**: 같은 서브프로그램을 다른 CLI와 동시에 작업하지 않는다. 시작 전 [`docs/ACTIVE_WORK.md`](docs/ACTIVE_WORK.md)·`git status`·`docs/HANDOFF.md`로 다른 CLI의 작업 중 여부를 확인하고 비어 있을 때만 시작, 끝나면 작업 내용·인수인계 문서를 남긴다. 원문: `CLAUDE.md` 최상단.
> **★★★ 계정 고정(2026-10-16)**: 관리자 계정은 항상 `buylifemall@gmail.com`, 일반 회원 테스트 계정은 항상 `buylifemall@naver.com`. 회원 기능 검수는 테스트 계정으로 실제 로그인해서 한다(비밀번호는 주인님이 직접). 원문: `CLAUDE.md` 최상단.

Gemini CLI(Antigravity)가 이 저장소(AIMaster)에서 작업할 때 읽는 안내 파일이다. 규칙은 다른 CLI와 똑같다 — 새로 만들지 않고 아래 문서를 그대로 따른다.

1. 루트 [`CLAUDE.md`](CLAUDE.md) — 저장소 불변의 핵심 원칙들과 작업 규칙의 원문(Claude 전용이 아니라 모든 CLI 공통 메인 지침).
2. 루트 [`AGENTS.md`](AGENTS.md) — 같은 규칙의 요약과 프로그램 목록·교훈.
3. **작업 시작 전 반드시**: [`docs/HANDOFF.md`](docs/HANDOFF.md)(멈춘 일·남은 일·다른 CLI가 작업 중인 폴더)와
   [`docs/ERROR_LESSONS.md`](docs/ERROR_LESSONS.md)(에러 해결 기록·작업 전 점검 체크리스트)를 읽는다.
4. 작업 중 에러를 해결했거나 중요 점검 사항을 찾으면 `docs/ERROR_LESSONS.md`에 같은 커밋으로 추가한다(핵심 원칙 7번).
5. 고칠 서브프로젝트의 `<프로그램명>/AGENTS.md`·`README.md`를 먼저 읽는다. 답변은 쉬운 한글 존댓말로 한다.
6. **디자인 업그레이드 및 템플릿화 의무(2026-10-16 주인님 지시)**: UI/UX 디자인 작업 시 연동/사용 매뉴얼 비주얼화(이미지, 사진, 캐릭터, 다이어그램, 이모티콘)를 준수하고, 작업한 디자인 내용을 템플릿화하여 고유 명칭(예: `사이버 네온 다크 콘솔 스타일`, `포커스 스튜디오 스타일` 등)을 정해 명시한다. 사용된 프로그램에 어떤 디자인 템플릿이 적용되었는지 `docs/PROGRAM_DESIGN_STANDARD.md` 카탈로그와 해당 프로그램 `AGENTS.md`/`docs/DESIGN_HANDOFF.md`에 기록하여, 나중에 다른 프로그램에서 해당 템플릿 스타일로 변경 요청 시 바로 참고하여 이식할 수 있도록 인수인계 문서(`docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`)를 남긴다.

