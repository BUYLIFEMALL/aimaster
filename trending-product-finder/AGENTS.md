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
- 스키마 추가/마이그레이션

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출** (쇼핑인사이트는 사용자 본인 NCP 계정으로 무료 호출, OpenAI/Gemini는
   본인 키로 소량 과금 발생 — "지금 리포트 생성" 1회당 등록 키워드 수만큼 호출됨)
7. **Vercel Cron 스케줄/활성화 변경** — `/api/cron/generate-reports`가 매일 활성 관심 목록
   전체를 순회하며 회원 본인 키로 자동 리포트를 생성한다(2026-09-01부터 가동 중, `CRON_SECRET`
   환경변수로 인증). 스케줄을 바꾸거나 끄면 회원들이 매일 받던 자동 리포트가 끊기니, 변경 전
   사용자에게 확인할 것.

---

## 🎯 프로젝트 목적

잘 팔리는 상품, 사람들이 많이 검색하는 상품, 지금 시즌/트렌드에 맞는 상품을 자동으로
발굴·추천해주는 프로그램. 회원이 관심 카테고리+키워드를 등록하면, 네이버클라우드 API HUB
쇼핑인사이트(관심도 추이)를 기반으로 "관심도가 오르는" 기회를 점수화하고, AI가 추천 사유를
문장으로 설명해준다. 경쟁 상품 수 지표는 Phase 2에서 쿠팡파트너스로 추가될 예정이다(네이버쇼핑
검색 API는 2026-07-31부로 완전 종료됨).

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
  등록했다면 여기서도 자동으로 쓰임), `openai`/`gemini`(기존 provider, 택1) 를 쓴다.
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
| 3 | 알리익스프레스 원가 비교 + 마진 시뮬레이션 — **별도 메뉴 `/sourcing`("🌏 소싱 원가 계산기")**로 독립. `aliexpress.affiliate.product.query`로 소싱 후보 검색(원화 환산) → 상품 선택 시 관세/부가세/운송비/플랫폼수수료 반영한 착한 마진 계산기. 리포트 화면에는 이 페이지로 키워드를 넘겨주는 링크만 둠(threads-affiliate-poster는 완전히 다른 프로그램이니 그 로직/API 키는 재사용하되, 상품소싱 자동화 자체의 진행 프로세스가 필요하면 독립된 메뉴로 만들 것 — 사용자 지시, 2026-09-01) | ✅ 구현 완료, 실계정(buylifemall) API 검증 완료(threads-affiliate-poster에 이미 등록된 알리 키를 공용 테이블로 그대로 재사용) |
| 4a | Vercel Cron으로 활성 관심 목록 정기 자동 리포트(`/api/cron/generate-reports`, 매일 UTC 00:00=KST 09:00) — 리포트 생성 핵심 로직을 `lib/reportEngine.ts`로 분리해 사용자 액션/Cron 양쪽이 재사용. 회원 본인 키가 없으면 자동으로 건너뜀(실패 아님) | ✅ 구현 완료, 실계정 4건 전부 정상 생성 검증 완료(2026-09-01) |
| 4b | Google Ads API(선택 연동, 글로벌 검색량) | ⏸️ 보류 — 회원별 Google Ads 계정+개발자 토큰 승인이 필요해 온보딩이 무겁고, 현재 네이버 검색광고로 이미 국내 실검색량을 확보하고 있어 우선순위 낮음. 필요해지면 착수 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다(사용자 지시: "단계별로 하나씩
진행하면 되"). 새 Phase를 시작할 때는 이 표를 갱신할 것.

## ⚠️ 미검증 항목 (실사용 전 반드시 확인)

- `lib/naver/categories.ts`의 카테고리 코드(cid)는 웹 조사로 확보한 것이라 전체가 100%
  정확하다고 보장할 수 없다. 실제 회원이 네이버 API 키를 등록하고 첫 리포트를 생성해볼 때
  반드시 실제 응답으로 재검증할 것 — 필요하면 네이버쇼핑 카테고리 URL의 `cat_id` 값으로
  직접 대조.
- `trend_snapshots.source` 값을 `naver_datalab`에서 `naver_shopping_insight`로 바꿨는데,
  기존에 (있다면) 쌓인 레거시 행과 값이 섞일 수 있다는 점 참고.
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
