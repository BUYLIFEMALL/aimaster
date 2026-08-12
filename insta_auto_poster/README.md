# 📸 인스타그램 자동 포스팅 관리 (insta_auto_poster)

인스타그램 **피드(단일 이미지) + 카드뉴스(4장 캐러셀)** 게시물을 AI로 자동 생성하고 즉시/예약
게시까지 관리하는 마케팅 자동화 웹입니다. AIMaster 안의 threads(`threads/`)와 거의 동일한 파이프라인
구조를 재사용하되, 인스타그램은 이미지가 필수라는 차이와 카드뉴스(여러 장 캐러셀)라는 형식을
반영했습니다.

## 파이프라인 (좌측 메뉴 순서와 동일)

| 단계 | 화면 | 주요 기능 |
| :--- | :--- | :--- |
| 1 | **게시글 주제 수집** (`/candidates`) | HTTP(URL 지정) / RSS(NewsBlur) / Perplexity(트렌드 검색) 중 하나로 게시글 주제(제목·캡션·해시태그·키워드) 자동 수집 |
| 2 | **게시글 작성** (`/posts/new`, `/posts/[id]/edit`) | 주제만 주면 AI가 인스타그램 톤(반말, 450자 이내)으로 캡션+해시태그를 생성하고, 나노바나나(Gemini)로 1:1 이미지까지 함께 생성 |
| 3 | **게시글 관리** (`/posts`) | 임시저장/예약/즉시 게시 관리, 실패 시 재시도 |
| 4 | **인스타그램 계정 연결** (`/accounts`) | Meta Graph API OAuth로 비즈니스/크리에이터 계정 연결 (buylife 소유 Meta 앱 하나로 모든 사용자를 받음 — threads/shots와 동일 방식) |
| 5 | **API 키 설정** (`/settings`) | 본인 OpenAI/Gemini/Perplexity API 키 등록 (필수 — 앱 공용 키로 폴백하지 않음, 아래 "API 키 정책" 참고) |

## 설계 배경 / 왜 이렇게 만들었는가

- **threads 코드를 그대로 재사용**: `docs/PLATFORM_PATTERNS.md`의 재사용 패턴(카테고리 3종 수집,
  SNS 캡션 AI 생성 규격, Meta Graph API 이미지 게시 폴링)을 그대로 따랐다. 인증/권한(`access.ts`),
  Supabase 클라이언트, API 키 관리(`apiKeys.ts`) 등은 threads/shots와 100% 동일한 구조.
- **이미지 필수**: threads(텍스트 중심, 이미지 선택)와 달리 인스타그램 피드 게시물은 이미지가
  없으면 게시 자체가 불가능한 플랫폼 제약이 있다. 그래서 `insta_posts.image_url`은 `not null`이고,
  `PostForm`도 이미지 URL 입력을 `required`로 강제한다.
- **해시태그 분리 필드**: threads는 해시태그 개념이 약하지만, 인스타그램은 해시태그가 도달률에
  중요하다. AI 생성 시 캡션 본문과 해시태그를 별도 JSON 필드로 받아서(`caption`, `hashtags`),
  캡션 본문에 해시태그가 섞여 지저분해지는 문제를 방지하고 실제 게시 시점에
  `buildInstagramCaption()`(`src/lib/posts/publish-core.ts`)이 캡션 하단에 자동으로 붙인다.
- **Instagram OAuth/게시 클라이언트**: shots(`shots/src/lib/instagram/client.ts`, 릴스 게시)의
  OAuth·비즈니스 계정 탐색 로직을 그대로 가져오되, 미디어 컨테이너는 릴스(REELS)가 아니라
  이미지(IMAGE) 타입으로 만든다. 컨테이너 처리 완료 폴링은 threads가 겪은 문제
  (`docs/PLATFORM_PATTERNS.md` §7 — 고정 대기 대신 `status_code` 폴링)를 그대로 적용했다.
- **테이블 네이밍**: `insta_accounts`(threads_accounts 대응), `insta_posts`(posts 대응),
  `insta_candidates`(threads_candidates 대응) — 프로그램마다 후보/계정/게시글 테이블을 별도로 둔다는
  기존 원칙을 그대로 따름. 단 `newsblur_accounts`, `user_api_keys`는 threads가 이미 만든 AIMaster
  플랫폼 공용 테이블을 그대로 재사용하고 새로 만들지 않았다.

## 카드뉴스(캐러셀) 아키텍처 결정 (2026-08-12)

피드(단일 이미지) MVP를 만든 뒤, 카드뉴스(4장 캐러셀)까지 지원해달라는 요청에 따라 설계를 확장했습니다.
결정 배경을 이 저장소 안에 남겨서, 나중에 threads/blog/구글블로거/워드프레스 자동화와 하나의
"동시포스팅" 시나리오로 합칠 때 이 서브프로젝트의 스키마·로직을 그대로 참고할 수 있게 합니다.

### 참고한 기존 자산 3가지

1. **Make.com 시나리오 `63🎯(Threads+INSTA)CardNews`**(scenario id 4386238, buylife 팀에서 운영 중이던
   실제 카드뉴스 자동화) — 블루프린트를 전량 조사한 결과: HTTP(뉴스 URL) → GPT가 블로그풍 장문 본문
   (2500~3000자, 9~10문단) + title + hashtags 생성 → GPT가 그 본문을 4문단으로 나눠 문단마다 영어
   포토리얼리스틱 이미지 프롬프트 생성 → Nanobanana2(`gemini-3.1-flash-image-preview`, 9:16, 2K)로
   문단마다 다른 이미지 1장씩 총 4장 생성(이미지에 텍스트는 굽지 않음, 텍스트는 캡션에만 존재) →
   Instagram은 4장 캐러셀 + 재가공 캡션(900~1400자), Threads는 같은 소스에서 짧은 글(450자) +
   이미지 1장만 게시. ⚠️ 조사 중 블루프린트 안에 살아있는 Gemini API 키가 평문으로 노출된 것을
   발견해 코드에는 옮기지 않았고, 키 로테이션을 권장했습니다(사용자에게 별도 안내 완료).
2. **블로그 자동화의 이미지 생성**(`blog/utils/news/imageGenerator.ts`) — 실제로 생성된 기사 문단을
   GPT(`gemini-2.5-flash`)에게 "포토리얼리즘 프롬프트 엔지니어" 시스템 프롬프트(카메라/조명/네거티브
   블록 포함)로 분석시켜 문단마다 정교한 영어 프롬프트를 만드는 방식이 Make 시나리오와 본질적으로
   같은 접근이라 재사용했습니다. 반대로 블로그의 **저장 방식**(이미지를 `blog_posts.content` HTML
   문자열에 `<img>`로 박아넣고, 사용자 개인 Cloudinary 계정을 요구하는 `user_cloudinary_config`
   테이블 사용)은 구조화가 낮고 사용자에게 별도 Cloudinary 가입을 요구하는 마찰이 있어 가져오지
   않았습니다.
3. **shots(쇼츠) 자동화의 "장면별 생성+수정" 패턴**(`shots/src/lib/actions/scripts.ts`,
   `shorts_video_segments` 테이블) — 장면당 1개 행에 `image_url`(활성 이미지) + `image_urls text[]`
   (생성 이력 전체)을 두고, "재생성" 액션은 이력 배열에 append하며 활성 이미지도 교체, "선택" 액션은
   클릭한 후보가 이력 배열 멤버인지 검증 후 활성 포인터만 교체하는 구조입니다. "이미지 생성, 수정"
   요구사항에 정확히 대응되는 이미 검증된 패턴이라 그대로 이식했습니다.

### 핵심 결정

- **이미지 저장소는 Supabase Storage 유지, Cloudinary로 바꾸지 않음.** threads/shots가 이미 이 방식이고
  사용자가 별도 계정을 만들 필요가 없어 마찰이 적습니다. blog만 다른 방식을 쓰는 건 기존 부채로
  남겨두고 이번 범위에서 통일하지 않았습니다(blog는 이미 운영 중이라 스키마를 건드리면 위험).
- **피드와 카드뉴스를 하나의 모델로 통합.** `insta_posts.post_type`(`feed` | `card_news`)을 두고,
  이미지는 구분 없이 전부 `insta_post_slides`(슬라이드 1~4개) 테이블에서 관리합니다. 피드는 "슬라이드가
  1개인 카드뉴스"로 취급하므로, 발행 로직도 "슬라이드 1개면 IMAGE, 2개 이상이면 CAROUSEL"로 자연스럽게
  분기되어 코드 중복이 없습니다.
- **슬라이드 이미지 생성/수정은 shots의 `shorts_video_segments` 패턴을 그대로 이식**
  (`insta_post_slides.image_url` + `image_urls text[]`, 재생성/선택 액션 구조 동일).
- **이미지 프롬프트 생성은 블로그의 "문단 분석형 포토리얼리즘 프롬프트 엔지니어"를 일반화**해서
  재사용(`generateVisualPrompts(text, slideCount, apiKey)`). 피드(1장)도 주제 문자열을 그대로 쓰지
  않고 이 함수를 슬라이드 1개로 호출해 화질/일관성을 블로그 수준으로 맞춥니다.
- **콘텐츠 생성은 2단계로 분리**(Make 시나리오 구조를 따름): (1) `generateCardNewsContent`로 블로그풍
  장문 본문+title+hashtags 생성 → (2a) `generateVisualPrompts`로 문단별 이미지 프롬프트 4개 생성,
  (2b) 기존 `generatePostContent`에 `sourceContent` 옵션을 추가해 장문 본문을 근거로 짧은 인스타
  캡션을 재가공. 후보 수집(HTTP/RSS/Perplexity)은 Make의 고정 URL 방식보다 이미 더 유연해서 그대로
  유지했습니다.
- **향후 멀티포스팅 통합 호환성**: `insta_post_slides`(슬라이드/장면 테이블 + 이력 배열) 패턴과
  `generateVisualPrompts`(문단→프롬프트 엔지니어) 함수는 프로그램 접두어만 바꾸면 threads나 향후
  blog 리팩터링에도 그대로 이식 가능한 형태로 설계했습니다. 이번엔 insta_auto_poster 안에만
  구현하고 공용 모듈화는 아직 하지 않았습니다(threads/blog를 건드릴 단계가 아직 아님).

## 인스타그램 계정 연결(OAuth) 실동작 검증 및 개선 (2026-08-12)

실제 buylife 계정으로 브라우저에서 카드뉴스/피드 생성과 인스타그램 계정 연결을 직접 검증하면서
발견·수정한 내용을 남긴다.

- **`Invalid time value` 에러**: `api/instagram/callback/route.ts`에서 Meta의 장기 토큰 교환
  응답에 `expires_in`이 기대한 형태로 오지 않을 때 `new Date(NaN).toISOString()`이 터지는 문제가
  있었다. Meta 공식 문서 기준 장기 토큰 수명(60일)으로 폴백하도록 방어 코드를 추가했고, 실제 응답값을
  서버 콘솔에 남기도록 진단 로그도 넣었다.
- **에러 사유 노출**: 콜백의 `catch` 블록이 원인을 뭉개고 항상 같은 안내문만 보여주고 있었다. 이제
  실패 사유(`err.message`)를 `reason` 쿼리 파라미터로 넘겨 `/accounts` 화면에 그대로 보여준다
  (access token 등 민감정보는 이 메시지에 절대 담기지 않는다 — 우리 코드가 던지는 Error는 항상 사람이
  읽을 설명 문자열이다).
- **페이지 선택 화면 추가**: 기존에는 `findInstagramBusinessAccount()`가 연결된 Facebook 페이지 중
  인스타그램 비즈니스 계정이 연결된 **첫 번째 페이지를 자동으로** 골랐다. Make 시나리오는 페이지를
  직접 선택하는 단계가 있는데 이 부분이 빠져 있어서, 페이지를 여러 개 관리하는 사용자를 위해
  `findInstagramBusinessAccounts()`(복수형, 후보 전체 반환)로 바꾸고 `/accounts/select` 화면을
  새로 만들었다. OAuth 콜백은 이제 access token을 바로 저장하지 않고 10분짜리 httpOnly 쿠키
  (`insta_pending_connection`, `src/lib/instagram/pendingConnection.ts`)에 담아 선택 화면으로
  넘기고, 사용자가 계정을 확정 선택(`confirmInstagramAccountAction`)해야 비로소 `insta_accounts`에
  저장된다.
- 이 흐름은 실제 브라우저 테스트로 끝까지 검증 완료(계정 연결 성공, 피드/카드뉴스 생성·발행 가드
  정상 동작).

## 콘텐츠 분량 보강 (2026-08-12)

실사용 중 "생성되는 콘텐츠가 너무 짧다"는 피드백을 받고, 사용자가 실제 Make 운영 환경에서 쓰던
"문장교정(인스타)" 모듈 프롬프트(900~1400자, 6~7문단, 문단 앞 이모지, 잡지풍 톤, 해시태그
8~10개)를 그대로 전달받아 반영했다.

- **`generateCardNewsCaption()`**(`src/lib/ai/generator.ts`) 신규 — Make 프롬프트를 그대로 이식한
  카드뉴스 전용 캡션 생성 함수. 피드용 짧은 캡션(`generatePostContent`, 450자 규격)과는 별도 함수로
  분리했다.
- **후보 수집(`/candidates`) 프롬프트도 900~1400자로 상향**(`src/lib/ai/collector.ts`의
  `STRUCTURE_SYSTEM_PROMPT`) — 원래 450자로 제한하고 그마저도 `caption.slice(0, 450)`로 강제로
  잘라내는 코드까지 있었다. 이제 후보 자체가 "완성된 짧은 글"이 아니라 "장문 소스 콘텐츠"로
  취급되고, 피드에서는 이걸 압축(`generatePostContent`의 `sourceContent` 옵션)해서 짧은 캡션을
  뽑고, 카드뉴스에서는 이 콘텐츠를 그대로 문단 분석 소스로 쓴다. 한 번의 AI 호출에서 여러 후보를
  동시에 길게 생성하면 출력 토큰 한도에 걸릴 수 있어, 한 번에 뽑는 후보 개수도 5개 → 3개로 줄였다
  (`CATEGORY_PAGE_PICK_COUNT`, RSS/Perplexity 호출부).
- `insta_posts.caption` 컬럼 자체엔 길이 제약이 없지만, 폼 검증(`postFormSchema`)의 캡션 상한을
  인스타그램 실제 캡션 한도(2200자)에 맞춰 올려뒀다(전에는 450자 초과 시 저장 자체가 막혔었다).

## 현재 상태 / 남은 작업

- ✅ 인증·권한(멀티테넌시), Supabase 스키마, Instagram OAuth 연결, 후보 수집 3종, AI 캡션+해시태그+이미지
  생성, 게시글 CRUD·즉시/예약 게시·재시도, API 키 설정까지 코드 작성 및 Supabase 마이그레이션 적용 완료.
  `programs` 테이블에도 `auto-instagram-posting` slug로 등록 완료 (카테고리: 인스타).
- ✅ **카드뉴스(캐러셀, 4장 이미지) 게시** — `insta_post_slides` 테이블, 캐러셀 발행
  (`publishInstagramCarousel`), 슬라이드별 생성/재생성/선택 액션(`slides.ts`, `SlideGallery.tsx`),
  `PostForm`의 피드/카드뉴스 토글 UI, 2단계 콘텐츠 생성까지 구현·검증 완료.
- ✅ **실제 브라우저 검증 완료** — buylife 실계정으로 로그인, 인스타그램 계정 연결(OAuth + 페이지
  선택 화면), 피드/카드뉴스 생성·발행 가드까지 전부 눌러서 확인했다. 그 과정에서 발견한 버그
  (Invalid time value, 카드뉴스 캡션이 후보의 짧은 캡션을 그대로 쓰던 문제)도 수정 완료.
- ✅ **Vercel 프로덕션 배포 완료** — `buylife/insta-auto-poster` 프로젝트로 배포됨
  (`https://insta-auto-poster-red.vercel.app`). `programs.app_url`에도 등록 완료.
- ✅ **Meta 앱 프로덕션 콜백 URI 등록 완료** — Meta for Developers 콘솔(App ID `2093051114755163`,
  threads/shots와 공유하는 buylife 소유 앱)의 유효한 OAuth 리디렉션 URI 목록에
  `https://insta-auto-poster-red.vercel.app/api/instagram/callback`을 추가함.
- ✅ **API 키 정책 변경 및 반영 완료** — 아래 "API 키 정책" 섹션 참고. 관리자 공용 키 폴백을
  완전히 없앴고, 루트 `CLAUDE.md`(멀티테넌시 원칙 3번)에도 이후 모든 서브프로젝트에 적용되는
  규칙으로 등록했다.
- ⏳ **가격 정책/카테고리 썸네일 미설정** — `pricing_plans` 연결과 `programs.thumbnail_url`은
  관리자가 추후 admin 화면에서 입력해야 한다 (real_estate_sales와 동일한 상황).

## API 키 정책 (2026-08-12)

**사용자는 반드시 본인의 API 키(OpenAI/Gemini)를 설정(`/settings`)에서 등록해야 AI 생성 기능을 쓸 수
있다. 관리자(buylife) 공용 키로 절대 폴백하지 않는다.** 관리자 개인 API 키 비용을 다른 사용자가
무제한으로 쓰게 되는 것을 막기 위한 명시적 정책 결정이다.

- `src/lib/apiKeys.ts`의 `resolveApiKey()`에서 앱 공용 키(`FALLBACK_ENV_KEYS`) 폴백 로직을 완전히
  제거했다 — 이제 본인 키가 없으면 무조건 `null`을 반환한다.
- 게시글 작성 화면(`PostForm`)은 생성 시도 전에 본인이 OpenAI/Gemini 키를 등록했는지(또는 폼에
  직접 키를 입력했는지) 확인하고, 없으면 `ApiKeyRequiredModal` 팝업으로 막아서 설정 페이지로
  안내한다.
- 후보 수집 화면(`/candidates`)은 기존 `MissingApiKeyNotice` 배너로 미등록 provider를 미리
  알려주고, 실제 수집 시도 시에도 서버 액션이 동일하게 막는다.
- Vercel에 등록해둔 `OPENAI_API_KEY`/`GEMINI_API_KEY` 프로덕션 환경변수는 이제 코드에서 읽지
  않는다(죽은 설정 — 필요 없다면 나중에 지워도 무방하다).
- 이 규칙은 루트 `CLAUDE.md`의 "멀티테넌시 원칙" 3번 항목에 반영되어, threads/blog/shots 등
  **기존** 서브프로젝트는 이번에 손대지 않았지만(별도 요청 시 진행), **앞으로 새로 만드는 모든
  서브프로젝트**는 처음부터 이 정책(폴백 없음 + 등록 안내 팝업)을 따라야 한다.

## 이미지 확대/프롬프트 수정/재생성/직접 업로드 (2026-08-12)

생성된 이미지가 마음에 안 들 때 다시 만들거나 직접 가진 파일로 바꿔 쓸 수 있어야 한다는 요청에 따라
피드/카드뉴스 양쪽에 아래 기능을 추가했다. 게시글 작성(생성) 화면(`PostForm.tsx`, 아직 DB에 없는
상태라 브라우저 메모리에서만 관리)과 게시글 수정 화면(`SlideGallery.tsx`, `insta_post_slides`에
바로 반영)에 동일한 개념을 각각 이식했다.

- **확대(`ImageZoomModal.tsx`, 신규 공용 컴포넌트)**: 슬라이드 이미지나 생성 이력 썸네일을 클릭하면
  크게 확대해서 볼 수 있다. 이력 썸네일 위 🔍 배지를 누르면 선택하지 않고 확대만 볼 수 있고, 작성
  화면에서는 확대 모달 안에 "이 이미지로 선택" 버튼도 있어 확대해서 확인한 뒤 바로 고를 수 있다.
- **프롬프트 확인/수정**: 이미지 생성에 쓰인 프롬프트를 각 슬라이드 카드에 그대로 보여주고, 고친 뒤
  "다시 생성"을 누르면 그 문구로만 해당 슬라이드 이미지가 새로 만들어진다 (다른 슬라이드는 그대로).
- **생성 이력 + 선택**: 재생성/업로드할 때마다 새 이미지가 이력에 쌓이고, 예전 후보로 되돌아가고
  싶으면 이력 썸네일을 클릭해서 바로 전환할 수 있다 (기존 SlideGallery/shots 패턴을 작성 화면에도
  동일하게 이식).
- **직접 업로드(피드 전용)**: 카드뉴스는 Make 시나리오처럼 AI로 4장을 일관되게 생성하는 게 핵심이라
  이번엔 대상에서 뺐고, 피드(1장)에서만 "이미지 파일 직접 첨부" 버튼으로 JPG/PNG/WEBP(10MB 이하)를
  올려 AI 생성 이미지 대신 쓸 수 있다. 신규 액션 `uploadCustomImageAction`(작성 화면, DB 미반영·URL만
  반환)과 `uploadSlideCustomImageAction`(수정 화면, `insta_post_slides` 이력에 바로 추가)을 만들었고,
  둘 다 Storage 경로(`{user_id}/...`)·RLS는 기존 이미지 업로드와 동일하다.
- 브라우저로 직접 확인: 기존 draft 게시글(피드 1건, 카드뉴스 1건)의 수정 화면에서 확대 모달(메인
  이미지 클릭, 이력 썸네일 🔍 배지 클릭 둘 다)과 업로드 UI 노출 여부(피드만 보임)를 확인했다. 다만
  파일 업로드 자체의 종단 테스트와 신규 게시글 작성 화면에서의 실제 AI 재생성 흐름은 유료 API
  호출이 필요해 진행하지 않았다 — 로직은 기존에 검증된 `SlideGallery`/`slides.ts` 패턴을 그대로
  재사용했다.

## 게시 중복 버그 조사 및 수정 (2026-08-12)

**증상**: 게시글 상세 페이지에서 "지금 게시하기"를 눌렀는데 반응이 없어 사용자가 다시 눌렀고,
결과적으로 같은 내용이 인스타그램에 **두 번** 게시됨 (예: `Db7kxd3o7FW`, `Db7k2KHozyf` 두 개의
서로 다른 permalink가 실제로 생성된 것을 WebFetch로 직접 확인).

**근본 원인**:
1. `publishInstagramPost`/`publishInstagramCarousel`는 Meta 미디어 컨테이너가 `FINISHED` 상태가
   될 때까지 폴링하기 때문에 수 초~수십 초가 걸리는데, "지금 게시하기" 버튼에 처리 중 표시
   (로딩/비활성화)가 전혀 없어서 사용자가 "반응이 없다"고 느끼고 다시 눌렀다.
2. 상세 페이지의 `isEditable` 조건이 `status === "publishing"`일 때도 무조건 재게시 버튼을
   노출했다. 원래 의도는 "서버가 죽어서 영영 publishing에 멈춘 글의 재시도"였지만, **아직 정상
   처리 중인 publishing 요청까지 재시도 대상으로 취급**해버려서, 두 번째 클릭이 첫 번째 요청과
   별개로 `publishPost()`를 한 번 더 실행시켰다.
3. `publishNowAction` 서버 액션 자체에도 "이미 published/처리 중인 글은 건너뛴다"는 가드가 없어서,
   두 요청이 각각 끝까지 실행되어 인스타그램에 실제로 두 개의 게시물이 만들어졌다.

**적용한 수정**:
- `src/lib/posts/publishStatus.ts` (신규): `status === "publishing"`이 `updated_at` 기준
  150초(`PUBLISH_STUCK_THRESHOLD_MS`)를 넘겼을 때만 "멈춘 것"으로 판단하는 `isPublishStuck()`.
  이 임계값은 아래 `maxDuration=120`보다 여유 있게 잡아, 정상적으로 아직 실행 중인 요청과
  겹치지 않게 했다.
- `src/components/posts/PublishButton.tsx` (신규): `DeleteButton`과 동일하게 `useFormStatus()`로
  처리 중엔 비활성화 + "게시 중..." 표시.
- `posts/[id]/page.tsx`: `isEditable`이 "publishing"을 무조건이 아니라 `isPublishStuck()`일 때만
  포함하도록 변경. 아직 처리 중인 동안은 버튼 자체를 숨기고 "게시 처리 중입니다" 안내 배너를 보여준다.
- `lib/actions/posts.ts`의 `publishNowAction`: `post.status`가 이미 `published`이거나, `publishing`
  이면서 아직 멈춘 것으로 판단되지 않으면 `publishPost()`를 다시 호출하지 않고 그대로 리다이렉트한다
  (폼이 비활성화돼 있어도 새로고침 중 재전송 등으로 서버까지 요청이 도달할 수 있어, 실제 게시를
  트리거하는 마지막 방어선을 서버 쪽에도 둔 것).
- `posts/[id]/page.tsx`, `posts/new/page.tsx`, `posts/[id]/edit/page.tsx`,
  `api/posts/dispatch-scheduled/route.ts`에 `export const maxDuration`(120~300초)을 추가.
  카드뉴스(캐러셀, 최대 4장)는 이미지마다 컨테이너 생성+`FINISHED` 대기를 반복해 기본 실행 시간
  제한을 넘길 수 있는데, 넉넉한 시간이 없으면 함수가 강제 종료되면서 성공/실패 어느 쪽 상태 업데이트도
  못 한 채 `publishing`에 멈춰버릴 수 있다 (이번 사고에서 두 번째 요청이 실제로 이 근처 시간이 걸렸다).
- 문제가 된 게시글(`28d14984-7339-44e5-b2e3-c9820b53c769`) DB 행은 두 번째 요청의 결과(`published`,
  두 번째 permalink)로 이미 자연 정착되어 있었다 — 코드만 수정하고 DB는 별도로 손대지 않았다.
  **다만 실제 인스타그램 계정에는 두 개의 게시물이 남아 있어, 사용자가 앱/웹에서 직접 확인 후 중복
  게시물 중 하나를 수동으로 삭제해야 한다** (Claude Code가 실제 SNS 계정의 게시물을 대신 삭제하지는
  않음 — 되돌리기 어려운 외부 서비스 조작이라 사용자 본인 확인·조작이 필요).

## 배포 정보

- **Vercel 프로젝트**: `buylife/insta-auto-poster`
- **프로덕션 URL**: https://insta-auto-poster-red.vercel.app
- 로컬 개발 시 Meta 콜백 포트를 shots와 맞추기 위해(같은 Meta 앱을 공유하므로) `npm run dev -- -p 3002`로
  실행할 것 (`.env.local`의 `META_INSTAGRAM_REDIRECT_URI`가 `localhost:3002` 기준으로 등록돼 있음).
- 남은 수동 작업: 가격 정책/썸네일 설정.

```bash
cd insta_auto_poster
npm install
npx tsc --noEmit
npm run build
vercel --prod   # 재배포 시
```

## 환경 변수

`.env.local.example` 참고. Supabase, Meta(Instagram Graph API), CRON_SECRET.
Meta 앱은 threads/shots와 같은 buylife 소유 앱(App ID `2093051114755163`)을 재사용한다. 프로덕션
환경변수는 `vercel env add <이름> production`으로 등록했다(민감정보라 이 문서엔 값을 남기지 않음).

`OPENAI_API_KEY`/`GEMINI_API_KEY`/`PERPLEXITY_API_KEY`는 더 이상 앱 폴백용으로 쓰지 않는다 — 위
"API 키 정책" 참고. 모든 사용자는 반드시 `/settings`에서 본인 키를 등록해야 한다.
