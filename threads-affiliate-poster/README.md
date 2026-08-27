# 🛍️ Threads Affiliate Poster — 쓰레드 쇼핑제휴 자동화

쿠팡파트너스/알리익스프레스/네이버 브랜드커넥트 제휴 링크를 자동으로 붙여서 쓰레드 홍보
게시글을 만들어주는 프로그램. `threads/`(쓰레드 자동 포스팅)와 `auto-detail-page/`(상세페이지
자동화)를 조사한 뒤, 처음부터 새로 만들지 않고 두 프로젝트의 재사용 가능한 부분을 최대한
가져다 썼다.

## 설계 배경 — 왜 이렇게 만들었나

### 1. Threads 인프라는 새로 만들지 않고 `threads/`를 그대로 이식
`threads/`를 조사해보니 OAuth 연결, AI 캡션 생성기(`generatePostContent()` — 제목 10자·본문
450자 제한, `cta: {text, url}` 파라미터로 링크를 자연스럽게 삽입하는 기능까지 포함), 이미지
생성(NanoBanana), 즉시/예약 게시, 크론 이중화(cron-job.org 메인 + Vercel Cron 백업) 스케줄러가
전부 프로덕션 수준으로 완성되어 있었다. README에는 "AI 생성 기능은 확장 예정 스텁"이라고
적혀 있었지만 실제 코드는 완성 상태였다 — 이 프로젝트는 그 코드를 그대로 복제해서 이식했다.

### 2. 새 Meta 앱을 만들지 않았다
`threads/`가 이미 쓰는 **공용 단일 Meta 앱**(`THREADS_APP_ID`/`THREADS_APP_SECRET`, 스코프
`threads_basic,threads_content_publish`)을 그대로 재사용한다. 이 프로젝트는 새로운 권한이
필요 없으므로, 그 앱의 "유효한 리디렉션 URI" 목록에 이 프로젝트의 콜백 주소만 추가로
등록하면 된다 — 사용자가 또 새 앱을 처음부터 만들 필요가 없다.

### 3. `auto-detail-page`는 프롬프트를 재사용하지 않았다
`auto-detail-page`는 URL을 넣으면 자동 분석하는 구조가 아니라 사용자가 상품명/설명/셀링포인트를
직접 입력하는 방식이고, 결과물도 짧은 캡션이 아니라 4000px+ 세로 상세페이지 HTML이라 프롬프트를
그대로 가져다 쓸 수 없었다. 대신 **"상품정보+상세페이지 직접 입력" 모드**에서, 사용자가 이미
`auto-detail-page`로 만들어둔 `detail_pages`를 같은 공용 Supabase 프로젝트 안에서 읽기 전용으로
참고할 수 있게만 연결했다(그 프로젝트 자체는 수정하지 않음).

### 4. 테이블명이 `threads/`와 겹쳐서 접두어를 붙였다
같은 Supabase 프로젝트를 공유하다 보니 `threads/`가 이미 `threads_accounts`/`posts` 테이블을
쓰고 있었다. 그래서 이 프로젝트는 `tap_accounts`/`tap_posts`(threads-affiliate-poster
접두어)로 분리했다.

### 5. 제휴 고지 문구는 법적 요구사항이라 강제로 삽입한다
쿠팡파트너스는 자체 운영정책과 표시광고법상 "이 포스팅은 쿠팡 파트너스 활동의 일환으로
일정액의 수수료를 제공받을 수 있다"는 고지가 필수다. `src/lib/ai/affiliateGenerator.ts`의
`generateAffiliatePostContent()`가 캡션 생성 직후 이 문구를 항상 덧붙이고, Threads 500자
제한 안에 들어가도록 본문을 자동으로 줄인다. 이 로직은 우회하면 안 된다.

## 제휴 플랫폼별 자동화 가능 범위

| 플랫폼 | 자동화 | 방식 |
|---|---|---|
| 쿠팡파트너스 | ✅ 완전 자동 | 공식 Open API — 키워드 상품검색(`searchProducts`) + URL→딥링크 변환(`createDeeplink`). HMAC-SHA256(CEA) 인증. |
| 알리익스프레스 | ✅ 완전 자동 | 공식 Affiliate API(TOP 프로토콜) — 상품 URL → 제휴 링크 변환(`getPromotionLinks`, method: `aliexpress.affiliate.link.generate`). MD5 서명. |
| 네이버 브랜드커넥트 | ⚠️ 반자동 | 공식 API를 찾지 못했다(링크 발급이 네이버 웹사이트 수동 조작으로만 가능 — 이 저장소는 비공식 스크래핑을 만들지 않는다는 원칙이 있어 자동화하지 않았다). 사용자가 직접 발급받은 링크를 붙여넣는 방식만 지원한다. |

## 데이터 모델

- `tap_accounts` — Threads OAuth 연결(user_id unique, threads_user_id, username, access_token,
  token_expires_at)
- `affiliate_products` — 등록된 제휴 상품. `platform`(coupang/aliexpress/naver),
  `input_mode`(url/manual), `product_url`/`affiliate_url`/`price`/`image_url`,
  manual 모드용 `description`/`key_selling_points`/`detail_page_id`(다른 서브프로젝트
  `detail_pages.id`를 느슨하게 참조, FK 없음)
- `tap_posts` — 게시글(`threads/`의 `posts`와 거의 동일한 상태머신: draft→scheduled→
  publishing→published/failed) + `product_id`로 `affiliate_products`와 연결
- `user_api_keys` — 공용 테이블, provider 4종 추가(`coupang_access_key`/`coupang_secret_key`/
  `aliexpress_app_key`/`aliexpress_app_secret`)

## 핵심 흐름

1. `/settings` — Threads 계정 연결 + AI 키(OpenAI/Gemini) + 쿠팡/알리익스프레스 키 등록(전부
   선택 등록)
2. `/products` — 플랫폼 탭 3개(쿠팡 검색/알리익스프레스 URL/네이버 수동 링크) + 입력 방식
   2가지(URL 간단 / 상품정보+상세페이지 직접 입력)
3. `/posts/new` — 상품 선택 → 톤 선택 → AI 캡션 생성(제휴 고지 문구 자동 포함) → 미리보기/수정
   → 즉시 게시 또는 예약
4. 예약 게시는 `threads/`와 동일한 크론 이중화(cron-job.org 메인 + Vercel Cron 백업)로 처리

## Phase 진행 상태

[AGENTS.md](AGENTS.md)의 Phase 표 참고.

## 명령어

```bash
npm run dev       # 로컬 개발 서버
npm run build     # 프로덕션 빌드
```

## 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
THREADS_APP_ID=            # threads/.env.local과 동일한 값(공용 앱 재사용)
THREADS_APP_SECRET=        # threads/.env.local과 동일한 값
THREADS_REDIRECT_URI=      # 이 프로젝트 전용 콜백 URL
CRON_SECRET=                # 이 프로젝트 전용(다른 서브프로젝트와 값을 공유하지 않음)
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_MAIN_SITE_URL=
```

## Vercel Cron (`vercel.json`, 아직 미활성화 — 사용자 승인 후 배포)

- `/api/posts/dispatch-scheduled` — 예약 게시 실행. 메인은 외부 스케줄러(cron-job.org, 1~5분
  간격), Vercel Cron은 하루 1회 백업(`threads/`와 동일한 이중화 전략).
