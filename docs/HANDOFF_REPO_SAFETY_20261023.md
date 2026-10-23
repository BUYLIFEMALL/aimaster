# 저장소 공동 작업 안전장치 — 인수인계 (2026-10-23, Claude Code 윈도우 · 세션 `claude-win-lessons`)

> 다른 CLI(Claude Code·Codex·agy, 윈도우·맥미니)가 이어서 유지·보완하기 위한 문서입니다. 장치를 고치기 전에 이 문서 → [협업 지침 안전장치 표](guidelines/COLLABORATION.md) → [에러 교훈](ERROR_LESSONS.md) 맨 위 요약 표 순서로 읽습니다.
> 대상: **저장소 운영 도구만**(프로그램 코드·회원 기능·운영 DB 무관, 배포 비용 없음). 명령 목록은 `node scripts/index-watch.mjs help`.

## 1. 왜 만들었나 (목적)
- 윈도우 PC와 맥미니(SMB 공유)의 여러 CLI 세션이 **저장소 하나와 공용 스테이징(`.git/index`) 하나**를 함께 씁니다.
- 2026-10-23에 생긴 일
  - 11:13 공용 스테이징이 65개로 줄어든 채 커밋·푸시 → 원격 파일 1만여 개 삭제(`c2e7c4db2` 등, 복구 `237741cc3`)
  - 13:28·14:00 같은 축소 재발
  - 14:33~15:39 `index.lock`이 한 시간 남음
  - 남의 파일이 커밋에 섞이고 남의 HANDOFF 줄이 지워짐
- 목표는 다섯 가지입니다: ① 사고를 커밋·푸시 전에 막기 ② 사고가 나면 원인을 기록으로 좁히기 ③ 작업 시작 때 위험을 미리 알리기 ④ 세션끼리 정확히 묻고 답하기 ⑤ 위 장치가 고장 나도 알아채기

## 2. 장치 지도 (파일 → 하는 일)
| 파일 | 하는 일 | 누가 부르나 |
|---|---|---|
| `scripts/git-hooks/pre-commit`·`pre-push` → `scripts/check-index-health.mjs`·`check-shared-doc-reverts.mjs` | 50개 넘는 삭제·HEAD 절반 미만 스테이징이면 커밋·푸시 차단, 공용 스크립트(`deploy.mjs` 등)를 일반 `git commit`으로 올리면 차단, 공용 문서에서 최근 2시간 안 다른 커밋의 줄을 지우면 경고 | git 자동. 설치 `node scripts/git-hooks/install.mjs` |
| `scripts/git-hooks/commit-msg` | `AIMASTER_SESSION`이 있으면 `AIMaster-Session:` 트레일러, 없으면 **경고만**(막지 않음) | git 자동 |
| `scripts/safe-commit.mjs` | 공용 문서·공용 스크립트 전용. `--begin`으로 뜬 기준 사본 대비 「내 변경만」 최신 HEAD에 얹어 임시 스테이징으로 커밋, `--handoff`, `--mine`, 공용 스테이징 맞추기는 잠금으로 한 번에 하나 | 사람·CLI. **세션 이름 필수** |
| `scripts/commit-paths.mjs` | 그 밖 파일. 최신 HEAD 기반 임시 스테이징으로 지정 경로만 커밋(공용 스테이징을 읽지 않음), 대량 삭제 검사, 공용 문서는 거부 | 사람·CLI. **세션 이름 필수** |
| `scripts/index-watch.mjs` (블랙박스) | 부를 때마다 `.git/aimaster-index-log.txt`에 한 줄, 세션 시작 점검, 잠금 증거, 묵은 항목, 세션 주소 기록 | 훅·도우미·세션 시작 훅·사람 |
| `scripts/cloud-session-start.mjs` | 저장소 공용 SessionStart 훅. 로컬 Claude Code 세션마다 `index-watch.mjs claude-session-start --quiet --warn-lock` → ⚠만 세션에 표시 | Claude Code 자동(윈도우·맥미니) |
| `scripts/deploy.mjs` | 세션 시작 점검(`--version-only --all`)에 「[🚨 저장소 안전]」 묶음·훅 자기 시험·맨 끝 결론, 폴더 배포 점검에 작업 중 표 세션 이름·보낼 문안·「막힘」 줄 | 사람·CLI |
| `scripts/mac-mini/commit-gate.sh` | 맥미니가 공용 스테이징으로 커밋할 때: pull 전 축소 확인, pull 뒤 묵은 항목이면 멈춤 | 맥미니 |
| `scripts/assert-scratch-repo.mjs` | 시험·재현이 실제 저장소 안에서 돌면 즉시 실패 | 시험 파일·셸 명령 |
| `scripts/commit-paths.test.mjs`(6)·`scripts/safe-commit.test.mjs`(14) | 저장소 밖 임시 폴더에서 두 도우미 시험 | `node scripts/<파일>` |

### 기록 파일 (모두 `.git` 안 — 커밋 안 됨)
| 파일 | 내용 | 크기 제한 |
|---|---|---|
| `.git/aimaster-index-log.txt` | 시각·장비·pid·부른 곳(세션)·index 크기@시각·항목 수·HEAD 수·`lock=Ns`·`cli=` | 4만 줄 넘으면 3만 줄 |
| `.git/aimaster-lock-evidence.txt` | 잠금 5분 초과 시 잠금당 한 번: 생성 ±2분 기록 + 그 장비 git 관련 프로세스 | 100건 넘으면 50건 |
| `.git/aimaster-sessions.txt` | 세션 이름 · 장비 · `uds:<메시지 주소>`(`CLAUDE_CODE_MESSAGING_SOCKET`, TOKEN은 안 적음) | 2,000줄 넘으면 1,000줄 |
| `.git/safe-commit/<세션>/*.base` | `--begin` 기준 사본, 커밋 성공 시 삭제 | `deploy-*`는 24시간 지나면 세션 점검이 삭제 |

## 3. 세션 시작 점검이 알리는 것 (`AIMASTER_SESSION=<세션명> node scripts/index-watch.mjs session-check`)
⚠가 하나도 없으면 「[공용 스테이징] 이상 없음 — …」 한 줄로 끝납니다. 끝에는 「[작업 중 세션] 폴더 → 세션」 줄이 붙습니다. ⚠ 종류는 아래와 같습니다.
| ⚠ 이름 | 뜻 | 할 일 |
|---|---|---|
| 공용 스테이징 축소 감지/이력 | 항목 수가 HEAD 절반 미만(지금/24시간 안) | 지금이면 커밋·푸시 중단, 주인님께 |
| 공용 스테이징 잠금 오래 남음 · 잠금 증거 | `index.lock` 5분 초과 | 지우지 말고 양쪽 장비 git 프로세스 확인 후 주인님께 |
| 공용 스테이징 묵은 항목 | 작업 파일=HEAD인데 스테이징만 옛 판 | 안내된 `git reset -q HEAD -- <파일>`만(작업 파일 그대로) |
| 시작 점검 누락 | 24시간 안 기록은 있는데 시작 점검이 없는 장비·CLI | 그 CLI 지침 ⑥ 안내 |
| 작업 중 표 세션 이름 없음 / 오래된 줄 / 다른 세션이 고침 | ACTIVE_WORK 줄 관리 문제 | 이름 넣기 / 지우지 말고 주인님께 / 두 세션에 확인 |
| 오래된 기준 사본 | 24시간 넘은 `.git/safe-commit/<세션>` | `safe-commit --status`로 보고 그 세션에 확인 |
| 축소 원인 관찰(끝) | `a88f09453` 이후 24시간 관찰 | 아래 6-1 |

## 4. 정해진 규칙 (주인님 결정·승인)
- 커밋은 경로 지정만 합니다. 공용 문서·공용 스크립트는 `safe-commit`, 그 밖은 `commit-paths`(맥미니는 `commit-gate.sh`)를 씁니다. `--no-verify`, `git add -A`, 경로 없는 `git commit`은 쓰지 않습니다(루트 CLAUDE.md 최상단).
- **도우미는 세션 이름 필수**입니다(`--as` 또는 `AIMASTER_SESSION`). 형식은 `<claude|codex|agy>-<win|mac>-<날짜>-<작업>`입니다. 첫 단어로 블랙박스가 CLI를 구분합니다.
- 루트 `AGENTS.md`·`GEMINI.md` 최상위 ⑥: 작업 시작 때 `session-check`를 한 번 합니다(승인받음).
- 작업 중 표 줄의 「에이전트(장비)」 칸에는 `` 세션 `이름` ``을 꼭 넣습니다. 일부 파일만 맡으면 폴더 칸 끝에 `(범위: a·b/c)`(폴더 안 경로를 `·`로)를 적습니다. 줄을 올리면 `index-watch.mjs register <세션명>`을 실행합니다.
- 세션 사이 문의는 **임시 기준**입니다. 같은 장비 Claude Code끼리는 메시지(`who <세션명>`), 다른 장비·Codex·agy에는 작업 중 표·HANDOFF로 묻습니다.
- `safe-commit --begin`은 **고치기 전에 한 번만** 합니다. 기준 사본이 HEAD와 같은데 작업 파일이 바뀌었으면 거부합니다(`--force-begin`만 허용). `deploy.mjs`는 늘 `--force-begin`을 씁니다.

## 5. 고칠 때 주의 (오늘 실제로 틀린 것)
1. **시험은 저장소 밖에서** 합니다. 셸은 cd 직후 `node /d/Antigravity/AIMaster/scripts/assert-scratch-repo.mjs || exit 1`, 시험 파일은 `assertScratchRepo(dir)`를 씁니다. 오늘 실제 저장소에 시험 커밋 16개가 들어간 적이 있습니다.
2. **역슬래시가 든 수정은 Edit 도구로** 합니다. heredoc 안 파이썬·sed가 `\P`·`\t`를 바꿔 경로가 깨졌습니다(3번).
3. `index-watch.mjs`는 판정에 **`rawTag`를 씁니다.** `tag`에는 `(세션)`이 붙으므로, `tag === "session-check"`로 비교하면 이름을 붙였을 때 점검 전체가 건너뛰어집니다(오늘 버그).
4. `CODEX_HOME`은 이 PC 전체 설정이라 Claude Code 환경에도 있습니다. CLI 판정에 쓰지 않습니다.
5. 출력 줄의 ⚠·`[`로 시작하는 형식과 「공용 스테이징·축소·안전장치·되돌림」 낱말은 `deploy.mjs` 요약(`SAFETY` 정규식)이 읽습니다. 바꾸면 그쪽도 함께 맞춥니다.
6. 공용 스크립트(`safe-commit.mjs`·`deploy.mjs`·`index-watch.mjs` 등)는 다른 세션도 고칩니다(예: `804ebed90` 다른 세션의 `deploy.mjs` 수정). `--begin` → 고침 → `safe-commit`으로 커밋합니다.
7. 고친 뒤에는 시험 두 파일과 `node --check`를 돌립니다. `deploy.mjs`는 `--go` 없이 점검 모드로 실행해 봅니다(배포 안 함, 비용 없음).

## 6. 남은 일 (다음 첫 단계)
### 6-1. 2026-10-24 14:07 이후 — 축소 원인 관찰 마감
- 세션 점검에 「⚠ [축소 원인 관찰 끝]」이 나오면
  1. `docs/ERROR_LESSONS.md`의 2026-10-23 14:00 항목에 「확정: safe-commit 맞추기 경합(`a88f09453`로 해결), 24시간 축소 0번」을 기록합니다.
  2. `scripts/index-watch.mjs`의 `OBSERVE` 관찰 코드와 요약 줄의 「원인 관찰」 부분을 지웁니다.
- 「⚠ [축소 원인 관찰] … 뒤에도 축소 N번」이 나오면 확정하지 않고, 그 직전 기록을 14:00 항목에 덧붙입니다.

### 6-2. 맥미니에서 확인 (미확인)
- [플레이북](MAC_MINI_AGENT_PLAYBOOK.md) 「맥미니 첫 확인」을 실행합니다: 시험 `fail 0`, `pre-commit`이 node를 찾는지, `commit-msg` 경고가 나오는지, 블랙박스 장비 이름이 맥미니로 나오는지.
- 같은 문서의 「맥미니 ↔ 윈도우 메시지 시험」을 한 뒤, 결과로 [협업 지침](guidelines/COLLABORATION.md) 「세션 사이 문의 방법」의 **임시 기준**을 확정으로 고칩니다.

### 6-3. Codex·agy 실제 이행 확인
- `.git/aimaster-index-log.txt`에 `session-check(codex-…)`·`(agy-…)` 줄이 생기는지 봅니다(10-23 17:50까지 0건).
- 없으면 세션 점검의 「시작 점검 누락」이 알려 줍니다.

### 6-4. 검토 대기 제안 (주인님 판단 필요)
- **공용 스크립트도 작업 중 표에 올릴지**: 지금은 루트 공용 문서만 표에서 빠지는 규칙이고, `scripts/` 공용 스크립트는 정해진 바가 없습니다. 이 세션의 추천은 올리는 쪽입니다(코드라 겹치면 위험, 오늘 `deploy.mjs`를 두 세션이 함께 고침).
- `help` 내용을 협업 지침 표 아래에도 옮길지.
- HANDOFF 맨 위 「다음 첫 단계」에 6-2 맥미니 시험을 넣을지.

## 7. 확인 방법 (이어받은 뒤 처음 할 것)
```bash
cd /d/Antigravity/AIMaster
node scripts/index-watch.mjs help
AIMASTER_SESSION=<내 세션명> node scripts/index-watch.mjs session-check
node scripts/commit-paths.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"   # pass 6 · fail 0
node scripts/safe-commit.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"    # pass 14 · fail 0
cmp scripts/git-hooks/commit-msg .git/hooks/commit-msg && echo 훅 설치본 같음
```

## 8. 관련 문서
- [루트 CLAUDE.md 최상단](../CLAUDE.md) — 대량 삭제 사고 재발 방지 ①~⑤
- [협업 지침](guidelines/COLLABORATION.md) — 안전장치 표·도구 순서·사고 기록 절차·문의 방법
- [CLI 공동작업 원문](CLI_COLLABORATION_RULES.md) 9번 — 안전 커밋 도우미
- [멀티세션 규칙](MULTI_AGENT_SESSION_RULES.md) §2 — 세션 이름
- [작업 중 표](ACTIVE_WORK.md) 사용법 2 — 세션 이름·범위·주소 등록
- [에러 교훈](ERROR_LESSONS.md) 맨 위 요약 표 + 2026-10-23 항목들
- [맥미니 플레이북](MAC_MINI_AGENT_PLAYBOOK.md) — 첫 확인·매 작업 점검·메시지 시험
