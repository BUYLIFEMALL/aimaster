# 개선사항 원장 — YOUTUBE VIRAL FINDER (youtube-viral-studio)

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | 모바일 | 휴대폰에서 메뉴가 전혀 없음(사이드바 `hidden md:flex`, 위쪽 바·☰ 없음) — 다른 화면 이동 불가 | `src/components/layout/Sidebar.tsx` | 높음 | **구현(v1.13, 배포 대기)** |
| 2 | 2026-10-17 | 보안·캐시 | `(dashboard)/layout.tsx`에 `fetchCache = "force-no-store"` 누락 | `src/app/(dashboard)/layout.tsx` | 높음 | **구현(v1.13, 배포 대기)** |
| 3 | 2026-10-17 | 디자인 | 흰 배경·하늘색 선택, 유튜브 느낌 약함, 로그인 밝음 | `globals.css`, `Sidebar.tsx`, `(auth)/login` | 중간 | **구현(v1.13, 배포 대기)** |
| 4 | 2026-10-17 | 편의성 | 「대시보드」 메뉴가 1번 메뉴와 같은 `/viral-shorts` | `Sidebar.tsx`, `app/page.tsx` | 중간 | **구현(v1.13, 배포 대기)** |
| 5 | 2026-10-17 | 데이터 | 즐겨찾기가 `localStorage`에만 저장 — 기기·브라우저 바꾸면 사라짐. 회원별 DB 저장(+최상위 규칙의 30일 자동 삭제 적용 여부 결정) 필요 | `favorites/page.tsx` | 중간 | 제안(DB 스키마 변경 — 승인 필요) |
| 6 | 2026-10-17 | 문서 | `AGENTS.md` 현재 버전 표기 v1.09 ↔ 코드 v1.12 불일치 | `AGENTS.md` §1 | 낮음 | 제안(문서 정리) |
| 7 | 2026-10-17 | ① 로직·기능 | 검색 결과에 「채널 진단 보내기」 없음 — 터진 영상의 채널을 바로 깊게 분석할 수 없음 | 영상 카드·채널 카드 | 중간 | 제안 |
| 8 | 2026-10-17 | ① 로직·기능 | 같은 검색을 반복하면 매번 YouTube 할당량을 다시 씀 — 회원별 결과 임시 저장(30일 자동 삭제, 최상위 규칙)으로 재검색 비용 절감 | `api/youtube/*` | 중간 | 제안(DB 추가 — 승인 필요) |
| 9 | 2026-10-17 | ② UI·편의성 | 검색 전 빈 화면에 예시 키워드 칩(주식·다이어트·AI 등) 원클릭 검색 없음, 결과 정렬(VPH·vsRatio·점수) 토글 없음 | `viral-shorts/page.tsx` | 낮음 | 제안 |
| 10 | 2026-10-17 | ③ 타 프로그램 연계 | **`youtube-channel-consultant`의 「공략 채널 찾기」와 이 프로그램 「황금 채널 발굴」이 같은 기능**(구독자 1만 이하 + 평균 조회수 높은 채널) — 한쪽으로 합치거나 서로 링크 | `goldenChannels.ts` ↔ consultant `targets.ts` | 중간 | 제안 |
| 11 | 2026-10-17 | ③ 타 프로그램 연계 | 터진 쇼츠 → `shorts-viral-studio`(공식 분석→대본)로 영상 주소 넘기기, 황금 채널 → `youtube-channel-consultant` 채널 분석으로 넘기기, 터진 영상 제목 → `seo-thumbnail-pro` 메타데이터 전략 | 영상·채널 카드 | 중간 | 제안 |
