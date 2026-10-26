# 역할별 현황 파일 (모든 CLI 공통)

> **2026-10-24 주인님 지시:** 「이후 각각의 CLI나 세션에서 작업 중인 에이전트들이 작업 전 읽거나 분석하고 또 결과를 갱신해 놓으면 나도 쉽게 이해하고 작업 진행을 할 수 있을 것 같아」.
> 근거 플랜: [`docs/PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md`](../PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md) §2-1. 관리자 「개발 현황·지침 센터」(2단계 예정)가 이 파일들을 그대로 읽어 화면에 보여 준다.

## 쓰는 법
- **작업 전**: 내 역할 파일을 읽는다(지금 하는 일·대기·주인님께 여쭐 것).
- **요청·건의**: 주인님께 여쭐 것·요청·건의·개선 제안은 「## 주인님께 여쭐 것」 칸에 한 줄씩 남긴다. 관리자 화면 「한눈에 보기」 맨 위 「📮 관리자에게 온 요청·건의」에 모여 보인다. 처리되면 그 줄을 지우고 「최근 완료」로 옮긴다.
- **작업 후**: 내 역할 파일의 「지금 하는 일 / 대기 중 / 최근 완료 / 다음 첫 단계 / 주인님께 여쭐 것 / 마지막 갱신」을 고친다.
  - 「최근 완료」는 최근 10개만 남기고 오래된 줄은 지운다. 상세 기록은 루트 [`HANDOFF.md`](../HANDOFF.md)에 그대로 남긴다.
  - 역할 파일 = 한눈에 보는 요약 현황, HANDOFF = 상세 기록이다.
- **자기 역할 파일만 고친다.** 다른 역할에 전할 일은 루트 HANDOFF에 남기고 그 세션에 알린다.
- 칸 이름(`## 지금 하는 일` 등)과 표 머리글은 바꾸지 않는다. 관리자 화면이 이 이름으로 읽는다.
- 커밋: 역할 파일은 역할마다 따로라서 경로를 지정해 커밋한다(`git commit -m "…" -- docs/roles/<파일>`). 이 README는 여러 세션이 고칠 수 있으니 [안전 커밋 도우미](../CLI_COLLABORATION_RULES.md) 9번으로 커밋한다.
- 새 역할이 생기면(주인님이 「너는 ○○ 담당이야」라고 지정) 아래 표에 한 줄을 넣고 [`_TEMPLATE.md`](_TEMPLATE.md)를 복사해 파일을 만든다.
- **정리 점검**: `node scripts/check-role-status.mjs`(읽기만 함). 3일 넘게 갱신이 없는 역할 파일, 아직 초안인 파일, 담당 세션이 역할 파일보다 나중에 커밋한 경우, 작업 중 표의 「종료」 줄·24시간 넘은 줄·`[역할: …]` 표시가 없는 줄을 보여 준다. 작업 시작·끝에 한 번씩 돌리면 좋다. 관리자 화면용으로 `--json`도 있다.
- 세션이 끝나고 다른 세션이 이어받으면, 이어받은 세션이 「담당」 줄을 고치고 이전 세션 이름을 괄호로 남긴다.

## 역할 목록

| 역할 | 파일 | 담당(CLI·세션) | 맡은 범위(요약) | 카테고리 |
|---|---|---|---|---|
| 새 프로그램 분석·개발 플랜 | [analysis-planning.md](analysis-planning.md) | Claude Code(윈도우) `claude-win-20261027-analysis`(이전 `claude-win-dotori`) | 외부 분석·비교·플랜·인계(구현 안 함) | 전체 |
| 블로그 | [blog.md](blog.md) | Codex(윈도우·엣지) `codex-win-20261025-blog` | 블로그 9개 폴더 | 블로그 |
| 음악 | [music.md](music.md) | Claude Code(윈도우) `claude-win-20261024-music` | 음악 프로그램·배경음악 공용화 | 음악 |
| 영상 | [video.md](video.md) | Claude Code(윈도우) `claude-win-video` | 영상 스튜디오·공용 영상 코드·내 PC 렌더 영상 쪽 | 유튜브·멀티미디어 |
| 이커머스·이미지 | [ecommerce-image.md](ecommerce-image.md) | Claude Code(윈도우) `claude-win-sdp` | 바나나 캔버스·상세페이지·이미지 스튜디오 | 이커머스·이미지 |
| 문서 챗봇·AI Prompt | [docbot-prompt.md](docbot-prompt.md) | Codex(윈도우) `codex-win-20261025-docbot-release` | 문서 챗봇·AI Prompt·공용 공급자(디자인은 agy) | 업무자동화·AI 프롬프트 |
| AI 업무 워크스페이스 | [workspace.md](workspace.md) | Claude Code(윈도우) `claude-win-20261025-workspace` | `ai-work-workspace`, `ai-task-planner` | Tools |
| 검수 | [review.md](review.md) | Claude Code(윈도우) — 세션 이름 확인 필요 | 다른 CLI 작업 검수 | 전체 |
| 디자인 | [design.md](design.md) | Antigravity(`agy`) | 디자인 리뉴얼·매뉴얼 시각화 | 전체 |
| 부동산 | [realty.md](realty.md) | Claude Code(윈도우) `claude-win-20261024-realty` | `realty-listing-alert`(새 프로그램 구현)·부동산 프로그램 | 부동산 |
| 맥미니 | [mac-mini.md](mac-mini.md) | Claude Code(맥미니) | 맥용 프로그램 개발·실물 테스트 | 맥용 |
| (전담 없음) | [unassigned.md](unassigned.md) | 전담 역할이 없는 모든 세션 | 역할 없는 작업의 요약·요청·건의 공용 칸(여러 세션이 쓰므로 안전 커밋 도우미) | 전체 |

> 전담 세션이 없는 카테고리(예: 쓰레드·인스타·CRM·부동산)의 프로그램을 작업하는 세션은 루트 HANDOFF에 기록한다. 주인님이 담당을 정하면 이 표에 줄을 추가한다.

## 관리자 화면 요청 처리 (2026-10-24 — 관리자 지시는 절대 지시)

주인님은 관리자 「개발 문서 관리」(https://www.buylife.xyz/admin/dev-docs)에서 모든 지침·역할 파일·프로그램 문서를 보고, 그 자리에서 세 가지를 남긴다. 저장된 요청은 운영 DB 표 `admin_dev_requests`에 「반영 대기」로 쌓인다.

| 종류 | 화면 버튼 | 처리 | 명령 |
|---|---|---|---|
| **수정안** | ✏️ 직접 수정 | 주인님이 고친 문서 전체를 그 문서에 반영(그사이 바뀐 부분과 3-way 병합) | `node scripts/dev-requests.mjs apply <id> --as <세션>` |
| **관리자 지시** | ⚠ 관리자 지시 달기 | 그 문서 맨 위(첫 제목 아래)에 「🗣 주인님(관리자) 지시 — 날짜」 칸으로 옮겨 적기. **그 문서를 읽는 모든 CLI가 문서 내용보다 먼저 따른다** | `apply <id> --as <세션>` |
| **역할 메모** | 📝 이 역할에 메모 | 그 역할 담당 세션이 읽고 작업 방향을 맞춘 뒤 처리 기록 | `done <id> --as <세션> --note "어떻게 따랐는지"` |

- **작업 시작 때**: `node scripts/dev-requests.mjs list --role <내 역할 ID>`(전체는 `list`). 대기 요청이 있으면 다른 일보다 먼저 처리한다.
- **관리자 지시·메모는 절대 지시**다. 반려(`reject`)하지 않는다. 최상위 규칙(회원 본인 계정·키, 운영/Lab 분리, 비용 승인)과 부딪히면 실행하지 말고 주인님께 먼저 여쭌다.
- 수정안이 그사이 바뀐 같은 줄과 부딪혀 자동으로 합쳐지지 않으면 도구가 멈춘다(문서는 그대로). 주인님께 알리고 `show <id>`로 수정본을 본 뒤 손으로 반영하고 `done <id> --note`로 기록한다.
- 반영하면 화면 「수정 요청함」에 커밋 번호가 표시된다. 화면은 GitHub 최신본을 읽으므로 **푸시해야 화면 문서에 보인다**(작업 단위 끝에 모아서 푸시).
- 새 문서를 만들거나 지우면 `node scripts/build-dev-docs-manifest.mjs`로 문서 목록을 다시 만들어 같이 커밋한다(화면 목록의 기준).

## 역할 이름으로 기록하기 (2026-10-24 주인님 승인: 「세션 이름 대신 역할 이름으로 기록하기 … 진행해」)

세션 이름은 자주 바뀐다(예: `claude-win-20261023-blog2` → `claude-win-20261024-blog3`, `codex-win-20261024-docbot-prompt` → `codex-win-20261024-docbot-g1`). 그래서 기록에는 **바뀌지 않는 역할 ID를 함께** 쓴다. 관리자 「개발 현황·지침 센터」와 점검 도구가 이 표시로 역할별 기록을 모은다.

- **역할 ID = 이 폴더의 역할 파일 이름**(확장자 뺀 것): `analysis-planning` · `blog` · `music` · `video` · `ecommerce-image` · `docbot-prompt` · `workspace` · `review` · `design` · `mac-mini` · `realty` · `unassigned`(전담 없음)
- 전담 역할이 없는 작업은 `[역할: 미지정]`이라고 쓴다. 주인님이 담당을 정하면 새 역할 ID를 이 표에 추가한다.
- **어디에 쓰나**
  1. 루트 `docs/HANDOFF.md` 항목 제목: 날짜·상태 표시 바로 뒤에 넣는다.
     ``## 2026-10-24 ✅ [역할: blog] Claude Code(윈도우) · 세션 `claude-win-20261024-blog3` — 제목``
  2. `docs/ACTIVE_WORK.md` 「에이전트(장비)」 칸 맨 앞: ``[역할: music] Claude Code(윈도우, 크롬) · 세션 `…` ``
  3. 커밋 메시지는 지금처럼 쓰고(영어), 안전 커밋 도우미 `--as`에는 세션 이름을 그대로 넣는다(역할 ID는 넣지 않아도 됨).
- 하나의 작업이 두 역할에 걸치면 주된 역할 하나만 쓴다(예: 이커머스 담당이 맥미니 요청을 배포 → `[역할: ecommerce-image]`).
- 이전 기록은 고쳐 쓰지 않는다. 대신 아래 「이전 세션 이름」으로 옛 기록을 역할에 연결한다.

| 역할 ID | 지금 세션 | 이전 세션 이름(옛 기록 연결용) |
|---|---|---|
| `analysis-planning` | `claude-win-20261027-analysis` | `claude-win-dotori` |
| `blog` | `codex-win-20261025-blog` | `claude-win-20261024-blog3`, `claude-win-20261023-blog2`, `claude-win-20261023-seo-bg` |
| `music` | `claude-win-20261024-music` | — |
| `video` | `claude-win-video` | — |
| `ecommerce-image` | `claude-win-sdp` | `claude-mac-20261023-ecommerce`(맥미니 이커머스, 마무리됨) |
| `docbot-prompt` | `codex-win-20261025-docbot-release` | `codex-win-20261025-docbot-g4`, `codex-win-20261025-docbot-g3`,  `codex-win-20261024-docbot-g2`, `codex-win-20261024-docbot-g1`, `codex-win-20261024-docbot-prompt` |
| `workspace` | `claude-win-20261025-workspace` | `claude-win-20261024-workspace` |
| `review` | 확인 필요 | — |
| `design` | `agy-win-20261024-videorender`(최근) | — |
| `mac-mini` | 확인 필요 | — |

세션이 바뀌면 이어받은 세션이 이 표의 「지금 세션」을 고치고, 옛 이름을 「이전 세션 이름」으로 옮긴다.

## 처음 작성
- 2026-10-24 `claude-win-dotori`가 루트 HANDOFF·작업 중 표·세션 기록에서 확인된 사실만 옮겨 초안을 만들었다. **각 담당 세션은 다음 작업 때 자기 파일을 확인하고 고쳐 확정한다.**
