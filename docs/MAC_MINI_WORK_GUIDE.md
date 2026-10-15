# 맥미니 원격 작업 지침 (MAC_MINI_WORK_GUIDE.md)

> **적용 대상: 맥미니에서 이 저장소를 네트워크 공유(SMB)로 열어 작업하는 Claude Code 세션만.**
> 윈도우 PC의 메인 Claude Code·Codex·Gemini 지침(`CLAUDE.md`, `AGENTS.md`)은 이 문서 때문에 바뀌지 않는다. 메인 지침과 충돌하면 메인 지침(`CLAUDE.md`)이 우선하되, 아래 "실행 금지"와 "경로 해석"은 맥미니에서 항상 추가로 지킨다.
> 만든 날: 2026-10-15 (맥미니에서 `mount`로 실측)

## 1. 이 세션이 누구인가
- 장비: 맥미니(macOS). 작업 폴더 `/Volumes/gt1_mega/Antigravity/AIMaster` = 윈도우 PC의 `D:\Antigravity\AIMaster`.
- Claude 계정: 보조 계정 `buylifemall1@gmail.com`(설정 폴더 `~/.claude-account2`). 메인 계정 `buylifemall@gmail.com`은 윈도우 쪽이다(원칙 18번).
- 브라우저: 보조 계정은 엣지만 사용(원칙 18번).

## 2. 하는 일 / 안 하는 일
- **한다**: 파일 읽기·편집·분석, 문서 작성.
- **하지 않는다(윈도우에서 실행하도록 안내)**: `npm install/run dev/build`, `git` 명령 전부(commit·push 포함), Vercel 배포. 윈도우의 다른 에이전트가 같은 폴더를 쓰므로 맥에서 실행하면 잠금·인덱스 충돌이 난다.
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
- `docs/HANDOFF.md`에 항목을 쓸 때 제목에 **"맥미니"**를 넣는다(예: `## 2026-10-15 Claude Code(맥미니·보조 계정) — …`). 어느 장비에서 한 작업인지 구분된다.
- `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`에는 다른 CLI의 미커밋 변경이 있을 수 있다. **기존 항목은 지우거나 덮어쓰지 않고 추가만** 한다.
- 맥에서 파일을 편집했으면 보고에 "윈도우에서 커밋·푸시 필요"와 바뀐 파일 목록을 적는다.
- 맥에만 저장한 설정·메모리에 의존하는 내용은 저장소 문서에도 남긴다(원칙 7번).

## 5. 오류 방지 점검
1. 작업 시작 시 `/Volumes/gt1_mega`가 마운트돼 있는지 확인(`ls /Volumes`). 없으면 작업하지 말고 알린다.
2. 경로가 `C:\`나 `%…%`면 맥에서 열 수 없는 경로로 취급한다.
3. 공유 폴더에는 임시 파일을 만들지 않는다. 임시 파일은 세션 스크래치 폴더(`/private/tmp/…`)에 둔다.
