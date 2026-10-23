# Codex 상태바 실행기 인수인계

버전: v1.05. 사용자 요청: 상태바 안에 5시간·주간 재설정까지 남은 시간 표시 및 `모델명 effort | 5h 잔여% (시간) | weekly 잔여% (시간) | context 잔여%` 형식 적용. 모델명과 effort 사이에는 공백 한 칸을 넣는다.

2026-10-15 v1.05: 전체 단색 ANSI 출력을 항목별 색상으로 수정. `src/format.mjs`의 `colorFooter()`는 폭 조절이 끝난 텍스트에만 색상을 붙인다. 모델명·effort 베이지, 5h·weekly 분홍, context 살구색, 구분자 회색(Claude 상태바 팔레트와 동일). `src/run.mjs`에서 호출한다. 자동 검사 18개·빌드·본인 계정 조회·설치 연결·표준 버전 명령 통과. 실제 가시적 Orca 새 터미널에서 색상과 시간 표시 확인, 증거 `.local/v105-terminal-screen.png`. macOS 글로벌 npm 런처 경로 지원 추가 및 `~/.zshrc` 가드로 새 터미널 연결 시 자동 유지/점검 장치 완료. AI 요청 없이 검수했고 기존 사용자 세션은 유지했다. 새 Codex 실행부터 적용된다. Vercel·DB 배포 대상 아님.

루트 `AGENTS.md`, `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`, `docs/ERROR_LESSONS.md`, `docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md`를 먼저 읽는다. 상세 실행·복원은 `README.md`에 있다.

이 폴더는 로컬 CLI 보조 도구이며 웹 프로그램을 구현하거나 등록하지 않는다. 본인 Codex 계정의 읽기 전용 한도 데이터만 쓴다. auth.json·API 키 값을 출력·복사하거나 다른 계정으로 우회하지 않는다. app-server에서 로그인·키 변경·크레딧 소비·thread/start·turn/start를 호출하지 않는다.

`src/format.mjs`: 한도 창 판별·카운트다운·상태바 문자열. `src/rates.mjs`: 공식 app-server 한도 읽기. `src/run.mjs`: PTY 중계와 상태바 표시. `install.mjs`: npm 실행기 설치·백업·원복. `.local/`은 사용자별 백업과 검수 자료이며 커밋하지 않는다.

변경 후 `npm test`, `npm run check`, 실제 계정 한도 조회, 대화형 기동·입력·종료와 표준 비대화형 명령 보존을 확인한다. 현재 실행 중인 세션을 강제 종료하지 않는다. 사용자 설정 파일의 모델·권한·상태바 항목은 바꾸지 않는다.

2026-10-13 v1.01 검수: 실제 본인 계정 `account/rateLimits/read` 성공, 원래 `codex.cmd` 기동에서 두 한도 카운트다운 표시·시간 감소·입력·정상 종료 확인. 실제 물리 창 크기 변경은 미검수이며 ANSI 화면·크기 변경 검사는 자동 하네스로 확인한다. 구현 중 인라인 화면의 상태바가 화면 맨 아래가 아니라 입력란 아래 13행에 놓이는 것을 발견하여 `src/screen.mjs`에서 현재 입력 커서 아래를 찾도록 고쳤다.

2026-10-13 v1.02: 주인님 최신 예시의 `context` 표기를 사용한다(앞선 `contex` 요청을 대체). 모델명+effort, 파이프 구분자, `left` 제거, 1시간 미만 `0h` 표기를 적용했다. 좁은 화면에서도 `ctx`/`wk`로 축약하지 않는다. 시간 검증 실패 시 표시는 유지하고 확인하지 못한 시간만 생략한다. 기존 실행 중 세션은 종료하지 않고 새 Codex 실행부터 적용한다.

v1.02 검수: 기존 자동 검사 16개 및 `npm run build` 통과, 실제 본인 계정 한도 읽기 성공, `codex.cmd --version` 보존 및 기존 설치 경로 연결 확인. Orca의 가시적인 검수 터미널에서 `GPT-6.1-Solhigh | 5h 70% (3h 51m) | weekly 80% (6d 17h 40m) | context 100%` 출력·시간 감소를 확인하고 실제 화면을 캡처했다. `.local/terminal-check.jsonl`에 실행기 표시 증거가 있다. 로컬 실행기 적용이 배포이며 Vercel·DB·라이브 URL은 해당하지 않는다.

2026-10-13 v1.03: 주인님 추가 지시로 모델명과 강도 사이에 공백 한 칸을 넣었다(`GPT-6.1-Sol high`). 기존 모델명·한도 잔여량·카운트다운·context 계산은 유지한다. 자동 검사 16개·빌드·실제 본인 계정 한도 조회·표준 `codex.cmd --version` 확인 통과. Orca의 가시적인 검수 터미널에서 `GPT-6.1-Sol high | 5h 63% (3h 30m) | weekly 79% (6d 17h 19m) | context 100%` 표시를 확인했다. `.local/terminal-check.jsonl`에 표시 증거를 남겼으며 AI 작업은 보내지 않았다. 기존 실행기의 동적 모듈 연결을 사용하므로 새 대화형 실행부터 적용된다. 로컬 적용 완료이며 Vercel·DB·라이브 URL은 해당하지 않는다.

2026-10-14 v1.04: 좁은 창에서 시간 단위와 구분자의 공백을 없애던 처리를 제거했습니다. 새 대화형 Codex 실행은 설치된 npm 실행기를 통해 현재 소스의 표시 형식을 자동으로 불러옵니다. 시작·복구 공통 지침은 [CODEX_STATUSBAR_STARTUP.md](../docs/CODEX_STATUSBAR_STARTUP.md)를 따릅니다. 기존 세션은 유지하며 다음 Codex 실행부터 적용됩니다.

검수(2026-10-14): 자동 검사17개·빌드 통과, 설치된 npm 실행기 연결·백업 해시 검증, 본인 계정 한도 읽기 및 `codex.cmd --version` 확인. 실제 Orca의 새 가시적 터미널에서 `GPT-6.1-Sol high | 5h 45% (3h 24m) | weekly 40% (5d 15h 35m) | context 100%`를 확인하고 화면 캡처했습니다. 입력은 Enter 없이 확인 후 지웠고 AI 요청 없이 Codex 정상 종료·PowerShell 복귀를 확인했습니다. 검수 탭만 닫았으며 기존 사용자 세션은 유지했습니다. 로컬 증거: `.local/v104-terminal-check.json`, `.local/v104-terminal-screen.png`(git 제외).
