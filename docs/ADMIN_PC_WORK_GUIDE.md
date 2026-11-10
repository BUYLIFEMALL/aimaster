# Admin(마스터) PC 작업 지침 · 인수인계 (2026-11-10)

> **주인님 지시(2026-11-10)**: 「현재 너는 Admin(마스터) PC에서 작업하는 담당자야」「Admin 마스터 pc에서의 작업은 윈도우 메인 pc와의 작업충돌을 피하기 위해 맥미니 pc에서의 작업 수준에서 작업을 할꺼야」「메인 최상단 지침에 추가 등록 해줘」「다른 cli도 이 룰을 지킬수 있도록 인수인계 문서로 남겨놔」「작업폴더는 윈도우PC의 네트워크 공유폴더를 작업폴더로 사용하고 있어」
> **누가 읽나**: Admin PC에서 실행되는 **모든 CLI**(Claude Code·Codex·Antigravity `agy`). 어떤 계정으로 로그인했든 똑같이 지킨다.
> **우선순위**: 루트 `CLAUDE.md`(Codex `AGENTS.md`, agy `GEMINI.md`) ★ 규칙 > 이 문서 > 맥미니 문서([`MAC_MINI_AGENT_PLAYBOOK.md`](MAC_MINI_AGENT_PLAYBOOK.md)·[`MAC_MINI_WORK_GUIDE.md`](MAC_MINI_WORK_GUIDE.md))를 Admin PC로 바꿔 읽은 내용.

## 1. Admin PC가 누구인가

| 항목 | 내용 |
|---|---|
| 장비 | 윈도우 PC, 호스트명 `Admin`(사용자 `Administrator`). **윈도우 메인 PC와 다른 장비**다 |
| 작업 폴더 | 윈도우 메인 PC의 네트워크 공유 폴더 **`\\GT1_MEGA\d\Antigravity\AIMaster`** = 메인 PC `D:\Antigravity\AIMaster`. **같은 폴더·같은 Git 인덱스**를 메인 PC·맥미니의 모든 세션과 함께 쓴다 |
| 로컬 복제본 | 만들지 않는다. 로컬 clone에서 작업·커밋·푸시하면 작업 중 표·미커밋 변경이 실시간 공유되지 않아 동시 작업 금지 규칙이 깨진다(맥미니 2026-10-16 사례와 같음) |
| 작업 수준 | **맥미니와 같은 수준** — 편집·분석·검수·내 파일 커밋까지만. 실행 단계는 메인 PC에 요청(§2) |
| 세션 이름 | `claude-admin-YYYYMMDD-<작업>` · `codex-admin-…` · `agy-admin-…`(메인 `-win-`, 맥미니 `-mac-`와 구분) |

## 1-1. 메인 PC와 협업 · 작업 기록 · 다른 작업자 확인 (2026-11-10 주인님 추가 지시)

> 「너는 윈도우 메인피씨와 협업작업을 할꺼야」「항상 윈도우 메인pc와 맥미니쪽에서 같은 작업공간의 파일을 공유하면서 작업을 하고 있으니 항상 작업완료후 작업내용을 남겨야 하고 커밋,푸시,배포시에도 다른 작업자가 있는지 확인하고 없을때 너의 작업을 진행할수 있도록」「너가 사용한 브라우저는 ego lite 야」

- **협업 구조**: Admin PC는 윈도우 메인 PC와 한 팀이다. 메인 PC가 실행 단계(`npm`·빌드·배포·DB)를, Admin PC는 편집·분석·실물 검수를 맡고, 서로 요청 표로 넘긴다.
- **작업이 끝날 때마다 기록**: `docs/HANDOFF.md` 맨 위(제목에 `[역할: …] <CLI>(Admin PC) · 세션 …`), 프로그램 `AGENTS.md`·`docs/`, 역할 파일. 채팅에만 남기지 않는다.
- **커밋·푸시·배포 직전마다 다른 작업자 확인** — 다른 작업자가 있으면 기다렸다가 없을 때 진행:
  1. `docs/ACTIVE_WORK.md`에 같은 폴더 작업 줄이 없는지
  2. `git status --porcelain -- <내 경로>`에 남의 미커밋 변경이 없는지
  3. `.git/index.lock`·`.git/safe-commit-index.lock`이 없는지(있으면 지우지 않고 기다림)
  4. `git log -5`로 방금 다른 세션 커밋이 있었는지, 파일 수(`git ls-files | wc -l` 대 `git ls-tree -r HEAD --name-only | wc -l`)
  5. 배포(메인 PC에 요청할 때도)는 Vercel 팀 `buylife`에 빌드·대기 중 배포가 없는지
- **담당 세션 인수인계(2026-11-10 주인님 「음악담당 메인 담당이 있으니 작업한 내용과 작업중 발견된 특이사항은 항상 인수 인계 문서로 남겨」)**: 메인 PC에 담당 세션(음악·영상 등)이 있는 프로그램을 Admin PC에서 만지거나 시험하면, 한 일·결과·작업 중 발견한 특이사항을 그 프로그램 인수인계 문서(`<프로그램>/docs/HANDOFF_*`·`IMPROVEMENTS.md`·`AGENTS.md`)에 「담당께」로 남기고, 담당 세션에 붙여 넣을 프롬프트를 채팅으로 드린다. 담당의 역할 파일(`docs/roles/<담당>.md`)은 고치지 않고 담당에게 옮겨 달라고 프롬프트에 적는다. 첫 사례: `free-music-studio/docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md` 17절.
- **브라우저**: Admin PC의 Claude Code는 **ego lite**(`C:\Program Files\Citro Labs\ego lite`, `ego-browser nodejs`)를 쓴다. 작업 하나 = 작업 공간 하나, 끝나면 `task.finish({ keep: [] })`.
- **공용 스테이징을 쓰지 못함(2026-11-10 실측)**: Admin PC에서 `.git/index`를 덮어쓰면 `fatal: unable to write new index file`로 실패한다(메인 PC가 그 파일을 열어 둔 상태로 보임, 새 파일 만들기는 됨). 커밋 도우미(`safe-commit.mjs`·`commit-paths.mjs`)는 임시 인덱스로 **커밋은 정상**이지만 공용 스테이징이 커밋 전 상태로 남아 `git status`에 `MM`·`D ` + `??`로 보인다. 이 상태에서 누가 경로 없이 커밋하면 내 변경이 되돌려지므로, 커밋 뒤 **메인 PC 세션에 「`git add -- <커밋한 경로>`로 공용 스테이징 맞추기」를 요청**한다. Admin PC에서 `git add`·`git reset`·`read-tree`를 되풀이하지 않는다.
- **GitHub 푸시 로그인 없음(2026-11-10 실측)**: `git push`가 `fatal: could not read Username for 'https://github.com'`로 실패한다. Admin PC는 커밋까지만 하고 **푸시는 메인 PC가 한다** — 같은 저장소라 메인 PC 세션이 자기 커밋을 푸시할 때 Admin PC 커밋도 함께 올라간다(2026-11-10 `eb1701fdc`·`966079117`·`4780594ed`가 그렇게 올라감). 급하면 HANDOFF 요청 표에 「푸시」를 적는다.
- **Git 작성자**: 이 PC 전역 설정 `user.name BUYLIFE`, `user.email buylifemall@gmail.com`, `core.autocrlf true`(2026-11-10 설정).

## 2. 하는 일 / 메인 PC에 요청할 일

### ✅ Admin PC에서 직접 한다
- 코드 읽기·분석·수정, 새 파일·문서 작성, 디자인 리뉴얼, 리팩터링.
- 브라우저 검수(Admin PC에 켜진 자기 브라우저만 — 다른 장비 브라우저는 보여도 고르지 않는다).
- **내 파일만** 커밋·푸시: 일반 파일 `node scripts/commit-paths.mjs "<메시지>" <경로>... --push`, 공용 문서 `node scripts/safe-commit.mjs`.

### ❌ 하지 않는다 → 메인 윈도우 PC 세션에 요청
- `npm install`·`npm ci`·`npm run build`·`npm run dev`, 그 밖에 `node_modules`·`.next`·빌드 결과물을 만드는 명령.
- Vercel 배포·배포 후 확인, 버전 DB 갱신, 운영 DB 쓰기·마이그레이션, 환경변수(`.env*`·Vercel env) 변경, 예약 작업(스케줄러) 등록.
- **이유**: 같은 폴더를 네트워크로 열어 쓰므로 Admin PC가 `node_modules`·빌드 폴더를 만들거나 지우면 메인 PC에서 돌고 있는 dev 서버·빌드와 바로 부딪치고, 네트워크 드라이브라 느리며 중간에 끊기면 파일이 깨진다.
- **요청 방법**: 맥미니와 같다 — 인수인계 문서 끝에 「순서 | 실행할 명령 | 확인할 것」 표를 붙이고(승인 필요 단계는 「주인님 승인 필요」 표시), 주인님께 메인 PC 세션에 보낼 한 줄을 드린다. 폴더가 같아 메인 PC는 별도 동기화 없이 바로 실행한다.
- 주인님이 그 작업에서 Admin PC 실행을 직접 시키면 예외. 끝나면 「메인 PC에서 `npm install` 다시 실행」 안내를 남긴다.

## 3. 충돌 방지 — 시작·작업·커밋

1. **시작 전**: `docs/ACTIVE_WORK.md`에서 그 폴더를 다른 CLI(메인 PC·맥미니 포함)가 작업 중인지 확인하고, 아니면 내 줄을 추가한 뒤 시작. `docs/HANDOFF.md` 맨 위 항목과 `git status`로 다른 세션의 미커밋 변경을 확인한다.
2. **같은 폴더 동시 작업 금지**: 장비가 달라도 같은 프로젝트·같은 서브프로그램을 두 CLI가 동시에 맡지 않는다.
3. **Git(네트워크 공유 = 맥미니 SMB와 같은 위험)**:
   - git 명령(add·commit·status)을 중간에 끊지 않는다(Ctrl+C·창 닫기·시간 초과 강제 종료 금지). `.git/index.lock`이 있으면 지우지 말고 기다린다.
   - 커밋할 때마다 끝난 직후 인덱스 파일 수를 확인하고, 연속 커밋은 하나씩 확인하며 한다(줄었으면 멈추고 알림). 훅을 `--no-verify`로 건너뛰지 않는다.
   - `git add .`·`git add -A`·`git stash`·`git reset --hard`·`git checkout -- .` 금지. 다른 세션의 미커밋 변경을 건드리지 않는다.
4. **끝날 때**: `docs/HANDOFF.md` 맨 위에 `[역할: …] <CLI>(Admin PC) · 세션 <이름>` 형식으로 결과·남은 일·메인 PC 요청 표를 남기고, `docs/ACTIVE_WORK.md` 내 줄을 지운다.

## 4. Admin PC 환경 메모

- **경로**: Git Bash에서는 `//GT1_MEGA/d/Antigravity/AIMaster`로 쓴다. `cmd.exe`는 UNC 경로를 현재 폴더로 못 써서 경고 뒤 `C:\Windows`에서 실행된다 — `cmd`를 거치는 명령은 절대 경로를 넘기거나 PowerShell·Git Bash를 쓴다.
- **Claude Code 하단 상태바(2026-11-10 설치)**: Orca 계정 폴더 `%APPDATA%\orca\claude-profiles\03cb129b-…\home`에 `node scripts/install-statusbars.mjs --only claude`로 설치(Orca 호출 유지, `settings.json` 백업 `.bak-<시각>`, `statusline-extra.js.good` 백업 생성). 형식은 [`CLAUDE_STATUSBAR.md`](CLAUDE_STATUSBAR.md) 1절. **고정 장치(guard)는 Admin PC에 아직 없다** — Orca 재설치·새 계정 연결 뒤 상태바가 사라지면 같은 명령을 다시 실행한다. Codex·agy를 Admin PC에서 쓰기 시작하면 `--only codex`·`--only agy`로 설치한다.
  - 설치 스크립트의 시험 출력이 가짜 한도 값을 `%TEMP%\claude-statusline-last-limits.json`에 남기므로 설치 직후 이 파일을 지운다(2026-11-10 지움).
- **한국어 장치(2026-11-10 설치)**: `node scripts/mac-mini/install-korean-reminder.mjs`로 `~/.claude`와 Orca 계정 폴더에 출력 스타일 `Korean`·질문마다/도구마다 상기·종료 검사 훅 설치(백업 `settings.json.before-korean-hook`). 출력 스타일은 Claude Code 재시작 뒤 적용.
- **도구**: `ffmpeg`·`ffprobe`(WinGet) 있음 — 영상 소리 확인에 씀. 무료음악 PC 엔진(FreeMusicEngine)이 이 PC에서 실행되며 음원 저장 폴더는 `E:\AI-Musc\Song`.
- 보조 문서: 맥미니용 [`MAC_MINI_AGENT_PLAYBOOK.md`](MAC_MINI_AGENT_PLAYBOOK.md)의 표준 작업 루프·요청 표 형식을 그대로 쓰되, 「맥미니」를 「Admin PC」로, 맥 전용 항목(SMB 마운트·zsh·맥 크롬)은 §1·§4로 바꿔 읽는다.
