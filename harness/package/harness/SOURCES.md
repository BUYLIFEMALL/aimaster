# 공식 문서와 설계의 구분
확인 기준: 2026-11-20. 아래 제품 동작은 공식 문서를 확인했습니다. 작업 상태·역할 이름·요청 양식·로그 구조·5분/30초 등 운영 수치는 이 패키지의 설계 제안입니다.

- OpenAI, Codex integration layers: https://developers.openai.com/blog/codex-as-a-platform
  codex exec, SDK, app-server의 실행 제어 역할.
- OpenAI, AGENTS.md: https://learn.chatgpt.com/docs/agent-configuration/agents-md
  프로젝트 지침 검색·적용 및 크기 제한. 공통 지침을 짧게 유지하고 역할 파일은 필요한 것만 읽도록 설계.
- OpenAI, Non-interactive mode: https://learn.chatgpt.com/docs/non-interactive-mode
  비대화형 실행·JSONL 출력·재개. 이 패키지의 중앙 events 스키마와 CLI 원시 이벤트 스키마는 서로 다름.
- OpenAI, CLI reference: https://learn.chatgpt.com/docs/developer-commands?surface=cli
  --no-alt-screen 옵션.
- Anthropic, programmatic Claude Code: https://code.claude.com/docs/en/headless
  -p, 구조화 출력, 스트리밍 이벤트. 실제 설치 버전에서 옵션 확인 필요.
- Anthropic, project memory: https://code.claude.com/docs/en/memory
  CLAUDE.md 및 AGENTS.md/파일 import. 제공 CLAUDE.md는 @AGENTS.md를 가져오는 방식.
- Google, Antigravity rules: https://antigravity.google/docs/rules
  AGENTS.md, GEMINI.md 및 규칙 파일. 설치된 AGY의 실제 로딩은 점검 필요.
- Git, worktree: https://git-scm.com/docs/git-worktree
  작업 트리 분리. worktree lock은 동시 편집 잠금이 아님.

제품 기능·옵션이 달라질 수 있으므로 실제 설치 버전의 도움말과 공식 문서로 연결을 검증합니다.
