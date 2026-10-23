# 맥미니 에이전트 작업 플레이북 — Claude Code · Codex · Antigravity CLI 공통 (2026-10-17)

> **누가 읽나**: 맥미니에서 실행되는 **모든 CLI**(Claude Code `claude`, Codex `codex`, Antigravity `agy`). 어떤 계정으로 로그인했든 이 순서대로 작업하면 된다.
> **근거**: 2026-10-16~17 Claude Code(맥미니)가 디자인 리뉴얼 15건을 이 방식으로 끝까지 처리한 실제 절차(이력: [`MAC_MINI_CLAUDE_RESUME_20261017.md`](MAC_MINI_CLAUDE_RESUME_20261017.md)).
> **우선순위**: 루트 `CLAUDE.md`(Codex는 `AGENTS.md`, Antigravity는 `GEMINI.md`) ★ 규칙 > 이 문서 > 장비 설정 [`MAC_MINI_WORK_GUIDE.md`](MAC_MINI_WORK_GUIDE.md). 충돌하면 위가 이긴다.

---

## 1. 원격 작업 공간 — 한 장 요약

| 항목 | 내용 |
|---|---|
| 작업 폴더 | `/Volumes/gt1_mega/Antigravity/AIMaster` — 윈도우 `D:\Antigravity\AIMaster`를 SMB(`//administrator@gt1_mega/D`)로 연결한 **같은 폴더·같은 Git 인덱스**. 맥 로컬 복제본(clone)에서는 절대 작업하지 않는다 |
| 연결 확인 | `ls /Volumes/gt1_mega/Antigravity/AIMaster/CLAUDE.md` 가 보이면 정상. 안 보이면 Finder ⌘K → `smb://gt1_mega/D` 재연결을 주인님께 요청 |
| 실행 | Claude `cd $AIM && claude` · Codex `codex -C /Volumes/gt1_mega/Antigravity/AIMaster` · Antigravity `cd $AIM && agy` (단축 명령: `MAC_MINI_WORK_GUIDE.md` §6-4) |
| 설치 확인(2026-10-17 실측) | `claude` ✅ · `codex` ✅ · `agy` ✅ · `vercel`·`gh` 설치돼 있으나 **맥미니에서 배포에 쓰지 않음** · Node v24(`/usr/local/opt/node@24`) · `python3`·`perl` ✅ · **Google Chrome ✅ / Microsoft Edge ❌ 미설치** |
| 커밋 작성자 | 항상 `BUYLIFE <buylifemall@gmail.com>`(전역 git 설정). 로그인 계정이 달라도 바꾸지 않는다 |
| 셸 | `zsh` — 따옴표 없는 글롭(`--include=*.tsx`)은 「no matches found」로 명령 전체가 멈춘다. 기다릴 때는 `perl -e 'select(undef,undef,undef,5)'` |
| 임시 파일 | 세션 임시 폴더는 사라진다. 남길 절차·결과는 반드시 저장소 `docs/`·`scripts/`에 둔다 |

---

## 2. 맥미니에서 하는 일 / 윈도우에 요청할 일 / 주인님께 여쭐 일

### 2-1. ✅ 맥미니에서 직접 한다
- 코드 읽기·분석·수정, 새 파일 작성, 화면(디자인) 리뉴얼, 리팩터링.
- **타입 검사만**: `cd <프로그램 웹앱 폴더> && node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json` (node_modules는 윈도우가 설치해 둔 것을 그대로 읽기만 함). 테스트가 순수 node 스크립트면 `node --test` 정도는 가능.
- 문서 작성: 플랜, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_HANDOFF_YYYYMMDD.md`, 프로그램 `AGENTS.md`, 루트 공용 문서의 **내 항목**.
- `DESIGN.md` 현황판 상태 변경(🔵 착수 / 🟠 맥미니 완료), `docs/ACTIVE_WORK.md` 내 줄 추가·삭제.
- **커밋·푸시**(내 파일만, §4 — 권장 `node scripts/commit-paths.mjs`·공용 문서 `safe-commit.mjs`, 대안 `scripts/mac-mini/commit-gate.sh`).
- DB **읽기 조회**(버전·`app_url`·데이터 건수) — Supabase MCP가 있는 CLI만(프로젝트 `esgxyikcnnvmlhygjkth`). 없으면 §2-2로.
- 배포 결과 **확인**: DB 버전, `curl -s https://<주소>/login | grep -o 'v1\.[0-9]*'`, 브라우저 화면(§3).

### 2-2. 🔁 윈도우(메인 PC) CLI에 요청한다
| 작업 | 이유 |
|---|---|
| `npm install`·`npm run build`·`npm run dev` | 맥에서 실행하면 윈도우용 `node_modules`가 깨지고 SMB라 매우 느림 |
| `vercel deploy --prod`, Vercel 환경변수(`CRON_SECRET` 등) 확인·추가 | 배포는 메인 PC 담당 + 이 맥미니 계정은 Vercel 권한이 없는 경우가 있음(Claude 보조 계정 403 실측) |
| DB 쓰기(`programs.version` 갱신 등), 마이그레이션 적용 | 운영 DB 변경은 메인 PC에서 |
| 크롬 확장 ZIP 재생성·`check-extension-release.mjs` | 빌드 단계 |
| 현황판 ✅ 「1차 작업완료」 변경 | 배포·검수를 끝낸 쪽(윈도우)이 바꿈 |
| Supabase MCP가 없는 CLI의 DB 조회 | 윈도우 Claude Code에 조회 요청 |

요청은 **프로그램 폴더의 `docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md` 「윈도우 CLI 다음 첫 단계」**에 번호 순서로 적고, 주인님께는 아래 양식 문장을 드린다(주인님이 윈도우 CLI에 그대로 붙여넣음).

```
<slug> vX.YY(커밋 <해시>)를 배포해 주세요. 순서: cd <폴더> && npm run build → vercel deploy --prod --yes
→ DB update programs set version='vX.YY', updated_at=now() where slug='<slug>'; → DESIGN.md <번호>번 ✅.
절차: <폴더>/docs/IMPROVEMENT_HANDOFF_YYYYMMDD.md
```

### 2-3. ⏸ 주인님께 먼저 여쭌다 (승인 전 하지 않음)
- 코드 수정 착수(플랜 승인), DB 스키마·예약 작업·환경변수·저장소(버킷) 설정 변경, 파일·데이터 삭제.
- 유료 API 호출(이미지·글 생성 버튼 포함), 최종 발행·발송·결제 버튼, 로그아웃처럼 모든 프로그램 세션에 영향을 주는 동작.
- 다른 CLI가 작업 중인 폴더에 손대는 것(ACTIVE_WORK 줄 또는 `git status`의 미커밋 변경이 있으면 기록만 하고 넘어감).
- 비밀번호·API 키 입력(에이전트는 입력하지 않는다 — 주인님이 직접).

---

## 3. 브라우저 검수 — CLI별 규칙

| CLI | 브라우저 | 맥미니 현황(2026-10-17) |
|---|---|---|
| Claude Code | **맥미니 Google Chrome**(claude-in-chrome 확장). `list_connected_browsers`에서 macOS·isLocal 항목만 선택 | ✅ 사용 중 |
| Codex · Antigravity | **맥미니 Microsoft Edge 전용, 화면에 보이는 창(포그라운드)** — 크롬은 Claude 전용이라 쓰지 않음 | ❌ **Edge 미설치** → 설치 전에는 ① 주인님께 Edge 설치 요청 또는 ② 화면 검수를 맥미니 Claude Code나 윈도우 CLI에 요청. 크롬으로 대신하지 않는다 |

> **2026-10-22 개정(주인님 지시)**: 브라우저 분담이 **Claude Code = 크롬, Codex = 엣지, agy = 네이버 웨일**로 바뀌었습니다(장비가 달라도 같음 — 그 장비에 웨일이 없으면 agy는 주인님께 설치를 요청). 이것은 기본 할당이며, 필요하면 주인님이 그 세션에서 브라우저를 지정하고 지정받은 세션은 그 브라우저를 씁니다(예: agy·Codex 토큰 한도 때 Claude Code 세션에 엣지/웨일). 원문: 루트 `CLAUDE.md` 맨 위 「CLI별 브라우저 고정 규칙」·「보조 지침 — 세션 지정 브라우저」.

공통 검수 순서(주인님이 보는 창에서, 단계마다 한글로 안내):
1. 시험 계정 `buylifemall@naver.com` 로그인 상태 확인(로그인은 주인님이 직접).
2. 데스크톱 폭에서 주요 화면 캡처(대시보드·작업 화면·📖 매뉴얼·설정).
3. 창을 390×800으로 줄여 휴대폰 화면 → ☰ 눌러 메뉴 순서·계정 위치 확인 → 원래 크기로 복구.
4. 옛 화면이 보이면 강력 새로고침(맥 `cmd+shift+r`) → DB 버전과 화면 왼쪽 위 버전 대조.
5. 요금 발생·발행·발송·로그아웃 버튼은 누르지 않는다.

---

## 4. 커밋 — `scripts/mac-mini/commit-gate.sh` (세 CLI 공통)

여러 CLI가 두 PC에서 **같은 Git 인덱스**를 쓰므로 `git add .`·`git commit -a`·`git stash`·`git reset`·`git checkout -- .` 은 금지. 이 스크립트를 쓴다.

> **권장(2026-10-23~, 윈도우와 같은 방식)**: 일반 파일은 `node scripts/commit-paths.mjs "<메시지>" <경로>... --push`, 공용 문서는 `node scripts/safe-commit.mjs`(→ `docs/CLI_COLLABORATION_RULES.md` 9번). `commit-paths`는 최신 HEAD에서 시작한 **임시 스테이징**으로 커밋해 공용 인덱스를 읽지 않고(새 파일·삭제·폴더·이미지 가능), 대량 삭제 검사를 직접 돌리며, 공용 인덱스가 정상일 때만 내 경로를 맞춘다. 아래 `commit-gate.sh`는 공용 인덱스를 직접 쓰므로 대안으로만. 2026-10-23 공용 스테이징이 두 번 비워졌다(`docs/ERROR_LESSONS.md`) — 모든 도우미·훅이 `.git/aimaster-index-log.txt`에 장비 이름과 함께 기록하므로, 맥미니에서 돈 것도 구분된다.
> **맥미니 첫 확인(비용 없음, 공유 저장소 안 건드림 — 맥 임시 폴더에서 돌아감)**: `node --test scripts/commit-paths.test.mjs scripts/safe-commit.test.mjs` → `pass 9`·`fail 0`이면 맥에서도 정상. 그리고 `sh -x .git/hooks/pre-commit 2>&1 | head -3`으로 훅이 `node`를 찾는지(못 찾으면 검사가 조용히 건너뜀).

```zsh
# 내 파일만 커밋 + 공용 문서는 「HEAD + 내 변경」만 올림
scripts/mac-mini/commit-gate.sh \
  -m "feat(<slug>): <무엇을> (vX.YY)

Co-Authored-By: <CLI 서명>" \
  -s DESIGN.md:/tmp/my_design_change.py \
  -s docs/ACTIVE_WORK.md:/tmp/my_activework_change.py \
  -- <프로그램폴더>/src <프로그램폴더>/docs <프로그램폴더>/AGENTS.md
```
- 스크립트가 하는 일: `git pull --ff-only` → `.git/index.lock`·남의 스테이징이 사라질 때까지 최대 5분 대기(잠금 파일은 지우지 않음) → 그래도 남의 스테이징이 있으면 **중단** → 내 경로만 `git add -A` → 공용 문서는 `git show HEAD:<파일> | python3 <변환>`로 계산해 올림 → 커밋·푸시.
- **변환 스크립트** = 표준입력(파일 전체) → 표준출력(내 변경을 적용한 전체). 예: 현황판 한 행 바꾸기
  ```python
  import sys,re
  t=sys.stdin.read()
  m=re.search(r"^\| 17 \| 이미지 변환 스튜디오 \|.*$",t,re.M); assert m
  c=m.group(0).split("|"); c[6]=" 🔵 작업 중 (Codex 맥미니 2026-10-18, 플랜 승인 대기) "
  sys.stdout.write(t.replace(m.group(0),"|".join(c)))
  ```
  HANDOFF 맨 위 항목 추가는 `# 작업 인수인계 현황판 (HANDOFF.md)\n\n` 바로 뒤에 끼워 넣는 변환을 쓴다.
- 커밋 뒤 `git show HEAD:<공용문서> | grep …`으로 실제 반영을 확인한다(다른 CLI가 먼저 같이 커밋해 주는 경우도 있음 — 내용만 맞으면 된다).
- 서명: Claude `Co-Authored-By: Claude …`, Codex·Antigravity는 각자 CLI 지침의 서명 규칙을 따른다(없으면 생략).

---

## 5. 표준 작업 루프 (디자인 리뉴얼 기준 — 다른 개발 작업도 같은 뼈대)

1. **시작 점검**: `git pull --ff-only` → `docs/HANDOFF.md` 맨 위 3개 → `docs/ACTIVE_WORK.md` → `git status --porcelain -- <폴더>` → `DESIGN.md`에서 다음 ⚪ 대상. DB `programs.app_url`로 실제 주소 확인(현황판·추측 주소를 믿지 않음 — 틀린 사례 있음).
2. **분석·플랜**: 화면·라우트·사이드바·`globals.css`·큰 파일·DB를 보고 `<폴더>/docs/PLAN_YYYYMMDD_DESIGN_RENEWAL.md` 작성(템플릿 권장안·현재 문제·화면별 변경·바꾸지 않는 것·검수·비용·버전). 현황판 🔵 + ACTIVE_WORK 내 줄 → 커밋 → **주인님께 플랜 보고 후 승인 대기**.
3. **구현**: Tailwind v4면 `@theme`에 토큰 접두어 하나로 색 정의 → 흰색·회색 클래스 일괄 치환(python 정규식, `bg-white` 앞에 `(?<![:\w/-])`) → 히어로·도식·📖 매뉴얼(`/guide` 또는 화면 안 매뉴얼) → 사이드바 「📖 연동 & 사용 매뉴얼」·휴대폰 ☰ → 버전 +0.01(`lib/version.ts`) → **tsc 오류 0**. 매뉴얼 문구는 코드로 사실 확인(없는 기능 금지).
4. **문서**: `DESIGN_HANDOFF.md`·`IMPROVEMENTS.md`(상태 갱신+새 제안)·`IMPROVEMENT_HANDOFF_YYYYMMDD.md`(윈도우 다음 첫 단계)·프로그램 `AGENTS.md` 버전 기록·루트 `PROGRAM_CAPABILITY_MAP.md`(목록 표 버전+카드)·`HANDOFF.md` 맨 위(제목에 `CLI(맥미니)`).
5. **마무리 커밋**: 현황판 🟠 「메인(윈도우) CLI 마무리 작업요망 (`vX.YY`, 템플릿, CLI 맥미니 날짜)」, ACTIVE_WORK 내 줄 삭제 → §4 스크립트로 커밋·푸시.
6. **보고(한글 존댓말)**: ① 작업 내용 ② 추가개선 제안 3대 항목(로직·기능 / UI·편의성 / 다른 프로그램 연계) + 다른 프로그램 1곳 둘러본 결과(그 폴더 `docs/IMPROVEMENTS.md`에 선제 기록, 다른 CLI 작업 중이면 HANDOFF에만) ③ 윈도우에 요청할 일(§2-2 양식) + 프로그램 링크 단독 줄.
7. **배포 확인**: 주인님이 「다했어」 → DB 버전·사이트 버전·브라우저(§3) 확인 → 안 됐으면 윈도우에 전달할 문장을 다시 드림(「다했어」가 다른 작업을 뜻한 사례 있음).

현황판 상태 기호: ⚪ 작업 예정 → 🔵 작업 중(착수 즉시) → 🟠 맥미니 완료·윈도우 배포 대기 → ✅ 1차 작업완료(윈도우) · ⏸ 보류.

---

## 6. 대화·보고 규칙 (세 CLI 공통, 주인님이 여러 번 강조)
- 진행 안내·도구 설명·명령 설명은 **쉬운 한글 존댓말**. 명령어·코드·실행 결과·파일 경로만 영어 그대로.
- 브라우저 조작은 주인님이 볼 수 있는 실제 창에서, 단계마다 무엇을 하는지 한글로 알린다.
- 한 번에 한 프로그램만 끝까지(플랜 → 구현 → 문서 → 커밋 → 윈도우 배포 → 확인). 중간에 새 요청이 오면 지금 작업을 커밋까지 마친 뒤 이어서 한다고 알린다.
- 확인하지 않은 주소·버전·배포 여부를 단정하지 않는다(모르면 「확인하지 않았습니다」).

---

## 7. 막혔을 때
| 증상 | 처리 |
|---|---|
| `.git/index.lock` 있음 / 남의 스테이징 | 기다림(스크립트가 5분), 그래도면 주인님께 알림. 잠금 파일 삭제 금지 |
| `git pull` 거절(갈라짐) | 원격 받아 합치되 다른 CLI 미커밋 파일은 건드리지 않음. 애매하면 주인님께 |
| `/Volumes/gt1_mega` 없음 | SMB 끊김 — 주인님께 재연결 요청, 로컬 복제본으로 대신하지 않음 |
| tsc가 node_modules 없음으로 실패 | 윈도우에 `npm install` 요청(맥에서 설치 금지) |
| 배포 확인 권한 없음(Vercel 403) | DB 버전·`curl` 버전·화면으로 판정 |
| Edge 없음(Codex·agy) | 주인님께 설치 요청 또는 검수를 Claude Code(맥미니)/윈도우에 요청 |

## 한국어 진행 표시 상기 훅 (2026-10-19 주인님 지시)

맥미니 Claude Code에도 윈도우와 같은 「매 질문마다 한국어 진행 표시 규칙 상기」 훅을 쓴다. 맥미니 터미널에서 한 번 실행한다(주인님 또는 맥미니 에이전트):

```bash
node /Volumes/gt1_mega/Antigravity/AIMaster/scripts/mac-mini/install-korean-reminder.mjs
```

- **(2026-10-19 확장) 3단 장치를 설치한다: ① 출력 스타일 `Korean`(기본 지침에 한국어 규칙, 재시작 후 적용) ② 질문마다 상기 ③ 도구 사용마다 상기.** 이전에 한 번 실행했어도 다시 실행하면 빠진 장치만 추가된다.
- 상기 스크립트를 `~/.claude/korean-reminder.js`로 복사하고, `~/.claude`·`CLAUDE_CONFIG_DIR`·Orca 계정 폴더(`~/Library/Application Support/orca/claude-profiles/*/home`)의 `settings.json`마다 `UserPromptSubmit` 훅 하나를 추가한다(기존 상태바 보호·Orca 훅 유지, 바꾸기 전 `settings.json.before-korean-hook` 백업, 두 번 실행해도 겹치지 않음).
- 새 Orca 계정을 연결하면 다시 실행한다. 적용은 다음 질문부터. 확인: 새 질문 때 훅 출력 「[0순위 규칙 상기] …」가 맥락에 들어오면 정상.
- 규칙 전문·원인 분석: 루트 `CLAUDE.md` 맨 위 0순위 규칙.
