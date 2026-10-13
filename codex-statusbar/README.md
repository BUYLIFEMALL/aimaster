# Codex 상태바 재설정 시간 표시 v1.01

Windows의 대화형 Codex CLI 상태바에 5시간·주간 한도의 재설정까지 남은 시간을 덧붙이는 로컬 실행기다. 기본 Codex 0.160.0의 상태바에는 이 시간 항목이 없어 터미널 출력에 덧붙인다. 프로그램 카탈로그에 등록하는 웹 서비스가 아니다.

표시 예시: `GPT-6.1-Sol · high · 5h 85% left (1h24m) · weekly 82% left (6d17h) · Context 49% left`. 수치는 예시이며 실행할 때 본인의 현재 계정에서 읽는다. `left`는 잔여량이다.

## 설치와 실행

이 폴더에서 `npm ci`, `npm test`, `npm run check`, `npm run install-launcher`를 실행한다. 설치기는 현재 사용자 npm의 `@openai/codex/bin/codex.js`에 대화형 실행 분기를 추가하고 원본 백업을 `.local/`에 보관한다. Codex 바이너리·로그인·API 키·권한 설정은 바꾸지 않는다.

설치 후 평소처럼 `codex.cmd -C D:\Antigravity\AIMaster` 또는 `codex -C D:\Antigravity\AIMaster`를 새로 실행한다. 이미 실행 중인 Codex 프로세스는 종료하지 않으므로 현재 세션에는 소급 적용되지 않는다. npm으로 Codex를 업데이트하면 설치 분기가 교체될 수 있어 이 폴더에서 `npm run install-launcher`를 다시 실행한다.

복원: 이 폴더에서 `npm run restore-launcher`. 설치 이후 npm 실행기 파일이 외부에서 바뀌었다면 자동으로 덮어쓰지 않는다.

## 데이터와 표시

- 동일 `CODEX_HOME`·동일 환경으로 공식 `codex app-server`를 실행하여 읽기 전용 `account/rateLimits/read`의 `resetsAt`을 조회한다. 인증 파일의 비밀 값을 직접 읽거나 출력하지 않는다. 다른 계정으로 폴백하지 않는다.
- 한도는 60초마다 다시 읽고 카운트다운은 1초마다 갱신한다. 원래 상태바의 잔여 비율과 API 값이 일치하는 한도에만 시간을 덧붙인다. 조회 실패·오래된 데이터·누락된 시간·다른 종류의 한도에는 시간을 지어내지 않는다.
- `5h`는 300분, `weekly`는 10,080분 창으로 판별한다. 만료 시 `resetting`으로 표시하고 다음 조회로 갱신한다. 반환되지 않은 창은 표시하지 않는다.
- 좁은 터미널에서는 `wk`, `ctx`, `%left`로 줄인다. 원래 Codex 상태바가 식별되지 않으면 본문을 덮어쓰지 않는다.
- `exec`, `review`, `app-server`, 로그인·도움말 등 비대화형 명령은 원래 실행 경로를 사용한다. 이 도구가 자동으로 AI 작업·로그인·재설정 크레딧 소비를 실행하지 않는다.
- 공식 근거: [상태바 설정](https://learn.chatgpt.com/docs/developer-commands?surface=cli), [계정 한도 읽기](https://learn.chatgpt.com/docs/app-server).

## 검수와 인수인계

`npm test`는 한도 창 판별·시간 계산·미확인/만료/오래된 데이터·좁은 화면·원래 상태바 판별을 확인한다. `npm run verify-account`는 실제 본인 계정의 한도 읽기만 확인한다. 대화형 터미널에서 기동·시간 덧붙임·입력·종료·화면 크기 변화도 확인한다.

외부 npm 설치 파일은 git에 포함하지 않는다. 설치기가 백업·파일 해시·원복을 관리한다. 새 CLI가 작업하기 전 루트 지침과 이 폴더의 `AGENTS.md`를 읽는다. 이 도구는 로컬 CLI용이므로 Vercel 배포·DB 버전 갱신 대상이 아니다.
