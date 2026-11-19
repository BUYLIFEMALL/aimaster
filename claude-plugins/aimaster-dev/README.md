# aimaster-dev — AIMaster 개발 지침 자동화 플러그인 (Claude Code)

루트 `CLAUDE.md`의 반복 절차를 Claude Code 플러그인으로 묶은 것이다. 규칙 본문은 복사하지 않고, 기존 `scripts/` 도구와 `docs/` 문서를 부르는 절차만 담았다. **규칙이 바뀌면 `CLAUDE.md`가 기준이다.**

## 들어 있는 것

| 종류 | 이름 | 하는 일 |
|---|---|---|
| 스킬 | `/aimaster-dev:work-start <폴더> [역할 ID]` | 작업 전 점검(관리자 지시·역할 파일·다른 세션 점유·인덱스 파일 수·0번 규칙 고지·플랜) |
| 스킬 | `/aimaster-dev:safe-commit <경로...>` | 커밋 도우미 선택과 커밋 전후 확인 |
| 스킬 | `/aimaster-dev:pre-deploy <폴더>` | 배포 전 점검(직접 불러야만 실행됨) |
| 스킬 | `/aimaster-dev:work-finish <폴더> [역할 ID]` | 문서 갱신·요청함 기록·결과 보고 형식 |
| 훅 | `PreToolUse` → `scripts/guard.js` | 금지 명령을 실행 전에 차단(아래 표) |
| 에이전트 | `aimaster-dev:access-auditor` | 권한·본인 키·데이터 격리 위반 감사(읽기 전용) |
| 에이전트 | `aimaster-dev:program-comparison-analyst` | 프로그램 비교·병합 분석(읽기 전용) |
| MCP | `supabase-aimaster-readonly`, `vercel` | 운영 DB 읽기 전용 조회, Vercel 배포 상태 확인 |

### 훅이 막는 것

| 판정 | 대상 |
|---|---|
| 차단 | `git add -A`·`git add .`, `git commit -a`, 경로(`-- <경로>`) 없는 `git commit`, `--no-verify`, `git reset --hard`, `git stash`(list·show 제외), `git checkout .`·`git restore .`, `.git/index`·잠금 파일 삭제 |
| 차단 | `.env*` 덮어쓰기(`> .env.local`, `tee .env`, 이미 있는 파일을 Write로 통째 쓰기). 줄 추가(`>>`, `tee -a`)와 `.env.example`은 허용 |
| 확인 요청 | force-push, `AIMASTER_ALLOW_MASS_DELETE=1`, `.env*` 파일 Edit·새로 만들기 |

훅은 판단하지 못하면 통과시킨다. git 훅(`scripts/git-hooks/`)과 커밋 도우미의 검사를 대신하지 않고 그 앞에 한 겹 더 두는 것이다.

## 설치 (장비·계정마다 한 번)

저장소 폴더에서:

```bash
claude plugin marketplace add .
```

```bash
claude plugin install aimaster-dev@buylife --scope user
```

한 번만 시험해 보려면:

```bash
claude --plugin-dir claude-plugins/aimaster-dev
```

- 설치 뒤 Claude Code를 다시 시작한다. MCP 두 개는 처음 쓸 때 `/mcp`에서 주인님이 직접 로그인한다.
- 이미 claude.ai 커넥터로 Supabase·Vercel을 쓰는 계정은 도구가 겹쳐 보일 수 있다. 겹치면 `.mcp.json`에서 해당 항목을 지운다.
- 클라우드 세션(claude.ai/code)은 저장소에 든 플러그인을 불러오지 않는다.
- 플러그인을 고친 뒤에는 `plugin.json`의 `version`을 올려야 설치된 쪽에 반영된다.

## 점검

```bash
node --test claude-plugins/aimaster-dev/scripts/guard.test.js
```

```bash
claude plugin validate claude-plugins/aimaster-dev
```

## 한계·남은 일

- 훅은 명령 문자열을 보고 판단한다. 스크립트 파일 안에서 실행하는 git 명령은 보지 못한다.
- 한국어 종료 검사(`scripts/claude-hooks/korean-stop-check.js`)는 넣지 않았다. 윈도우에는 이미 `~/.claude`에 설치돼 있어 겹치기 때문이다. 플러그인으로 옮길지는 주인님 결정 사항이다.
- MCP 주소는 실제 로그인 연결까지 확인하지 못했다(클라우드 세션에서 작성).
- 프로그램 폴더가 아니므로 `programs` 등록·버전(`vX.YY`) 규칙의 대상이 아니다.
