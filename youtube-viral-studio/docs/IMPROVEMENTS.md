# 개선사항 원장 — YOUTUBE VIRAL FINDER (youtube-viral-studio)

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | 모바일 | 휴대폰에서 메뉴가 전혀 없음(사이드바 `hidden md:flex`, 위쪽 바·☰ 없음) — 다른 화면 이동 불가 | `src/components/layout/Sidebar.tsx` | 높음 | 플랜 포함(승인 대기) |
| 2 | 2026-10-17 | 보안·캐시 | `(dashboard)/layout.tsx`에 `fetchCache = "force-no-store"` 누락 | `src/app/(dashboard)/layout.tsx` | 높음 | 플랜 포함 |
| 3 | 2026-10-17 | 디자인 | 흰 배경·하늘색 선택, 유튜브 느낌 약함, 로그인 밝음 | `globals.css`, `Sidebar.tsx`, `(auth)/login` | 중간 | 플랜 포함 |
| 4 | 2026-10-17 | 편의성 | 「대시보드」 메뉴가 1번 메뉴와 같은 `/viral-shorts` | `Sidebar.tsx`, `app/page.tsx` | 중간 | 플랜 포함 |
| 5 | 2026-10-17 | 데이터 | 즐겨찾기가 `localStorage`에만 저장 — 기기·브라우저 바꾸면 사라짐. 회원별 DB 저장(+최상위 규칙의 30일 자동 삭제 적용 여부 결정) 필요 | `favorites/page.tsx` | 중간 | 제안(DB 스키마 변경 — 승인 필요) |
| 6 | 2026-10-17 | 문서 | `AGENTS.md` 현재 버전 표기 v1.09 ↔ 코드 v1.12 불일치 | `AGENTS.md` §1 | 낮음 | 제안(문서 정리) |
