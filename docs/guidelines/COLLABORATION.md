# CLI 협업·작업 환경 지침 요약

[분야별 색인](README.md) · 모든 CLI와 장비에 적용하며 상세 작업법은 [협업 원문](../CLI_COLLABORATION_RULES.md)을 확인합니다.

**여러 세션의 동시 작업은 [멀티에이전트·멀티세션 공동 작업 규칙](../MULTI_AGENT_SESSION_RULES.md)을 먼저 읽습니다.** 주인님의 2026-10-23 추가 요청으로 등록한 세션 식별·공용 자원·데이터 수정·인계 기준입니다. 아래는 빠른 안내입니다.

## 현재 작업 환경과 세션 구분

2026-10-23 주인님 확인: **윈도우 PC가 메인, 맥미니가 원격 작업에 참여하는 보조 PC이며 AGY·CODEX·CLAUDE CODE의 멀티세션 환경**입니다. 같은 CLI의 다른 세션도 별도 작업자로 구분합니다.

| 구분 | 윈도우 메인 PC | 맥미니 보조 PC |
|---|---|---|
| 작업 폴더 | `D:\Antigravity\AIMaster` | SMB `/Volumes/gt1_mega/Antigravity/AIMaster` — 같은 저장소/파일/인덱스 |
| 참여 도구 | AGY·CODEX·CLAUDE CODE의 여러 세션 | AGY·CODEX·CLAUDE CODE 원격 세션, 실제 등록/연결 상태 확인 |
| 작업 역할 | 담당 폴더 개발·검사·빌드·배포·운영 적용 | 담당 폴더 분석·개발·문서·허용된 검사·커밋/푸시 |
| 윈도우에 넘기는 작업 | 인수인계 내용·담당 표·비용 승인 범위 확인 후 실행 | 설치·dev/build·배포·확장 ZIP·DB 쓰기는 기존 맥미니 지침대로 윈도우에 인계 |

담당 행·인수인계·안전 커밋의 `--as`에는 **장비 + CLI + 세션/작업명**을 구분해 적습니다. 예: `codex-win-guidelines-20261023`, `claude-mac-gif-guide`. `Claude`·`Codex`라는 이름만 보고 같은 세션으로 판단하거나 다른 세션 행을 지우지 않습니다.

맥미니에서 저장한 변경과 Git 작업도 윈도우에 즉시 영향을 줍니다. 별도 로컬 클론·공용 브랜치 전환·전체 스테이징 정리로 세션을 분리하지 않으며, 담당 폴더와 공용 문서 변경 단위로 협업합니다. 원격 화면을 보고 있다는 이유로 다른 세션의 브라우저를 사용할 수 있다고 가정하지 않습니다.

## 담당 확인과 기존 작업 보존

- 시작 전 [ACTIVE_WORK](../ACTIVE_WORK.md)·[최신 HANDOFF](../HANDOFF.md)·`git status --porcelain -- <대상폴더>`를 대조합니다. 같은 서브프로그램은 두 CLI가 동시에 수정하지 않습니다. 읽기 분석과 실제 변경을 구분합니다.
- 시작 시 본인 담당 행에 폴더·CLI/장비·시각·작업을 기록하고, 종료 시 인수인계를 남긴 후 본인 행을 지웁니다. 오래된 다른 CLI 행을 임의로 지우지 않습니다. 루트 공용 문서는 원문의 공용 문서 협업 절차를 따릅니다.
- 다른 CLI와 결과가 다르면 목적·최신 지시·변경 차이·검수 근거를 비교합니다. 본인이 썼거나 더 최근이라는 이유로 우선하지 않습니다. 충돌이 불명확하면 기존 작업을 보존하고 확인받습니다.
- 공유 저장소 전체 reset/stash/checkout이나 타 CLI 변경·스테이징의 덮어쓰기를 하지 않습니다. 커밋 직전 최신 HEAD·차이·스테이징을 다시 확인합니다.
- `.git/index.lock`은 임의로 지우지 않습니다. 새 커밋의 파일 수·삭제 규모가 요청 범위와 다르면 최신 HEAD·인덱스·원격을 대조하고, 관계없는 삭제를 이번 작업에 섞지 않습니다. 최근 실제 사고/복구는 ERROR_LESSONS와 HANDOFF에서 확인합니다.

## 공용 문서는 안전 커밋

HANDOFF·ACTIVE_WORK·루트 지침·아이디어·디자인·공용 모듈 등 공동 편집 문서는 다음 흐름을 사용합니다.

```text
node scripts/safe-commit.mjs --begin <파일>... --as <세션이름>
# 본인 변경만 작성
node scripts/safe-commit.mjs "<메시지>" <파일>... --as <세션이름> [--push]
```

고치기 직전에 기준 사본을 만들고, 고친 뒤 바로 검토·커밋합니다. 도우미의 병합/충돌·미리보기·한계·HANDOFF 전용 추가 명령은 [협업 원문 9번](../CLI_COLLABORATION_RULES.md)을 확인합니다. 도우미를 썼다는 사실만으로 다른 CLI 변경까지 안전하게 분리됐다고 가정하지 않습니다.

## 공용 저장소 안전장치 (2026-10-23 추가)

2026-10-23 공용 스테이징(`.git/index`)이 세 번 비워지고 파일 1만여 개가 지워진 커밋이 원격까지 간 사고 뒤 생긴 장치입니다. 끄거나 우회하지 않습니다(`--no-verify` 금지). 상세는 [협업 원문 9번](../CLI_COLLABORATION_RULES.md)·[에러 교훈](../ERROR_LESSONS.md) 2026-10-23 항목.

| 장치 | 하는 일 | 쓰는 법 |
|---|---|---|
| 커밋 전·푸시 전 훅 (`scripts/git-hooks/`, `check-index-health.mjs`) | 파일을 50개 넘게 지우거나 스테이징이 HEAD의 절반 아래면 커밋·푸시를 막음 | 자동. 새 장비는 `node scripts/git-hooks/install.mjs`. 승인된 대량 삭제만 `AIMASTER_ALLOW_MASS_DELETE=1` |
| 일반 커밋 도우미 `scripts/commit-paths.mjs` | 최신 HEAD에서 시작한 임시 스테이징으로 커밋(공용 스테이징을 읽지 않음, 새 파일·삭제·폴더·이미지 가능), 대량 삭제 검사 직접 실행, 공용 스테이징은 정상일 때만 맞춤 | `node scripts/commit-paths.mjs "<메시지>" <경로>... [--push] [--as <세션>]` — 경로 지정 커밋의 대안 |
| 안전 커밋 도우미 `scripts/safe-commit.mjs` (공용 문서·공용 스크립트) | 내 변경만 최신 HEAD에 얹음. 겹치면 내 변경 덩어리를 같은 자리에, `--mine`은 최근 다른 커밋이 있으면 푸시 보류, 공용 스테이징 맞추기는 한 번에 한 도우미(잠금) | `--begin` → 고침 → 커밋(협업 원문 9번). 공용 스크립트를 일반 커밋하면 훅이 알림 |
| 블랙박스 `scripts/index-watch.mjs` → `.git/aimaster-index-log.txt` | 세션 시작·훅·도우미마다 스테이징 크기·항목 수·장비·세션·CLI·잠금 나이를 한 줄 기록, 줄면 ⚠와 직전 기록. 세션 점검에서 ⚠로 알리는 것: 축소 이력·`index.lock` 5분 넘음·**묵은 스테이징 항목**(작업 파일=HEAD인데 스테이징만 옛 판, 정리 명령 함께)·**시작 점검 누락**(24시간 안 기록은 있는데 시작 점검이 없는 장비·CLI). ⚠가 없으면 「[공용 스테이징] 이상 없음」 한 줄 | **작업 시작 때** `AIMASTER_SESSION=<세션명> node scripts/index-watch.mjs session-check`(루트 AGENTS.md·GEMINI.md 최상위 ⑥, Claude Code는 세션 시작 훅이 자동). 세션 이름 첫 단어(`claude-`·`codex-`·`agy-`)로 CLI를 구분 |
| 잠금 증거 `.git/aimaster-lock-evidence.txt` | 잠금이 5분 넘으면 잠금 하나당 한 번, 생성 ±2분 기록 줄과 **그 장비의** git 관련 프로세스(시작 시각·명령줄)를 남김. 100건 넘으면 최근 50건만 | 자동. 세션 점검에 「[공용 스테이징 잠금 증거]」 한 줄 요약(지금 잠금이면 ⚠). 잠금 파일은 지우지 말고 주인님께 |
| 맥미니 커밋 스크립트 `scripts/mac-mini/commit-gate.sh` | 공용 스테이징으로 커밋하는 맥미니 절차 — pull 전 축소 확인, pull 뒤 묵은 항목이 있으면 멈추고 정리 명령 안내, 다른 CLI 스테이징·잠금은 최대 5분 대기 | 맥미니 [플레이북](../MAC_MINI_AGENT_PLAYBOOK.md). 윈도우는 `commit-paths.mjs`·`safe-commit.mjs` |
| 세션 시작 점검 자기 시험 (`deploy.mjs --version-only --all`) | 훅이 실제로 막는지 매번 흉내 내 확인, 고장이면 ⚠ | 자동 |
| 실제 저장소 시험 차단 `scripts/assert-scratch-repo.mjs` | 지금 폴더가 이 저장소 안이면 즉시 실패 | 셸 재현 명령은 cd 직후 `node <경로>/scripts/assert-scratch-repo.mjs \|\| exit 1`, 시험 파일은 `assertScratchRepo(dir)` |

**어떤 도구를 언제 쓰나(순서)**
1. 작업 시작: `AIMASTER_SESSION=<세션명> node scripts/index-watch.mjs session-check` — ⚠가 있으면 아래 2~4로 가기 전에 해결(묵은 항목은 안내된 `git reset -q HEAD -- <파일>`만, 축소·잠금은 주인님께).
2. 공용 문서·공용 스크립트(`docs/HANDOFF.md`·`ERROR_LESSONS.md`·`AGENTS.md` 등, `scripts/safe-commit.mjs`·`commit-paths.mjs`·`index-watch.mjs` 등): 고치기 전 `safe-commit.mjs --begin` → 고침 → `safe-commit.mjs "<메시지>" <파일> --as <세션>`. HANDOFF 항목은 `--handoff <항목.md>`.
3. 그 밖의 파일(프로그램 코드 등), 윈도우: `commit-paths.mjs "<메시지>" <경로>... --as <세션>`. 맥미니: `commit-gate.sh -m "<메시지>" -- <경로>`.
4. 커밋 뒤 `git show --stat HEAD | tail -1`로 바뀐 파일 수를 확인하고, 푸시는 작업 단위로 모아서 `--push`(메인 사이트 자동 빌드가 푸시마다 생김).
5. 재현·시험 명령은 저장소 밖 임시 폴더에서, cd 직후 `assert-scratch-repo.mjs`.

스테이징이 줄어 있으면(`git ls-files | wc -l`이 HEAD보다 크게 적음) 커밋·푸시를 멈추고 주인님께 먼저 알립니다. 고칠 때는 승인 뒤 「남은 항목이 모두 HEAD와 같은지」 확인하고 `git read-tree HEAD` — 작업 폴더는 건드리지 않습니다.

**저장소 사고가 나면 기록(2026-10-23)**: ① [에러 교훈](../ERROR_LESSONS.md)에 날짜 항목(증상 → 원인 → 해결 → 다음부터)을 쓰고 ② 그 문서 맨 위 「저장소·공용 스테이징 사고 한눈에 보기」 표에 **한 줄**(일어난 일 | 지금 막는 장치)을 더합니다 — 날짜가 바뀌면 표 제목의 날짜를 「~부터」로 넓히고 줄은 지우지 않습니다. ③ 새 장치를 만들었으면 위 안전장치 표에도 한 줄. 증거는 `.git/aimaster-index-log.txt`(블랙박스)·`.git/aimaster-lock-evidence.txt`(잠금)·`git log --format='%h %(trailers:key=AIMaster-Session,valueonly)'`(어느 세션)에서 찾습니다.

## 브라우저 분담

| CLI | 기본 브라우저 |
|---|---|
| Claude Code | 해당 장비의 Chrome 기본 프로필 실제 창 |
| Codex | 해당 장비의 Microsoft Edge 실제 창 |
| Antigravity(`agy`) | 해당 장비의 네이버 Whale 실제 창 |

모두 포그라운드로 검수하고 다른 CLI·다른 장비의 창을 건드리지 않습니다. **주인님이 그 세션 채팅에서 다른 브라우저를 지정하면 해당 세션만 예외**이며 ACTIVE_WORK에 명시합니다. 기존 사용 세션과 충돌하면 먼저 확인합니다. 과거의 ‘agy도 Edge’ 기록은 2026-10-22 개정과 구분합니다.

## 역할·장비·도구의 조건부 원문

- Codex는 기획/설계/디버깅/시험, Claude Code는 복잡한 구현/추가/리팩터링이 주력입니다. agy는 주인님 배정에 따릅니다. 주력 역할은 요청 범위나 검수·인수인계 책임을 제한하지 않습니다.
- 맥미니는 공유 SMB 작업 폴더·커밋 게이트·윈도우에 요청할 빌드/배포/DB 작업을 [맥미니 작업 지침](../MAC_MINI_WORK_GUIDE.md)과 [플레이북](../MAC_MINI_AGENT_PLAYBOOK.md)에서 확인합니다. 별도 로컬 클론을 기준으로 작업하지 않습니다.
- 클라우드는 [클라우드 세션 원문](../CLOUD_SESSION.md)의 `cloud-work` 브랜치·배포/버전/DB 쓰기 제한을 따릅니다. 공유 로컬 폴더의 브랜치를 임의 전환하지 않습니다.
- Claude 로그인 계정과 상태바 보호는 [루트 원문](../../CLAUDE.md) 및 [상태바 지침](../CLAUDE_STATUSBAR.md)을 확인합니다. CLI 로그인 보조 계정은 사이트 관리자/시험 계정과 별개입니다.
- 외부 스킬·gstack은 [선택 사용 지침](../EXTERNAL_SKILLS_POLICY.md)과 루트 원문을 따릅니다. 설치 여부를 CLI/계정별로 확인하고 스킬의 기본 배포·브라우저 방식으로 저장소 규칙을 대체하지 않습니다.
