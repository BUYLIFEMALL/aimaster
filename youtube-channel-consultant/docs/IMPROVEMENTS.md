# 개선사항 원장 — YOUTUBE CHANNEL CONSULTANT (youtube-channel-consultant)

> 2026-10-17 Claude Code(맥미니)가 `youtube-viral-studio` v1.13 작업 중 타 프로그램 탐색(원칙 ⑫)으로 선제 기록 + 디자인 리뉴얼 분석.

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | ② UI·편의성 | 흰 배경, 유튜브 느낌 약함, 로그인 밝음 | `globals.css`, `(auth)/login` | 중간 | **구현(v1.07, 배포 대기)** |
| 2 | 2026-10-17 | ② UI·편의성 | 📖 매뉴얼 메뉴·`/guide` 없음(원칙 ⑦) | `Sidebar.tsx` UTILITY_ITEMS | 높음 | **구현(v1.07, 배포 대기)** |
| 3 | 2026-10-17 | ③ 타 프로그램 연계 | 「공략 채널 찾기」(`targets.ts`)가 `youtube-viral-studio` 「황금 채널 발굴」(`goldenChannels.ts`)과 같은 기능 — 한쪽으로 통합하거나 서로 연결 | 두 파일 | 중간 | **완료(2026-10-17 v1.08)** — 공용 기준 코드 `youtube-golden-engine`(이 프로그램 `goldenEngine.ts`가 기준, viral-studio는 사본). `docs/SHARED_MODULES.md` |
| 4 | 2026-10-17 | ③ 타 프로그램 연계 | VIRAL FINDER의 영상·채널 카드에서 「이 채널 분석」을 누르면 이 프로그램 `/channel-analysis?channel=`으로 넘어오게(입력값 쿼리 받기 필요) | `channel-analysis/page.tsx` | 중간 | 제안 |
| 5 | 2026-10-17 | ① 로직·기능 | 분석 결과가 저장되지 않아 같은 채널을 다시 보려면 할당량을 다시 씀 — 회원별 저장 + 30일 자동 삭제(최상위 규칙) | `api/youtube/*` | 중간 | 제안(DB 추가 — 승인 필요) |
| 6 | 2026-10-17 | 문서 | `AGENTS.md` 현재 버전 v1.03 ↔ 코드 v1.06 불일치 | `AGENTS.md` §1 | 낮음 | 제안 |
| 7 | 2026-10-17 | ② UI·편의성 | 분석 화면 입력칸에 최근 분석한 채널·키워드 바로 다시 넣기(브라우저 기록) 없음 | `channel-analysis`·`keyword-analysis` | 낮음 | 제안 |
| 8 | 2026-10-17 | ③ 타 프로그램 연계 | 키워드 분석 결과 → `blog-keyword`/`longtail-keyword-expander`로 키워드 넘기기(유튜브·블로그 동시 공략), 채널 진단 결과 → `seo-thumbnail-pro`로 제목·썸네일 전략 넘기기 | 결과 화면 | 낮음 | 제안 |
