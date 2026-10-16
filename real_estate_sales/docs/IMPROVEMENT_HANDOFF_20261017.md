# 개선 인수인계 — 부동산 실거래 투자분석 자동화 (2026-10-17, Claude Code 맥미니)

## 한 일 (v1.11) — 주인님 승인 후 구현
스마트 매트릭스 스타일(다크 슬레이트) 디자인 리뉴얼. 플랜 [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md), 디자인 [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md), 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md).

## 바뀐 파일
- 신규: `src/app/(dashboard)/guide/page.tsx`, `src/components/listings/ListingMatrix.tsx`, `src/components/ui/{PageHero,KpiCard}.tsx`(ghost-scraper와 같은 파일), `src/lib/format.ts`, `AGENTS.md`, `docs/*`
- 수정: `src/app/globals.css`(@theme `mx-*` + 옛 `gold`·`dark-*` 이름을 다크 토큰으로 재연결), `src/app/layout.tsx`, `src/app/(auth)/layout.tsx`(다크 배경 — 원칙 13), 로그인·회원가입·모든 화면·컴포넌트의 `zinc`·흰색·빨강·초록·`#005acc` 클래스를 토큰으로 일괄 치환, `src/components/layout/Sidebar.tsx`(☰·📖), 대시보드·관심 지역·실거래 목록·상세·설정 페이지, `src/lib/version.ts`(v1.11)
- 서버 액션·수집·AI 분석·DB 변경 없음.

## 확인한 것 / 못 한 것
- 확인: 정적 검토, DB 타입 대조(`floor`는 문자열), 매뉴얼 문구를 코드와 대조(자치구 25개, 예약 주기 1·3·6·12·24시간, 「다시 분석하기」 버튼).
- **못 한 것**: `npm run build`·배포·화면 검수(맥미니 빌드 금지). Tailwind v4에서 옛 `gold`·`dark-*` 재연결 색이 의도대로 나오는지 빌드 화면으로 확인 필요.

## 다음 첫 단계 (윈도우 CLI)
1. `docs/ACTIVE_WORK.md` 줄 추가 → `cd real_estate_sales && npm run build`.
2. `vercel deploy --prod --yes`(서울 리전 `vercel.json` 유지) → DB `update programs set version='v1.11', updated_at=now() where slug='real-estate-sales';`
3. `buylifemall@naver.com` 1440px·375px: 로그인(다크), 대시보드 지표·연결 상태·최근 실거래 표, 관심 지역(칩·지금 조회 카드·예약 카드), 실거래 목록(검색·자치구·정렬·표/카드·상태 칩), 상세(지표 4종·토지·투자 매력도 막대·이력 표), 설정, `/guide`, ☰. **「지금 조회하기」「다시 분석하기」는 누르지 않는다**(회원 키 유료 호출).
4. 루트 `DESIGN.md` 57번 「✅ 1차 작업완료 (`v1.11`, …)」, `DESIGN_HANDOFF.md` 기록, ACTIVE_WORK 줄 삭제.
