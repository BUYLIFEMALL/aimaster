# GEMINI.md

> **★★★ 개발작업 최상단 공통 지침 — CLI별 역할 분담 (2026-10-16 주인님 지시)**
> **Antigravity CLI(agy)·Codex·Claude Code는 AIMaster 메인 사이트와 모든 서브 자동화 프로그램의 개발·유지보수에 협업한다. Codex의 주력 역할은 개발 기획·시스템 설계·코드 오류 수정·디버깅·테스트이며, 주인님 요청 시 신규 프로그램 개발도 수행할 수 있다.** **Claude Code의 주력 역할은 복잡한 코드 구현·기능 추가·리팩터링이다.** Antigravity CLI의 세부 주력 역할은 주인님이 별도로 지정하기 전까지 각 요청의 작업 배정에 따른다(임의로 전담 영역을 정하지 않는다). 역할은 주력 업무 구분이며 공통 지침·검수·인수인계·배포 책임을 면제하지 않는다. 같은 서브프로그램 동시 작업 금지와 시작 전 ACTIVE_WORK 확인을 지키고, 변경·발견한 개선사항은 프로그램별 문서에 남겨 다음 CLI가 이어서 작업할 수 있게 한다. 상세: [공통 개발 방식의 CLI 역할 분담](docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md).

> **★★★ 개발작업 최상단 공통 지침 — 발견한 개선사항 상시 인수인계 의무 (2026-10-16 주인님 지시)**
> **모든 CLI는 작업 중 발견한 오류·기능·성능·편의성·디자인 개선사항을 해당 프로그램 서브폴더의 `docs/IMPROVEMENTS.md`에 즉시 기록한다.** 작업 종료·중단·이관 시 같은 폴더에 `docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md`를 남기고 `AGENTS.md`/`README.md`에서 연결한다(같은 날짜면 기존 문서에 추가하거나 작업별 접미사 사용). 발견 근거·영향·우선순위·처리 상태·관련 파일·남은 작업·다음 첫 단계·검수 방법을 적어 다른 CLI가 이어서 작업할 수 있게 한다. **미구현 제안을 완료로 표시하거나 기록만으로 구현 승인을 받은 것으로 간주하지 않는다.** 루트 `docs/HANDOFF.md`에는 프로그램별 문서 링크와 요약을 남긴다. 상세·기록 양식: [`docs/IMPROVEMENT_HANDOFF_POLICY.md`](docs/IMPROVEMENT_HANDOFF_POLICY.md). 메인 앱 개선사항은 루트 `docs/`에 기록한다.

> **★★★ Antigravity(Gemini) 개발·검수 브라우저 지정 — Microsoft Edge(엣지) 전용 사용 (2026-10-16 주인님 지시)**
> **Antigravity는 앞으로 프로그램 개발, 디버깅, 화면 확인, 실제 회원 테스트 등 모든 작업 시 Microsoft Edge 브라우저만 전용으로 사용한다.**
> Chrome은 메인 Claude Code 전용이므로 충돌 방지를 위해 사용하지 않는다. 화면 확인이 필요할 때는 보이는 실제 Edge 창을 띄워 주인님과 함께 확인한다.
> **두 PC 멀티 작업(2026-10-16)**: 윈도우 PC와 맥미니 모두 Antigravity·Codex·Claude Code가 등록돼 동시에 작업할 수 있다. 맥미니에서 실행 중이면 [`docs/MAC_MINI_WORK_GUIDE.md`](docs/MAC_MINI_WORK_GUIDE.md)를 먼저 읽고, 브라우저는 그 장비의 엣지만 쓴다(크롬은 Claude Code 전용). 규칙 원문: `CLAUDE.md` 원칙 18.
> **★★★ 동시 작업 금지(2026-10-16)**: 같은 서브프로그램을 다른 CLI와 동시에 작업하지 않는다. 시작 전 [`docs/ACTIVE_WORK.md`](docs/ACTIVE_WORK.md)·`git status`·`docs/HANDOFF.md`로 다른 CLI의 작업 중 여부를 확인하고 비어 있을 때만 시작, 끝나면 작업 내용·인수인계 문서를 남긴다. 원문: `CLAUDE.md` 최상단.
> **★★★ 계정 고정(2026-10-16)**: 관리자 계정은 항상 `buylifemall@gmail.com`, 일반 회원 테스트 계정은 항상 `buylifemall@naver.com`. 회원 기능 검수는 테스트 계정으로 실제 로그인해서 한다(비밀번호는 주인님이 직접). 원문: `CLAUDE.md` 최상단.
> **★★★ 디자인 작업 메인지침 및 템플릿화 의무 (2026-10-16 주인님 지시)**: 모든 웹 서브프로그램의 UI/UX 디자인 작업 시 루트 최상단 [`DESIGN.md`](DESIGN.md)와 [`docs/PROGRAM_DESIGN_STANDARD.md`](docs/PROGRAM_DESIGN_STANDARD.md)를 필독하고 준수한다. 작업 내용을 템플릿화하여 "○○○ 스타일 템플릿"으로 고유 명명하고 `DESIGN.md` 카탈로그에 등록하며, 각 프로그램 폴더에 `docs/DESIGN_HANDOFF.md` 및 `docs/IMPROVEMENTS.md`를 필수로 작성해 남긴다. 검수는 Edge 전용.

Gemini CLI(Antigravity)가 이 저장소(AIMaster)에서 작업할 때 읽는 안내 파일이다. 규칙은 다른 CLI와 똑같다 — 새로 만들지 않고 아래 문서를 그대로 따른다.

1. 루트 [`CLAUDE.md`](CLAUDE.md) — 저장소 불변의 핵심 원칙들과 작업 규칙의 원문(Claude 전용이 아니라 모든 CLI 공통 메인 지침).
2. 루트 [`AGENTS.md`](AGENTS.md) — 같은 규칙의 요약과 프로그램 목록·교훈.
3. **작업 시작 전 반드시**: [`docs/HANDOFF.md`](docs/HANDOFF.md)(멈춘 일·남은 일·다른 CLI가 작업 중인 폴더)와
   [`docs/ERROR_LESSONS.md`](docs/ERROR_LESSONS.md)(에러 해결 기록·작업 전 점검 체크리스트)를 읽는다.
4. 작업 중 에러를 해결했거나 중요 점검 사항을 찾으면 `docs/ERROR_LESSONS.md`에 같은 커밋으로 추가한다(핵심 원칙 7번).
5. 고칠 서브프로젝트의 `<프로그램명>/AGENTS.md`·`README.md`를 먼저 읽는다. 답변은 쉬운 한글 존댓말로 한다.
6. **디자인 업그레이드 및 템플릿화 의무(2026-10-16 주인님 지시)**: UI/UX 디자인 작업 시 연동/사용 매뉴얼 비주얼화(이미지, 사진, 캐릭터, 다이어그램, 이모티콘)를 준수하고, 작업한 디자인 내용을 템플릿화하여 고유 명칭(예: `사이버 네온 다크 콘솔 스타일`, `포커스 스튜디오 스타일` 등)을 정해 명시한다. 사용된 프로그램에 어떤 디자인 템플릿이 적용되었는지 `docs/PROGRAM_DESIGN_STANDARD.md` 카탈로그와 해당 프로그램 `AGENTS.md`/`docs/DESIGN_HANDOFF.md`에 기록하여, 나중에 다른 프로그램에서 해당 템플릿 스타일로 변경 요청 시 바로 참고하여 이식할 수 있도록 인수인계 문서(`docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`)를 남긴다.
