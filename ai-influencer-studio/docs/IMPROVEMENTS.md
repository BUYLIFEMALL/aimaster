# 개선사항 원장 — AI 인플루언서 자동화 (ai-influencer-studio)

> 2026-10-17 Claude Code(맥미니)가 `infinite-loop-video` v1.05 작업 중 타 프로그램 탐색(원칙 ⑫)으로 선제 기록. 아직 디자인 리뉴얼 전(DESIGN.md 15번 ⚪, 권장 크리에이티브 아틀리에). v1.09 기준.

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | ② UI·편의성 | 기본 흰 화면(Next 기본 `globals.css`) — 화보·인물 이미지 성격에 맞는 크리에이티브 아틀리에(다크 캔버스) 권장 | `src/app/globals.css` | 중간 | 제안 |
| 2 | 2026-10-17 | ② UI·편의성 | 매뉴얼이 팝업(`HelpModal`)뿐이고 `/guide` 페이지·「📖 연동 & 사용 매뉴얼」 메뉴 표준과 다름(원칙 ⑦) | `src/components/HelpModal.tsx`, `Sidebar.tsx` 209행 | 중간 | 제안 |
| 3 | 2026-10-17 | ① 로직·기능 | 생성 기록을 브라우저 `localStorage`에만 저장 — 다른 기기·브라우저에서 안 보이고, 캐시를 지우면 사라짐. 회원별 DB 저장(+30일 자동 삭제, 최상위 규칙) 검토 | `src/components/InfluencerStudio.tsx` 68·159행 | 중간 | 제안(DB 추가라 승인 필요) |
| 4 | 2026-10-17 | ① 로직·기능 | 입력 패널 `ControlPanel.tsx` 1,081줄 한 파일 — 단계(외형·일과·표정·광고·화보)별로 나누면 유지보수 쉬움 | `src/components/ControlPanel.tsx` | 낮음 | 제안 |
| 5 | 2026-10-17 | ③ 타 프로그램 연계 | 만든 인물 화보를 `insta_auto_poster`(인스타 포스팅)·`cardnews-studio`로 넘기는 버튼, 짧은 움직임은 `infinite-loop-video`로 반복 영상화 | 같은 계열 프로그램 | 낮음 | 제안 |

- 휴대폰 ☰ 메뉴는 이미 있음(`Sidebar.tsx`) — 리뉴얼 때 유지.
