# 🛍️ Threads Affiliate Poster — Threads 쇼핑제휴 자동화 (v1.61)

> **최신 버전**: `v1.61` | **실제 서비스 링크**: https://threads-affiliate-poster.buylife.xyz  
> **디자인 템플릿**: **스레드 바이럴 스튜디오 스타일 — 쇼핑제휴 변형 (Threads Viral Studio Style - Affiliate Variant)**  

---

## 🏛️ [규격화 7대 핵심 항목 안내]

1. **프로그램의 사용 목적 및 대상**:
   - 쿠팡파트너스/알리익스프레스/네이버 브랜드커넥트/토스쇼핑 쉐어링크 상품을 기반으로 10종 AI 페르소나와 나노바나나 AI 이미지를 결합한 Threads 홍보 글·카드뉴스를 자동 생성 및 발행하는 마케팅 자동화 SaaS.
   - 대상: 이커머스 제휴 마케터, 부업 크리에이터, Threads 인플루언서.
2. **개발 구현에 사용된 도구 / 기술 스택**:
   - Next.js 16.2.11 (Turbopack, App Router), React 19, TypeScript, Tailwind CSS v4
   - Supabase SSR, Vercel Serverless Functions, Playwright (Edge 전용 검수)
   - Meta Threads Graph API (OAuth), Google Gemini (NanoBanana), OpenAI (GPT-4.1), Claude, Coupang/AliExpress/Toss API
3. **핵심 기능 및 시스템 아키텍처 (장점/단점)**:
   - 10종 페르소나 어조 맞춤 캡션 생성, 4대 플랫폼 제휴 링크 자동 파싱/썸네일 수집, 공정위 경제적 대가 고지문 자동 포함, 나노바나나 AI 카드뉴스 조립, 즉시/예약 발행 스케줄러.
   - 장점: 키가 없어도 직링크로 즉시 사용 가능, Meta 모노 다크 감성 및 375px 모바일 완벽 대응, 100% 회원 본인 키 사용으로 비용 0원.
   - 단점: 알리/토스의 경우 초기 사전 키 등록 필요, Threads API 앱 심사 전 테스터 계정 위주 연동.
4. **현재 버전 및 버전별 변경 히스토리**:
   - 현재: `v1.61` (DB 및 UI 일치)
   - `v1.61`: 스레드 바이럴 스튜디오 다크 콘솔 스타일 전면 리뉴얼, 모바일 햄버거 메뉴 신설, 비주얼 매뉴얼(`/guide`) 신규 구축, 대시보드 다크 테마 일관화.
5. **남아 있는 추가 프로그램 및 디자인 대기 내용**:
   - `docs/IMPROVEMENT_BACKLOG.md` (상품 품절 자동 체크, 구매 링크 첫댓글 자동 포스팅 연계, 폼 세부 다크 인풋 보강).
6. **기존 다른 프로그램과의 연계/기능 병합 제안**:
   - 8번 `detail-page-12p` (상세페이지 요약문 가져오기), 34번 `threads-video-downloader` (영상 미디어 연계), 46번 `threads-comment-reply` (구매 링크 대댓글 자동 발송).
7. **사용자 편의성 증대를 위한 디자인 UI 개선안**:
   - `docs/DESIGN_HANDOFF.md` 및 `docs/IMPROVEMENTS.md` 참조.

---

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
- 등록 화면의 직접 입력 칸 제목은 "🛒 쿠팡 API키가 없는 경우 직접 등록방법"(굵게, v1.12 문구 확정)이고, 아래에 5단계 등록 방법(파트너스 링크 생성 화면 바로가기 포함)을 안내한다(v1.10, v1.11부터 2단계는 "블로그용 태그").
- **사진·이름 자동 입력 (v1.11, 2026-09-30 서버 실측으로 확정)**: 쿠팡은 서버에서 상품 페이지를 열면 403으로 막고, 검색 API에 상품번호를 넣어도 그 상품이 나오지 않아 링크 주소만으로는 사진을 못 가져온다. 대신 파트너스 링크 생성 화면 아래 **[이미지 + 텍스트] → HTML → "블로그용 태그"** 코드를 쓴다.
  - **블로그용 태그** `<a href="https://link.coupang.com/a/…"><img src="https://img3a.coupangcdn.com/image/affiliate/banner/…@2x.jpg" alt="상품명">`: `importCoupangBlogTagAction`이 링크·상품명을 코드에서 읽고, 배너(240x480, 로고+사진+버튼)의 사진 칸(0,60,240,240)을 잘라(`src/lib/coupang/widget.ts`, jpeg-js) `post-images`에 저장한다. coupangcdn.com 배너 주소만 요청한다.
  - **일반태그** `<iframe src="https://coupa.ng/xxxx">`는 **쓰지 않는다**: 이 컴퓨터(한국 가정/사무실 회선)에서는 coupa.ng가 링크·이름·사진 경로를 담은 주소로 넘겨주지만, **Vercel 서버에서는 미국·서울 지역 모두 403**(클라우드 IP 차단). v1.09에서 로컬 테스트만 보고 이 방식으로 배포했다가 회원 화면에서 실패했다. 일반태그를 넣으면 "블로그용 태그를 넣어달라"는 안내가 뜬다.
  - `coupa.ng` 주소 자체는 위젯 페이지라 게시글 링크로 저장하지 않는다(`checkCoupangAffiliateLink`가 `widget_url`로 거부).
  - 제휴 링크(`link.coupang.com/a/`)를 서버가 직접 여는 방식은 회원의 제휴 클릭으로 잡힐 수 있어 쓰지 않는다.
  - `sharp`는 쓰지 않는다: Vercel 함수에 네이티브 라이브러리(libvips)가 포함되지 않아 `ERR_DLOPEN_FAILED`로 실패했다(시험 배포에서 확인). 순수 JS인 `jpeg-js`로 자른다.
  - `vercel.json`에 `"regions": ["icn1"]`(서울) 지정 — 쿠팡 차단은 풀리지 않았지만 공용 DB(Supabase ap-northeast-2)와 가까워 유지.

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

## 배포 키트(수강생·외부 설치용) — AIMaster 표준 `KIT/` 방식 (2026-10-19 개편)

다른 사람이 자기 Supabase·Vercel·Meta 계정에 설치해 독립 운영하는 **배포 키트**는 [`KIT/`](KIT/)에 있다. 지침: 루트 [`docs/DISTRIBUTION_KIT_GUIDE.md`](../docs/DISTRIBUTION_KIT_GUIDE.md).
(예전 `clone-kit/` + `make-clone.mjs` 방식은 2026-10-19 `KIT/` 표준으로 통합 — 설치 스크립트로 환경변수·배포 자동화, DB 파일은 포장 때 마이그레이션에서 자동 생성)

| 파일 | 내용 |
|---|---|
| `KIT/README.md` | 수강생용 설치 안내(표준 목차 0~9장) |
| `KIT/kit.json` | 포장·설치 설정(뺄 항목, 덮어쓸 파일, DB 파일 생성 순서, 추가 환경변수 질문) |
| `KIT/database/00_core_tables.sql`, `99_finalize.sql` | DB 파일 앞·뒤 조각(가운데는 `supabase/migrations/*`) — 포장 때 `KIT/schema.sql`로 합쳐짐 |
| `KIT/setup.ps1` / `setup.sh` | 공용 설치 스크립트(원본 `AIMaster/scripts/kit-template/`) |
| `KIT/enable-vercel-cron.*`, `KIT/vercel.json` | Pro용 1분 예약 호출 켜기 / 무료 요금제용 설정 |
| `KIT/PLATFORMS.md`, `KIT/manuals/*.html` | 플랫폼별 키 발급 매뉴얼 8종 |
| `KIT/DB_DESIGN.md`, `KIT/GUIDELINES.md` | DB 설계, 설치본 기본 지침 |

- 포장: 루트에서 `python scripts/make_lecture_kit.py --name <묶음이름> --programs threads-affiliate-poster` → `D:\PDS\<묶음이름>_<날짜>.zip`(비밀값 자동 검사)

- **독립 운영 모드**: 같은 코드가 `NEXT_PUBLIC_STANDALONE_MODE=true`일 때 자체 회원가입(`/signup`, `/auth/callback`), 권한 없음 안내(`/no-access`),
  법적 고지(`/legal/privacy|terms|data-deletion`, 운영자 정보는 `NEXT_PUBLIC_OPERATOR_*`)를 쓰고, AIMaster 링크·매뉴얼 버튼·다른 쓰레드 프로그램
  테이블(`threads_accounts`, `th_accounts`, `th_posts`) 접근을 끈다. 스위치와 주소는 `src/lib/deployment.ts` 한 곳에 모여 있다. 값이 없으면(AIMaster 운영)
  기존 동작과 같다.
- 2026-09-29 검증: 두 모드 모두 `npm run build` 통과, `make-clone.mjs`로 만든 복제본 빌드 통과, `schema.sql`을 빈 PostgreSQL 17(Supabase auth/storage 최소 모사)에
  실행해 오류 없이 테이블 15개·`post-images` 버킷·가입 트리거·키 종류 제한 동작 확인. 실제 새 Supabase/Vercel 계정에서의 전체 설치는 아직 안 해 봄.
- **유지 규칙**: 새 마이그레이션은 포장 때 자동으로 DB 파일에 들어간다(별도 갱신 불필요). 회원 키 종류를 추가하면 `KIT/database/99_finalize.sql` 허용 목록에도 넣고,
  새 AIMaster 의존(공용 테이블·`buylife.xyz` 링크·다른 프로그램 테이블)을 추가하면 `deployment.ts` 분기와 `KIT/` 문서를 같이 고칠 것.

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


## 2026-10-16 DB 연동 변수 호환 — v1.52 (threads-affiliate-poster)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-004(P1)를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.
