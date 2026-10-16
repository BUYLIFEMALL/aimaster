# 맥미니 원격 작업 지침 (MAC_MINI_WORK_GUIDE.md)

> **적용 대상: 맥미니에서 이 저장소를 네트워크 공유(SMB)로 열어 작업하는 모든 에이전트 세션(Antigravity CLI·Codex·Claude Code). (2026-10-16 개정)**
> 윈도우 PC의 메인 Claude Code·Codex·Gemini 지침(`CLAUDE.md`, `AGENTS.md`)은 이 문서 때문에 바뀌지 않는다. 메인 지침과 충돌하면 메인 지침(`CLAUDE.md`)이 우선하되, 아래 "실행 금지"와 "경로 해석"은 맥미니에서 항상 추가로 지킨다.
> 만든 날: 2026-10-15 (맥미니에서 `mount`로 실측)

## 1. 이 세션이 누구인가
- 장비: 맥미니(macOS). 작업 폴더 `/Volumes/gt1_mega/Antigravity/AIMaster` = 윈도우 PC의 `D:\Antigravity\AIMaster`.
  - **(2026-10-16 주인님 지시) 맥미니의 작업 폴더는 반드시 이 SMB 공유 폴더다. 맥 로컬 복제본(`~/…/AIMaster` 등 별도 clone)에서 작업·커밋·푸시하지 않는다.** 복제본에서 작업하면 작업 중 표·미커밋 변경이 윈도우와 실시간으로 공유되지 않아 동시 작업 금지 규칙이 깨진다(2026-10-16 맥미니 커밋 `c5b835d3`·`50c7b7e6`이 공유 폴더가 아닌 다른 복제본에서 만들어진 것을 윈도우 reflog·객체 시각으로 확인). 맥에 복제본이 있으면 지우지 말고 쓰지 않으며, 정리는 주인님께 확인한다.
- Claude 계정(2026-10-16 개정): 원칙은 **`buylifemall@gmail.com` 하나만 쓴다**(원칙 18번). 단 **한시 예외**로 이 맥미니 Orca 프로필은 보조 계정 `buylifemall1@gmail.com`으로 로그인돼 있고, 예외 기간(원칙 18번 "한시 예외" 참고) 동안은 이 계정으로 작업해도 멈추거나 계정 전환을 요구하지 않는다. 기간이 끝나면 메인 계정 하나로 돌아간다.
- 에이전트 구성(2026-10-16 주인님 지시): 맥미니에는 필요할 때 **Antigravity CLI(`agy`)·Codex·Claude Code** 계정을 등록해 두고, 일이 많을 때 윈도우 PC와 **분담해서 작업**한다. 분담 폴더는 주인님이 지정하며, 에이전트마다 맡은 폴더만 건드리고 끝나면 인수인계 문서를 남기는 아래 규칙을 모든 에이전트가 똑같이 따른다(Claude만 해당하던 표현은 에이전트 전체로 읽는다).
- 브라우저(2026-10-15 주인님 지시): **맥미니에서 실행되는 이 세션의 크롬 작업은 항상 이 맥미니에 있는 크롬으로 한다.** (2026-10-16 개정) 에이전트별 브라우저는 윈도우와 같은 규칙이다 — **Claude Code=맥미니 크롬, Antigravity·Codex=맥미니 엣지**(§1-1).
  - `list_connected_browsers`에서 `osPlatform`이 macOS이고 `isLocal: true`인 항목이 맥미니 크롬이다(2026-10-15 실측: "Browser 1", deviceId `6d2d44cb-e050-43a5-9c78-eb3dd1d06bb0`). deviceId는 바뀔 수 있으니 매번 이 조건으로 확인한다.
  - Windows로 표시되는 브라우저(다른 PC의 크롬·엣지)는 선택하지 않는다. 선택 질문이 필요한 경우에도 macOS·isLocal 항목을 권장으로 안내한다.
  - 사이트 로그인은 이 크롬에서 주인님이 직접 해 둔 상태를 쓴다. 비밀번호·키 입력과 최종 발행·결제는 하지 않는다(원칙 13번).

## 1-1. 두 PC 멀티 에이전트 구성 (2026-10-16 주인님 지시)

윈도우 PC와 맥미니 모두 세 에이전트를 등록해 두고 필요할 때 동시에 쓴다. 최대 6개 세션이 **같은 저장소·같은 Git 인덱스**를 쓴다(원칙 18 「두 PC 멀티 에이전트 구성」).

| 장비 | 에이전트 | 브라우저 | 실행 단계(`npm`·빌드·배포) |
|---|---|---|---|
| 윈도우 PC(메인) | Claude Code (`buylifemall@gmail.com`) | 윈도우 **크롬** 기본 프로필 | 한다 |
| 윈도우 PC(메인) | Antigravity CLI(`agy`) · Codex | 윈도우 **엣지** | 한다 |
| 맥미니(보조 PC) | Claude Code (`buylifemall@gmail.com`) | 맥미니 **크롬** | 하지 않음 → 윈도우에 요청 |
| 맥미니(보조 PC) | Antigravity CLI(`agy`) · Codex | 맥미니 **엣지**(없으면 주인님께 설치 요청) | 하지 않음 → 윈도우에 요청 |

- **폴더 분담**: 주인님이 에이전트마다 폴더를 지정한다. 같은 폴더를 두 에이전트(장비가 달라도)가 동시에 맡지 않는다. 시작 전에 `docs/HANDOFF.md` 맨 위 항목과 `git status`로 다른 에이전트의 미커밋 변경을 확인한다.
- **브라우저 선택**: `list_connected_browsers`에서 `osPlatform`이 자기 장비(macOS/Windows)인 항목 중 자기 에이전트에 정해진 브라우저만 고른다. 다른 장비의 브라우저는 보이더라도 고르지 않는다.
- **Git**: 인덱스(스테이징)는 두 장비의 모든 에이전트가 공유한다. `git add`는 커밋 직전에 내 파일만 경로를 지정하고 바로 커밋한다. `.git/index.lock`이 있으면 지우지 말고 잠시 뒤 다시 한다. 푸시가 거절되면 원격을 받아 합치되 다른 에이전트의 미커밋 변경은 건드리지 않는다.
- **사용 한도**: Claude는 두 장비 모두 같은 계정이라 5시간·주간 한도를 함께 쓴다. 무거운 작업을 동시에 몰지 않는다.

### 맥미니 등록 점검표 (처음 한 번, 장비 바뀌면 다시)
1. `ls /Volumes`로 `gt1_mega` 마운트 확인(§5-1).
2. Claude Code: `buylifemall@gmail.com`으로 로그인, 하단 상태바 장치 확인(`docs/CLAUDE_STATUSBAR.md` 5절).
3. Codex: 주인님 계정 로그인, 상태바 실행기 확인(`docs/CODEX_STATUSBAR_STARTUP.md`의 macOS 항목).
4. Antigravity CLI(`agy`): 주인님 계정 로그인, 시작 시 루트 `GEMINI.md`를 읽는지 확인.
5. Git 전역 설정: `git config --global user.name BUYLIFE`, `git config --global user.email buylifemall@gmail.com`, **`git config --global core.autocrlf input`**(윈도우는 시스템 설정으로 `true`라 맥에는 자동 적용되지 않는다 — 맥에서 CRLF가 섞여 커밋되는 것 방지). `core.filemode=false`는 저장소 설정이라 이미 공유된다.
6. 브라우저: 맥미니 크롬(Claude Code용)·엣지(agy·Codex용)를 켜 두고, 검수에 필요한 사이트는 주인님이 직접 로그인해 둔다.

## 2. 하는 일 / 안 하는 일 (2026-10-15 주인님 지시로 개정)
작업 방식은 메인 PC와 같다: 에이전트마다 **주인님이 지정한 프로젝트 폴더**를 맡아 작업하고, 끝나면 인수인계 문서를 남기며, 다음 CLI는 그 문서를 먼저 읽고 이어간다.
- **한다**: 파일 읽기·편집·분석, 문서 작성, 브라우저 검수, **맡은 프로젝트 파일만 골라 `git` 커밋·푸시**.
  - 커밋 전에 `git status`·`git diff --cached --name-only`로 스테이징 목록을 확인해 다른 에이전트의 파일이 섞이지 않게 한다(파일을 지정해 `git add <경로>` 후 바로 커밋). 푸시가 거절되면 원격을 받아 합치되 다른 CLI의 미커밋 변경을 건드리지 않는다.
  - 프로젝트 `AGENTS.md`의 사전 승인 규칙(푸시·배포 전 승인 등)은 그대로 지킨다.
  - 공용 문서(`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`)는 내 항목만 추가하고, 다른 CLI의 미커밋 수정이 섞이지 않게 커밋한다.
- **하지 않는다 → 윈도우(메인 PC) 세션에 요청**: `npm install`·`npm run build/dev`·Vercel 배포·배포 후 확인 등 **실행 단계**. 이유: 윈도우용 `node_modules`를 맥에서 덮어쓰면 윈도우 빌드가 깨지고, 네트워크 드라이브라 느리다. 주인님이 그 프로젝트에서 맥 실행을 직접 시키면 예외로 하고, 끝나면 "윈도우에서 `npm install` 재실행" 안내를 남긴다.
- **윈도우에 요청하는 방법**: 인수인계 문서 끝에 아래 표를 붙인다. 폴더가 같아서 윈도우는 별도 동기화 없이 바로 실행한다. 승인이 필요한 단계는 표에 "주인님 승인 필요"로 적는다.

  | 순서 | 실행할 명령 | 확인할 것 |
  |---|---|---|
  | 1 | `npm install` (package.json이 바뀐 경우) | 오류 없음 |
  | 2 | `npm run build` | 빌드 통과 |
  | 3 | 프로덕션 배포·버전 DB 갱신·배포 후 확인 | 승인 필요 여부, 라이브 확인 |
- 메인용 지침 파일(`CLAUDE.md`, `AGENTS.md`)은 사용자가 지시할 때만 고친다. 맥미니 전용 내용은 이 문서에만 적는다.
- 다른 CLI가 작업 중이라고 알려진 폴더(`document-translator`, `codex-statusbar` 등)는 건드리지 않는다.

## 3. 경로 해석 (윈도우 ↔ 맥)
`/Volumes/gt1_mega`는 윈도우 **D: 드라이브 전체**(SMB `//administrator@gt1_mega/D`)다. 변환: `D:\<경로>` → `/Volumes/gt1_mega/<경로>`.

| 문서의 경로 | 맥미니에서의 의미 | 처리 |
|---|---|---|
| `D:\Antigravity\AIMaster` | `/Volumes/gt1_mega/Antigravity/AIMaster` | 그대로 열 수 있음 |
| `D:\PDS`(참고 자료 기본 폴더) | `/Volumes/gt1_mega/PDS` | 그대로 열 수 있음 |
| `C:\Tools`, `C:\Program Files\…`, `C:\Users\Administrator\…`, `%TEMP%`, 윈도우의 `~/.claude*` | **[WIN] 윈도우 로컬** | 맥에서 열 수 없다. 열려 하지 말고 "윈도우에서 확인/실행" 안내 |
| `~/.claude-account2`, `~/.zshrc`, `~/Library/…`, `/private/tmp/…` | **[MAC] 맥 로컬** | 윈도우 에이전트에게 안 보인다. 공유할 내용은 `docs/`에 적는다 |
| `/Volumes/admin`, `/Volumes/admin-1` | 다른 PC 드라이브 | 이 프로젝트와 무관, 건드리지 않는다 |

REA·상태바 스크립트 같은 도구는 윈도우 설치본과 맥 설치본이 따로다. 문서가 윈도우 설치 경로를 말하면 맥 설치 여부를 확인한 뒤 쓴다.

## 4. 인수인계 규칙 (섞임 방지)
- `docs/HANDOFF.md`에 항목을 쓸 때 제목에 **"맥미니"**를 넣는다(예: `## 2026-10-16 Claude Code(맥미니) — …`). 어느 장비에서 한 작업인지 구분된다.
- `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`에는 다른 CLI의 미커밋 변경이 있을 수 있다. **기존 항목은 지우거나 덮어쓰지 않고 추가만** 한다.
- 작업을 마치면 프로젝트 `docs/`에 인수인계 문서를 만든다. 항목: ① 한 일·바뀐 파일 ② 커밋·푸시·배포 여부와 커밋 번호 ③ 확인한 것·확인하지 못한 것 ④ 남은 일과 이어서 할 첫 단계 ⑤ 주의점(건드리면 안 되는 파일·승인 필요 단계) ⑥ 작업 장비(맥미니) ⑦ 윈도우에 요청할 실행 단계 표. `docs/HANDOFF.md` 맨 위에는 제목에 "맥미니"를 넣은 요약과 링크 한 줄을 추가한다.
- 커밋하지 못한 파일이 있으면 보고에 "윈도우에서 커밋 필요"와 파일 목록을 적는다.
- 맥에만 저장한 설정·메모리에 의존하는 내용은 저장소 문서에도 남긴다(원칙 7번).

## 5. 오류 방지 점검
1. 작업 시작 시 `/Volumes/gt1_mega`가 마운트돼 있는지 확인(`ls /Volumes`). 없으면 작업하지 말고 알린다.
   - 이어서 **현재 위치가 공유 폴더인지 확인**: `git rev-parse --show-toplevel`이 `/Volumes/gt1_mega/Antigravity/AIMaster`여야 한다. 다르면(로컬 복제본) 작업하지 말고 `cd /Volumes/gt1_mega/Antigravity/AIMaster`로 옮긴 뒤 시작한다. 이 위치에서는 `git pull`이 필요 없다(윈도우와 같은 파일).
   - 윈도우 쪽에서 확인하는 방법: PowerShell `Get-SmbSession`에 맥미니(Tailscale `macmini-macmini`, 100.65.7.96 / LAN 192.168.0.8)가 보이고, 맥에서 작업 중이면 `Get-SmbOpenFile | ? Path -like '*Antigravity\AIMaster*'`에 열린 파일이 나온다.
2. 경로가 `C:\`나 `%…%`면 맥에서 열 수 없는 경로로 취급한다.
3. 공유 폴더에는 임시 파일을 만들지 않는다. 임시 파일은 세션 스크래치 폴더(`/private/tmp/…`)에 둔다.

## 6. 세 CLI를 공유 폴더 작업 공간으로 실행하는 방법 (2026-10-16 주인님 지시)
모든 명령은 **맥미니 터미널**에서 실행한다. 세 CLI 모두 작업 폴더는 이 PC의 SMB 공유 폴더 `/Volumes/gt1_mega/Antigravity/AIMaster` 하나다(§1, 로컬 복제본 금지).

### 6-1. 공유 폴더 연결 확인 (매번 시작 전)
```bash
ls /Volumes/gt1_mega/Antigravity/AIMaster >/dev/null && echo "연결됨" || echo "연결 안 됨"
```
- 연결이 안 돼 있으면 Finder에서 `⌘K`(서버에 연결) → 집 안 같은 공유기: `smb://administrator@192.168.0.7/D` / 밖에서(Tailscale): `smb://administrator@100.124.125.70/D`. 윈도우 계정 비밀번호는 주인님이 직접 입력하고 "키체인에 저장"을 체크한다(에이전트는 입력하지 않는다).
- **연결 후 `ls /Volumes`로 마운트 이름을 확인한다.** 이 문서는 `/Volumes/gt1_mega`(기존 마운트, SMB `//administrator@gt1_mega/D`) 기준이다. Finder로 다시 연결해 `/Volumes/D` 등 다른 이름이 되면 이 문서의 경로를 실제 이름으로 고친다.
- 자동 연결: 시스템 설정 → 일반 → 로그인 항목에 연결된 공유 폴더를 추가한다.

### 6-2. 위치 확인
```bash
cd /Volumes/gt1_mega/Antigravity/AIMaster
git rev-parse --show-toplevel    # /Volumes/gt1_mega/Antigravity/AIMaster 여야 정상
```
- 이 위치는 윈도우와 같은 파일이라 `git pull`이 필요 없다. 결과가 `~/…` 등이면 로컬 복제본이므로 쓰지 않는다.

### 6-3. CLI별 실행
| CLI | 실행 명령 | 처음 실행할 때 확인 |
|---|---|---|
| Claude Code | `cd /Volumes/gt1_mega/Antigravity/AIMaster && claude` | 폴더 신뢰 질문 "예", `/status`로 `buylifemall@gmail.com` 로그인 확인 |
| Codex | `codex -C /Volumes/gt1_mega/Antigravity/AIMaster` (윈도우와 같은 옵션이면 `--sandbox danger-full-access --ask-for-approval never` 추가) | `/status`의 작업 폴더 경로 확인 |
| Antigravity CLI | `cd /Volumes/gt1_mega/Antigravity/AIMaster && agy` | 폴더 신뢰 질문 "예", 시작 시 루트 `GEMINI.md`를 읽는지 확인 |

- Orca에서 실행할 때: Orca에 작업 폴더로 `/Volumes/gt1_mega/Antigravity/AIMaster`를 추가하고 그 폴더에서 에이전트 터미널을 연다. 복제본 경로로 등록된 항목이 있으면 공유 폴더 경로로 바꾼다.

### 6-4. 단축 명령 (선택, `~/.zshrc` 맨 아래)
```bash
export AIM=/Volumes/gt1_mega/Antigravity/AIMaster
aim-check() {
  [ -d "$AIM" ] || { echo "❌ 공유 폴더 미연결 — Finder ⌘K로 연결"; return 1; }
  cd "$AIM" || return 1
  [ "$(git rev-parse --show-toplevel 2>/dev/null)" = "$AIM" ] || { echo "❌ 공유 폴더 저장소가 아님"; return 1; }
  echo "✅ 공유 폴더: $AIM"
}
alias aclaude='aim-check && claude'
alias acodex='aim-check && codex -C "$AIM"'
alias aagy='aim-check && agy'
```
- 저장 후 `source ~/.zshrc`. 이후 `aclaude`·`acodex`·`aagy` 한 단어로 연결 확인 → 위치 확인 → 실행. Codex 상태바 실행기(`docs/CODEX_STATUSBAR_STARTUP.md` macOS 항목)가 `~/.zshrc`에 있으면 그 아래에 둔다.

### 6-5. 실행 후 지킬 것 (요약)
- 시작 전 `docs/ACTIVE_WORK.md` · `git status --porcelain -- <폴더>` · `docs/HANDOFF.md` 맨 위로 다른 CLI의 작업 중 여부 확인(최상단 동시 작업 금지 규칙).
- `npm`·빌드·배포는 하지 않고 윈도우에 요청(§2). 브라우저: Claude Code=맥미니 크롬, Antigravity·Codex=맥미니 엣지(§1-1).
- 네트워크 드라이브라 `git status` 등이 윈도우보다 느릴 수 있다(정상).

### 6-6. 아직 실측하지 않은 것 (확인되면 이 줄을 고친다)
- `agy`의 작업 폴더 지정 옵션: 미확인이라 `cd` 후 실행으로 적었다(`agy --help`에 옵션이 있으면 써도 된다).
- 맥미니 Finder 재연결 시 마운트 이름이 `gt1_mega`로 유지되는지.
- 세 CLI를 이 방법으로 실행한 실제 결과(2026-10-16 작성 시점에는 윈도우에서 정리만 함). 실측 후 결과를 이 절에 적는다.
