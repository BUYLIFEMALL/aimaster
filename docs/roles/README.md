# 역할별 현황 파일 (모든 CLI 공통)

> **2026-10-24 주인님 지시:** 「이후 각각의 CLI나 세션에서 작업 중인 에이전트들이 작업 전 읽거나 분석하고 또 결과를 갱신해 놓으면 나도 쉽게 이해하고 작업 진행을 할 수 있을 것 같아」.
> 근거 플랜: [`docs/PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md`](../PLAN_20261024_ADMIN_DEV_DOCS_CENTER.md) §2-1. 관리자 「개발 현황·지침 센터」(2단계 예정)가 이 파일들을 그대로 읽어 화면에 보여 준다.

## 쓰는 법
- **작업 전**: 내 역할 파일을 읽는다(지금 하는 일·대기·주인님께 여쭐 것).
- **작업 후**: 내 역할 파일의 「지금 하는 일 / 대기 중 / 최근 완료 / 다음 첫 단계 / 주인님께 여쭐 것 / 마지막 갱신」을 고친다.
  - 「최근 완료」는 최근 10개만 남기고 오래된 줄은 지운다. 상세 기록은 루트 [`HANDOFF.md`](../HANDOFF.md)에 그대로 남긴다.
  - 역할 파일 = 한눈에 보는 요약 현황, HANDOFF = 상세 기록이다.
- **자기 역할 파일만 고친다.** 다른 역할에 전할 일은 루트 HANDOFF에 남기고 그 세션에 알린다.
- 칸 이름(`## 지금 하는 일` 등)과 표 머리글은 바꾸지 않는다. 관리자 화면이 이 이름으로 읽는다.
- 커밋: 역할 파일은 역할마다 따로라서 경로를 지정해 커밋한다(`git commit -m "…" -- docs/roles/<파일>`). 이 README는 여러 세션이 고칠 수 있으니 [안전 커밋 도우미](../CLI_COLLABORATION_RULES.md) 9번으로 커밋한다.
- 새 역할이 생기면(주인님이 「너는 ○○ 담당이야」라고 지정) 아래 표에 한 줄을 넣고 [`_TEMPLATE.md`](_TEMPLATE.md)를 복사해 파일을 만든다.
- 세션이 끝나고 다른 세션이 이어받으면, 이어받은 세션이 「담당」 줄을 고치고 이전 세션 이름을 괄호로 남긴다.

## 역할 목록

| 역할 | 파일 | 담당(CLI·세션) | 맡은 범위(요약) | 카테고리 |
|---|---|---|---|---|
| 새 프로그램 분석·개발 플랜 | [analysis-planning.md](analysis-planning.md) | Claude Code(윈도우) `claude-win-dotori` | 외부 분석·비교·플랜·인계(구현 안 함) | 전체 |
| 블로그 | [blog.md](blog.md) | Claude Code(윈도우) `claude-win-20261024-blog3` | 블로그 9개 폴더 | 블로그 |
| 음악 | [music.md](music.md) | Claude Code(윈도우) `claude-win-20261024-music` | 음악 프로그램·배경음악 공용화 | 음악 |
| 영상 | [video.md](video.md) | Claude Code(윈도우) `claude-win-video` | 영상 스튜디오·공용 영상 코드·내 PC 렌더 영상 쪽 | 유튜브·멀티미디어 |
| 이커머스·이미지 | [ecommerce-image.md](ecommerce-image.md) | Claude Code(윈도우) `claude-win-sdp` | 바나나 캔버스·상세페이지·이미지 스튜디오 | 이커머스·이미지 |
| 문서 챗봇·AI Prompt | [docbot-prompt.md](docbot-prompt.md) | Codex(윈도우) `codex-win-20261024-docbot-g1` | 문서 챗봇·AI Prompt·공용 공급자 | Tools |
| AI 업무 워크스페이스 | [workspace.md](workspace.md) | Claude Code(윈도우) `claude-win-20261024-workspace` | `ai-work-workspace` | Tools |
| 검수 | [review.md](review.md) | Claude Code(윈도우) — 세션 이름 확인 필요 | 다른 CLI 작업 검수 | 전체 |
| 디자인 | [design.md](design.md) | Antigravity(`agy`) | 디자인 리뉴얼·매뉴얼 시각화 | 전체 |
| 맥미니 | [mac-mini.md](mac-mini.md) | Claude Code(맥미니) | 맥용 프로그램 개발·실물 테스트 | 맥용 |

> 전담 세션이 없는 카테고리(예: 쓰레드·인스타·CRM·부동산)의 프로그램을 작업하는 세션은 루트 HANDOFF에 기록한다. 주인님이 담당을 정하면 이 표에 줄을 추가한다.

## 처음 작성
- 2026-10-24 `claude-win-dotori`가 루트 HANDOFF·작업 중 표·세션 기록에서 확인된 사실만 옮겨 초안을 만들었다. **각 담당 세션은 다음 작업 때 자기 파일을 확인하고 고쳐 확정한다.**
