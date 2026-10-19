# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **상품소싱 자동화(trending-product-finder)** 프로젝트에서 AI Agent(Claude Code
등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- DB 스키마 변경은 루트 최신 지침의 사전 승인 범위를 확인한 뒤 진행

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (쇼핑인사이트는 사용자 본인 NCP 계정으로 무료 호출, OpenAI/Gemini는
   본인 키로 소량 과금 발생 — "지금 리포트 생성" 1회당 등록 키워드 수만큼 호출됨)
5. **Vercel Cron 스케줄/활성화 변경** — `/api/cron/generate-reports`가 매일 활성 관심 목록
   전체를 순회하며 회원 본인 키로 자동 리포트를 생성한다(2026-09-01부터 가동 중, `CRON_SECRET`
   환경변수로 인증). 스케줄을 바꾸거나 끄면 회원들이 매일 받던 자동 리포트가 끊기니, 변경 전
   사용자에게 확인할 것.

---

## 🎯 프로젝트 목적

잘 팔리는 상품, 사람들이 많이 검색하는 상품, 지금 시즌/트렌드에 맞는 상품을 자동으로
발굴·추천해주는 프로그램. 회원이 관심 카테고리+키워드를 등록하면, 네이버클라우드 API HUB
쇼핑인사이트(관심도 추이)를 기반으로 "관심도가 오르는" 기회를 점수화하고, AI가 추천 사유를
문장으로 설명해준다. 경쟁 상품 수·표본 가격대는 Phase 8에서 회원 본인 11번가 키로 반영됐다. 쿠팡파트너스 연동은 승인 대기이며, 아래 Phase 2 예정 기록은 과거 이력이다.

**주의**: `sourcing/`(제조 공장 견적서·위챗 대화 비교 코파일럿)과는 완전히 다른, 별개의
서브프로젝트다. 이름이 비슷해 보일 수 있으니 혼동하지 말 것.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `trending-product-finder/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은
  `trending-product-finder/` 폴더 내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

trending-product-finder는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — 특히 아래 항목:

- **불변의 핵심 원칙 4번**: 엔진(코드/로직/UI)은 우리가 함께 만들고, 그 엔진을 구동하는
  API 키(네이버/OpenAI/Gemini)는 이용하는 각 회원이 본인 것을 설정 페이지에서 직접 연동해서
  쓴다. 운영자 키로 대신 동작하지 않는다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), 향후 API route를 추가한다면
  redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램
  이용 권한까지 확인한다. **`requireProgramAccess()`/`checkProgramAccessApi()`를 쓰는 모든
  layout.tsx/route.ts에는 `export const dynamic = "force-dynamic"`과
  `export const fetchCache = "force-no-store"` 두 줄을 반드시 같이 선언할 것** —
  2026-08-30 플랫폼 전수 감사에서 이 두 줄 누락이 Vercel의 정적 캐싱으로 이어져 권한 체크
  자체가 무력화되는 버그가 발견됐다 (`docs/PLATFORM_PATTERNS.md` §10 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `naver_client_id`/`naver_client_secret`(쇼핑인사이트),
  `naver_ads_api_key`/`naver_ads_secret_key`/`naver_ads_customer_id`(검색광고 키워드도구,
  카테고리 후보 추천 기능 전용), `aliexpress_app_key`/`aliexpress_app_secret`/
  `aliexpress_tracking_id`(알리 원가 비교 전용 — `threads-affiliate-poster`가 이미 추가해둔
  provider라 이 프로젝트에서 새 마이그레이션 없이 그대로 재사용, 회원이 그쪽에서 이미
  등록했다면 여기서도 자동으로 쓰임), `domeggook_api_key`(도매매 국내 소싱 전용, 이
  프로젝트에서 `0004_domeggook_provider_key.sql`로 새로 추가), `openai`/`gemini`(기존
  provider, 택1) 를 쓴다.
- 사용자 소유 데이터 테이블(`trend_watchlist`, `trend_snapshots`, `shopping_competition`,
  `recommendation_reports`)은 `user_id` + RLS owner-only 정책으로 격리한다.

## 🚨 네이버 API 발급 경로 변경 이력 (2026-08-31, 필독)

Phase 1을 처음 구현할 때는 구(舊) `developers.naver.com` 방식(`X-Naver-Client-Id` 헤더,
`openapi.naver.com/v1/datalab/shopping` 도메인)으로 만들었는데, **이 방식은 2026년 7월 31일
부로 신규 발급이 전면 종료**된 상태였다는 걸 사용자가 실제 등록 화면을 보다가 발견했다.
`api.ncloud-docs.com` 공식 문서로 재조사해서 다음과 같이 고쳤다:

- **네이버쇼핑 검색 API**(구 경쟁 상품 수 조회용): **완전 종료, 공식 대체 API 없음.**
  `lib/naver/shoppingSearch.ts`를 삭제하고, `shopping_competition` 관련 로직을 리포트
  생성 플로우에서 뺐다. Phase 2에서 쿠팡파트너스 검색 API로 경쟁도를 대체할 예정.
- **데이터랩 쇼핑인사이트**: 신규 발급은 가능하지만 **네이버클라우드 플랫폼(NCP) 계정**으로
  `console.ncloud.com/naver-api-hub`에서 새로 신청해야 한다(개인 회원가입 가능, 무료).
  `lib/naver/datalab.ts`를 NAVER API HUB 스펙으로 재작성함:
  - base URL: `https://naverapihub.apigw.ntruss.com/shopping/v1`
  - 인증 헤더: `X-NCP-APIGW-API-KEY-ID`(Client ID) / `X-NCP-APIGW-API-KEY`(Client Secret)
  - 경로(`/categories`, `/category/keywords`)와 요청/응답 바디 구조는 기존과 거의 동일
  - 참고 문서: `api.ncloud-docs.com/docs/naver-api-hub-shopping-insight-categories`,
    `.../naver-api-hub-shopping-insight-keywords`
- 설정 페이지의 발급 안내 링크도 `console.ncloud.com/naver-api-hub/application`으로 교체함.

**교훈**: API 서비스명이 그대로여도("데이터랩 쇼핑인사이트") 발급 경로/인증 방식이 통째로
바뀔 수 있다. 신규 API를 연동할 때는 문서만 믿지 말고, 가능하면 실제 발급 화면까지 확인해서
검증할 것.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 관심 카테고리+키워드 등록, 네이버클라우드 API HUB 쇼핑인사이트 관심도 추이 조회, 기회 점수 계산(관심도만), AI 추천 사유 생성, 리포트 뷰 | ✅ 구현 완료, 실계정(buylifemall) E2E 검증 완료 (2026-08-31) |
| 1.5 | 카테고리+시드 키워드 → 네이버 검색광고 키워드도구(연관키워드+월간검색수+경쟁정도) 자동 조회 → 상위 후보는 관심도 추이까지 결합해 후보점수 산정 → 마음에 드는 후보만 관심 목록에 추가 | ✅ 구현 완료, 실계정(buylifemall) E2E 검증 완료 (2026-08-31) |
| 2 | 쿠팡파트너스 검색 API로 경쟁 상품 수 확보(경쟁도 지표 부활) → `threads-affiliate-poster` 원클릭 연동 | ⏸️ 보류 — 쿠팡파트너스 API 키가 매출 15만원 요건 미충족으로 아직 미승인(`threads-affiliate-poster/AGENTS.md` 참고). **승인된 뒤 착수할 것, 그 전엔 시작하지 않는다**(사용자 지시, 2026-09-01) |
| 3 | 알리익스프레스 원가 비교 + 마진 시뮬레이션 — **별도 메뉴 `/sourcing`("🌏 상품소싱 마진계산기")**로 독립. `aliexpress.affiliate.product.query`로 소싱 후보 검색(원화 환산) → 상품 선택 시 관세/부가세/운송비/플랫폼수수료 반영한 착한 마진 계산기. 리포트 화면에는 이 페이지로 키워드를 넘겨주는 링크만 둠(threads-affiliate-poster는 완전히 다른 프로그램이니 그 로직/API 키는 재사용하되, 상품소싱 자동화 자체의 진행 프로세스가 필요하면 독립된 메뉴로 만들 것 — 사용자 지시, 2026-09-01) | ✅ 구현 완료, 실계정(buylifemall) API 검증 완료(threads-affiliate-poster에 이미 등록된 알리 키를 공용 테이블로 그대로 재사용) |
| 4a | Vercel Cron으로 활성 관심 목록 정기 자동 리포트(`/api/cron/generate-reports`, 매일 UTC 00:00=KST 09:00) — 리포트 생성 핵심 로직을 `lib/reportEngine.ts`로 분리해 사용자 액션/Cron 양쪽이 재사용. 회원 본인 키가 없으면 자동으로 건너뜀(실패 아님) | ✅ 구현 완료, 실계정 4건 전부 정상 생성 검증 완료(2026-09-01) |
| 4b | Google Ads API(선택 연동, 글로벌 검색량) | ⏸️ 보류 — 회원별 Google Ads 계정+개발자 토큰 승인이 필요해 온보딩이 무겁고, 현재 네이버 검색광고로 이미 국내 실검색량을 확보하고 있어 우선순위 낮음. 필요해지면 착수 |
| 5 | 도매매(dome.co.kr) Open API를 `/sourcing`에 알리익스프레스와 나란히 추가 — 국내 위탁소싱이라 관세/부가세/해외운송비 계산 불필요, 개인 ID 로그인만으로 API Key 즉시 무료 발급 가능해 BYOK 원칙에 가장 적합 | ✅ 구현 완료, 실계정(buylifemall) E2E 검증 완료(2026-09-01) — `lib/domeggook/client.ts`(상품리스트 API, market=supply), `/sourcing`에 알리익스프레스/도매매 채널 체크박스(중복선택) UI. 실제 키로 "마스크" 검색 → 정상 응답 확인(응답 root 키가 `domeggook`이라는 가정이 실제와 100% 일치). 검증 과정에서 설정 페이지 저장 버그(신규 provider 전부 "잘못된 provider" 에러로 거부)를 발견해 함께 수정 |
| 6 | YouTube Data API v3로 키워드 관련 영상 조회수/업로드량을 기회 점수의 세 번째 신호로 추가 | ✅ 구현 완료, 실계정(buylifemall) E2E 검증 완료(2026-09-01) — `lib/youtube/client.ts`(search.list로 최근 30일 관련 영상 수 조회 → videos.list로 조회수 합산, 0~100 점수화), `lib/ai/opportunity.ts`의 `calcOpportunityScore()`에 유튜브 신호 있을 때 가중치 재배분 로직 추가, 리포트 화면에 "📺 최근 30일 관련영상 N개" 노출. **선택 항목**(youtube_api_key 미등록이어도 기존과 동일하게 동작). 실제 키로 "무선청소기" 검색 → search.list/videos.list 둘 다 200 응답, 관련 영상 25건·조회수 합계 정상 집계, 점수 계산까지 확인 완료 |
| 7 | 11번가 오픈API로 국내 오픈마켓 상품검색 추가(쿠팡 승인 대기 중 대안) | ✅ 구현 완료, 실계정(buylifemall) E2E 검증 완료(2026-09-02) — `lib/elevenst/client.ts`(apiCode=ProductSearch, XML/EUC-KR 응답을 `<ProductCode>` 위치 기준으로 방어적 파싱), `/sourcing`에 알리익스프레스/도매매/11번가 3채널 체크박스 UI로 확장. **재조사 결과 정정**: 기존에 "개인셀러 전환 필요"로 기록했던 것과 달리, 셀러 등록 없이 "서비스 등록"(개인 회원가입만으로 가능, 사업자등록 불필요)만으로 발급되는 일반 Open API 등급으로 확인됨. API 키 유효기간 180일 정책 있음(설정 페이지에 안내). 실제 키로 "무선청소기" 검색 → 200 응답, 최상위 wrapper가 `ProductSearchResponse > Products > Product`임을 확인. **최초 구현의 필드명 추정이 3곳 틀려서 실계정 검증 중 수정함**: 이미지는 `ImageUrl`이 아니라 `ProductImage`/`ProductImage200`(사이즈별 다수), 상세URL은 `ProductDetailUrl`이 아니라 `DetailPageUrl`, 판매자 표시명은 `Seller`(아이디)보다 `SellerNick`(닉네임)이 적합 — 전부 실제 필드명으로 교정 완료 |

| 8 | 11번가 상품검색 API로 "경쟁 상품 수·가격범위" 지표를 트렌드 리포트에 결합(쿠팡파트너스 승인 없이도 경쟁도 지표 부활) | ✅ 구현 완료, 배포됨(2026-09-02) — `lib/elevenst/client.ts`에 `getCompetition()` 추가(`<Products><TotalCount>` 파싱, 표본 20건 가격범위). `lib/reportEngine.ts`가 `elevenst_api_key` 등록 시 자동 조회해 기존에 이미 준비돼 있던 `calcOpportunityScore()`의 경쟁도 분기(Phase 1 설계 당시부터 존재)에 그대로 연결. **TotalCount 파싱 자체는 raw XML로 확인됨(실계정, "무선청소기" → 139,981건)이나, 리포트 생성 파이프라인 전체(버튼 클릭 → DB 저장 → 화면 표시)의 실사용 E2E는 아직 미검증** — 다음에 실제로 리포트를 생성해볼 때 "🏪 11번가 등록상품 N개" 표시와 기회점수 반영이 정상인지 확인할 것. 주의: TotalCount는 키워드 포함 전체 검색결과라 실제 "동일상품 판매자 수"보다 훨씬 크게 나옴(10,000건 초과 시 페널티 포화, 코드 주석 참고) |
| 9 | 소싱 후보 카드에 "이 상품으로 쓰레드 홍보글 만들기" 버튼 → `threads-affiliate-poster`로 원클릭 연결 | ⏸️ 보류 — 상품소싱 자동화 자체의 핵심 기능(발굴/분석/소싱)에 우선 집중하기 위해 다른 서브프로젝트와의 연계는 미룸(사용자 지시, 2026-09-02). 필요해지면 재개 |
| 10 | 매일 자동 생성된 리포트를 이메일·카카오톡·텔레그램으로 요약 발송(로그인 없이도 확인) | ✅ 구현 완료, 배포됨(2026-09-02) — **최초엔 운영자 공용 SMTP(env var)로 설계했다가, "설정 페이지에서 각 회원이 본인 값을 넣게 해야지"라는 사용자 피드백으로 BYOK 방식으로 다시 구현**, 이어서 "솔라피 카카오톡 발송과 텔레그램 연동도 기존 작업 참고해서 구현해달라"는 요청으로 3채널로 확장함. 전부 공용 테이블(프로그램 접두어 없음)을 마이그레이션 없이 재사용: 이메일 `user_smtp_accounts`(stepmail 등), 카카오톡 `user_solapi_accounts`(crm-google-form), 텔레그램 `user_telegram_links`(real_estate_sales, (user_id,program_slug) 단위라 프로그램마다 별도 연동 필요). 회원이 다른 프로그램에서 이미 이메일/카카오톡 계정을 등록했다면 재등록 없이 이 프로젝트 설정 페이지에도 그대로 보임(실계정 buylifemall에 SMTP 계정 2개 이미 확인됨). 코드: `lib/email/transport.ts`(sendViaSmtpAccount), `lib/solapi/client.ts`(sendSms/sendFriendtalk/getBalance, crm-google-form과 동일), `lib/telegram/client.ts`(findChatIdFromUpdates/sendTelegramMessage, booking-reminder와 동일), `lib/actions/{smtpAccounts,solapiAccount,telegram}.ts`, `components/settings/{SmtpAccountForm,SmtpAccountCard,ProviderAccountSection,SolapiAccountSection,TelegramConnectForm}.tsx`(디자인만 이 프로젝트 sky 팔레트로 조정), 설정 페이지에 "📣 리포트 자동 알림" 섹션(3채널 통합). `lib/reportEngine.ts`의 `options.notify` 플래그 — **cron 자동 생성분만** 발송하고("지금 리포트 생성" 버튼은 이미 화면을 보고 있어 중복 알림이라 제외), 채널별로 독립적으로 best-effort 발송(한 채널 실패가 다른 채널·리포트 생성 자체를 막지 않음). 카카오톡 수신 번호는 신규 필드 추가 없이 루트 공용 `profiles.phone`을 재사용. 계정/연동 미등록 채널은 조용히 건너뜀(에러 아님). **텔레그램 실계정(buylifemall) E2E 검증 완료(2026-09-02)** — 실제로 봇(`aimaster_shopping_bot`) 연동 후 `user_telegram_links`에 `program_slug='trending-product-finder'`로 정상 저장됨을 확인, reportEngine.ts와 동일한 조회 조건으로 `bot_token`/`chat_id`를 가져와 실제 리포트 요약 형식 텍스트를 `sendMessage`로 발송 → HTTP 200, `ok:true` 응답 확인, **사용자가 실제 텔레그램에서 메시지 수신까지 확인함**. **이메일·카카오톡은 아직 미검증** — 계정 등록 후 테스트발송 버튼을 눌러 확인 필요 |
| 11 | 관심 키워드 전체를 한 번에 마진계산 → 마진율 순 정렬 + CSV 내보내기 | ✅ 구현 완료, 배포됨(2026-09-02) — **두 가지 CSV 다운로드를 모두 제공**(사용자가 처음엔 "검색결과 CSV"를 기대했는데 구현은 "워치리스트 일괄계산"이라 혼선이 있어 확인 후 둘 다 유지하기로 함): (1) `BatchMarginCalculator` — 관심 키워드(카테고리별 그룹) 체크박스 선택 + 직접 입력 병행, 선택 채널마다 검색해 **최저가 상품 1건을 대표값**으로 계산(여러 키워드 비교용). 실행 버튼 누르기 전 "이번에 계산할 키워드" 미리보기 칩(개별 제거/전체 해제)을 추가해, 이전에 선택해둔 키워드가 조용히 함께 실행되는 혼선을 방지함. (2) `SourcingCalculator` 내 "검색결과 전체 CSV 다운로드" — 지금 검색한 키워드 하나의 채널별 검색결과 **상품 전체**(대표 1건이 아님)에 마진을 계산, 이미 화면에 불러온 데이터로 클라이언트에서 즉시 계산(추가 API 호출 없음). 둘 다 `calcMargin()`(플랫폼별 기본값)과 CSV(UTF-8 BOM, Excel 한글 호환)를 공유하는 동일한 계산 로직. 서버 액션(`lib/actions/batchMargin.ts`)은 기존에 각각 실계정 검증된 3개 플랫폼 클라이언트를 재사용하는 순수 오케스트레이션이라 로직 위험은 낮으나, **버튼 클릭→CSV 다운로드까지의 브라우저 실사용 E2E는 아직 미확인** |
| 12 | 한국수출입은행 Open API로 알리 원가 원화환산 기준 환율을 매일 자동 갱신 | ⏸️ 대기 — 2순위(2026-09-02 백로그 등록). 개인 본인인증만으로 무료 즉시 발급 확인(일 1,000회 제한), `oapi.koreaexim.go.kr` |
| 13 | 공공데이터포털 관세청 관세환율정보 API로 품목군별 대표 관세율 참고표 페이지(`/fees`류) 제공 | ⏸️ 대기 — 2순위(2026-09-02 백로그 등록). 상품 단위 HS코드 완전자동 매칭은 어려워 "참고표" 형태로 우선 제공 |
| 14 | 저장된 소싱 후보(알리/도매매/11번가)를 크론으로 주기 재조회해 품절·가격변동 감지 알림 | ✅ 구현 완료, 배포됨(2026-09-02) — 사용자가 Phase 18과의 차이를 물어 "18번은 매번 전체 리스트 발송, 14번은 특정 상품 찜해두고 변화 있을 때만"으로 정리한 뒤 "부동산 알림 기능 참고"라는 지시로 real_estate_sales의 예약 조회 dispatch 패턴을 그대로 재사용해 구현. `/sourcing` 검색결과에 "⭐ 관심상품 저장" 버튼 → `sourcing_saved_products`에 저장 → 5분 tick 크론(`dispatch-price-alerts`)이 각 상품의 `alert_interval_minutes` 주기마다 저장 당시 키워드로 재검색해서 같은 product_key를 찾음(단건 조회 API 신설 없이 기존 검색 클라이언트 재사용) → 가격 5%+ 변동 또는 재고상태 변화(검색결과에서 사라지면 품절 추정, 다시 나타나면 재입고 추정)가 있을 때만 Phase 10/18과 같은 4채널로 알림, 변화 없으면 조용히 last_price_krw/last_status만 갱신. 상품별로 독립적인 확인 주기·채널을 `/sourcing`의 "⭐ 관심 상품" 패널에서 설정. **추가 보완(같은 날)**: "예약기능을 직접 켜고 끄고 설정할 수 있게, 부동산 예약기능 참고해서"라는 요청으로 real_estate_sales의 `components/districts/MonitoringSettings.tsx`(모니터링 ON/OFF + 동작 시간대) UI를 그대로 재현 — 삭제 없이 추적만 켜고 끌 수 있는 `alert_enabled` 토글과, 원치 않는 시간대(예: 새벽)엔 재조회/알림이 안 나가게 하는 `active_hour_start/end`를 추가(`lib/schedule.ts`에 `isWithinActiveHours`/`currentKstHour` 이식). **미검증**: 배포·크론 등록(`vercel cron ls`로 3개 확인)까지 확인했으나 실제 가격/품절 변화 감지 후 알림이 정상 도착하는지, ON/OFF·시간대 설정이 실제로 크론 동작에 반영되는지는 아직 실사용 확인 전. **버그 발견·수정(2026-09-03)**: 사용자가 "예약 기능이 안 보인다"고 보고 → DB 조회로 저장된 관심상품이 0개임을 확인 → 원인은 배포 문제가 아니라 `SavedProductsPanel`이 상품이 0개면 섹션 자체를 `return null`로 숨기고 있었던 것(한 번도 안 써본 회원은 기능이 있는지조차 알 수 없는 발견성 결함). 비어 있어도 항상 섹션을 보여주고 "검색결과에서 저장 버튼을 눌러보라"는 안내 문구를 넣도록 수정 |
| 15 | 기회 점수가 임계값(예: 80점) 이상인 키워드만 즉시 알림 | ⏸️ 대기 — 2순위(2026-09-02 백로그 등록). Phase 10(이메일 알림) 완료 후 이어서 착수하면 자연스러움 |
| 16 | 네이버 커머스API센터 상품등록 API로 소싱 후보를 스마트스토어 초안 상품으로 바로 등록 | ⏸️ 대기 — 3순위, 신중 검토(2026-09-02 백로그 등록). 개인 판매자도 앱 등록이 가능한지 실제 신청 화면에서 재확인 필요 |
| 17 | 쿠팡 Wing Open API(파트너스와 별개, 셀러 어드민 발급)로 상품/가격/재고 등록 | ⏸️ 대기 — 3순위, 신중 검토(2026-09-02 백로그 등록). 쿠팡 셀러 가입 자체에 사업자등록이 필요할 가능성이 높아 BYOK 진입장벽이 가장 큼 |
| 18 | 관심 키워드별 "예약 소싱 알림" — 회원이 정한 주기(1/3/6/12시간, 매일)마다 실제 소싱 후보 상품 리스트를 검색해 이메일/카카오톡/텔레그램/문자 중 켜둔 채널로 발송 | ✅ 구현 완료, 배포됨(2026-09-02) — 사용자가 "예약 발송 켜놓으면 그 시간마다 키워드로 검색해 상품리스트를 등록된 채널로 보내달라"고 제안, "이미 정기예약 발송 구현한 프로그램 참고"라는 힌트로 real_estate_sales의 예약 조회 패턴(`collect_interval_minutes`/`last_run_at`, 5분 tick cron + 각 행에서 due 여부 재판단)을 그대로 재사용. `trend_watchlist`에 `sourcing_alert_enabled/interval_minutes/channels/last_run_at` 컬럼 추가(기본 전부 꺼짐, 기존 회원 무영향). 채널은 키워드마다 독립적으로 이메일/카카오톡/텔레그램/문자 중 원하는 것만 켜고 끌 수 있음(요청사항 그대로 반영) — Phase 10에서 만든 4채널 발송 인프라(SMTP/SOLAPI/텔레그램)를 그대로 재사용. `lib/schedule.ts`(ALERT_INTERVAL_OPTIONS/isAlertDue), `lib/sourcingAlert.ts`(키워드별 소싱 후보 검색 + best-effort 4채널 발송), `app/api/cron/dispatch-sourcing-alerts/route.ts`(5분 tick, `vercel.json` 등록 확인됨 — `vercel cron ls`로 2개 크론 정상 등록 확인), `components/watchlist/SourcingAlertControls.tsx`(키워드별 토글/주기/채널 UI, `/watchlist` 각 행에 임베드). **미검증**: 코드/배포/크론 등록까지 확인했으나 실제 예약 발송 1건이 정상 도착하는지는 아직 실사용 확인 전. **발견성 버그 수정 + 기능 보완(2026-09-03)**: 사용자가 "여기도 예약 기능이 안 보인다"고 보고 → DB 확인 결과 워치리스트 4건 모두 정상 존재·컴포넌트도 정상 렌더링 중이었음, 실제 원인은 `border-gray-100/bg-gray-50`가 흰 카드 배경과 거의 구분이 안 될 만큼 옅어서 눈에 안 띈 것(기능 자체는 있었음) — `⭐ 관심상품` 박스처럼 `border-2 border-sky-200/bg-sky-50`로 강조하고 꺼진 상태에서도 설명 문구가 항상 보이게 수정. 이어서 "소싱쪽처럼 시간대 켜고 끄는 기능 넣어줘" 요청으로 Phase 14와 동일한 "동작 시간대"(종일/특정 시간대만)를 `trend_watchlist.sourcing_alert_active_hour_start/end`로 추가하고 dispatch 라우트에 `isWithinActiveHours` 적용. **"변경사항만 발송" 모드 추가(같은 날)**: "두곳다 변동사항이 있을때만 받아볼수 있도록" 요청 — 관심상품(Phase 14)은 이미 상품 1건 찜 구조라 원래부터 변경시에만 알리므로 손댈 것 없음, 이 Phase는 키워드 검색이라 "같은 상품" 기준이 없는 게 문제라서 직전 실행 검색결과를 `sourcing_alert_last_snapshot`(jsonb)에 스냅샷으로 저장해두고 다음 실행 때 비교하는 방식으로 구현(신규 상품/가격 5%+ 변동/이전 상품이 검색결과에서 사라짐=품절추정 중 하나라도 있으면만 발송). `sourcing_alert_notify_mode`('always' 기본값 / 'changes_only') 컬럼과 `SourcingAlertControls.tsx`의 "매번 전체 발송"/"변경사항만 발송" 토글로 선택 |
| 19 | `/sourcing` 검색결과에서 상품명에 공동구매/할인/이벤트 등 프로모션 키워드가 있으면서 마진율 조건도 만족하는 상품만 골라보는 필터 | ✅ 구현 완료, 배포됨(2026-09-03) — "상품명에 공동구매/할인행사/이벤트 등 키워드가 있는 상품을 선별"이라는 요청에 사용자가 직접 "단순 프로모션 문구만으로는 홍보할 가치가 없다, 마진율 조건과 결합하는 형태로"라고 설계를 확정해 키워드 단독이 아닌 키워드+마진율 하한 결합 필터로 구현. `lib/promoKeywords.ts`(공동구매/할인/이벤트/특가/세일/SALE/프로모션/타임세일/반값/1+1/핫딜/런칭/오픈기념/한정수량/마감임박 — 단순 부분일치, 오탐 가능성을 주석에 명시)의 `isPromoProduct()`/`matchedPromoKeyword()`를 `SourcingCalculator.tsx`의 `resultMarginRows`(기존 Phase 11 CSV용 계산 결과 재사용)에 결합해 `platform:key` 단위로 조건 만족 집합을 계산. ON/OFF 토글(Phase 14/18과 동일한 파란/빨강 스타일)로 켜면 조건 미달 상품은 목록에서 숨기고, 매칭된 상품 카드에는 매칭된 키워드 배지(🎯)를 표시. 이 필터는 향후 `threads-affiliate-poster` 연동의 전 단계로 만든 것이지, 그 자체로 제휴 링크를 생성하지는 않는다 — 실제 연동 시에는 여기서 골라진 상품의 `key`(플랫폼 상품코드, 이미 `NormalizedProduct.key`로 보유)를 그대로 넘겨 쿠팡파트너스/알리익스프레스 제휴 링크로 변환해야 실제 수익이 발생한다는 원칙을 사용자가 명시함(단순 프로모션 상품 홍보만으로는 의미가 없다는 이유) — 이 원칙은 `threads-affiliate-poster/AGENTS.md`에도 반영 필요. **미검증**: 브라우저 실사용 E2E(토글 ON 후 실제로 조건 만족 상품만 남는지, 배지 표시가 정확한지)는 아직 확인 전 |
| 20 | `/watchlist`에서 카테고리 하나에 묶인 여러 키워드 중 특정 키워드만 개별로 추가/삭제 | ✅ 구현 완료, 배포됨(2026-09-03) — 사용자가 "디지털/가전" 카테고리에 무선청소기/에어프라이어/폴더8케이스/넥밴드선풍기/넥쿨러가 한 행에 묶여 등록된 화면을 보여주며 "이런식으로 나오면 필요 없는 관심키워드 삭제나 수정은 어떻게 하지?"라고 질문 — 확인해보니 기존엔 카테고리(행) 단위 삭제(`deleteWatchlistAction`)만 있고 키워드 배열 자체를 수정하는 액션이 없어 특정 키워드 하나만 빼려 해도 카테고리 전체를 지우고 재등록해야 했던 실사용성 공백이었음. `lib/actions/watchlist.ts`에 `updateWatchlistKeywordsAction`(keywords 컬럼만 갱신, 최소 1개 필수·최대 10개) 신설, `WatchlistRow.tsx`에 "✏️ 키워드 수정" 버튼 → 칩 형태로 키워드 표시하고 개별 × 삭제 + 입력창으로 새 키워드 추가(Enter 또는 추가 버튼) 후 저장/취소. **미검증**: 브라우저 실사용 E2E는 아직 확인 전 |
| 21 | 예약 소싱 알림(Phase 18)/관심상품 변경 알림(Phase 14)에 "카카오 알림톡" 채널 추가 | ✅ 구현 완료, 배포됨(2026-09-04) — 사용자가 제공한 카카오 개발자 문서 상세 분석 결과, 기존 "kakao" 채널이 실제로는 친구톡(2026-01-01부터 Solapi가 브랜드 메시지로 자동 대체)이고, 알림톡(정보성, 채널 친구가 아니어도 발송 가능, 사전승인 템플릿 필요)은 별개 상품이라는 걸 재확인해 "alimtalk"을 별도 채널로 신설. `lib/solapi/client.ts`에 `sendAlimtalk()`(crm-google-form/booking-reminder와 동일 구현) 추가. `user_kakao_alimtalk_templates` 테이블(사용자별 소싱/가격 알림용 템플릿 ID 각각 저장) 신설 — 발송 문구 전체를 단일 변수(`#{내용}`)로 담는 템플릿을 승인받아 등록하도록 설정 페이지에 `KakaoTemplateSection` 추가. `lib/sourcingAlert.ts`/`lib/priceAlert.ts`에 alimtalk 발송 분기 추가(템플릿 미등록 시 조용히 건너뛰고 로그만 남김). **미검증**: 실제 알림톡 템플릿 승인·발송까지의 E2E는 아직 확인 전(사용자가 Solapi에서 직접 템플릿을 승인받아야 테스트 가능) |

Phase 5~7의 상세 조사 근거(공식 API 유무, 개인 발급 가능 여부, 비용, 탈락시킨 후보 목록과
이유)는 `README.md`의 "사용 가능한 API 소싱 매트릭스"와 "조사했지만 채택 보류한 소싱처"
섹션에 정리해뒀다. Phase 8~17(다음 자동화 백로그)의 조사 근거는 README.md의 "다음 자동화
후보 백로그" 섹션 참고.

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다(사용자 지시: "단계별로 하나씩
진행하면 되"). Phase 8~17은 2026-09-02에 사용자 요청으로 조사해 백로그로 등록했고, "하나씩
추가 작업 진행하자"는 사용자 지시에 따라 1순위(8~11)부터 순서대로 착수한다. 새 Phase를
시작할 때는 이 표를 갱신할 것.

## ⚠️ 미검증 항목 (실사용 전 반드시 확인)

- `lib/naver/categories.ts`의 카테고리 코드(cid)는 웹 조사로 확보한 것이라 전체가 100%
  정확하다고 보장할 수 없다. 실제 회원이 네이버 API 키를 등록하고 첫 리포트를 생성해볼 때
  반드시 실제 응답으로 재검증할 것 — 필요하면 네이버쇼핑 카테고리 URL의 `cat_id` 값으로
  직접 대조.
- `trend_snapshots.source` 값을 `naver_datalab`에서 `naver_shopping_insight`로 바꿨는데,
  기존에 (있다면) 쌓인 레거시 행과 값이 섞일 수 있다는 점 참고.
- **알리익스프레스 한글 키워드 버그(2026-09-01 발견·수정)**: `aliexpress.affiliate.product.query`의
  `keywords` 파라미터는 한글 검색어를 사실상 무시한다 — 에러 없이 "Call succeeds"로 응답하지만
  키워드와 무관한 인기상품(판매량 기준 베스트셀러로 추정)을 반환한다. 실계정으로 직접 확인:
  "자전거 렌턴"/"자전거 랜턴" → 스퀴시 장난감/테이프 등 무관 상품, "bike light"/"bicycle
  lantern"(영어) → 정확한 자전거 라이트 상품. `lib/ai/translateKeyword.ts`를 새로 만들어
  한글이 섞인 키워드는 검색 전에 등록된 OpenAI/Gemini 키로 영어로 번역한 뒤 검색하도록
  고쳤다(`findSourcingCandidatesAction`에서 처리). AI 키가 없으면 번역 없이 원본 키워드로
  검색하되 UI에 "검색 결과가 부정확할 수 있다"는 경고를 띄운다. 번역이 실제로 일어나면
  UI에 "실제 검색어: OO(영어)"로 투명하게 보여준다. 도매매(국내)는 한글 검색이 정상 동작해서
  이 문제가 없다.
- `lib/domeggook/client.ts`(도매매 상품리스트 API)는 공식 문서(openapi.domeggook.com)만 보고
  구현했고 아직 실계정으로 검증하지 못했다. 2026-09-01에 문서를 재차 정독해서 다음은
  확인됨: (1) 엔드포인트 `www.domeggook.com/ssl/api/`가 2026-08-11 공지로 바뀐 최신 주소와
  일치, (2) `getItemList`(상품리스트)는 "Open API" 카테고리 소속이라 **Private API 승인
  없이 API Key만으로 즉시 호출 가능**(회원 문의 "Open API 키와 Private API 권한신청 둘 다
  해야 하나" → Open API 키만 있으면 됨, 2026-09-01). 다만 응답 JSON의 최상위 wrapper 키가
  `domeggook`이라는 가정은 문서의 XML 예시 구조를 따른 추정이라 여전히 미확정 — 그래서
  `findByPaths()`로 `domeggook.list.item`/`list.item`/`result.list.item` 등 여러 후보
  경로를 순서대로 탐색하도록 방어적으로 작성해뒀다. 실제 회원이 키를 등록하고 첫 검색을
  해볼 때 결과가 안 나오면, 우선 (a) 설정 페이지에 키가 실제로 저장됐는지, (b) Open API
  키 발급이 제대로 됐는지부터 확인하고, 그래도 안 되면 응답 필드명을 로그로 재확인할 것.

### ✅ 검색광고 키워드도구 실계정 검증 완료 (2026-08-31) — CUSTOMER_ID 주의사항

`lib/naver/searchAd.ts`를 실계정(buylifemall)으로 end-to-end 검증 완료했다. 서명 로직(SECRET_KEY를
raw UTF-8 문자열로 그대로 HMAC 키에 사용, uri는 쿼리스트링 제외한 경로만)은 GitHub
`naver/searchad-apidoc/python-sample/examples/signaturehelper.py` 공식 샘플과 대조해서
정확함을 재확인했고, 코드 수정은 필요 없었다.

**실제 걸림돌은 CUSTOMER_ID였다** — 처음엔 광고 대시보드 URL
(`ads.naver.com/manage/ad-accounts/<숫자>/dashboard`)에 보이는 숫자를 CUSTOMER_ID로
추측했는데, 이건 틀렸다(그 값으로는 `auth-failed`라는 포괄적 인증 실패만 뜨고, 심지어
SECRET_KEY를 잘못 다뤄도(base64 디코딩 등) 더 구체적인 `invalid-signature` 에러로 넘어가지
않았다 — 즉 CUSTOMER_ID가 틀리면 서명 검증 단계까지 가지도 못한다). **정확한 CUSTOMER_ID는
광고시스템 → 도구 → "SA API 사용 관리" 화면에 직접 표시된 값**이며, 대시보드 URL의 숫자와
다를 수 있다(네이버 광고의 "통합 로그인 계정" 구조 때문으로 추정). 새 회원이 이 기능을 쓸 때
인증이 안 되면 가장 먼저 CUSTOMER_ID를 SA API 사용 관리 화면에서 다시 확인하게 안내할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (trending-product-finder)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://trending-product-finder.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 옛 주소 / → 새 주소, /watchlist 재로그인 없이 열림(시험 계정 표시). 알림 메일 링크 기본 주소 새 주소로
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-17 v1.08 — 디자인 리뉴얼: 스마트 매트릭스(다크 슬레이트) (Claude Code 맥미니)
- 롱테일 v3 토큰·부품 이식, 사이드바 ☰·📖, `/dashboard`(기회 키워드 TOP 5·연결 상태)·`/guide` 신설(`/`→`/dashboard`), 리포트를 키워드 매트릭스 표로(기회점수 순·🌏 소싱 링크), 로그인까지 다크. 서버 로직 변경 없음. 디자인: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md)
- **Windows 빌드·배포·무료 화면 검수 완료(v1.08, 소스6587e370).** DBv1.08,Edge로컬9/운영9·합성9·권한/본인키/SMTP/마진15 통과. 실제 검색/생성/발송0.
- 플랜: [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계: [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)

## Windows v1.08 인수 완료 (2026-10-17 Codex)

[완료 결과·증거·다음 작업](docs/IMPROVEMENT_HANDOFF_20261017.md)의 최신 절을 먼저 읽습니다. Next15.5.27/React19·Nodemailer10.1.2,권한 관리자 조회·카테고리 소유자 조건·TOP5 모바일 최소폭 보완. 기존3Cron/점수/발송 로직 유지. 잔여 보안·조회 오류 안내·30일 보관 적용 확인은 별도 후속입니다. 공유 stash d49e6303 전체 복원 금지(이후 최신 작업 덮임 위험).

## 2026-10-17 v1.09 — 리포트 페이지 나눔·키워드별 기회점수 추이 (Claude Code 윈도우, 개선 원장 #7)
- **페이지 나눔**: `/reports?page=N` 20개씩(`.range()` + 전체 개수 `count: "exact"`), 아래에 [← 최근 리포트 | N / M 페이지 · 전체 K개 | 이전 리포트 →]. 예전엔 최근 20개만 보이고 그 이전 리포트는 볼 수 없었음. 잘못된 페이지 값은 1~마지막으로 정리(`lib/reportTrend.ts`의 `clampPage`).
- **점수 추이**: 최근 90일 리포트(최대 400개, 이미 저장된 자료·새 API 호출 없음)로 키워드(카테고리별 구분)마다 하루 마지막 기회점수를 이어 작은 SVG 그래프(`components/ui/Sparkline.tsx`, 60점 점선) + 최신 점수·첫 점수 대비 ▲▼. 2회 이상 기록된 키워드만, 최신 점수 높은 순 8개 + [나머지 N개 키워드 보기]. 계산은 `lib/reportTrend.ts`의 `buildKeywordTrends`.
- 테스트: `npm run test:trend`(신규 3개 통과), `npm run test:permissions` 통과, build·lint 통과. 합성 화면 테스트용 `tests/fixture-adapters.tsx`에 `.range()` 지원 추가(이 검사는 Edge 자동화라 Claude Code는 실행하지 않음 — Codex가 다음 회차에 실행).
- 실화면: 크롬 시험 계정(buylifemall@naver.com, 리포트 0개) — v1.09·빈 화면 정상, 추이·페이지 버튼 숨김. 관리자 실데이터(리포트 23개, 2026-08-31~09-11) 기대값을 SQL로 계산: 추이 키워드 11개(첫 화면 8 + 펼침 3), 1위 "추석선물" 49점(▼51), 페이지 "1 / 2 · 전체 23개" — **관리자 계정 화면 대조는 주인님 로그인 후 확인 필요.**
- 비용: 유료 API·리포트 생성·검색·발송 0회. Cron 3개 설정 그대로.

## 2026-10-17 v1.10 — 소싱 계산기 파일 분리(동작·화면 동일) (Claude Code 윈도우, 개선 원장 #8)
- `components/sourcing/SourcingCalculator.tsx` 800줄 → 237줄(상태·배치만). 나눈 파일:
  - `lib/sourcingResults.ts` — 채널 정의(`PLATFORMS`·국내 판정·채널 기본값), 검색결과 형식, 결과 전체 마진표 `buildResultMarginRows`, 프로모션 필터 `promoMatchKeys`, CSV `resultRowsToCsv`(순수 함수)
  - `components/sourcing/sourcingFetchers.ts` — 알리·도매매·11번가 검색 서버 액션 호출과 결과 형식 맞추기(`FETCHERS`)
  - `components/sourcing/SourcingResults.tsx` — 결과 위 도구(CSV 다운로드·🎯 프로모션 필터), 채널별 결과 목록
  - `components/sourcing/MarginCalculatorPanel.tsx` — 💰 마진 계산기(입력값을 `MarginForm` 한 객체로, `costFieldsFrom`·`marginOf`)
- 테스트: `npm run test:trend`에 `tests/sourcingResults.test.mjs` 4개 추가(총 7개 통과, esbuild로 묶어 불러옴), 권한·마진 15개·build·lint 통과. 합성 화면 검사(`tests/fixtures.mjs`, Edge)는 라벨·자리표시 문구를 그대로 둬 영향 없게 했으나 Claude Code는 실행하지 않음 — Codex 다음 회차 실행 권장.
- 실화면(크롬 시험 계정): `/sourcing?keyword=합성 테스트` — 키워드 전달·알리 기본 선택, 원가 10,000·판매가 30,000 → **마진 8,460원·28.2%·최종 수입 단가 15,300원**(분리 전과 동일). 검색·저장·발송 0회.

## 2026-10-17 v1.11 — DB 조회 장애와 "자료 없음" 구분 (Claude Code 윈도우, 개선 원장 #15)
- 예전엔 조회 `error`를 확인하지 않아 DB 장애도 "아직 리포트가 없습니다"·0개·미연결로 보였음. `lib/loadErrors.ts`(`failedQueries`·`logLoadErrors` — 서버 로그엔 조회 이름·오류 코드만) + `components/ui/LoadErrorNotice.tsx`(⚠️ 안내 + [🔄 다시 시도] 링크).
- 화면별: **키워드 발굴** 조회 실패 시 입력 화면 대신 안내(빈 목록을 보고 중복 등록 방지) · **리포트** 목록 실패 시 "리포트 없음" 대신 안내, 추이·카테고리 실패는 작은 안내 · **대시보드** 위쪽 안내(숫자·연결이 0/미연결로 보일 수 있음) · **소싱** 관심 키워드·관심 상품 실패 안내(계산기는 그대로 사용) · **설정** "등록 안 됨으로 보여도 다시 입력하지 말고 먼저 다시 시도" 안내.
- 테스트: `npm run test:trend` 9개(판정 함수 2개 추가), 권한 15개·build·lint 통과. 실화면(크롬 시험 계정) 5화면 정상 시 안내 없음·기존 화면 동일, 콘솔 오류 0. 운영에서 DB 장애를 일부러 낼 수 없어 오류 화면은 단위 테스트·코드 확인으로만 검증.

## 2026-10-17 v1.12 — 잔여 보안 경고 정리: 운영 의존성 0건 (Claude Code 윈도우, 개선 원장 #14)
- 원인: Next 15.5.27이 내부에 postcss 8.4.31을 고정(XSS·파일 읽기·경로 탐색 계열 4건, 운영 경고 2건). 다른 곳은 이미 8.5.26.
- 조치: `package.json` `overrides: { next: { postcss: "^8.5.26" } }` + 설치 기록의 옛 항목 제거 후 재설치 → `npm audit --omit=dev` **0건**, 전체 11 → 9건. 빌드 CSS 파일이 이전과 완전히 동일(같은 해시·27,800바이트) → 화면 영향 없음.
- **남은 9건(개발 도구, 수용)**: tailwind 3이 쓰는 `braces` 3.0.3(최신이 3.0.3이라 고친 버전 없음)·`micromatch`·`chokidar`·`fast-glob`·`postcss-selector-parser` 6(tailwind 3은 7과 호환 안 됨)·`eslint-config-next`. 빌드할 때 우리 소스 파일에만 쓰이고 외부 입력이 닿지 않음. 해결하려면 tailwind 4 메이저 업그레이드(디자인 설정 전면 변경)가 필요해 별도 승인 작업으로 남김.
- 증거: `docs/evidence/dependency-audit-v112.json`, `dependency-audit-prod-v112.json`. 테스트 9개·권한 15개·build·lint 통과, 크롬 대시보드 디자인 동일(배경 #0f1115·카드 #171a21)·콘솔 오류 0.

## 2026-10-17 v1.13 — 생성 자료 30일 자동 삭제 (Claude Code 윈도우, 개선 원장 #16, 주인님 승인)
- **정리 Cron** `app/api/cron/cleanup-generated/route.ts`(CRON_SECRET Bearer, `vercel.json` 4번째 `50 18 * * *` = 한국 03:50): `recommendation_reports`(generated_at)·`trend_snapshots`·`shopping_competition`(fetched_at) 30일 지난 행 삭제, `trend_watchlist.sourcing_alert_last_snapshot`은 마지막 실행이 30일 넘으면 값만 비움(행·설정 유지 — "바뀐 것만" 알림은 다음 1회 전체 발송 후 다시 비교). 응답·로그엔 표별 개수만. 기준 시각 `lib/retention.ts`(`RETENTION_DAYS=30`, `retentionCutoff`).
- **지우지 않음(A안, 주인님 결정)**: ⭐ 관심 상품 `sourcing_saved_products`(회원이 고른 찜 목록·가격 추적 설정), 관심 키워드·알림 설정, 계정·키·연동.
- **만료 자료 재사용 금지**: 리포트 화면·대시보드 TOP5 조회에 `generated_at >= 30일 전` 조건, 점수 추이 90 → 30일(`TREND_DAYS`), 리포트 화면 안내에 "만든 날부터 30일 보관 후 자동 삭제".
- 첫 실행 예상(배포 전 재조회): 리포트 31/59·스냅샷 65/177·경쟁 0·알림 캐시 1 삭제, 관심 상품 5개 유지. 관리자 리포트 23개(2026-08-31~09-11)는 전부 만료라 지금도 화면에 보이지 않음.
- 검수: 단위 11개(기준 시각 2개 추가)·권한 15·build·lint, 배포·DB v1.13, 무인증·잘못된 인증 정리 호출 401, `vercel crons ls` 4개 확인, 크롬 리포트·대시보드 정상·콘솔 오류 0.
- **남은 확인**: 2026-10-18 03:50 KST 첫 실행 뒤 표별 행 수가 위 예상만큼 줄었는지 DB 대조(Claude Code는 CRON_SECRET을 모르므로 인증 호출을 직접 하지 않았음). 날짜 칸 인덱스는 표가 작아(수십~수백 행) 이번엔 추가하지 않음 — 자료가 많아지면 검토(스키마 변경 승인 필요).

## 2026-10-17 v1.14 — 유튜브 조회를 공용 기준 코드 `youtube-data-client` 사본으로 (2단계, Claude Code 윈도우)
- `lib/youtube/youtubeData.ts`(사본) 추가, `lib/youtube/client.ts` `getYoutubeSignal()`의 검색·조회수 조회가 모듈로 위임. 예전엔 검색 실패 때 YouTube 오류 원문(최대 300자)을 그대로 던졌는데 한국어 안내로 바뀜. 조회수 합계는 보조 신호라 실패해도 예전처럼 0.
- 개선: 15초 시간 제한, 서버 오류·네트워크만 1회 재시도, 키 가리기, 일일 한도/분당 제한/키 사용 제한/API 미사용 구분 안내(초기화 시각 서머타임 반영).
- 검수: tsc·eslint(lib/youtube) 0, build, 배포·DB v1.14, 크롬 화면 v1.14. 리포트 엔진은 유튜브 신호 실패를 기록만 하고 계속 진행(기존 동작). 실제 YouTube 호출은 하지 않음.
- **주의(다음 CLI)**: 모듈 파일 `youtubeData.ts`는 공용 기준 코드 `youtube-data-client`의 사본이다(기준: `youtube-channel-consultant/src/lib/youtube/youtubeData.ts`). 직접 고치지 않는다. 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync` → 사본을 쓰는 8개 프로그램 모두 테스트·빌드·배포·버전 +0.01. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §1.

## 2026-10-17 23:46(KST) — 30일 정리 Cron 첫 실행 전 기준값 기록 (Claude Code 윈도우, 코드·버전 변경 없음)
- 첫 실행(2026-10-18 03:50 KST) **전** DB: `recommendation_reports` 59개(30일 지남 31) · `trend_snapshots` 177개(30일 지남 65) · `shopping_competition` 0 · `sourcing_saved_products` 5(지우지 않음) · 알림 비교 캐시 1개 — v1.13 배포 때 예상과 같음.
- **실행 후 기대값**: 리포트 28 · 스냅샷 112(실행 전까지 새로 쌓인 만큼 더해짐) · 관심 상품 5 그대로 · 캐시는 마지막 실행 30일 지난 경우만 비움. 03:50 이후 같은 쿼리로 대조하고 결과를 여기에 덧붙인다.

## 2026-10-18 — 30일 정리 Cron 첫 실행 결과 확인 (Claude Code 윈도우, 코드·버전·배포 변경 없음)
- `/api/cron/cleanup-generated` 첫 실행: **2026-10-18 03:50:17 KST GET 200**(`vercel logs requests`).
- 실행 후 DB(같은 기준 `generated_at`·`fetched_at` 30일): `recommendation_reports` 59 → **28**(30일 지난 행 0) · `trend_snapshots` 177 → **112**(0) · `shopping_competition` 0(0) · `trend_watchlist.sourcing_alert_last_snapshot` 값 있는 행 1 → **0**(행·알림 설정은 유지). 첫 실행 전 기준값 기록의 예상치와 정확히 일치.
- 남은 일 없음. 이후에도 매일 03:50 실행.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.15 — ⏰ 매일 리포트·소싱 알림·가격 알림 실행 방식 회원 선택 + 하루 1번·중복 발송 방지·이용 권한 확인·비밀값 검사 (Claude Code 윈도우)
- 주인님 「2순위도 적용하고 권한 확인도 넣어줘」. 지침 루트 `docs/SCHEDULER_POLICY.md`, 플랜 `docs/PLAN_20261020_MEMBER_SCHEDULER.md`, 기준 `youtube-auto-reply` v1.12.
- 정기형(작업 3개): 회원 cron-job.org는 **5분마다** 깨워 세 작업의 차례를 각각 판단. 「남은 일」 = 켜진 관심 목록 수 + 알림 켠 관심 상품 수(0이면 작업 끔). Next 15라 회원 실행 주소는 `after`.
- 코드: `lib/schedulerMember/`(cronJobOrg·memberScheduler·dispatch·sync — 표 `trend_member_scheduler`, 토큰 `trend_…`, 끄기 스위치 `TREND_PLATFORM_SCHEDULER=off`), `lib/programAccess.ts`(사본). `dispatch.ts`가 세 작업(`dispatchDueReports`·`dispatchDueSourcingAlerts`·`dispatchDuePriceAlerts`)을 운영자 주소에서 옮겨 와 **이용 권한 확인 + 먼저 차지하기**를 더함:
  - 매일 리포트: 새 칸 `trend_watchlist.report_last_run_at` — 「오늘 09:00 KST 이후 1번」(`reportWindowStart`, 08:59면 어제 09시 기준). 예전엔 이 기록이 없었음. 직접 누르는 「지금 리포트 생성」은 이 칸을 건드리지 않음.
  - 소싱 알림 `sourcing_alert_last_run_at`·가격 알림 `last_checked_at`: 예전엔 보낸 **뒤에** 적어 실행이 겹치면 두 번 보낼 수 있었음 → 보내기 전에 조건부로 먼저 바꾼 실행만 진행.
- 운영자 주소 3곳(`generate-reports`·`dispatch-sourcing-alerts`·`dispatch-price-alerts`)은 제외 목록(cronjob·일시정지 회원)·비밀값 검사만 하는 얇은 주소. 30일 정리(`cleanup-generated`) 포함 **예약 주소 5곳 모두 `CRON_SECRET` 빈 값이면 401**. 새 `/api/cron/dispatch-member`.
- 켜고 끄는 7곳 연결(`sync.ts`): 관심 목록 만들기·후보에서 추가·켜기/끄기·삭제, 관심 상품 저장(알림 기본 켜짐)·알림 켜기/끄기·삭제. **켜기 스위치는 준비가 안 되면(「내 cron-job.org」인데 키 없음 등) 다시 끄고 행에 안내**, 새로 만든 것은 그대로 두고 관심 키워드 화면 상태 줄로 알 수 있게 함. `settings.ts` 키 변경·삭제 처리, 키 종류·이름표에 `cronjob_org_api_key`.
- 화면: 설정 「⏰ 예약 발행」(방식 선택 + 키 칸, mx 다크 색), 관심 키워드 화면 위 「⏰ 실행 상태」 줄·일시정지/재개, `/guide` FAQ. DB(운영 `esgxyikcnnvmlhygjkth`): `supabase/migrations/20261020180000_trend_member_scheduler.sql` — 크롬 SQL Editor 적용(배포 **전**), 결과 표 생성·`report_last_run_at` 칸 1·`v1.15`. `package.json` 1.15.0.
- 검수: tsc 0, `test:trend` 11/11, `test:permissions` PASS, build, 09시 기준 계산 4가지 시각 확인, 커밋 `0e695730`, 배포 `trending-product-finder-3put0pd4n`(Ready), 예약 주소 5곳 무인증·`Bearer undefined`·가짜 토큰 401, `/login` 200. 크롬(관리자): 설정 v1.15·예약 발행 구역·공용 키 「등록됨」, 관심 키워드 화면 상태 줄 「AIMaster 기본(Vercel) 실행 중 · 켜진 정기 작업 5개」(DB 대조: 켜진 관심 목록 0/7 + 알림 켠 관심 상품 5/5) → 일시정지 → 재개 정상(DB paused false). 실제 리포트 생성·알림 발송·유료 호출 없음. 배포 뒤 운영자 5분 실행이 새 배포에서 `dispatch-sourcing-alerts`·`dispatch-price-alerts` 모두 200.
- **미확인(다음 첫 단계)**: 「내 cron-job.org」 실검수 — 2026-10-20 cron-job.org 하루 호출 한도(100회) 소진, 한도가 풀린 날 관리자 계정으로 방식 전환 → 관심 상품 알림 켜기로 작업 자동 켜짐 → 회원 실행 200 → Vercel 복귀. 첫 09시 리포트 실행 뒤 `report_last_run_at`이 채워지는지 DB 확인(관리자는 켜진 관심 목록이 0개라 다른 회원 행으로 확인).

## 2026-10-20 v1.16 — 예약 공용 코드 「실패 시 상태 되돌리기」 (Claude Code 윈도우)
- 주인님 「순서대로 진행해줘」(남은 일 4번). 「내 cron-job.org」로 바꿀 때 cron-job.org 작업 켜기가 실패하면(하루 호출 한도 초과·키 오류) **이전 방식으로 되돌림**(예전엔 cronjob으로 남아 운영자 실행에서도 빠져 예약이 멈출 수 있었음), 「재개」가 실패하면 **일시정지 상태로 되돌림**(예전엔 화면은 일시정지·DB는 대기로 어긋남). `memberScheduler.ts`의 `setMemberSchedulerMode`·`resumeMemberScheduler` 두 곳, 11개 사본 같은 수정. 커밋 `ccf80d68`, DB 버전 크롬 SQL Editor로 갱신, 11개 순차 배포 모두 Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `trending-product-finder-q1oiv1gj9`.
- 실검수는 같은 코드인 booking-reminder에서 실패 경로 3가지를 실제로 확인(cron-job.org 하루 한도 소진 상태 이용).
