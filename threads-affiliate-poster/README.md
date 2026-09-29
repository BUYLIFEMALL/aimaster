# 🛍️ Threads Affiliate Poster — Threads 쇼핑제휴 자동화

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
| 알리익스프레스 | ✅ 완전 자동 | 공식 Affiliate API(TOP 프로토콜) — 상품 URL → 제휴 링크 변환(`getPromotionLinks`, method: `aliexpress.affiliate.link.generate`) + 공식 고화질 썸네일 수집(`getProductDetails`). MD5 서명. |
| 토스쇼핑 쉐어링크 | ✅ 완전 자동 | 공식 OAuth2 API — Fixie 고정 IP 프록시 연동. 상품 브라우징(베스트/카테고리/특가) + 쉐어링크 발급. |
| 네이버 브랜드커넥트 | ⚠️ 반자동 | 공식 API 미제공. 사용자가 직접 발급받은 쉐어링크 수동 등록 방식 지원. |

## 데이터 모델

- `tap_accounts` — Threads OAuth 연결(user_id unique, threads_user_id, username, access_token, token_expires_at)
- `affiliate_products` — 등록된 제휴 상품. `platform`(coupang/aliexpress/naver/toss), `input_mode`(url/manual), `product_url`/`affiliate_url`/`price`/`image_url`, manual 모드용 `description`/`key_selling_points`/`detail_page_id`
- `tap_posts` — 게시글(`threads/`의 `posts`와 동일한 상태머신: draft→scheduled→publishing→published/failed) + `product_id`로 `affiliate_products`와 연결
- `tap_saved_posts` — 찜/직접 가져온 레퍼런스 글 보관함 (user_id, post_id, author_handle, author_name, content, category). `post_id` 접두사로 출처 구분: `th-`(Threads 검색), `mn-`(직접 가져옴, `mn-<shortcode>`면 원문 링크 복원), `ai-`(AI 예시), 그 외(작성 예시). likes/replies/reposts 컬럼은 남아 있지만 실제 수치가 없어 쓰지 않는다. (운영 DB 적용: 2026-09-28)
- `tap_personas` — 회원이 저장한 "내 페르소나" (user_id, name ≤40자, tone_description ≤500자, sample_writing ≤1,000자 선택, 회원당 최대 20개; `emoji_style`/`is_default` 컬럼은 미사용). 2026-09-29 연결: 커스텀 페르소나 입력 후 "💾 내 페르소나로 저장" → 트렌드 벤치마킹 모달·새 게시글 작성 화면의 공용 `PersonaPicker`(`src/components/personas/`)에서 "내 저장 페르소나" 그룹으로 선택, 트렌드 "AI 페르소나 보관함" 탭에서 삭제. 서버 액션 `src/lib/actions/personas.ts`, 프롬프트 변환 `src/lib/personaTone.ts`(예시 문장은 "말투만 참고"로 전달). 선택 id는 `my-<uuid>`로 프리셋(`p-01`)과 구분.
- `user_api_keys` — 공용 테이블, provider 추가(`coupang_access_key`/`coupang_secret_key`/`aliexpress_app_key`/`aliexpress_app_secret`/`toss_access_key`/`toss_secret_key`/`toss_publisher_id`)

## 상품 등록 미리보기 (2026-09-30, v1.06)

- 쿠팡 검색 결과·토스 상품 목록의 "선택" 버튼 왼쪽에 **🔍 상세보기** 버튼(`src/components/products/ProductPreviewButton.tsx`)이 있어, 실제 상세페이지를 팝업으로 열어 보고 고를 수 있다.
- 쿠팡은 API의 `productUrl`이 **회원 본인 제휴 추적 링크**라 미리보기로 열면 제휴 클릭으로 잡힐 수 있으므로, 일반 상품 페이지 `https://www.coupang.com/vp/products/{productId}`를 연다. 미리보기에 제휴 링크를 쓰지 말 것.
- 토스는 목록에 `productUrl`이 없으면 `https://toss.shopping/t/{tacaItemId}`를 연다(등록된 토스 상품의 원본 주소가 이 형태이고 공유 키 없이 열림 확인). 목록 번호와 페이지 번호가 같은지는 실제 목록에서 한 번 더 확인 필요.

## 쿠팡 링크 직접 등록 검사 (2026-09-30, v1.07)

- 파트너스 사이트(partners.coupang.com [링크 생성])에서 만든 링크는 "쿠팡 상품 URL 직접 입력 → 이 링크로 등록"으로 등록한다. 검색 API는 키워드당 10개·시간당 10회라 사이트보다 상품이 적다.
- `src/lib/coupang/links.ts`의 `checkCoupangAffiliateLink()`가 화면과 서버(`registerCoupangProductAction`) 양쪽에서 링크를 검사한다: `link.coupang.com/...` 또는 `lptag=AF...`가 붙은 주소만 허용, 일반 쇼핑 주소(`www/m.coupang.com/...`)는 수수료가 안 잡히므로 경고하고 등록을 막는다. `coupa.ng` 단축 링크도 허용.
- **사진·이름 자동 입력 (v1.08)**: 쿠팡은 서버에서 상품 페이지를 열면 403으로 막고(Vercel·로컬 모두 확인), 검색 API에 상품번호를 넣어도 그 상품이 나오지 않는다(2026-09-30 실측). 그래서 링크 주소만으로는 사진을 가져올 수 없다. 대신 파트너스 링크 생성 화면의 **HTML(이미지형) 코드**를 붙여넣으면 `parseCoupangShareCode()`가 링크·`<img src>`·`alt`(상품명)를 뽑아 채운다. HTML 코드의 실제 형식은 회원 화면에서 한 번 확인 필요(추정 형식으로 구현). 제휴 링크(`link.coupang.com/a/`)를 서버가 직접 열어 확인하는 방식은 회원의 제휴 클릭으로 잡힐 수 있어 쓰지 않는다.

## 떡상글 탐지기 (/trends)

> ⚠️ 2026-09-28 정정: 이전에 "5대 바이럴 떡상 탐지기"로 소개된 조회수 배지·반응도 정렬·실시간 검색은 하드코딩
> 샘플과 지어낸 수치였고 실제로 동작하지 않았다. 아래가 실제 동작하는 기능이다.

0. **사용 방법 안내 박스**: 화면 맨 위에 "A. Meta 앱 검수 승인 회원 — 타인 공개 글 검색" / "B. 승인 전 회원 — 떡상글 직접 가져오기"를 나란히 안내하고, 연결 계정·검색 권한 상태를 표시한다.
1. **Threads 키워드 검색 (Meta 공식 `keyword_search`)**: 키워드/해시태그 검색 방식, 미디어 유형(글·이미지·동영상), 작성자 필터 지원. 검색어/브랜드 칩으로 실제 Threads 글 검색, 인기순(TOP)/최신순(RECENT), 1일/1주/1달 기간 필터. 앱 심사로 `threads_keyword_search`가 승인되기 전에는 **본인 계정 글만** 검색된다. 타인 글의 좋아요·조회수는 API가 주지 않아 표시하지 않고 원문 링크를 제공한다. 글에 붙은 **이미지·영상은 참고용 미리보기**로 보여준다(Meta CDN 주소라 약 4일 뒤 만료, 저장·재게시하지 않음, v1.04).
2. **떡상글 직접 가져오기**: Threads 게시글 링크(선택)+본문(필수)을 붙여넣으면 공개 게시글 여부를 확인하고 보관함에 저장.
3. **찜 보관함 (`tap_saved_posts`)**: 검색 결과·가져온 글·예시 찜하기 및 `📁 내 찜 보관함` 탭.
4. **부가 자료 (버튼 클릭 시에만)**: 관련 쿠팡 상품 보기(시간당 호출 제한), AI 작성 예시 3개(본인 OpenAI 비용).
5. **10종 AI 페르소나 벤치마킹 캡션 생성**: 선택한 레퍼런스 글의 문체를 참고해 내 상품 제휴 캡션 + NanoBanana 이미지 생성. 화면에서 고른 AI 모델(OpenAI GPT-6/5.6/4.1 등, Gemini 3.x, Claude Sonnet 5/Opus 5/Haiku 4.5)을 그대로 호출한다.

## 5단계 추천 이용 프로세스 (대시보드)

1. `🔑 API키등록·플랫폼연동 (/settings)` — Threads 계정 연결 + AI 키(OpenAI/Gemini/Claude) + 제휴 키(쿠팡/알리/토스) 등록
2. `🛒 상품 관리 (/products)` — 쿠팡·알리·네이버·토스 제휴 상품 등록 및 고화질 썸네일/제휴 링크 자동 추출
3. `🔥 트렌드 & 떡상 탐지기 (/trends)` — Threads 키워드 검색·떡상글 직접 가져오기 & 10종 AI 페르소나 벤치마킹 캡션 생성
4. `📝 새 게시글 작성 (/posts/new)` — 10종 AI 페르소나 선택 → 멀티 AI 엔진 캡션 및 NanoBanana AI 이미지 생성
5. `🚀 퍼블리싱 & 예약 관리 (/posts)` — Threads 즉시 게시 또는 스케줄링 예약 자동 포스팅 진행
4. 예약 게시는 `threads/`와 동일한 크론 이중화(cron-job.org 메인 + Vercel Cron 백업)로 처리

## 별도 서버로 통째 복제하기

다른 GitHub·Vercel·Supabase 계정으로 옮겨 독립 운영하는 **복제 키트**가 [`clone-kit/`](clone-kit/)에 있다 (v1.02, 2026-09-29).

| 파일 | 내용 |
|---|---|
| `clone-kit/README.md` | 설치 매뉴얼 (Supabase → Vercel → 환경변수 → 첫 계정 → Threads 연동 → 크론 → 문제 해결) |
| `clone-kit/GUIDELINES.md` | 복제본의 기본지침 (복제본에서는 `AGENTS.md`가 됨) |
| `clone-kit/DB_DESIGN.md` | DB 설계 (테이블·관계·RLS·이용 권한 판정) |
| `clone-kit/database/schema.sql` | 새 DB에 한 번에 붙여넣는 전체 스키마 (= `00_core_tables.sql` + `supabase/migrations/*` + `99_finalize.sql`) |
| `clone-kit/env.example` | 환경변수 목록 |
| `clone-kit/manuals/*.html` | 회원용 연동 매뉴얼 8종 (`platform_guides`에서 내보냄) |
| `clone-kit/scripts/make-clone.mjs` | `node clone-kit/scripts/make-clone.mjs <대상폴더>` — 비밀값을 뺀 복제본 폴더를 만들고 위 파일들을 배치 |

- **독립 운영 모드**: 같은 코드가 `NEXT_PUBLIC_STANDALONE_MODE=true`일 때 자체 회원가입(`/signup`, `/auth/callback`), 권한 없음 안내(`/no-access`),
  법적 고지(`/legal/privacy|terms|data-deletion`, 운영자 정보는 `NEXT_PUBLIC_OPERATOR_*`)를 쓰고, AIMaster 링크·매뉴얼 버튼·다른 쓰레드 프로그램
  테이블(`threads_accounts`, `th_accounts`, `th_posts`) 접근을 끈다. 스위치와 주소는 `src/lib/deployment.ts` 한 곳에 모여 있다. 값이 없으면(AIMaster 운영)
  기존 동작과 같다.
- 2026-09-29 검증: 두 모드 모두 `npm run build` 통과, `make-clone.mjs`로 만든 복제본 빌드 통과, `schema.sql`을 빈 PostgreSQL 17(Supabase auth/storage 최소 모사)에
  실행해 오류 없이 테이블 15개·`post-images` 버킷·가입 트리거·키 종류 제한 동작 확인. 실제 새 Supabase/Vercel 계정에서의 전체 설치는 아직 안 해 봄.
- **유지 규칙**: 새 마이그레이션을 추가하면 `make-clone.mjs`로 복제본을 한 번 만들어 `clone-kit/database/schema.sql`을 갱신하고, 새 AIMaster 의존
  (공용 테이블·`buylife.xyz` 링크·다른 프로그램 테이블)을 추가하면 `deployment.ts` 분기와 `clone-kit/` 문서를 같이 고칠 것.

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
