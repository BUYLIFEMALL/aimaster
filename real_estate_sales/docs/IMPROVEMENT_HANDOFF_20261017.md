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

## 2026-10-17 Codex(Windows) — 배포 전 Windows 검수

- 블랙 확정 문서(e2c300c2)·맥미니11943ac8·최신 지침을 대조했습니다. [Windows 플랜](VERIFICATION_PLAN_20261017_WINDOWS.md). 빌드·TypeScript 통과, 기존 본인 API/공공 키 검사2종 통과.
- 초기 의존성11건(critical1/high10)을 확인하고 공식 공지 대조 후 Next/eslint-config-next16.4.2·허용 범위 전이 패키지로 보완·재빌드했습니다. 운영 의존성0, 개발 도구5high는 #11로 남습니다. package도 APP v1.11에 맞춰1.11.0으로 정리했습니다.
- 실제 일반 회원·보이는 Edge 로컬9개(1440/375px·5개 회원 화면/로그인/가입·메뉴·FAQ·실제 블랙/gold별칭) 통과, 실제 목록/상세 컴포넌트 합성9개(검색/필터/정렬/표·카드·가격/토지/이력/375px) 통과. 실제 상세 GET/미리읽기·쓰기는 검사기에서 차단하고 유료 버튼은 누르지 않았습니다. 회원 테이블4개 전후[1,0,0,0], 쓰기·유료 API0회.
- **기존 AI 조사 캐시 공유·30일 미적용(#10)은 운영 미해결**입니다. 실측 카탈로그/소스 근거만 남겼고 조사 내용 열람·키/정책/데이터/예약 변경은 하지 않았습니다. #12 상세GET 자동 유료 분석도 별도 개선 사항입니다. 이번 디자인 인수와 구분합니다.
- 테스트 대체 코드는 tests/ 하네스에서만 사용합니다. 로컬 설정은 기존 루트 DB 연결을 자식 프로세스에만 주입, 서버127.0.0.1:3036. 가입 안내 화면은 main 대신 body로 대기하도록 검사기를 보완했습니다(제품 오류 아님).
- 다음: 소스 커밋/푸시→고정 소스 서울icn1·기존 Cron 그대로 배포→DBv1.11→실제 회원 운영 무료 검사→현황판57/최종 인수인계. 재현: npm run build:verify; node tests/local.mjs start 후 npm run test:runtime; npm run test:fixtures. 운영은 RE_TEST_BASE=https://real-estate-sales.buylife.xyz.
