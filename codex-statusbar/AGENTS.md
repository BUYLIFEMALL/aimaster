# Codex 상태바 실행기 인수인계

버전: v1.01. 사용자 요청: 상태바 안에 5시간·주간 재설정까지 남은 시간 표시.

루트 `AGENTS.md`, `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`, `docs/ERROR_LESSONS.md`, `docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md`를 먼저 읽는다. 상세 실행·복원은 `README.md`에 있다.

이 폴더는 로컬 CLI 보조 도구이며 웹 프로그램을 구현하거나 등록하지 않는다. 본인 Codex 계정의 읽기 전용 한도 데이터만 쓴다. auth.json·API 키 값을 출력·복사하거나 다른 계정으로 우회하지 않는다. app-server에서 로그인·키 변경·크레딧 소비·thread/start·turn/start를 호출하지 않는다.

`src/format.mjs`: 한도 창 판별·카운트다운·상태바 문자열. `src/rates.mjs`: 공식 app-server 한도 읽기. `src/run.mjs`: PTY 중계와 상태바 표시. `install.mjs`: npm 실행기 설치·백업·원복. `.local/`은 사용자별 백업과 검수 자료이며 커밋하지 않는다.

변경 후 `npm test`, `npm run check`, 실제 계정 한도 조회, 대화형 기동·입력·종료와 표준 비대화형 명령 보존을 확인한다. 현재 실행 중인 세션을 강제 종료하지 않는다. 사용자 설정 파일의 모델·권한·상태바 항목은 바꾸지 않는다.

2026-10-13 검수: 실제 본인 계정 `account/rateLimits/read` 성공, 원래 `codex.cmd` 기동에서 두 한도 카운트다운 표시·시간 감소·입력·정상 종료 확인. 80열에서는 `wk`·`ctx`로 축약했다. 실제 물리 창 크기 변경은 미검수이며 ANSI 화면·크기 변경 검사는 자동 하네스로 확인한다. 구현 중 인라인 화면의 상태바가 화면 맨 아래가 아니라 입력란 아래 13행에 놓이는 것을 발견하여 `src/screen.mjs`에서 현재 입력 커서 아래를 찾도록 고쳤다.
