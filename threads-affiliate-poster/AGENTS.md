# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **Threads 쇼핑제휴 자동화(threads-affiliate-poster)** 프로젝트에서 AI Agent(Claude
Code 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
파일 생성/코드 수정, 패키지 설치, 로컬 테스트/빌드, 스키마 추가/마이그레이션.

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
1. 파일이나 폴더 삭제
2. Git push
3. 실제 서비스 배포(Vercel 프로덕션)
4. 데이터베이스 데이터 삭제
5. 환경변수와 API 키 변경
6. 유료 API 호출(AI 캡션/이미지 생성, 쿠팡/알리익스프레스 API 호출 등)
7. **제휴 고지 문구(`src/lib/ai/affiliateGenerator.ts`의 `DISCLOSURE_TEXT`) 삭제/우회** —
   쿠팡파트너스/알리익스프레스는 표시광고법 + 자체 운영정책상 "이 포스팅은 제휴 활동의 일환으로
   수수료를 제공받을 수 있다"는 고지가 법적으로 필수다. 어떤 경로(즉시 게시/예약 게시)로 가든
   `generateAffiliatePostContent()`를 거쳐 이 문구가 항상 포함되도록 되어 있으니, 이 로직을
   지우거나 조건부로 만들지 말 것.
8. **실제 게시(`publishPost`)** — 사람이 대시보드에서 캡션을 직접 확인·수정한 뒤 "게시" 버튼을
   눌러야만 실행된다(DM/댓글 자동응답류와 달리 이 프로젝트는 외부 이벤트에 반응하는 게 아니라
   사람이 대시보드에서 상품을 고르고 캡션을 만들어 직접 게시하는 흐름이라, 애초에 "자동 승인"
   개념 자체가 없다 — 게시는 언제나 사람의 명시적 클릭이 트리거다).
9. Vercel Cron(`vercel.json`) 활성화/배포 — 예약 게시 dispatch가 매 순간 자동 실행되므로 배포
   전 확인한다.

---

## 🎯 프로젝트 목적

상품(쿠팡파트너스/알리익스프레스/네이버 브랜드커넥트) 정보를 등록하면, 제휴 링크를 자동으로
붙인 쓰레드 홍보 게시글을 AI가 만들어주고, 사람이 확인 후 즉시/예약 게시하는 프로그램.

**핵심 설계**: 새로 만들지 않고 기존 두 서브프로젝트를 최대한 재사용했다.
- Threads 연동(OAuth/게시/예약 발행/AI 캡션 생성 뼈대)은 `threads/`(쓰레드 자동 포스팅,
  `programs.slug = "auto-threads-posting"`)의 코드를 그대로 복제·이식했다.
- 상품 정보를 "URL만 넣기(간단)" 대신 "직접 입력하기(풍부)"로 등록할 때는, 이미 존재하는
  `auto-detail-page`(상세페이지 자동화, "15P")의 `detail_pages` 테이블을 같은 공용 Supabase
  프로젝트 안에서 읽기 전용으로 참고할 수 있다(그 프로젝트를 수정하지 않음).

설계 배경 상세는 [README.md](README.md) 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `threads-affiliate-poster/`
* Next.js 16(App Router, `src/` 디렉토리 구조 — `threads/`와 동일).

---

## 🔗 AIMaster 플랫폼 공통 원칙

threads-affiliate-poster는 AIMaster 저장소 안의 서브프로젝트다. 루트 `../CLAUDE.md`를 메인
지침으로 함께 따른다. 핵심 요약:

- `programs.slug = "threads-affiliate-poster"` 이용 권한(구독/개별부여/등급)이 있는 모든
  AIMaster 회원이 각자 계정으로 쓸 수 있는 멀티테넌시 SaaS다.
- 페이지는 `requireProgramAccess()`, API route는 `checkProgramAccessApi()`로 권한을 확인한다
  (`src/lib/access.ts`).
- 사용자 소유 데이터(`tap_accounts`, `tap_posts`, `affiliate_products`)는 `user_id` + RLS
  owner-only로 격리한다.
- **API 키는 본인 키만 사용, 관리자 키 폴백 없음** — `threads/`의 `apiKeys.ts`는 이 정책이
  생기기 전(2026-08-12 이전)에 만들어져 앱 공용 키 폴백이 남아있지만, 이 프로젝트는 처음부터
  최신 정책대로 폴백 없이 구현했다(`src/lib/apiKeys.ts`). `threads/`의 apiKeys.ts를 참고
  코드로 삼지 말 것.

### 테이블명이 `threads/`와 겹치지 않도록 접두어를 붙였다
같은 공용 Supabase 프로젝트를 쓰다 보니 `threads/`가 이미 `threads_accounts`/`posts`라는
테이블명을 쓰고 있어서, 이 프로젝트는 **`tap_accounts`/`tap_posts`**(threads-affiliate-poster
접두어)로 분리했다. 새 테이블을 추가할 때도 이름이 겹치지 않는지 먼저 확인할 것 — 이 저장소는
여러 서브프로젝트가 하나의 Supabase 프로젝트를 공유하므로, 프로젝트 로컬 마이그레이션 파일만
보고 테이블명이 안 겹칠 거라고 가정하면 안 된다. `information_schema.tables`로 실제 라이브
스키마와 대조하고 결정할 것.

### Threads OAuth — 새 Meta 앱을 만들지 않고 `threads/`의 공용 앱을 재사용한다
`THREADS_APP_ID`/`THREADS_APP_SECRET` 값은 `threads/.env.local`에 있는 것과 동일한 값을 그대로
쓴다(새 권한이 필요 없어서 앱을 새로 만들 이유가 없음). 대신 그 Meta 앱의 "유효한 리디렉션
URI" 목록에 `https://threads-affiliate-poster.vercel.app/api/threads/callback`을 **추가로**
등록해야 한다(기존 threads/ 콜백 URI는 그대로 둔 채 추가만 하는 것 — instagram-comment-reply/
instagram-dm-reply가 같은 Meta 앱에 리디렉션 URI를 여러 개 등록했던 것과 동일한 패턴).

### 제휴 API 클라이언트(쿠팡/알리익스프레스)
- `src/lib/coupang/client.ts`, `src/lib/aliexpress/client.ts`는 커뮤니티 SDK/공식 문서를
  근거로 구현했고, 엔드포인트/서명 방식(쿠팡: CEA HmacSHA256, 알리익스프레스: TOP API MD5)을
  1차 소스로 재확인까지 마쳤다(2026-08-27).
- **알리익스프레스는 2026-08-28에 실제 발급받은 App Key/Secret + Tracking ID(`buylife`)로
  `aliexpress.affiliate.link.generate` 실호출까지 검증 완료**했다(HTTP 200, `resp_code: 200`,
  "Call succeeds" — 테스트에 쓴 상품 하나가 판매 불가 지역이라는 데이터성 메시지만 있었고
  서명/엔드포인트/파라미터는 전부 정상). Tracking ID는 `aliexpress_tracking_id`라는 이름으로
  공용 `user_api_keys`에 provider를 추가해서(0002 마이그레이션) 본인 값만 쓰도록 고쳤다 —
  예전엔 `"threads_affiliate_poster"`라는 값이 코드에 하드코딩되어 있었다.
- **쿠팡은 2026-09-11 실계정 실호출로 검증 완료했다.** 매출 요건을 채워 키가 활성화된 뒤
  실제로 검색(GET)/딥링크(POST) 흐름을 테스트하다 두 가지를 발견했다.
  1. **서명 버그**: `buildAuthorizationHeader`가 서명 대상 문자열에 path와 query 사이 "?"를
     포함시키고 있었다("Invalid signature" 401). 공식 문서(PHP/Python 예제)대로 `datetime+
     method+path+query`를 "?" 없이 이어붙이도록 수정(실제 요청 URL에는 "?"가 그대로 필요).
  2. **"url convert failed"(400) 딥링크 오류**: 검색 API가 돌려주는 `productUrl`은 이미 본인
     파트너스 키로 추적되는 제휴 링크(`link.coupang.com/re/AFFSDP?...`)였다 — 여기에 딥링크
     변환을 다시 걸면 쿠팡이 거부한다.
  → 이 두 번째 발견을 계기로 **딥링크 변환 API(`createDeeplink`) 자체를 제거**했다. 검색
  결과로 고른 상품은 `productUrl`이 이미 추적 링크라 그대로 `affiliate_url`로 저장하고,
  "URL 직접 입력"도 네이버 브랜드커넥트(`registerNaverProductAction`)와 동일하게 사용자가
  쿠팡파트너스 사이트에서 직접 발급받은 본인 제휴 링크를 그대로 붙여넣는다는 전제로 바꿨다
  (2026-09-11). 그래서 `registerCoupangProductAction`은 이제 Access/Secret Key를 전혀
  요구하지 않는다 — 그 키는 상품 검색(`searchCoupangProductsAction`)에만 필요하다. 매출
  15만원 미달로 검색 API 키가 아직 활성화되지 않은 회원도 "URL 직접 입력"으로는 등록할 수
  있다. 실제 상품(무선 이어폰 검색 → 선택 → 등록)으로 end-to-end 성공 확인.
- 쿠팡 상품검색 API는 시간당 호출 제한(약 10회, 커뮤니티 정보 — 쿠팡이 발급 시 제공하는
  가이드 PDF에만 적혀 있고 공개 문서 포털에는 없음)이 있다고 알려져 있어, 화면에도 안내
  문구를 노출하고 검색 결과를 `affiliate_products`에 저장해 재검색을 줄이는 방향으로
  설계했다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Threads OAuth 연결(공용 앱 재사용), AI 캡션 생성(`generatePostContent`/`generateAffiliatePostContent`), 이미지 생성(NanoBanana), 즉시/예약 게시, 예약 발행 dispatch(admin/user 이중화 + CRON_SECRET 보호 라우트) | ✅ 구현 완료 |
| 1 | 쿠팡파트너스 클라이언트(키워드 검색 + 딥링크 생성) | ✅ 구현 완료 + 실계정 실호출 검증 완료(2026-09-11) |
| 1 | 알리익스프레스 클라이언트(URL → 제휴 링크 변환) | ✅ 구현 완료 + 실계정 실호출 검증 완료(2026-08-28) |
| 1 | 네이버 브랜드커넥트 — 공식 API 없음, 직접 발급받은 링크를 수동으로 등록하는 방식으로 구현 | ✅ 구현 완료(구조적으로 계속 수동) |
| 1 | 상품 등록 2가지 입력 방식(URL 간단 입력 / 상품정보+상세페이지 직접 입력) — `affiliate_products.input_mode`, `auto-detail-page`의 `detail_pages` 읽기 전용 참조 | ✅ 구현 완료 |
| 1 | "분석으로 등록" 6단계 흐름(`EnrichmentFields`) — 1.대표이미지 2.상세페이지 이미지(선택,최대10) 3.상품 원본 정보 4.분석 결과 확인/수정 5.게시글용 대표 이미지(업로드 선택 또는 NanoBanana AI 생성) 6.최종 확인. `shop-detail-page`(별도 서브프로젝트, `/products/new`)의 AI 분석 UX를 참고해서 설계했다 — `auto-detail-page`와는 다른 프로젝트이니 혼동 주의. | ✅ 구현 완료(2026-08-28) |
| 1 | 제휴 고지 문구 자동 삽입(쿠팡/알리익스프레스/네이버 전부), 500자 제한 안에 고지 문구가 항상 포함되도록 본문 자동 트리밍 | ✅ 구현 완료 |
| 1 | 게시글 영상 첨부 — Threads API `media_type=VIDEO`+`video_url`(공식 스펙: MP4/MOV, 최대 1GB, 최대 5분). 이미지와 동시 첨부는 불가해 UI/서버 양쪽에서 배타적으로 처리. `tap_posts.video_filename`(미사용 스텁)을 `video_url`로 교체(0003 마이그레이션) | ✅ 구현 완료(2026-08-28, 공식 문서 기준 구현 — 실제 영상 게시 테스트는 아직 안 함) |
| 1 | `programs` 카탈로그 등록 + 썸네일(Gemini 생성) | ✅ 구현 완료(2026-08-27) |
| 1 | Vercel 배포(`buylife` 팀, 공용 Threads 앱 env 재사용) | ✅ 구현 완료(2026-08-27) |
| 1 | 토스쇼핑 쉐어링크 연동 — `src/lib/toss/client.ts`(OAuth2 client_credentials 토큰 발급, 베스트/카테고리/오늘의특가 상품 조회, 쉐어링크 발급). Toss Open API는 사전 등록된 고정 IP에서만 호출을 허용하는데 Vercel 서버리스는 고정 IP가 없어, **Fixie(usefixie.com) 프록시**를 붙여 해결했다 — 모든 요청이 `undici`의 `ProxyAgent`(`dispatcher` 옵션, `FIXIE_URL` env)를 거쳐 고정 IP 2개(`52.87.82.133`, `52.5.155.132`)로 나간다. `user_api_keys`에 `toss_access_key`/`toss_secret_key`/`toss_publisher_id` 3종 추가(0006 마이그레이션), `affiliate_products.platform`에 `'toss'` 추가, 설정 페이지에 고정 IP를 본인 토스 어드민 "허용 IP"에 등록하라는 안내 포함, 제휴 고지 문구도 토스용으로 추가. 키워드 검색 API가 없어 UI는 베스트/카테고리별/오늘의 특가 브라우징 방식으로 구현. **실계정 실호출로 응답 필드명 확인 완료(2026-09-10)**: 문서 예시 부족으로 처음엔 `productName`/`imageUrl`/`price`로 추정 구현했으나, 실제 응답은 `displayName`/`thumbnailUrl`/`displayPrice`였다(그래서 상품 목록은 뜨는데 이름/이미지/가격이 전부 비어 보이는 버그가 있었음) — `normalizeTossProduct()`를 실제 필드명 기준으로 수정. 또한 목록 응답에는 `tacaId` 필드 자체가 없고 `tacaItemId`만 내려온다(쉐어링크 발급은 `tacaItemId` 기준이라 문제 없음). 카테고리 목록(`/categories`)도 같은 이유로 `name`이 아니라 `displayName`이 실제 필드명이라 드롭다운이 빈 값으로 보이던 버그가 있었음 — 수정 완료. 베스트/카테고리별/오늘의특가 3개 탭 전부 실계정으로 상품명·가격·이미지 정상 노출 확인. 쉐어링크 발급(`POST /links`)도 `subTagId`에 회원 user_id를 임의로 채워 보내던 게 원인으로 `SHARELINK_OPENAPI_ACCESS_DENIED`("접근 권한이 없습니다") 오류가 났었다 — subTagId는 `POST /openapi/sub-tags/create`로 사전 등록한 값만 허용되므로 자동 전송 로직을 제거(선택 필드라 생략 가능). 실제 상품으로 쉐어링크 발급까지 end-to-end 성공 확인(2026-09-10). | ✅ 구현 완료 + 실계정 전체 플로우(브라우징 3종+쉐어링크 발급) 검증 완료(2026-09-10) |
| 2 | 실사용자 쿠팡 API 키 실연동 검증 | ✅ 완료(2026-09-11, 위 참고) |
| 2 | 실사용자 알리익스프레스 API 키 실연동 검증, Meta 앱에 새 리디렉션 URI 등록, Vercel Cron 활성화 | ⏳ 예정(의도적으로 미착수) |
| 2 | 토스쇼핑 쉐어링크 실계정 검증 — Access/Secret Key·Publisher ID 발급, Fixie 고정 IP 2개를 토스 어드민 허용 IP에 등록, 베스트/카테고리/오늘의특가 실호출로 응답 필드명 확인·필요시 클라이언트 파싱 로직 수정 | ⏳ 예정(의도적으로 미착수) |
| 2+ | 알리익스프레스 키워드 검색(`listPromotionProduct`), 상품 가격/재고 변동 알림, 다른 채널 동시 배포 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
