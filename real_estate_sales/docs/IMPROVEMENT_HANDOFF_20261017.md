# 개선 인수인계 — 부동산 실거래 투자분석 자동화 (2026-10-17, Claude Code 맥미니)

> **최신 상태: Windows v1.11 운영 배포·무료 화면 검수 완료.** 아래 맥미니의 대기 절차와 사전 검수 기록은 작업 이력입니다. 다음 작업은 이 문서 끝의 남은 일부터 확인합니다.

## 한 일 (v1.11) — 주인님 승인 후 구현
스마트 매트릭스 스타일(다크 슬레이트) 디자인 리뉴얼. 플랜 [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md), 디자인 [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md), 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md).

## 바뀐 파일
- 신규: `src/app/(dashboard)/guide/page.tsx`, `src/components/listings/ListingMatrix.tsx`, `src/components/ui/{PageHero,KpiCard}.tsx`(ghost-scraper와 같은 파일), `src/lib/format.ts`, `AGENTS.md`, `docs/*`
- 수정: `src/app/globals.css`(@theme `mx-*` + 옛 `gold`·`dark-*` 이름을 다크 토큰으로 재연결), `src/app/layout.tsx`, `src/app/(auth)/layout.tsx`(다크 배경 — 원칙 13), 로그인·회원가입·모든 화면·컴포넌트의 `zinc`·흰색·빨강·초록·`#005acc` 클래스를 토큰으로 일괄 치환, `src/components/layout/Sidebar.tsx`(☰·📖), 대시보드·관심 지역·실거래 목록·상세·설정 페이지, `src/lib/version.ts`(v1.11)
- 서버 액션·수집·AI 분석·DB 변경 없음.

## 확인한 것 / 못 한 것
- 확인: 정적 검토, DB 타입 대조(`floor`는 문자열), 매뉴얼 문구를 코드와 대조(자치구 25개, 예약 주기 1·3·6·12·24시간, 「다시 분석하기」 버튼).
- **못 한 것**: `npm run build`·배포·화면 검수(맥미니 빌드 금지). Tailwind v4에서 옛 `gold`·`dark-*` 재연결 색이 의도대로 나오는지 빌드 화면으로 확인 필요.

## 당시 다음 첫 단계 (윈도우 CLI — 아래 완료 기록 참고)
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

## 2026-10-17 Codex(Windows) — v1.11 운영 검수 완료

- **상태**: ✅ 블랙 버전 v1.11 Windows 인수·운영 배포 완료. 맥미니 `11943ac8`와 블랙 확정 기록 `e2c300c2`를 대조했습니다. 배경 `#0f1115`, 카드 `#171a21`, 블루·앰버 및 로그인/회원가입 테마를 유지했습니다.
- **소스**: `156bb4ad5d71bc15a1fb674f5cbb7744568606db` 커밋·origin/master 푸시 완료. 최종 문서 커밋은 이 절이 들어간 커밋입니다(`git log -- real_estate_sales/docs/IMPROVEMENT_HANDOFF_20261017.md`).
- **운영 배포**: `dpl_3snwHM99aerw5s4GzwB1kn586vPm` READY, 소스 커밋 일치. [프로그램](https://real-estate-sales.buylife.xyz) · [고정 배포](https://real-estate-sales-3mawihksx-buylife.vercel.app). 서울 `icn1` 및 기존 `/api/collect/dispatch` 5분 Cron을 유지했습니다.
- **버전**: APP/운영 DB `programs.version` 모두 **v1.11**, package `1.11.0`. 등록 주소·배지 유지. 버전 DML만 적용했으며 DB 스키마·회원 자료·키·환경변수는 바꾸지 않았습니다. 재현 SQL: `supabase/releases/20261017_v111.sql`.
- **자동 검사**: Next16.4.2 `npm run build:verify`/TypeScript 통과, `test:api-keys`·`test:public-keys` 통과. Next/eslint-config-next16.2.11→16.4.2와 허용 범위 전이 의존성 보완 후 운영 의존성 audit **0건**. 개발 lint 도구 **5 high**는 개선 원장 #11에 남겼습니다.
- **실제 화면**: 보이는 Microsoft Edge, 일반 회원 `buylifemall@naver.com`(관리자 아님), 1440px/375px. 로컬 **9/9**, 운영 **9/9** 통과. 대시보드·관심 지역·목록·설정·매뉴얼, 로그인/가입, FAQ, 모바일 메뉴·계정·이동 후 닫힘, 가로 넘침을 확인했습니다. 무인증 Cron 요청은 **401**, 수집은 실행되지 않았습니다.
- **채워진 목록·상세**: 실제 `ListingMatrix`와 상세 서버 페이지를 테스트 경계에서 합성 데이터로 렌더한 **9/9** 통과(검색·자치구·4종 정렬·표/카드·상태·금액 단위·공시가 비율·토지·점수·이력·375px). 운영 시험 회원 목록은 비어 있어 **실제 운영 상세·유료 분석 품질은 검수하지 않았습니다**.
- **비용/자료**: 「지금 조회하기」「다시 분석하기」 및 저장은 누르지 않았습니다. 실제 상세 GET/미리읽기도 검사 브라우저에서 차단했습니다. 유료 호출 **0**, 쓰기 **0**, 브라우저 오류 **0**. 회원별 관심/매칭/분석/설정 행 수는 전후 `[1,0,0,0]` 동일합니다.
- **증거**: `docs/evidence/deployment-v111.json`, `runtime-live.json`, `runtime-local.json`, `fixtures.json`, `cron-unauthorized.json`, `dependency-audit-after-production.json`, `dependency-audit-after-all.json` 및 live/fixture 1440·375 PNG. 테스트용 모의 경계는 `tests/`에만 있으며 제품 인증·분석·DB 코드에는 넣지 않았습니다.

### 다음 CLI가 먼저 볼 남은 일

1. **#10 높음·미해결: AI 시장조사 캐시 회원 격리·30일 보관**. `real_estate_district_sentiment`는 user_id 없이 자치구+날짜로 본인 Perplexity 생성 결과를 공유하고, 운영 RLS도 인증 회원 전체 읽기/쓰기를 허용합니다. catalog/정책만 조회했고 생성 내용·자료는 읽거나 변경하지 않았습니다. 과거 무료 공공 API 예외는 회원 AI 생성물 공유 승인이 아닙니다. 소유자별 저장·기한/정리·무소유 기존 자료 접근 제한 전환안을 먼저 만들고 DB/삭제 승인 범위를 확인합니다. 임의 소유자 지정·회원별 일괄 복사 금지. 디자인 완료를 데이터 격리 완료로 해석하지 않습니다.
2. **#4/#12 높음·미해결: 상세 GET 자동 유료 분석**. `ensureListingAnalysis()`가 상세 렌더 중 실행됩니다. 명시적 실행/자동 분석 선택·비용 안내·미리읽기 차단·동시 중복 방지를 함께 설계합니다. POST만 차단한 검수는 안전하지 않습니다.
3. **#11 개발 도구 보안 5 high**: 공식 수정판/대체 경로를 확인합니다. `npm audit fix --force`가 제안하는 오래된 Next로 내리지 않습니다.
4. 페이지 나눔(현재 50건), 열람 상태/새 실거래 숫자, 서울 밖 지원은 기존 별도 과제입니다. VWorld의 옛 등록 도메인은 주인님 포털 확인·신규 도메인 추가 후 별도 승인된 환경변수 전환으로 처리하며 지금 지우지 않습니다.

현황판 57번은 ✅ 1차 작업완료(v1.11)로 갱신하고 이 작업의 ACTIVE_WORK 줄만 제거했습니다. 다른 CLI의 작업·스테이징은 보존합니다.

## 2026-10-17 Claude Code(윈도우) — #10 해결(v1.12)
- **#10 해결**: AI 시장조사 캐시 회원별 분리(user_id + 본인 전용 RLS) + 30일 자동 삭제 cron. 상세·검수: `AGENTS.md` v1.12. 기존 주인 없는 5건은 아무도 못 보며 첫 cron 실행(03:30 KST) 때 삭제.
- **#12 진행 예정(v1.13)**: 주인님 지시 "사용자가 버튼을 클릭했을 때 실행" — 상세 화면 자동 분석 제거.
- **#12 해결(v1.13)**: 상세 열람 자동 분석 제거, [AI 분석 실행] 버튼·1분 중복 방지. 예약 조회(텔레그램) 자동 분석은 회원이 켠 기능이라 유지 — 켜기/끄기 선택은 추가 제안. 상세: `AGENTS.md` v1.13.

- **추가 개선(v1.14)**: 예약 조회 알림의 AI 분석 켜기/끄기(기본 켜짐). 상세: `AGENTS.md` v1.14.
