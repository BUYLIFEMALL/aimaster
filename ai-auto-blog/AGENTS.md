<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AIMaster 플랫폼 공통 원칙

blog는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- blog는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug = "ai-auto-blog"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), **쓰기 작업을 하는 모든 API route(`/api/auto-post`, `/api/posts/[id]` PUT·DELETE 등)는 반드시 `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인**한다 (`getSessionUser()`만으로 로그인 여부만 확인하고 끝내지 말 것 — 2026-08-06 감사에서 이 부분이 빠져 있던 것을 발견해 수정함).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만 사용, 앱/운영자 공용 키로 폴백하지 않음 — 2026-08-12 정책, 2026-09-03에 이 서브프로젝트에 남아있던 옛 폴백 로직 제거)을 그대로 쓴다. 본인 키가 없으면 `null`을 반환하니, 호출부는 조용히 실패시키지 말고 "API 키 등록 필요" 안내로 이어가야 한다.
- 최상위 본인 계정 규칙에 따라 `blog_posts`/`blog_authors`는 회원 본인 소유 데이터입니다. 소유자가 없는 옛 글은 임의 귀속·접근 허용하지 않습니다. `blog_categories`는 공통 분류 목록이며 변경은 관리자만 가능합니다. 이전의 공유 블로그 설명은 최상위 규칙과 충돌하므로 사용하지 않습니다.

# 보안 마무리 — v1.39 RLS 적용·운영 배포 완료 (2026-10-10)

**최신 비교 조사(기능 변경 없음):** [네이버 에이전트 v1.63와 자동화 비교](../naver-blog-agent/docs/AUTOMATION_COMPARISON_2026-10-10.md). 실제 BLOG 회원 홈/글 생성 옵션 확인·보안39개 재실행·라이브 v1.39 ZIP 코드 일치 확인. 기존 제목/중복 본문도 입력 검증이 통과하는 것을 실제 함수 모의 실행으로 재현했습니다. 대상 blogId·빈 문서 확인, 입력 중 active/선택 변경 잠금, 보고 오류 보존, 이미지 변경의 단일 프레임 실행, 동적 연도·목표 글자수 단위는 **미수정 후속 항목**입니다. 최종 발행은 회원 직접 흐름이며 이번에 유료 생성/실제 입력/최종 발행을 검사하지 않았습니다. 버전·운영 배포 v1.39 유지.

- 승인된 DB 보안 변경 v1.39 릴리스 완료. 코드 커밋 `d0e014b5`·origin/master 푸시·프로덕션 배포 `dpl_HCYqUNJKrWyw1rQES1jPRxYwtNmR`. 로컬/운영 빌드·보안 검사 39개 통과, DB/확장/라이브 ZIP v1.39 일치(실패·경고 0). 운영 API 두 곳 비로그인 401+no-store+캐시 MISS, 상세 화면 307 확인. 버전 기록 `supabase/migrations/20261009165944_blog_bump_version_v1_39.sql`.
- 글 GET/PUT/DELETE는 로그인+이용 권한+본인 소유 조건을 확인하고 조회·수정·삭제 쿼리에 `user_id`를 적용합니다. 소유자 null·타인 글은 404, DB 조회 오류는 삭제를 중단합니다. 모든 해당 API 응답은 `private, no-store`입니다.
- 상세 화면에도 서버 권한 게이트를 넣고 인증 없는 SDK 직접 조회를 제거했습니다. 공통 카테고리 변경은 `/api/categories`에서 실제 `profiles.is_admin`을 확인하며 일반 회원 화면은 읽기만 가능합니다. 권한 조회는 관리자 클라이언트, 서버 키 미설정 시 공개 키 폴백 없음. RLS 해제 오류 안내 제거.
- 검수: `npm run test:security` 39개 통과, `npm run build` 타입 포함 통과, `node scripts/check-security-lint.cjs` 신규 오류 0건(변경 파일의 기존 오류 7건·경고 3건 유지). 로컬 API GET 두 곳 비로그인 401+no-store, 상세 화면 307→auth 확인. 유료 호출·실제 회원 데이터 변경 없음.
- Google Fonts 네트워크 제한으로 최종 빌드가 실패해 저장소의 Geist 글꼴을 이 폴더에 복사하고 `next/font/local`로 변경했습니다. 이후 빌드 성공. 폰트 라이선스 포함.
- **주인님 승인 후 운영 RLS 적용 완료:** `supabase/migrations/20261009164750_blog_personal_access_hardening.sql`. 7개 테이블 익명/PUBLIC 권한 제거·본인 행/본인 글 연결만 허용·관리자만 공통 분류 변경·댓글/좋아요 쓰기 차단. authenticated의 TRUNCATE/REFERENCES/TRIGGER도 회수했습니다.
- 데이터 보존: 게시글 20(미귀속 7)·작성자 11·글감 60·분류 10·연결 16·댓글/좋아요 0, 전체 행 내용 지문 7곳 일치. DB 역할 검증 27개·REST 익명 401 차단 7곳 통과. 시험용 행·변경은 모두 되돌립니다. 재검증: `supabase/security/verify-blog-access.sql`, `node scripts/check-blog-anon-access.mjs`.
- 브라우저 장애 해소·루트 시험 계정 실제 로그인 성공. BLOG 자체 저장된 정보 자동 입력이 없어 주인님께 로그인 확인 요청. 실제 BLOG 회원 화면 검수는 그 확인 후 진행합니다. 승인·스냅샷·검증 증거: `supabase/security/approved-application-verification.json`, `before-approved-application.json`. DB 역할 검증을 실제 로그인으로 보고하지 않습니다.
- 배포 도구는 `requires approval / approval policy is never`로 타로 키 반영 재배포를 거부했습니다. 보안 완료 선언 금지. 전체 기록: `docs/SECURITY_REVIEW_2026-10-10.md`.

# 이미지 생성 로직 (2026-09-30 개편, 프로그램 버전 v1.03)

주인님 지시("BLOG 원문 자동화의 이미지 퀄리티가 떨어진다 — SEO 블로그 스튜디오의 이미지 로직·프롬프트를 참고해 반영")로
`utils/news/imageGenerator.ts`를 네이버 블로그 SEO 스튜디오(`naver-blog-seo-studio/lib/ai/contentVisuals.ts`, `lib/ai/nanoBanana.ts`) 방식으로 바꿨다.

- **예전**: 문단 전체를 고정 시작 문구("Create a sense of adventure, courage, and realism…")·카메라 스펙·긴 부정어 블록을 붙인
  초장문 프롬프트로 만들고 `cleanAsciiPrompt()`로 한글·기호를 지운 뒤 생성 → 글 내용과 무관한 비슷한 장면(사무실 사람들 등)이 반복되기 쉬웠다.
- **지금**: `selectSectionVisuals()`가 회원 Gemini 키로 `gemini-2.5-flash`(JSON, temperature 0.25)를 불러 **섹션마다 그림으로 표현할
  핵심 문장 1개를 원문 그대로** 고르고, 그 문장만 담은 짧고 구체적인 영어 장면 설명을 만든다(원문에 없는 문장이면 버리고 섹션 가운데 문장으로 대체).
  `generateSceneImage()`는 SEO 스튜디오와 같은 감싸는 문장으로 나노바나나를 부르고, 응답 parts 중 `inlineData`가 있는 것을 찾아 쓴다
  (예전엔 `parts[0]`만 봐서 텍스트가 먼저 오면 이미지를 놓쳤다). 편집기 즉석 생성(`utils/ai/editorImage.ts`)도 같은 방식으로 바꿨다.
- **없앤 것(플랫폼 규칙 위반)**: 운영자 환경변수 키(`GEMINI_API_KEY`/`NANOBANANA_API_KEY`) 폴백, `image.pollinations.ai` 대체 이미지.
  운영 Vercel에 `GEMINI_API_KEY`가 등록돼 있어 **키 없는 회원의 글·이미지가 운영자 키로 생성되고 있었다.** 이제 `app/api/auto-post/route.ts`가
  회원 키가 없으면 `API_KEY_REQUIRED`를 돌려주고, 작성 화면(`app/write/ai-form/page.tsx`)은 설정 페이지로 안내한다.
  이미지 1장이 실패하면 그 칸은 비우고(`imageLine()`) 글 생성은 계속한다.
- 글 아래 "🎨 생성 이미지 AI 프롬프트" 섹션은 이미지마다 **그린 본문 문장 + 사용한 장면 설명**만 보여준다(`buildImagePromptSection()`).
  예전 "API 요청 스키마" 블록은 화면에서 이미 숨기던 것이라 만들지 않는다(과거 글의 스키마 블록은 `stripImageSchema.ts`가 계속 숨김).
- (2026-10-01 해결 — 아래 "이미지 저장소 전환" 참고) 당시 남은 과제: 이미지 저장이 아직 Cloudinary(회원 설정) 또는 본문 base64다. 루트 `CLAUDE.md`의 "AI 이미지는 Supabase Storage" 규칙에 맞추는
  전환은 편집 화면(`posts/[id]/edit`)의 base64 처리와 함께 바꿔야 해서 별도 작업으로 남겼다.
- **실측 검증(2026-09-30, 주인님 승인, 테스트 계정 Gemini 키, 107번 글 본문)**: 예전 이미지는 내용과 무관한 "사무실 사람들"이었고,
  새 방식은 3장 모두 고른 문장 내용(신경망·금융·공장 분석, RPA+AI 로봇, 비정형 데이터 처리)을 표현했다. 테스트 중 3가지를 추가로 고쳤다.
  1. 장면 설명을 360자에서 자르던 것(SEO 스튜디오 코드에서 가져온 제한) → `cleanPrompt()` 1500자. 잘리면 장소·조명 정보가 빠졌다.
  2. AI가 고른 문장이 원문 확인에서 떨어지던 것(목록 기호·따옴표 모양·HTML 엔티티 차이) → `normalizeForMatch()`가 글자·숫자만 비교.
  3. 화면·서류가 나오는 장면에 알아볼 수 없는 가짜 한글이 가득 그려지던 것 → 설계 지시문과 생성 문장에 `NO_LEGIBLE_TEXT_RULE`
     (화면·서류·간판은 흐리게, 읽을 수 있는 글자·숫자 없음) 추가. 수정 후 재생성에서 글자 없는 깔끔한 이미지 확인.
- 운영 Vercel(`aimaster`)의 `GEMINI_API_KEY` 환경변수는 코드에서 더 이상 쓰지 않아 2026-09-30 주인님 승인으로 삭제했다. 다시 넣지 말 것.

# 본문 생성 모델·이미지 생성 모델 분리 선택 (2026-10-01, 프로그램 버전 v1.04)

주인님 지시("SEO 스튜디오의 본문 생성 설정 방식으로 콘텐츠 생성 모델과 이미지 생성 모델을 분리해서 같은 레이아웃으로")로
글 작성 화면(`app/write/ai-form/page.tsx`)에 SEO 스튜디오와 같은 카드 2개를 넣었다.

- **본문 생성 설정 · {플랫폼}**: 플랫폼(OpenAI / Anthropic Claude / Google Gemini) + 모델. 목록·기본값은 `utils/ai/contentModels.ts`
  (SEO 스튜디오 목록과 동일 + Gemini 첫 항목은 기존 BLOG 모델 `gemini-2.5-flash`). 처음 기본값은 Gemini(키 하나로 시작 가능).
- **이미지 생성 설정 · Google Gemini (나노바나나)**: 플랫폼은 Gemini 고정, 모델은 NanoBanana 2 2K(추천)/4K/Pro/Standard 1K.
  예전 "이 글에만 쓸 키·커스텀 엔드포인트" 입력칸은 "고급 설정(선택)"으로 접어 두었고, "없으면 앱 기본 키 사용" 안내 문구는 사실과 달라 지웠다.
- 마지막 선택은 브라우저 localStorage(`ai-auto-blog:model-selection`)에 기억한다(편의용).
- 서버(`app/api/auto-post/route.ts`): `contentProvider`/`contentModel`을 받아 검증하고, **본문용 키(고른 플랫폼)와 이미지용 Gemini 키를 각각** 확인해
  없으면 어느 키가 필요한지 `API_KEY_REQUIRED`로 알려준다. 생성 실패 사유는 `error`에 그대로 담아 화면에 보여준다.
- 생성(`utils/news/generator.ts` `generateWithContentModel()`): SEO 스튜디오와 같은 어댑터 `utils/ai/contentJson.ts`(OpenAI Chat Completions·
  Claude Messages·Gemini generateContent, JSON 응답)로 호출. GPT-5 이상은 temperature를 보내지 않는다(기본값만 허용).
  **고른 모델이 실패하면 예전처럼 AI 없이 틀로 만든 "24h 심층 분석" 기본 글을 대신 저장하지 않고 오류를 알린다**(그 대체 코드는 삭제).
- 검증: 테스트 계정 키로 짧은 요청 — gpt-4o-mini, claude-haiku-4-5, gemini-2.5-flash, gpt-5.6-luna 모두 JSON 정상 응답. 전체 글 1편 생성은 미실시.

# 버전 표시 (2026-10-01, 프로그램 버전 v1.05)

- 핵심 원칙 5번(버전 관리)이 BLOG에는 DB(`programs.version`)에만 적용돼 있고 코드·화면에는 빠져 있었다
  (2026-09-29 사이드바 21개에 버전 표시를 일괄 추가할 때, BLOG는 루트 앱에 내장된 구조라 사이드바가
  `components/layout/BlogSidebar.tsx`(루트)에 있어서 누락됨).
- `ai-auto-blog/utils/version.ts`의 `APP_VERSION`을 새로 만들고, 사이드바(`app/_components/BlogSidebar.tsx`) 제목 밑에 표시한다. **수정할 때마다 이 파일과
  DB `programs.version`(slug `ai-auto-blog`)을 같이 올릴 것.**

# 독립 배포 분리 (2026-10-01, 프로그램 버전 v1.06)

주인님 지시("BLOG만 왜 www.buylife.xyz/blog 고유 주소를 쓰나 — 다른 프로그램처럼 분리하고, 메인 카탈로그에 교체 등록해 새 배포를 본 프로그램으로 쓰자")로
루트 앱 내장을 없애고 **자체 Vercel 프로젝트 `ai-auto-blog`** 로 배포한다.

- **주소**: https://ai-auto-blog-one.vercel.app (`ai-auto-blog.vercel.app`은 이미 다른 사람 것이라 `-one` 별칭이 붙음).
  `programs.app_url`도 이 주소로 바꿨다(메인 카탈로그 교체 등록). 루트 `next.config.mjs`가 예전 `/blog`, `/blog/:path*` 주소를 같은 경로의 새 주소로 넘긴다.
- **배포**: `cd ai-auto-blog && npx vercel deploy --prod --yes --scope buylife`(2026-10-01 폴더 이름 변경 전에는 `cd blog`) (`.vercel/project.json`이 `ai-auto-blog`에 연결됨).
  `vercel.json`의 `framework: nextjs`는 지우지 말 것(없으면 전 페이지 404). 루트 앱 배포에서는 `.vercelignore`의 `/ai-auto-blog`로 이 폴더를 뺀다.
- **환경변수(Vercel ai-auto-blog, production/preview)**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`(공용 Supabase와 같은 값), `NEXT_PUBLIC_MAIN_SITE_URL=https://www.buylife.xyz`. AI 키는 넣지 않는다(회원 본인 키만).
- **루트에서 지운 것**: `app/(embedded)/blog/*`, `app/api/{auto-post,candidates,newsblur-account,posts}`(blog 라우트 재수출·중복 구현),
  `components/layout/BlogSidebar.tsx`, `tailwind.config.ts`의 blog 경로, `components/programs/ProgramCard.tsx`의 "slug에 blog가 들어가면 /blog" 예외.
- **BLOG 안에서 바꾼 것**:
  - 사이드바와 사이드바 표시 규칙을 `app/_components/BlogSidebar.tsx`·`BlogShell.tsx`로 옮김(경로 앞 `/blog` 제거). `app/layout.tsx`가 감싼다.
  - 권한 판정 코드를 `lib/access/checkProgramAccess.ts`(루트 같은 파일의 사본)로 복사 — **판정 규칙을 바꾸면 루트 파일과 함께 고칠 것.**
  - 회원 전용 화면(게시글 관리 홈 `/`, `/candidates`, `/dashboard`, `/settings`, `/my-posts`, `/posts/[id]/edit`, `/write`)에 서버 쪽
    `requireProgramAccess()` + `dynamic`/`fetchCache` 두 줄. 예전엔 루트의 /blog 진입 화면만 막고 있었다. 홈 화면 본체는 `app/_components/HomePage.tsx`.
  - `app/settings/actions.ts`(API 키·Cloudinary 저장/삭제)가 로그인만 확인하던 것을 `checkProgramAccessApi()`로 바꿈(멀티테넌시 원칙 1번 위반이었음).
  - 로그인은 이 앱의 `/auth`(AIMaster와 같은 계정, 회원가입은 AIMaster에서만). 비로그인 시 `/auth?redirect=<원래 경로>`로 보내고,
    로그인 후 그 경로로 돌아온다(`utils/supabase/middleware.ts`가 `x-pathname` 헤더를 실어줌. 외부 주소로는 못 가게 `/`로 시작하는 경로만 허용).
  - `utils/basePath.ts`는 이제 항상 접두사 없음과 `/auth`를 돌려준다(호출부가 많아 함수는 유지).
  - 단독 빌드에서 처음 드러난 타입 오류 1건 수정(`app/posts/[id]/page.tsx` innerText). `next.config.ts`에 `turbopack.root` 고정.
- **검증**: 단독 `npm run build` 통과. 운영 주소에서 비로그인 접근 시 회원 화면은 `/auth?redirect=...`로 이동, `/api/auto-post`는 401,
  공개 글(`/posts/107`)·로그인 화면은 200, 캐시 MISS 확인.
- **남은 일**: 회원 계정으로 로그인 → 글 생성까지 실사용 확인. 로그인 세션은 도메인이 달라 www.buylife.xyz와 공유되지 않아서
  BLOG에서 한 번 더 로그인해야 한다(다른 단독 배포 프로그램과 같음).

# 로그인 "fetch failed" 수정 (2026-10-01, 프로그램 버전 v1.07)

- **증상**: 독립 배포 직후 로그인하면 빨간 "fetch failed"만 뜨고 로그인이 안 됐다(주인님 테스트 계정으로 발견).
- **원인**: Vercel 환경변수를 `ai-auto-blog/.env.local`에서 옮겼는데, 그 파일에는 **BLOG를 처음 만들 때 쓰던, 지금은 없어진 Supabase 프로젝트 주소**
  (`rjjtjakljjxsgjelqgek`)가 남아 있었다. 루트에 내장돼 있던 동안은 루트의 공용 DB 설정값을 써서 드러나지 않았다.
  서버 로그: `getaddrinfo ENOTFOUND rjjtjakljjxsgjelqgek.supabase.co`.
- **수정**: Vercel(ai-auto-blog, production/preview)의 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 루트 `.env.local`의
  공용 DB(`esgxyikcnnvmlhygjkth`) 값(`NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`)으로 교체. 로컬 `ai-auto-blog/.env.local`도 같은 값으로 맞춤.
  배포된 화면 코드에 공용 DB 주소만 들어 있는 것 확인.
- 로그인 화면 문구 정리: 버튼 "세션 인증" → "로그인", 부제 "모든 빌드를 위한 정밀한 환경." → "AIMaster 계정(이메일·비밀번호)으로 로그인하세요.",
  로그인 완료 문구 "세션이 정상적으로 인증되었습니다." → "로그인되었습니다.". DB 연결 실패 시 "fetch failed" 대신
  "로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."를 보여준다(`app/auth/actions.ts`).

# 모델 기본값·목록 정리 (2026-10-01, v1.08 ~ v1.09)

- **v1.08**: 본문 생성 기본값을 OpenAI GPT-4.1로 바꿨다(`DEFAULT_CONTENT_PROVIDER = 'openai'`). 회원이 고른 값은 브라우저(localStorage)에 기억된다.
- **v1.09** (주인님 지시: "추론모델과 이미지 생성모델 지침을 보고 모델 값을 정리해서 추가", "나노바나나 2K 기본값, 1K를 2K 위로"):
  - 기준 문서 `docs/AI_MODEL_INTEGRATION_STANDARD.md`에 맞춰 `utils/ai/contentModels.ts`를 레지스트리 구조
    (`provider/value/name/purpose/category/lifecycle/endpoint`)로 바꿨다. 설명에는 용도만 적고 가격·속도 단정 문구는 뺐다.
  - **모델 ID는 각 공급사 모델 목록 API로 실제 존재를 확인한 것만** 넣었다(테스트 회원 키, 생성 호출 없음 — 비용 없음).
    - OpenAI: GPT-4.1(기본), 4o mini, 4o, GPT-5, 5.6 Luna/Terra/Sol, **GPT-6 Luna·GPT-6.1 Sol 추가**, GPT-6 Astra.
    - Claude: **Haiku 4.5는 목록에 `claude-haiku-4-5-20251001`로만 나와 그 ID로 바꿈**(기본), Sonnet 5, Opus 5, **Fable 5 추가**.
    - Gemini: **3.5 Flash(새 기본)**, 3.5 Flash-Lite, **3.6·3.8 Flash 추가**, 3.7 Flash, 2.5 Flash(예전 기본), 2.5 Pro, 3.1 Pro Preview(Preview 표시, 기본값 아님).
    - 목록에는 더 새로운 `claude-sonnet-5-5`·`claude-opus-5-5`·`claude-fable-5-1`도 있었지만 기준 문서 표에 없어 넣지 않았다(필요하면 같은 방식으로 추가).
  - 섹션 제목에 고른 모델 이름을 보여준다(예: "본문 생성 설정 · GPT-4.1", "이미지 생성 설정 · NanoBanana 2 · 2K").
  - 이미지 모델 순서: 1K → 2K(기본·추천) → 4K → Pro 4K.
  - OpenAI 어댑터(`utils/ai/contentJson.ts`): Chat Completions가 "지원하지 않음/Responses API" 류 400·404로 거절하면 Responses API로 한 번 더 보낸다.
    **GPT-6 계열의 실제 글 생성은 아직 검증하지 않았다**(유료 호출이라 주인님 승인 후 짧은 요청 1회로 확인할 것).

# 주소 입력 자동 보정 (2026-10-01, v1.10)

- 주인님 요청("url만 넣어도 자동주소로 인식되게"): 하단 추천 링크(CTA) 칸이 `type="url"`이라 `buylife.blog`처럼 `https://` 없이 넣으면
  브라우저가 "URL을 입력하세요"로 막았다. `type="text"` + `inputMode="url"`로 바꾸고, 칸을 벗어날 때와 생성 요청 때
  앞에 `https://`를 자동으로 붙인다(`app/write/ai-form/page.tsx`의 `normalizeUrl`). 참고 링크 3칸도 같은 규칙.
- 서버(`app/api/auto-post/route.ts`의 `normalizeCtaUrl`)도 같은 규칙으로 한 번 더 보정한다. 이미 `http://`·`https://`가 있으면 그대로 둔다.

# 이미지 프롬프트 섹션 숨김 (2026-10-01, v1.11)

- 주인님 지시("이미지 프롬프트 섹션은 이제 안 보여줘도 돼"): 글 아래 "🎨 생성 이미지 AI 프롬프트" 섹션(이미지마다 본문 문장 + 장면 설명)을 없앴다.
  섹션 안 코드블록 언어 표시가 "text"라는 글자로 따로 찍혀 나오던 문제도 함께 사라졌다.
  - 새 글: `utils/news/generator.ts`가 섹션(과 그 앞 구분선)을 더 이상 만들지 않는다(`buildImagePromptSection` 삭제).
  - 기존 글: `utils/stripImageSchema.ts`의 `removeImagePromptSection()`이 글 보기 화면(`app/posts/[id]/page.tsx`)과
    편집기(`app/posts/[id]/edit/page.tsx`, 불러올 때 제거 → 저장하면 DB에서도 빠짐)에서 섹션과 바로 앞 구분선을 걷어낸다.
  - 이미지 생성 자체(섹션마다 핵심 문장을 골라 그리는 방식, 한국인 기본 묘사)는 그대로다. 장면 설명은 화면에 안 보일 뿐 생성에는 계속 쓰인다.

# 이미지 저장소 전환 — Supabase Storage (2026-10-01, v1.12)

주인님 지시("새 글과 편집기 이미지 모두 Storage에", "기존 글 3개도 옮겨서 가볍게", "기존 사용자도 이 방식으로")로 저장 방식을 하나로 통일했다.

- **예전**: 회원이 Cloudinary를 등록했으면 그 계정에 업로드, 아니면 이미지를 base64 문자열로 글 본문에 통째로 넣음(글 1개 12MB 이상).
  편집기의 AI 이미지·첨부 이미지는 항상 base64.
- **지금**: 모든 회원·모든 이미지(자동 생성 3장, 편집기 "AI 이미지 생성", 편집기 이미지 첨부)를 공용 Supabase Storage
  `post-images`(public) 버킷의 `<회원 id>/ai-auto-blog/<uuid>.<확장자>`에 올리고, 글에는 공개 주소만 넣는다.
  - 서버 업로드: `utils/imageStorage.ts`(`uploadBase64Image`/`uploadDataUriImage`, 서비스 키). 자동 생성(`utils/news/imageGenerator.ts`)과
    편집기 AI 이미지(`app/api/posts/generate-editor-image/route.ts`)가 쓴다. 저장 실패 시 base64로 되돌리지 않고 그 칸을 비운다.
  - 편집기 첨부: `components/RichTextEditor.tsx`가 브라우저에서 바로 올린다(Vercel 4.5MB 요청 한도 회피, 10MB 제한).
    버킷 RLS(`post_images_insert_own`)가 본인 폴더에만 쓰기를 허용한다 — threads·insta·naver-cafe가 같은 버킷·같은 규칙을 쓴다.
  - Cloudinary 연동 삭제: `utils/cloudinary.ts`, `app/settings/CloudinaryConfigRow.tsx`, 설정 저장 액션, 설정 화면 칸·매뉴얼 버튼.
    DB `user_cloudinary_config` 테이블과 회원 6명의 등록값은 지우지 않고 그대로 두었다(다른 곳에서 안 씀). 이미 Cloudinary 주소가 든 예전 글 6개도 그대로 보인다.
  - 설정 화면 Cloudinary 칸 자리에 "🖼️ 이미지 저장 안내"(`components/settings/ImageStorageNotice.tsx`)를 넣었다.
- **기존 글 이전**: `scripts/migrate-base64-images.mjs`로 글 100·105·106번의 base64 이미지 9장을 Storage로 옮기고 본문을 주소로 바꿨다
  (각 12.0~12.6MB → 20~25KB). 실행 전 원본 본문은 작업자 PC 임시 폴더에 백업했고, 운영 화면에서 세 글 모두 정상 표시를 확인했다.
  다시 base64 글이 생기면 같은 스크립트를 `--dry-run`으로 먼저 확인한 뒤 실행한다.

# 이미지 보관 기간 30일 자동 삭제 + 회원 안내 (2026-10-01, v1.13)

주인님 지시("데이터 누적을 막기 위해 보관 기간은 1달, 사용자들이 인지할 수 있도록 정리해서 보기 좋게 노출"):

- **보관 기간 값**: `utils/imageRetention.ts`의 `IMAGE_RETENTION_DAYS = 30` — 정리 작업과 안내 문구가 이 값 하나를 쓴다.
- **정리 작업**: `app/api/cron/cleanup-images/route.ts`. Vercel Cron(`ai-auto-blog/vercel.json`, `0 18 * * *` = 매일 한국 시간 03:00)이 호출한다.
  - `Authorization: Bearer <CRON_SECRET>`이 맞을 때만 실행(Vercel이 자동으로 붙임). `CRON_SECRET`은 Vercel ai-auto-blog production 환경변수(민감값)로 등록했다.
  - **`post-images` 버킷은 threads·insta·naver-cafe와 공용이라 `<회원 id>/ai-auto-blog/` 폴더 안의 파일만** 만든 지 30일이 지나면 지운다.
  - `?dry=1`을 붙이면 지우지 않고 대상 개수만 알려준다. 배포 직후 확인: 키 없이 401, 키+dry → `checked 9, expired 0`(이전한 9장, 아직 30일 안 됨).
  - 지워진 이미지는 글 안에서 깨진 이미지로 보인다. 글 제목·본문 글자는 지우지 않는다.
- **회원 안내**: `components/settings/ImageStorageNotice.tsx` — 설정 화면에는 전체 안내(저장 방식·30일 자동 삭제·다른 블로그에 옮길 때
  이미지를 내려받아 직접 올리기·"본문 복사"로 붙인 이미지도 같은 주소라 기간 후 안 보임·글자는 안 지워짐), AI 글쓰기 화면의
  이미지 생성 설정 카드에는 짧은 안내(`compact`)를 노란 박스로 보여준다.
- 참고: 기존 글 100·105·106번의 이전한 이미지도 이전한 날(2026-10-01)부터 30일 뒤 지워진다.

# 콘텐츠 일체 30일 보관 — 글·이미지·글감 수집 결과 (2026-10-01, v1.14)

주인님 정의: **"30일 자동 삭제는 생성된 블로그 콘텐츠 일체를 건별로, 생성 날짜 기준 30일 뒤 삭제 — DB 용량이 무제한으로 쌓이는 것을 막기 위함."**
(v1.13의 "이미지만 30일"을 확장했다.)

- **삭제 대상(콘텐츠)**: `blog_posts`(글 제목·본문, 기준 `published_at`) — 댓글·좋아요·카테고리 연결은 DB CASCADE로 함께 삭제,
  지우는 글 본문에 든 BLOG 이미지(Storage), `<회원 id>/ai-auto-blog/` 안의 30일 지난 이미지 파일, `blog_candidates`(글감 수집 결과, 기준 `created_at`).
- **남기는 것(설정)**: `blog_categories`, `blog_authors`, `user_api_keys`, `newsblur_accounts`. 다른 프로그램 파일이 섞인 `post-images` 버킷의 다른 폴더.
- **기존 데이터 유예(주인님 선택)**: 정책 시작일 2026-10-01(KST)부터 30일 — 실제 삭제 기준 = max(작성일, 2026-10-01) + 30일.
  즉 기존 콘텐츠는 2026-10-31(KST)부터, 첫 정리 실행(11/01 03:00)에서 지금 있는 글 14개·글감 25개가 모두 지워진다(SQL로 미리 확인).
  계산은 `utils/imageRetention.ts`(`RETENTION_DAYS`, `RETENTION_POLICY_START`, `retentionDeleteAt`/`retentionDaysLeft`/`retentionCutoff`).
- **정리 작업**: `app/api/cron/cleanup-images/route.ts`(Vercel Cron 등록 경로라 이름은 그대로, 매일 03:00 KST). `?dry=1`이면 지우지 않고 개수만 응답.
  유예 기간 중에는 아무것도 지우지 않고 안내 문구만 돌려준다.
- **회원 안내**: `components/settings/ImageStorageNotice.tsx` — 설정 화면(전체 안내), AI 글쓰기·게시글 관리·글감 수집 화면(짧은 안내).
  게시글 관리 목록(`app/_components/HomePage.tsx`)의 글마다 "N일 후 삭제" 배지(7일 이하 빨간색).
- 참고: 이전 작업으로 base64를 걷어낸 `blog_posts` 테이블은 아직 38MB로 보이는데, 지운 데이터 공간은 DB 자동 정리(autovacuum)가 차차 회수한다.

# 보관 기간 안내 문구 정리 (2026-10-01, v1.15)

- 주인님 지시로 설정 화면 안내(`components/settings/ImageStorageNotice.tsx`)에서 두 문장을 지웠다:
  "따로 이미지 저장소(Cloudinary 등)를 연결하지 않아도 됩니다." / "이미 만들어 둔 콘텐츠는 2026년 10월 31일부터 삭제되기 시작합니다. 게시글 관리 화면에서 글마다 삭제까지 남은 날을 확인할 수 있습니다."
- 삭제 규칙(기존 콘텐츠 10/1부터 30일 유예 포함)과 게시글 관리의 "N일 후 삭제" 배지는 그대로다 — 문구만 뺐다.

# 글쓰기 화면 "고급 설정" 삭제 (2026-10-01, v1.16)

- 주인님 지시("이 기능 필요 없어 삭제"): AI 글쓰기 화면 이미지 설정 카드의 "고급 설정 (선택) — 이번 글에만 쓸 키·엔드포인트"
  (이번 글에만 쓸 Gemini API 키 입력, 커스텀 이미지 API 엔드포인트 입력)를 지웠다(`app/write/ai-form/page.tsx`).
- 서버(`app/api/auto-post/route.ts`)도 요청에 실린 키(`nanoBananaApiKey`/`apiKey`)를 더 이상 받지 않고, 설정에 등록한 본인 Gemini 키만 쓴다.
  커스텀 엔드포인트 옵션도 없앴다(`utils/news/generator.ts` — 모델 설정 `nanoBananaConfig`의 공식 주소만 사용).

# 네이버 블로그 입력 크롬 확장 (2026-10-01, v1.17)

주인님 지시: "SEO 스튜디오 확장의 자동 포스팅 기능을 BLOG에도 — A안(BLOG 전용 확장), 한 글자씩 입력, 우선 네이버만".
재사용 가능한 구조·주의사항 전체는 루트 `docs/PLATFORM_PATTERNS.md` §28에 정리했다(다른 프로그램은 거기부터 읽을 것).

- **흐름**: 설정 화면에서 연동 토큰 발급 + ZIP 설치 → 글 보기 화면 "🧩 네이버로 보내기" → 확장 사이드패널에서 글 선택(이미지까지 미리 내려받음)
  → 네이버 블로그 글쓰기 탭에서 "네이버 편집기로 입력" → 제목·본문·이미지 순서대로 입력 → 입력 확인 → 발행 설정창에 카테고리·태그 → **마지막 발행은 회원이 직접**.
- **확장**: `extension/`(manifest v3, `sidepanel.js`). SEO 스튜디오 확장의 검증된 네이버 처리 + §20 반영(70~170ms 타이핑, 클릭 전 hover).
  ZIP: `npm run build:extension` → `public/downloads/ai-auto-blog-extension-<version_name>.zip`. 확장을 고치면 manifest 버전 두 칸을 올리고 ZIP 재생성·커밋.
  (v1.19부터) 확장 버전은 프로그램 버전과 **항상 같다** — 아래 "확장 버전 자동 동기화" 참고.
- **서버**:
  - 토큰: `utils/extensionAuth.ts`(`personal_access_tokens`, `program_slug='ai-auto-blog'`, sha256 해시, 공용 권한 판정 `checkProgramAccess`),
    발급·조회·폐기 서버 함수 `app/settings/extensionTokenActions.ts`, 화면 `components/settings/ExtensionSettings.tsx`.
  - 확장용 API: `GET /api/extension/whoami`, `GET /api/extension/posts`(본인·보낸 글 최근 20개, 입력 블록 포함), `POST /api/extension/posts/[id]/input-result`.
  - 웹 보내기: `POST /api/posts/[id]/extension-handoff`(로그인 + 이용 권한 + 본인 글).
  - 글 → 입력 블록: `utils/extensionContent.ts`(cheerio). 소제목 `##` 제거, 목록 `•`, 링크 `글자 (주소)`, 마지막 해시태그 줄 → 태그 추천, 이미지 블록.
- **DB**: `blog_posts`에 `extension_handoff_at`, `naver_input_status`(in_progress/completed/publish_ready/failed), `naver_input_completed_at`,
  `naver_input_error` + 인덱스 — `supabase/migrations/0004_blog_posts_extension_handoff.sql`(주인님 승인, MCP로 적용).
- **검증(운영 주소)**: 임시 토큰으로 whoami 200, 보내기 전 목록 0 → 보낸 뒤 1(글 108: 이미지 3, 2,399자, 태그 자동 추출),
  이미지 주소 직접 내려받기 200(CORS 허용), 입력 결과 기록 200, 남의 글 404, 잘못된 토큰 401, 비로그인 보내기 401. 임시 토큰·상태는 테스트 후 삭제.
  회원 글 7개 변환 확인: 입력 글자 평균 약 4,000자(최대 약 9,000자) → 입력 시간 약 9분(긴 글 20분).
- **남은 일**: 주인님 PC의 실제 네이버 글쓰기 화면에서 확장으로 끝까지 입력 확인(네이버 로그인은 사람이 직접). 셀렉터가 맞지 않으면 확장의 "구조 분석" 결과로 갱신.
  서식(소제목 크기·굵게)은 입력되지 않는다 — 주인님 선택(①한 글자씩 입력)에 따른 한계.

# 서브폴더 이름 변경: blog/ → ai-auto-blog/ (2026-10-01, v1.18)

- 주인님 지시("기존 프로그램처럼 네이밍 규칙에 따른 서브폴더를 만들고 그쪽에서 다른 프로그램들처럼 관리"): 새 프로그램들은
  **폴더 이름 = 프로그램 slug = Vercel 프로젝트 이름**(예: `naver-blog-seo-studio`, `threads-affiliate-poster`)이라 `blog/`를 `ai-auto-blog/`로 옮겼다(`git mv`, 이력 유지).
- 이제 작업·빌드·배포는 모두 `AIMaster/ai-auto-blog/`에서 한다: `cd ai-auto-blog && npm run build && npx vercel deploy --prod --yes --scope buylife`
  (`.vercel/project.json`이 그대로 따라와 같은 Vercel 프로젝트 `ai-auto-blog`, 같은 주소 https://ai-auto-blog-one.vercel.app 으로 배포됨을 확인).
- 코드 안의 경로 별칭 `@/blog/*`는 tsconfig에서 이 폴더 자체를 가리키므로 그대로 둔다(폴더 이름과 무관).
- 루트에서 바꾼 것: `tsconfig.json` 제외 목록, `.vercelignore`(`/ai-auto-blog`), `next.config.mjs` 주석, 루트 문서의 경로 표기.
  다른 서브프로젝트(threads·shots·insta·naver-cafe 등) 코드 주석에 남은 `blog/...` 언급은 동작과 무관하고, 고치면 그 프로그램 버전까지 올려야 해서 그대로 두었다
  — 읽을 때 `ai-auto-blog/...`로 바꿔 읽으면 된다. Codex 담당 `naver-blog-seo-studio/`도 건드리지 않았다.
- 같은 저장소에 있는 `blog_auto_poster/`는 이름이 비슷하지만 다른(예전) 폴더다 — 혼동하지 말 것.

# 확장 버전 자동 동기화 — 프로그램 업데이트 = 확장 업데이트 (2026-10-01, v1.19)

주인님 지시("SEO 블로그 방식대로 — 프로그램 업데이트 때 확장도 동시에 업데이트하고, 압축해서 사용자들이 항상 최신 버전으로 받게"):

- **규칙**: 프로그램 버전(`utils/version.ts` `APP_VERSION`) = 확장 공개 버전(`extension/manifest.json` `version_name`) = 다운로드 ZIP 버전 = DB `programs.version`.
  SEO 스튜디오(`naver-blog-seo-studio`)와 같은 규칙인데, 거기는 사람이 매번 맞추고 여기는 **자동**이다.
- **자동화**: `package.json`의 `"prebuild": "node scripts/build-extension-archive.mjs"` — `npm run build`를 할 때마다(로컬·Vercel 서버 모두)
  `APP_VERSION`을 읽어 manifest의 `version`(크롬용 숫자, v1.19 → `1.19.0`)·`version_name`(v1.19)을 맞추고,
  `public/downloads/ai-auto-blog-extension-<버전>.zip`을 새로 만들며 예전 버전 ZIP은 지운다. **그러니 버전만 올리고 빌드하면 확장·ZIP은 신경 쓸 필요 없다.**
  로컬 빌드로 바뀐 `extension/manifest.json`과 새 ZIP(예전 ZIP 삭제 포함)을 같은 커밋에 넣는다.
- **회원 안내**:
  - 설정 화면(`components/settings/ExtensionSettings.tsx`): SEO 스튜디오처럼 "설치 전 → 설치 진행 중 → 설치 완료 표시 / 업데이트 필요" 상태 표시.
    웹은 확장 설치 여부를 직접 알 수 없어서 이 브라우저 localStorage에 "내려받음·설치 완료 표시" 버전을 기록하고, 프로그램이 새 버전이 되면 "업데이트 필요 · 설치된 vA → 최신 vB"를 빨간 안내로 보여준다.
  - 확장 프로그램 안: 연결 확인(`/api/extension/whoami`)이 `latestVersion`·`downloadUrl`을 돌려주고, 설치된 확장 버전과 다르면 사이드패널 맨 위에
    "새 버전이 나왔습니다 — 최신 ZIP 바로 받기" 안내를 띄운다(`extension/sidepanel.js` `renderUpdateBanner`).
- 크롬 정책상 "압축해제된 확장"은 스스로 업데이트되지 않는다 — 회원이 새 ZIP을 같은 폴더에 덮어쓰고 확장 관리 화면에서 새로고침해야 한다(안내 문구에 포함).
- 검증: 빌드 시 manifest가 v1.19로 바뀌고 ZIP 안 manifest도 v1.19, 운영에서 v1.19 ZIP 200·예전 v1.17 ZIP 404, Vercel 서버 빌드에서도 ZIP 자동 생성 확인,
  임시 토큰으로 whoami `latestVersion: v1.19` 확인(토큰 삭제).

# 확장 아이콘·이름 구분 (2026-10-01, v1.20)

- 주인님이 BLOG 확장을 불러왔을 때 SEO 스튜디오 확장 자리로 들어간 것처럼 보였다(원인은 불러온 폴더 설정 실수였음 — 주인님 확인).
  다만 두 확장 모두 아이콘이 없어 크롬이 이름 첫 글자로 만든 똑같은 회색 "A" 아이콘이었고, 같은 오른쪽 사이드패널을 써서(크롬은 사이드패널을 한 번에 하나만 보여줌)
  헷갈리기 쉬웠다. 그래서 BLOG 확장에 전용 아이콘(초록 바탕 흰 "B", `extension/icons/icon16·32·48·128.png`)을 넣고 이름을 "BLOG(원문) 네이버 입력 · AIMaster"로 바꿨다.
- 아이콘은 `scripts/make-extension-icons.mjs`로 만든다(외부 라이브러리 없이 PNG 직접 생성). 바꿀 일이 있으면 이 스크립트를 고쳐 다시 실행하고 결과를 커밋.
- 확장은 불러온 **폴더 위치로 구분**된다 — BLOG(`ai-auto-blog/extension` 또는 BLOG ZIP을 푼 폴더)와 SEO 스튜디오 확장은 서로 다른 폴더에서 각각 불러와야 둘 다 등록된다.
  같은 폴더에 다른 확장 ZIP을 덮어쓰면 그 자리의 확장이 바뀐다.

# 네이버 입력 시 링크가 걸리게 (2026-10-01, v1.21)

- 주인님 확인(추천링크.png): 확장으로 네이버에 입력한 글에서 추천 링크가 `추천링크 바로가기 (https://buylife.blog)` **글자로만** 들어가고 링크가 걸리지 않았다.
  한 글자씩 입력이라 링크 서식은 못 넣고, 네이버 편집기의 "주소 뒤 띄어쓰기·줄바꿈 → 자동 링크"에 기대야 하는데 주소 바로 뒤가 `)`라 변환되지 않은 것으로 판단.
- 수정(방법 ①, `utils/extensionContent.ts`): 링크를 `글자: 주소 `로 바꾸고(괄호 없음) 주소 뒤에 항상 띄어쓰기를 둔다. 텍스트 블록이 주소로 끝나면(뒤에 이미지 등) 띄어쓰기를 붙인다.
  예: `📢 추천링크 지금 바로 확인해 보세요: 👉 추천링크 바로가기: https://buylife.blog `.
- **남은 일**: 주인님이 새 버전으로 포스팅해 링크가 걸리는지 확인. 걸리지 않으면 방법 ②(편집기 링크 도구로 글자에 링크 걸기)로 넘어간다 —
  §20 규칙 3에 따라 실제 네이버 글쓰기 화면의 "구조 분석" 결과(링크 버튼·입력창)를 받은 뒤에 만든다. 방법 ③은 주소 붙여넣기로 생기는 링크 미리보기 카드.

# 추천 링크 한 줄 + 네이버에 실제 링크로 입력 (2026-10-01, v1.22)

주인님 지시: "📢 추천링크 지금 바로 확인해 보세요: 👉 추천링크 바로가기: 처럼 두 번 나온다 → 👉 추천링크 바로가기만", "네이버 편집기로 등록하면 실제 링크도 걸리게".
v1.21의 방법 ①(주소를 괄호 없이 + 뒤 띄어쓰기로 네이버 자동 링크 유도)로는 링크가 걸리지 않았다.

- **추천 링크 문구**: 새 글은 `utils/news/generator.ts`가 `> [👉 {문구} 바로가기]({주소})` 한 줄만 만든다(예전 "📢 {문구} / 지금 바로 확인해 보세요:" 삭제).
  예전 글은 네이버로 보낼 때 변환기(`utils/extensionContent.ts`)가 추천 링크 상자에서 링크만 꺼낸다.
- **링크 블록**: 링크만 있는 줄(추천 링크 상자, 링크 하나뿐인 문단)은 `{type:'link', text, url}` 블록으로 보낸다. 문장 속 링크는 여전히 "글자: 주소 ".
- **확장(`extension/sidepanel.js` `pasteLinkIntoNaver`)**: 링크 블록은 한 글자씩 입력하지 않고, 사람이 웹의 링크를 복사해 Ctrl+V 하듯
  링크가 걸린 HTML(`<a href>`)을 붙여넣기 이벤트(`ClipboardEvent('paste')` + `DataTransfer`)로 편집기에 넘긴다(셀렉터 추측 없이 현재 입력 위치에 넣음).
  붙여넣은 뒤 편집기 안에 그 주소의 실제 링크(`a[href]`)가 생겼는지 확인 → 안 생기고 글자도 안 들어갔으면 예전처럼 "글자: 주소 "로 입력(내용 손실 없음).
  입력이 끝나면 "링크 N/M개 실제 링크로 입력"을 보여준다. 본문은 그대로 §20 속도로 한 글자씩.
- **남은 일**: 네이버가 프로그램이 만든 붙여넣기 이벤트를 받아주는지 실제 화면 확인 필요(주인님 테스트). 안 받아주면(실제 링크 0개)
  편집기 링크 버튼으로 거는 방식(방법 ②)으로 간다 — 그때는 "구조 분석" 결과가 필요하다.

# 확장 미리보기 링크 문구 정리 (2026-10-01, v1.23)

- 주인님 지시: 확장 "전체 미리보기"에서 링크 줄 뒤에 붙던 " (실제 링크로 입력)" 안내 문구를 뺐다(`extension/sidepanel.js` `renderPreview`). 링크만 파란 글자로 보인다.

# 버튼 이름 "네이버 입력기로 보내기" (2026-10-01, v1.24)

- 주인님 지시(확장.png): 글 보기 화면 버튼 "🧩 네이버로 보내기" → "🧩 네이버 입력기로 보내기"(보낸 뒤 "✓ 네이버 입력기로 보냄").
  같은 버튼을 가리키는 안내 문구(설정 화면 확장 박스, 확장 사이드패널, 오류 메시지)도 모두 같은 이름으로 바꿨다.

# 확장 제목 "BLOG(원문) 네이버 입력기" 한 줄 (2026-10-01, v1.25)

- 주인님 지시(입력기.png): 확장 사이드패널 제목을 두 줄("BLOG(원문) / 네이버 입력") → 한 줄 "BLOG(원문) 네이버 입력기"(좁은 패널에서도 한 줄이 되게 글자 크기 자동 조절).
  크롬 확장 목록 이름 "BLOG(원문) 네이버 입력기 · AIMaster", 아이콘 툴팁·창 제목도 같은 이름으로 맞췄다.

# 확장 부제 문구 (2026-10-01, v1.26)

- 주인님 지시: 확장 사이드패널 제목 밑 문구 → "BLOG(원문) 편집기에서 보낸 글을 네이버 블로그 편집기에 사람처럼 입력합니다. 마지막 발행은 직접 누릅니다."(`extension/sidepanel.html`).

# 추천 링크가 4번 들어가던 문제 수정 (2026-10-01, v1.27)

- **증상(주인님 실제 네이버 화면)**: 마지막 줄에 "👉 추천링크 바로가기"가 **실제 링크 3개 + 글자("…: https://buylife.blog") 1개**로 들어갔다.
  → 붙여넣기 방식 자체는 네이버가 받아준다(링크가 실제로 걸림)는 것이 확인됐다.
- **원인**:
  1. `pasteLinkIntoNaver`가 `chrome.scripting.executeScript({allFrames: true})`로 **모든 프레임에서 동시에** 실행됐다. 네이버 글쓰기 화면은 프레임 안에 프레임이 있는 구조라,
     바깥 프레임들도 `activeElement`(iframe)를 따라 안쪽 편집기까지 내려가 **같은 편집기에 붙여넣기를 여러 번** 했다(3회).
  2. 동시에 돈 확인 로직의 붙여넣기 전후 링크 수 비교가 엇갈려 "실패"로 판단 → 글자 입력까지 한 번 더 했다.
- **수정(`extension/sidepanel.js`)**: `findFocusedEditorFrame` — 그 문서 **자신의** activeElement가 편집 영역이고 포커스를 가진 프레임 하나만 찾는다(iframe으로 내려가지 않음).
  그 프레임에서만 `frameIds: [frameId]`로 **딱 한 번** 붙여넣고, 같은 프레임 안에서 해당 주소 링크 수·문구 수를 전후 비교한다.
  링크도 문구도 늘지 않았을 때만 "글자: 주소"로 입력한다(중복 방지). 편집 프레임을 못 찾으면 붙여넣지 않고 글자로 한 번만 입력.
- **보완**: 같은 화면에서 이미지 설명 "📷 … (클릭하여 고화질 확대)"가 본문 글자로 들어간 것도 발견 — 편집기(Tiptap)로 저장한 글은 figure가 풀려
  설명이 별도 문단으로 남는다. 변환기(`utils/extensionContent.ts` `pushText`)가 이 줄을 빼도록 했다.
- **교훈(다른 확장에도 해당)**: 상태를 바꾸는 주입(붙여넣기·클릭·입력)은 `allFrames`로 돌리지 말고, 먼저 대상 프레임 하나를 찾은 뒤 `frameIds`로 그 프레임에서만 실행한다.
  읽기 전용 조사(구조 분석·확인)만 `allFrames`를 쓴다. → `docs/PLATFORM_PATTERNS.md` §28에도 기록.

# 확장 "추천태그 추출" (2026-10-01, v1.28)

주인님 지시: "SEO 블로그 쪽에서 구현 중인 태그 추천 기능을 읽어보고 BLOG(원문) 확장에도". SEO 스튜디오 확장 v1.57(`naver-blog-seo-studio/extension/sidepanel.js`
`buildRecommendedTags`, Codex 작업, 읽기만 함)과 같은 방식으로 `extension/sidepanel.js`·`sidepanel.html`·`styles.css`에 넣었다.

- 발행 설정 칸에 "카테고리명"·"추천태그" 이름표, 버튼 3개(추천태그 추출 / 카테고리·태그 저장 / 카테고리·태그 다시 입력).
- **추천태그 추출**은 회원이 눌렀을 때만 태그 칸을 채운다(자동 적용 아님, 넣은 뒤 직접 수정 가능). 최대 10개.
  후보 순서: 글 끝 해시태그 → 제목·본문에서 2번 이상 나온 단어(많이 나온 순). 뜻 없는 말(접속사·서술어·"추천링크·바로가기·우리" 등)은 뺀다.
- SEO 스튜디오와 다른 점(BLOG에 맞춰 보완):
  - BLOG 글에는 "주제" 칸이 없어서 **글 끝 해시태그와 제목**을 핵심 후보로 쓴다.
  - 해시태그 조사 처리: ① 본문에 그대로 있으면 유지 ② 조사를 뗀 말이 본문에 있으면 그 말 ③ 그 밖엔 확실한 조사(을·를·은·는·와·과·에·에서·이란 등)만 뗀다.
    SEO 방식(끝 글자 조사 무조건 제거)은 "투자협의"→"투자협"이 되는 문제가 있었다.
  - "위한·대응하·주목해야"처럼 서술어로 끝나는 짧은 말 제외, 주소(https…)·숫자만인 말 제외.
- 검증: 회원 글 5개로 추출 결과 확인(예: 108번 → 트럼프, 한국, 알래스카, LNG, 투자, 발표, 알래스카LNG, 한국대미투자, 원자력발전소, 투자협의).
  "AI와"처럼 본문에 그 모양 그대로 나오는 말은 남을 수 있다 — 칸에서 고치면 된다.
- 화면 표기는 맞춤법대로 "추천태그"(SEO 스튜디오 화면은 "추천테그").

# 추천테그 추출을 SEO 스튜디오 v1.59와 똑같이 (2026-10-01, v1.29)

주인님 지시: "SEO블로그에서 지금 구현한 방식대로 태그 추출 기능 적용 — 버튼 위치·기능·필터 읽어보고 적용". v1.28의 BLOG식 보완 대신
SEO 스튜디오 확장 v1.59(Codex, 커밋 `3a6c6ea`)의 코드를 **그대로** 옮겼다.

- `extension/sidepanel.js`: `TAG_STOP_WORDS`·`TAG_GENERIC_BODY_WORDS`·`KOREAN_TAG_PARTICLES` 상수와 `normalizeTagCandidate`·`isCoveredBySpecificTag`·
  `buildRecommendedTags` 함수가 SEO 쪽과 **글자까지 동일**(diff로 확인). 클릭 처리·안내 문구도 같다.
  BLOG 글에는 주제 칸이 없어서 `topic`은 비우고 `keywords` 자리에 글 끝 해시태그를 넣는다.
- `extension/styles.css`는 SEO 쪽 파일을 그대로 복사(같은 칸·버튼 배치). 이름표·버튼 문구도 SEO와 같은 "추천테그".
- **SEO 쪽 태그 규칙이 바뀌면 이 두 파일도 같이 맞출 것**(다시 복사하는 게 가장 안전).
- 알아둘 점: SEO 규칙은 "주제·키워드는 회원이 정한 값이라 그대로 살린다"인데, BLOG의 해시태그는 AI가 제목을 쪼개 만든 것이라
  "위한·주목해야·대응하·투자협" 같은 말이 걸러지지 않고 나올 수 있다(회원 글 5개 시험에서 확인). 칸에서 고치면 되고, 필요하면 BLOG만 해시태그에도 본문 필터를 적용하도록 바꿀 수 있다.

# 삭제 예정 배지 문구 (2026-10-01, v1.30)

- 주인님 지시(자동삭제.png): 게시글 관리 목록 배지 "N일 후 삭제" → "N일 후 자동삭제", 마지막 날 "오늘 삭제 예정" → "오늘 자동삭제 예정"(`app/_components/HomePage.tsx`).

# 이미지 장수 선택(1~5장) + 본문 문단 4개 (2026-10-01, v1.31)

주인님 지시: "본문 생성 시 몇 장의 이미지를 만들지 선택(1~5장)", "이미지는 전체 제목용 1개 + 본문 문단 4개 중에서 문단별 핵심 내용으로 구분해서 생성", "1개면 전체 내용".

- **글 구성**: 소제목·문단 3개 → **4개**(`utils/news/generator.ts` 프롬프트 JSON 10개 키: 제목·요약글·소제목 1~4·문단 1~4). 4개 문단은 서로 다른 핵심 내용.
- **이미지 배치**: 1번 = 글 전체를 대표하는 **제목용**(요약 바로 아래, 요약 + 각 문단 앞부분에서 대표 문장 선택), 2번부터 **문단 1→2→3→4 순서로 한 장씩**(각 소제목 바로 아래, 그 문단의 핵심 문장).
  1장=제목용만 · 2장=+문단1 · 3장(기본)=+문단1~2 · 4장=+문단1~3 · 5장=+문단 1~4 전부.
- **코드**: `utils/news/imageGenerator.ts` — 3장 고정(`selectSectionVisuals`/`generateNanoBananaImages`)을 구간 N개용 `selectSegmentVisuals`/`generateSegmentImages`로 일반화
  (구간 설명 `segmentLabels`를 문장 고르는 AI에 함께 전달). 프롬프트 규칙(한국인 기본, 읽을 수 있는 글자 없음, 원문 문장 대조)은 그대로.
  장수 값·선택지·`resolveImageCount`는 화면·서버 공용 `utils/ai/contentModels.ts`(`IMAGE_COUNT_OPTIONS`, 기본 3).
- **화면**(`app/write/ai-form/page.tsx`): 이미지 생성 설정 카드에 "이미지 장수" 선택, 브라우저(localStorage)에 모델 선택과 함께 기억, 생성 중 안내 문구도 고른 장수로.
- **서버**(`app/api/auto-post/route.ts`): `imageCount`를 받아 1~5로 보정, 최대 5장이라 `maxDuration = 300`.
- **검증**: 타입 검사·빌드·배포 완료. 실제 글 생성(회원 키 유료 호출)은 주인님 테스트로 확인 필요.

# 2~4장일 때 문단 4개를 나눠 맡기 (2026-10-01, v1.32)

- 주인님 지시: "2~4개를 선택하면 문단별로 구분된 내용으로 이미지가 만들어지도록". v1.31은 문단 이미지가 문단 1부터 차례로만 들어가
  3장이면 문단 3·4에는 이미지가 없었다(앞쪽에 몰림).
- 이제 제목용 1장을 뺀 문단 이미지 k장이 **문단 4개를 연속 묶음으로 고르게 나눠 맡는다**(`utils/news/generator.ts` `groupParagraphs`):
  2장=[문단1~4] · 3장=[1~2][3~4] · 4장=[1~2][3][4] · 5장=[1][2][3][4]. 각 이미지는 **자기 묶음 안에서만** 핵심 문장을 골라(이미지끼리 내용 안 겹침)
  묶음 첫 문단의 소제목 바로 아래에 넣는다. 화면 선택지 문구도 이 배치로 바꿨다(`utils/ai/contentModels.ts` `IMAGE_COUNT_OPTIONS`).

# "다른 프로그램 보기" → 메인 내 대시보드 (2026-10-01, v1.33)

- 주인님 결정: 좌측 메뉴 "← 다른 프로그램 보기"를 모든 프로그램에서 `https://www.buylife.xyz/dashboard`(이용 가능한 프로그램 목록)로 통일.
  BLOG는 `app/_components/BlogSidebar.tsx`에서 `/programs` → `/dashboard`. 다른 프로그램은 예전 값 `/blog/dashboard`가 BLOG 분리 후 BLOG 대시보드로
  가버리던 문제를 같은 작업에서 고쳤다(루트 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`). BLOG 로그인 폼(`app/auth/auth-form.tsx`)은 모든 프로그램 로그인 화면의 기준이 됐다(`docs/PLATFORM_PATTERNS.md` §29).

# 소제목 중복 표시·"요약:" 라벨 제거 (2026-10-02, v1.34)

주인님이 110번 글("두바이 비행 실화…")에서 신고한 두 가지를 고쳤다. 자세한 원인·점검 사항은 루트 `docs/ERROR_LESSONS.md` 2026-10-02 BLOG 항목 참고.

- **소제목 중복**: AI가 "문단 N" 값 첫 줄에 그 섹션 소제목(또는 글 전체 제목)을 마크다운으로 한 번 더 반환할 때가 있어, `generator.ts`가 따로 붙이는 `## 소제목`과 합쳐져
  이미지가 있는 섹션은 이미지 앞/뒤로, 없는 섹션은 연달아 소제목이 두 번 보였다. `tistory-auto-blog` v1.39와 같은 원인(AI가 제목/소제목을 본문에 메아리로 반환)이다.
  `utils/news/generator.ts`의 `stripLeadingHeadingEcho()`가 조립 전에 각 "문단 N" 값에서 해당 소제목·전체 제목과 글자 단위로 같은 선두 줄을 지운다.
  `removeDuplicateTitleLines()`(tistory와 같은 방식)는 완성된 마크다운에서 전체 제목이 통째로 한 번 더 나온 줄도 한 번 더 걸러낸다.
  확장 전송용 `utils/extensionContent.ts`의 `htmlToInputBlocks()`도 글 제목을 인자로 받아 같은 중복을 걸러내도록 바꿨다(호출부 `app/api/extension/posts/route.ts`가 제목을 넘김) —
  예전에 저장된 글을 네이버로 보낼 때도 적용된다.
- **"요약:" 라벨**: 요약 인용문이 `> **요약**: 내용`으로 라벨이 그대로 보여서 `> ${excerpt}`로 라벨을 뺐다(내용은 그대로).
- **기존 글 직접 수정(코드가 아니라 데이터)**: 110번 글은 중복된 `<h2>` 블록을 SQL로 하나로 합치고 "요약:" 라벨도 지웠다. 같은 라벨이 남아 있던 다른 9개 글(id 100·101·103~109)도
  라벨만 지웠다(소제목 중복은 없었음 — 110번만 해당). 두 수정 모두 글자·이미지는 건드리지 않았다.
- **검증**: 빌드 통과. 실제로 고친 결과는 운영 주소 `/posts/110`에서 확인 가능. 새로 생성하는 글의 중복 재발 여부는 다음 실사용 생성에서 확인 필요(HANDOFF §1-6).

# 본문+이미지 생성 및 실시간 블록 편집기 (2026-10-07, v1.35)

주인님 지시("https://ai-auto-blog-one.vercel.app/write/ai-form 다른 블로그(원문)자동화에 구현해 놓은 본문+이미지생성기능과 편집 기능을 면밀히 분석후 여기에 구현해줘"):

- **분석 및 배경**: 기존 `write/ai-form`은 폼 제출 시 백그라운드 생성 후 즉시 `/posts/[id]`로 넘어가버려 작성자가 본문이나 이미지를 확인하고 다듬을 수 있는 편집 기능이 없었다. `naver-blog-seo-studio`(StudioPage의 블록 편집기) 및 `naver-blog-agent`(실시간 이미지 갤러리/뷰어)의 검증된 UX를 융합하여 실시간 검토 & 블록 편집 워크스페이스를 구축했다.
- **백엔드 (`app/api/auto-post/route.ts` & `utils/news/generator.ts`)**:
  - `GeneratedPostResult`에 구조화된 문단 배열(`sections: PostSectionItem[]`), 대표 이미지(`coverImage`), CTA, 해시태그 객체 추가.
  - `previewOnly: true`(또는 `mode: 'generate'`) 모드 지원: 생성 후 DB 저장 없이 구조화된 글과 이미지 결과를 클라이언트에 즉시 반환.
  - `saveOnly: true`(또는 `mode: 'save'`) 모드 지원: 클라이언트에서 편집 완료된 제목, 요약문, 마크다운/HTML 본문, 카테고리를 받아 DB `blog_posts` 및 매핑 테이블에 단일 트랜잭션으로 등록.
- **프론트엔드 (`app/write/ai-form/page.tsx`)**:
  - **1단계 기획 폼**: 카테고리 복수 선택, 주제, 톤, 독자, 글자수, 모델 설정 등 기존 강력한 엔진 유지 + [✨ AI 블로그 글 & 이미지 생성 시작].
  - **2단계 실시간 검토 & 블록 편집기 (`#editor-section`)**:
    - **상단 메타 바**: 총 글자 수 실시간 카운트(공백 포함/제외), [원고 복사], [최종 발행 및 저장], [🧩 네이버 입력기 전송] 액션 배치.
    - **제목 & 요약문 편집**: 인풋/텍스트에어리어에서 클릭 즉시 수정.
    - **대표 이미지 카드**: 썸네일 미리보기, [🔄 대표 이미지 다시 생성], [💾 다운로드], [🔗 URL 복사].
    - **본문 문단 블록 편집기 (Content Block Editor)**:
      - 문단별 소제목(H2) 인풋 및 본문 `textarea` 실시간 편집.
      - 문단별 조작 툴바: [▲ 위로], [▼ 아래로], [🗑️ 문단 삭제].
      - 문단 전용 이미지 카드: [🔄 이 이미지만 다시 생성], [🗑️ 이미지 제거], 미배정 시 [🖼️ AI 이미지 생성] 원클릭 지원.
      - 하단 [➕ 새 본문 문단 추가하기] 버튼.
    - **추천 링크(CTA) & 추천 SEO 태그 카드**: 인라인 편집 및 태그 원클릭 복사.
    - **최종 발행 액션 바**: [💾 최종 발행 및 블로그에 등록] (DB 등록 후 상세 페이지로 이동 링크 제공), [📋 원고 전체 복사], [🧩 네이버 입력기 전송].
    - **고해상도 이미지 모달 뷰어**: 썸네일 클릭 시 풀사이즈 이미지 확대 보기 및 새 탭 열기.
- **동기화**: `utils/version.ts`, DB `programs.version`, 마이그레이션 `0005_bump_version_v1_35.sql`, 크롬 확장 manifest 및 ZIP 자동 갱신.

# 원클릭 본문+이미지 사이사이 자동 배치 & 완성본 통합 뷰어 구축 (2026-10-07, v1.36)

주인님 지시("여기 어떻게 텍스트와 이미지를 동시에 생성하는지 콘텐츠 생성 로직과 이미지를 사이사이 어떻게 넣는지 확인하고 블로그 생성 버튼 누르면 한번에 본문+이미지가 들어가는 구조로 만들어져야 해. 먼저 어떻게 만들어졌는지 구조와 프롬프트, 로직 분석후 다시 작업해"):

- **분석 보고 완료**:
  1. 실시간 뉴스 수집(`collector.ts`) ➔ SEO 본문 JSON 생성(`generator.ts`) ➔ 문단 묶음(`groupParagraphs`) 및 Gemini 2.5 Flash 핵심 문장 추출(`imageGenerator.ts`) ➔ NanoBanana/Gemini 실사 이미지 생성 및 Supabase Storage(`post-images`) 업로드 ➔ 소제목 바로 밑과 요약문 밑에 이미지 마크다운 조립(`imageLine`) ➔ HTML 변환(`mdLiteToHtml`)의 파이프라인과 프롬프트 구조 분석 보고.
  2. 이전 v1.35에서 2단계 분리(생성 후 쪼개진 블록 편집 폼 표시 ➔ 최종 발행 수동 클릭)로 인해 "버튼 누르면 한 번에 본문+이미지가 사이사이에 들어가는 완성형 글이 바로 등록되어야 한다"는 본래 사용성이 저해된 문제 식별.
- **개편 조치 (`app/write/ai-form/page.tsx` & `app/api/auto-post/route.ts`)**:
  - **원클릭 통합 생성 & 즉시 DB 등록**: `[✨ AI 블로그 포스트 생성 및 즉시 등록]` 버튼 클릭 시, 백엔드에서 텍스트 + 1~5장 실사 이미지 생성 + 본문 사이사이 마크다운/HTML 조립 + DB `blog_posts` 및 카테고리 매핑 테이블 저장을 단일 트랜잭션으로 한 번에 완료.
  - **완성본 포스트 뷰어(Article Viewer) 기본 화면 제공**: 분할 입력 폼이 아닌, 실제 블로그 포스팅처럼 제목, 카테고리, 요약문, 대표 썸네일, 소제목 바로 밑에 삽입된 고화질 이미지, 가독성 높은 문단 본문, CTA 추천링크, 해시태그가 사이사이에 완벽하게 배치된 완성형 포스트 뷰가 즉시 시원하게 펼쳐짐.
  - **상단/하단 원클릭 퀵 액션**:
    - [📋 원고 전체 복사] (HTML/텍스트 서식 완벽 복사)
    - [🧩 네이버 입력기 전송] (크롬 확장 자동 입력 큐 즉시 등록)
    - [📖 등록된 글 보기] (새 탭에서 발행 글 즉시 확인)
    - [✏️ 상세 에디터] (`/posts/${postId}/edit` 연동)
    - [🔄 새 글 작성] (원클릭 폼 초기화)
  - **선택형 빠른 내용 수정 탭**: 완성본 미리보기와 빠른 내용 수정(인라인 에디터) 탭을 두어, 필요한 경우 제목/문단을 가볍게 수정하고 `[💾 수정사항 DB 저장]`을 누르면 이미 등록된 게시글이 즉시 `UPDATE` 되도록 구현.
- **동기화**: `utils/version.ts` v1.36, DB `programs.version` v1.36, 마이그레이션 `0006_bump_version_v1_36.sql`.

## 2026-10-09 v1.37 — 확장 다운로드 고정 주소(`-latest.zip`)
- 다운로드 주소를 `/downloads/ai-auto-blog-extension-latest.zip`로 통일했다(빌드가 버전별 ZIP과 함께 `-latest.zip` 사본을 만든다). 설정 화면 버튼·`GET /api/extension/whoami`의 `downloadUrl`·DB `extension_download_url`(마이그레이션 0007)이 같은 주소를 쓴다. 기능·확장 코드 변경 없음(ZIP·manifest만 v1.37).

## 2026-10-10 v1.40 — 자동 입력 작업 큐·결과 저장 확인 (서버, Claude 담당 BLOG 개선 1단계)

주인님 지시: 네이버 블로그 에이전트의 "최종 완성 원고를 확장에 보내면 확장이 발행 직전까지 자동 진행" 방식을 BLOG에 적용(최종 발행 클릭은 자동화하지 않음 — 회원이 직접). 근거·결함 목록: `../docs/BLOG_AUTOMATION_HANDOFF_2026-10-10.md`, `../naver-blog-agent/docs/AUTOMATION_COMPARISON_2026-10-10.md`. **진행 계획(각 단계 독립 릴리스):** v1.40 서버(이 항목) → v1.41 확장 작업기(background worker로 이전·대상 블로그/빈 편집기 확인·정확한 문서 비교·단일 프레임·결과 선보관 재보고) → v1.42 생성(동적 연도·글자수 단위·뉴스 지표 표기).

- **자동 입력 대기 규칙(DB 스키마 변경 없음)**: `extension_handoff_at` 있음 + `naver_input_status` 비어 있음 + 보낸 지 30분 이내 = 대기. 30분이 지난 글은 자동 시작하지 않고 확장 목록에서 직접 시작(오래전 보낸 글이 확장을 켜자마자 갑자기 입력되는 사고 방지). 상수와 허용 상태 이동표: `utils/extensionTask.ts`.
- `POST /api/extension/task`(신규): 확장 작업기가 10초마다 호출. 본인 대기 글 중 가장 오래된 1건을 **대기 조건을 다시 확인하며** `in_progress`로 바꾸고 가져간다(확장 2개가 켜져 있어도 한 곳만 가져감). 응답은 `private, no-store`, DB 오류·예외는 503(내부 내용 미노출).
- `POST /api/extension/posts/[id]/input-result` 강화: DB 오류/예외 503, 내 글 아님·없음 404, 허용되지 않는 상태 이동 409(웹에서 글이 다시 보내진 뒤 늦게 도착한 옛 보고가 새 상태를 덮어쓰지 못함), 읽은 뒤 상태가 바뀌었으면 덮어쓰지 않고 409, 같은 상태 재보고는 최초 시각을 보존하고 성공(응답 유실 뒤 재보고 대비). 성공 응답에 `success`·`persisted`·`postId`·`status`를 명시(확장이 이 값이 맞을 때만 보고 완료 처리 — v1.41). 옛 확장 호환용 `result` 필드는 유지.
- `POST /api/posts/[id]/extension-handoff`: 지금 입력 중(90분 이내)인 글은 다시 보내도 덮어쓰지 않고 409. 응답에 `ok`를 추가(글쓰기 화면 `app/write/ai-form`이 `data.ok`를 확인하는데 이전 응답에는 없어서 보내기가 성공해도 항상 실패로 표시되던 버그 수정)하고 `autoStartMinutes`(30)를 알려줌. 안내 문구(글 보기·글쓰기 화면)를 새 동작으로 변경.
- 검사: `npm run test:extension-api` 19개(실제 route를 메모리 DB로 실행 — 토큰 오류, 가져가기 경쟁·중복 방지, 오래된/입력 중/타인 글 제외, DB 오류·예외 503, 늦은 보고 409, 동시 변경 409, 멱등 재보고, 소유자·진행 중 보호), 기존 `npm run test:security` 39개, `npm run build` 통과.
- **옛 확장(v1.39 이하) 호환**: 새 큐는 옛 확장이 쓰지 않는다. 옛 확장은 기존처럼 목록에서 글을 골라 시작하며 상태 보고 흐름이 모두 허용된다. 자동 시작은 v1.41 확장부터 동작한다(ZIP 재설치 필요).
- **남은 일**: v1.41(확장 작업기), v1.42(생성 개선). 입력 실행 식별자(run id)·선점 임대는 스키마 변경이 필요해 별도 승인 사항으로 남겨 둠. 실제 네이버 입력 E2E는 v1.41 이후 본인 계정 빈 편집기에서 검수.

## 2026-10-10 v1.41 — 확장 작업기 전면 개편: 자동 입력·정확한 문서 비교 (확장, Claude 담당 BLOG 개선 2단계)

**이제 흐름**: 웹에서 최종 검수 → "네이버 입력기로 보내기" → 확장 작업기(background service worker)가 10초마다(30초 알람 보조) 서버 대기 글을 가져가(`POST /api/extension/task`, v1.40) → 본인 블로그 새 글쓰기 탭을 열고 → 제목·본문·이미지·링크 입력 → 매 단계 문서 대조 → 이미지 AI 활용 표시 → 발행 설정창에서 카테고리·태그 → **발행 직전 준비 완료**. 마지막 발행 버튼은 누르지 않는다(회원이 직접). 사이드패널은 연결·블로그 ID·목록·직접 시작/중지·진행 상태·카테고리/태그만 맡고 닫아도 작업은 계속된다.

- **파일 구조(`extension/`)**: `blog-core.js`(순수 규칙: 문서 단위 정확 비교·이미지 파일명·추천 태그·오류 문구), `blog-engine.js`(입력 순서·검증·중지 판단, adapter 인터페이스만 사용), `naver-adapter.js`(탭·프레임·CDP 입력·이미지 업로드·발행 설정), `naver-page.js`(네이버 편집기 화면 안에서 실행되는 명령 `blogEditorCommand`), `background.js`(작업기: 큐 가져가기·결과 보고·재시작 복구·메시지), `sidepanel.js/html`(UI). 크롬 `alarms` 권한 추가, 최소 Chrome 120.
- **안전 규칙(네이버 에이전트 writer.js와 같은 방식)**: ① 시작 전 편집기가 비어 있어야 함 — 내용이 있는 기존 글쓰기 탭은 건드리지 않고 새 탭을 연다(회원이 쓰던 글 보호), 빈 새 글이 2초 이상 안정적일 때만 시작 ② 본인 블로그 ID(사이드패널에 저장) 확인, 다른 계정이면 중지 ③ 한 단계(제목/글/링크/이미지)마다 문서를 다시 읽어 "지금까지 검증된 입력 + 방금 넣은 것"과 **정확히 같은지**(연속 문단 합침, 이미지 위치·개수) 비교 — 예전의 "기대 문구가 문서에 들어 있는지" 검사는 기존 제목 혼합·본문 중복·순서 뒤바뀜을 통과시켰다(`tests/extension-engine.test.cjs`가 재현) ④ 다르면 같은 단계를 **다시 입력하지 않고** 즉시 중지(재시도가 중복을 만든다) ⑤ 바꾸는 명령(포커스·이미지·붙여넣기·설정)은 고른 한 프레임에서만, 읽기 조사만 모든 프레임 ⑥ 이미지 파일명 `blog-img-NN-<지문>.<확장자>`(고유) + 업로드 뒤 이미지가 정확히 늘었는지 확인, 반영 실패 시 재업로드 없이 중지 ⑦ 탭 닫힘·이동·디버거 끊김·사용자 중지는 즉시 중단하고 입력된 내용은 보존.
- **글자 입력 방식은 그대로**: CDP `Input.insertText` 한 글자씩 70~170ms(+가끔 쉼) — 루트 `docs/PLATFORM_PATTERNS.md` §20(봇 탐지 회피) 유지. 에이전트의 execCommand 덩어리 입력으로 바꾸지 않았다(속도·탐지율의 실측 우열이 없고 BLOG는 §20 준수가 기본). 이미지 AI 활용 표시는 에이전트가 실제 화면에서 확인한 스위치를 쓰되, 실패해도 입력은 유지하고 경고로만 알린다.
- **결과 보고**: 서버가 `success·persisted·status`를 확인해 줄 때까지 결과를 `chrome.storage`(`blogPendingResult`)에 보관하고 **보고만** 다시 시도(화면 입력은 절대 재실행하지 않음). 400/404/409는 재시도해도 같으므로 보관을 끝내고 안내만 남긴다. 작업 중 확장이 재시작되면 `EXTENSION_INTERRUPTED`로 실패 보고하고 자동 재입력하지 않는다(입력이 이미 검증·보고된 단계였다면 실패로 바꾸지 않는다). 직접 시작은 서버에 `in_progress`를 먼저 저장 확인한 뒤에만 시작.
- **오류 코드(사이드패널 진행 상태·서버 `naver_input_error`에 `[CODE] 문장`으로 기록)**: EDITOR_NOT_EMPTY, ACCOUNT_MISMATCH, EDITOR_PREPARATION_FAILED(로그인·알림 5분 대기 초과), TITLE_MISMATCH, TEXT_MISMATCH, DOCUMENT_CHANGED, IMAGE_MISMATCH, IMAGE_NOT_APPLIED, LINK_MISMATCH, FINAL_MISMATCH, TAB_CLOSED, TAB_NAVIGATED, CANCELLED, EXTENSION_INTERRUPTED, BLOG_ID_MISSING 등.
- **검사(모두 통과)**: `npm run test:extension` 48개(엔진 23 — 기존 내용·중복·누락·외부 끼어듦·이미지 이중 업로드·링크 중복·중지·탭 닫힘·설정 실패 등 / 작업기 11 — 가져가기·보고 재시도·미확인 응답·409·재시작 복구·수동 시작·이중 시작 거부 / adapter 14 — 새 탭 vs 재사용·계정 불일치·로그인 대기·단일 프레임 실행·디버거 항상 해제·이미지 1회 클릭·태그 검증), `test:extension-api` 19, `test:security` 39, `npm run build`.
- **미검증(반드시 다음에 확인)**: 실제 네이버 편집기 화면 E2E. 이 환경의 브라우저 도구는 네이버 접속이 차단되어 실제 화면에서 `naver-page.js`를 시험하지 못했다 — 선택자는 네이버 블로그 에이전트(v1.60~)와 기존 BLOG 확장이 실제 화면에서 확인한 것만 옮겼지만 화면 단위 검증은 주인님 PC에서 필요하다. 확인 순서: ZIP 설치 → 사이드패널에서 토큰 연결·블로그 ID 저장 → 시험 글(이미지 포함)을 BLOG에서 "보내기" → 확장이 새 탭을 열어 입력하는지, 제목·마지막 문장·이미지 전부·AI 표시·카테고리·태그, 마지막 발행 미클릭 확인. **의심 지점**: `1. 항목`처럼 번호로 시작하는 줄을 네이버가 자동 목록으로 바꿔 글자가 달라지면 TEXT_MISMATCH로 멈춘다(안전하게 중지, 이 경우 해당 줄 처리 방식을 조정).
- **회원 안내**: 옛 확장(v1.40 이하)은 자동 시작을 못 하므로 ZIP 다시 받기 → 기존 폴더에 덮어쓰기 → `chrome://extensions` 새로고침 → 사이드패널에서 **블로그 ID 저장**이 필요하다.
- **남은 일**: v1.42(동적 연도·글자수 단위 통일·뉴스 지표 표기), 실제 네이버 E2E 검수, 실행 식별자(run id)·선점 임대(스키마 변경 필요 — 주인님 승인 사항).

## 2026-10-10 v1.42 — 생성 개선: 당해 연도 기준·글자수 단위 통일·뉴스 점수 정직 표기 (Claude 담당 BLOG 개선 3단계)

- **당해 연도(루트 `CLAUDE.md` 핵심 원칙 8번)**: `utils/yearPolicy.ts`(네이버 에이전트 `src/lib/yearPolicy.ts`와 같은 순수 함수 사본 — 규칙을 바꾸면 양쪽을 같이 고칠 것) + `utils/news/promptRules.ts`의 `buildYearRule()`. 프롬프트에 `new Date().getFullYear()` 기준의 "기준 연도 엄수" 지침(과거 연도로 퇴행 금지, 실제 과거 사실의 연도는 그대로)을 넣고, 주제·키워드의 과거 연도는 올해로 바꿔 뉴스 검색과 생성에 쓴다(`app/api/auto-post/route.ts`). 결과의 제목·소제목·해시태그는 과거 연도를 모두 올해로, 요약·본문은 "최신 정보로 쓰인" 과거 연도만 올해로 바꾸고 출시·발표 같은 과거 사실 연도는 보존(`sanitizeBodyYear`).
- **글자수 단위 통일**: 화면은 "목표 글자수 2,000자"인데 서버가 이 숫자를 "약 2,000단어(공백 제외 약 7,000자 이상)"로 프롬프트에 넣고 규칙 4번에는 "2,000자 이상"을 따로 적어 서로 충돌했다. 이제 단위는 **공백 제외 글자 수** 하나다. `resolveTargetChars()`(800~3,500자, 100자 단위, 기본 2,000), 프롬프트는 "4개 문단 합계 공백 제외 약 N자(N×0.9~1.15 범위), 문단당 약 N/4자, 분량을 채우려고 반복하지 말 것". API는 `targetChars`(새 이름)를 받고 예전 `target_word_count`·`wordCount`도 같은 뜻(글자 수)으로 받는다. 응답(`data`)에 실제 `bodyChars`(공백 제외)와 `targetChars`를 돌려준다.
- **뉴스 지표 표기**(`utils/news/collector.ts`): `signals`는 기사 수·출처 수·키워드 포함 비율로 계산한 **내부 추정값**(SNS 언급량·검색 순위·실제 성과 조회가 아님)임을 타입 주석과 `estimated: true`로 명시, 기사를 못 모았으면 예전처럼 50점을 주지 않고 `hasData:false`·0점·`articleCount:0`. (현재 화면은 이 값을 표시하지 않고 API 응답에만 있다. 화면에 표시할 때는 "추정"이라고 적고 hasData가 false면 "데이터 없음"으로 보여줄 것.)
- 검사: `npm run test:generation` 7개(글자수 정리·단어 지시 제거·연도 지침·주제 연도 보정·생성기 통합: 프롬프트에 올해/글자 지침이 들어가고 제목·소제목·본문의 과거 연도 보정, 과거 사실 보존, 예전 wordCount 호환) + 기존 `test:extension`(48)·`test:extension-api`(19)·`test:security`(39)·`npm run build`·`tsc --noEmit`. 실제 AI 유료 생성(모델이 새 지침을 얼마나 지키는지, 실제 결과 글자 수)은 아직 시험하지 않았다 — 회원 키로 짧은 생성 1회 후 응답의 `bodyChars`와 `targetChars` 비교 필요.
- 확장은 코드 변경 없음(manifest·ZIP 버전만 v1.42로 동기화).

## 2026-10-10 v1.43 — 실행 번호·임대 (DB 칸 2개 추가, 주인님 승인)

문제: `taskId`가 글 번호라서, 웹에서 글을 다시 보낸 뒤 늦게 도착한 **옛 실행의 보고**가 새 실행의 상태를 덮어쓸 수 있었고(v1.40의 "이전 상태" 조건으로 대부분 막았지만 같은 상태 이동은 구별 불가), 입력 중 PC가 꺼지면 90분 동안 다시 보내지 못했다.

- **DB(승인 후 MCP로 운영 적용, 파일 `supabase/migrations/20261010200000_blog_extension_run_lease.sql`)**: `blog_posts.naver_run_id uuid`(실행 번호), `blog_posts.naver_lease_expires_at timestamptz`(임대 만료). 기존 행은 둘 다 null(옛 규칙으로 동작). RLS·권한 변경 없음(서버 관리자 클라이언트만 사용).
- **흐름**: 가져가기(`POST /api/extension/task`) 또는 직접 시작(`POST /api/extension/posts/[id]/start`, 신규)이 서버에서 **새 실행 번호 + 3분 임대**를 만들어 돌려준다 → 확장은 입력하는 동안 45초마다 `POST /api/extension/posts/[id]/heartbeat`(신규)로 임대를 연장 → 모든 결과 보고에 `runId`를 실어 보낸다. 서버는 번호가 지금 실행과 다르면 `409 {superseded:true}`로 거절한다.
- **규칙**: ① 임대가 살아 있는 입력 중 글은 웹에서 다시 보내기·직접 시작 모두 409(`isRunActive`, `utils/extensionTask.ts`) ② 임대가 끝난 입력 중 글(PC 꺼짐·확장 종료)은 다시 보내거나 직접 시작할 수 있다 — **자동으로 대기로 되돌리지는 않는다**(이미 입력·발행됐을 수 있어 회원이 확인해야 함) ③ 웹에서 다시 보내면 실행 번호·임대를 지워 옛 실행의 보고가 거절되게 한다 ④ 하트비트가 409면 확장은 입력을 중지하고 "웹에서 이 글이 다시 보내졌거나 끝난 것으로 처리되어 중지했습니다"를 보여 준다 ⑤ 입력 완료(`completed`) 직후에는 발행 설정 단계 동안 임대를 이어 가고 `publish_ready`·`failed`에서 비운다 ⑥ **옛 확장(번호 없이 보고)은 예전 규칙으로 계속 동작**(번호 없는 `in_progress` 시작은 실행 번호를 비움).
- **확장**: `background.js` — `runId`를 활성 작업·보관 결과·재시작 복구 보고에 모두 포함, 하트비트 타이머(실행이 끝나면 해제), 직접 시작은 `/start` 응답(`runId`)이 와야 시작.
- 검사: `test:extension-api` 32개(번호·임대 생성, 이중 가져가기/시작 1건만, 대체된 실행 보고 409, 임대 연장·종료, 하트비트 소유자·완료·DB 오류, 직접 시작 상태별·살아 있는 실행 거절·만료 후 재시작·경쟁·DB 오류, 다시 보내기 보호·만료 허용·번호 비움, 번호 없는 옛 확장 호환), `test:extension` 50개(하트비트 중 대체 감지 시 입력 중지, 재시작 보고에 번호 포함 추가), `test:security` 39, `test:generation` 7, 빌드.
- **Codex 참고(네이버 블로그 에이전트에 적용할 때)**: 에이전트의 `nba_posts` 선점(`queued→publishing`)에 같은 칸(`run_id`, `lease_expires_at`)을 추가하면 응답 유실·PC 단절 뒤 "무조건 queued로 되돌리지 않고" 안전하게 복구할 수 있다. 상세 제안은 `docs/SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md`.

## 2026-10-10 v1.44 — 입력 완료 크롬 알림

- 입력이 끝나면 크롬 알림으로 알린다: **발행 직전 준비 완료**(`publish_ready`, 확인 전까지 남아 있는 알림), **입력 완료**(`completed`, 카테고리·태그 없음 또는 자동 입력 실패 — 직접 확인 안내), **입력 중단**(`failed`, 사유 120자). 회원이 직접 중지한 경우와 서버가 대체한 실행(하트비트 409)으로 멈춘 경우는 알리지 않는다. 알림을 누르면 그 네이버 글쓰기 탭으로 이동한다(탭이 닫혔으면 아무 일도 하지 않음).
- 크롬 권한 `notifications` 추가(`manifest.json`). 사이드패널 "입력이 끝나면 크롬 알림 받기" 체크(기본 켜짐, 저장 키 `aiAutoBlogNotify`, false면 끔). 알림 생성이 실패해도 입력 결과에는 영향이 없다(`notifyOutcome` 전체 try/catch).
- 코드: `extension/background.js` `notifyOutcome()`·`notifications.onClicked`, `sidepanel.js/html`. 서버 변경 없음.
- 검사: `test:extension` 53개(발행 준비·입력 완료·중단 각각 1회 알림과 클릭 이동, 끄기·중지 시 알림 없음, 닫힌 탭·모르는 알림 클릭 무해) + 기존 전체 통과 + 빌드.
- 회원 안내: ZIP 덮어쓰기 후 `chrome://extensions`에서 새로고침하면 새 권한(알림)이 적용된다. Windows는 Chrome 알림이 "집중 지원/방해 금지" 상태면 보이지 않을 수 있다.

## 2026-10-10 v1.45 — 이미지 업로드 뒤 라이브러리 패널을 팝업으로 오인해 중단하던 문제 수정 (실제 화면 첫 시험에서 발견)

- **첫 실제 시험(주인님 PC, v1.44)**: 확장이 서버에서 글을 가져가 새 글쓰기 탭에서 제목·본문 일부·이미지 1장까지 입력했고, 이미지 뒤 본문을 이어 쓰려는 순간 `편집기 팝업이 열려 있습니다. 팝업을 닫은 뒤 다시 시도하세요.`로 중단됐다(진행 상태 "실패"). 입력된 내용은 보존됐고 중복 입력·발행은 없었다(안전 중지 설계대로).
- **원인**: 이미지를 올리면 네이버가 편집기 오른쪽에 **"라이브러리" 패널**(현재 문서 이미지 목록)을 자동으로 연다. `naver-page.js`의 팝업 판정이 `.se-popup-container` 외에 `[role='dialog'][aria-modal='true']`까지 "입력을 막는 팝업"으로 보았는데, 이 패널이 여기에 걸렸다(에이전트 `editor.js`의 판정을 그대로 옮겼으나 에이전트는 이미지를 올린 뒤 이 경로를 쓰지 않아 드러나지 않음). 기존 BLOG 확장(v1.39 이하)은 팝업 검사 자체가 없었다.
- **수정**: `blockingPopup()` — 제목(`.se-popup-title`) 또는 안내 문구(`.se-popup-alert-text`)가 있는 보이는 `.se-popup-container`만 입력을 막는 팝업으로 본다(임시글 이어쓰기 같은 실제 알림 창). `role=dialog` 패널·라이브러리는 막지 않는다. 막을 때는 팝업 제목을 오류 문구에 함께 보여 준다(원인 파악용). `inspect.dialogOpen`도 같은 판정.
- **시험**: `tests/extension-page.test.cjs`(신규, 가짜 화면으로 `naver-page.js` 실행) 3개 — 라이브러리 패널은 막지 않음(이전 코드에서 실패 확인), 제목 있는 실제 팝업은 막고 이름을 표시, 숨겨졌거나 제목 없는 컨테이너는 막지 않음. `npm run test:extension`에 포함.
- **교훈**: 다른 프로그램에서 "화면에서 확인된" 선택자를 옮겨도, 그 앞 단계(이미지 업로드 등)가 다르면 화면 상태가 달라진다. 실제 화면 한 번의 시험이 모의 시험 131개가 놓친 문제를 찾았다 — 새 단계 조합은 실제 화면으로 확인해야 한다.

## 2026-10-10 v1.46 — 추천 링크가 본문 중간에 붙고 글자로 한 번 더 입력되던 문제 수정 (실제 시험 2차에서 발견)

- **2차 실제 시험(v1.45)**: 팝업 오인은 해결되어 이미지 3장·본문 대부분이 정상 입력됐고, 마지막 추천 링크에서 `링크 입력 결과가 예상과 다릅니다(7번째 글, 더 많은 글자…)`로 안전 중지(중복 발행 없음). 화면에는 링크("👉 추천링크 바로가기")가 **본문 중간**에 걸려 있었고 그 옆에 같은 문구가 글자로 한 번 더 있었다. 원인은 서로 다른 두 가지였다.
  1. **붙여넣기 성공 판정 오류**: `pasteLink`는 붙여넣기를 실행한 프레임의 링크·문구 개수 변화로 성공을 판단했는데, 편집 입력용 프레임과 문서가 표시되는 프레임이 달라 **실제로는 붙여넣기가 성공해도 `{linked:false, inserted:false}`가 돌아왔다**. 엔진이 이를 "무시됨"으로 보고 같은 링크를 `라벨: 주소`로 한 번 더 입력했다. → 이제 엔진이 **편집기 문서(snapshot)의 실제 상태**로 판단한다: 붙여넣기 후 문서가 "기대 + 라벨"과 정확히 같으면 성공(링크 수는 snapshot의 `a[href]`로 셈), 문서가 붙여넣기 전 그대로일 때만(2~6초 기다린 뒤) 글자로 대체 입력, 그 밖의 차이는 중지. `naver-page.js` snapshot에 문단별 `links`, `blog-core.js`에 `countLinks`·`expected.clone()` 추가.
  2. **본문 포커스 위치 오류**: `focus(body)`가 "마지막 이미지 뒤의 **처음 만나는 빈 문단**"을 골랐다. 본문의 문단 사이 빈 줄(`\n\n`)도 빈 문단이라, 링크 앞에서 `focusBody()`를 다시 부르면 커서가 글 한가운데의 빈 줄로 가서 링크가 중간에 들어갔다(예전 확장은 링크 앞에서 포커스를 다시 잡지 않아 드러나지 않음). → 이제 **항상 문서 맨 끝 문단**에 커서를 둔다(이미지 뒤 새 빈 문단도 맨 끝이므로 그대로).
- **시험**: `tests/extension-engine.test.cjs` 27개(붙여넣기는 됐지만 프레임에서 안 보이는 경우를 글자로 다시 넣지 않음 — **이전 엔진에서 실패 확인**, 늦게 반영되는 붙여넣기 인식, 무시된 붙여넣기는 글자로 정확히 1번, `countLinks`), `tests/extension-page.test.cjs` 5개(본문 중간 빈 줄이 있어도 맨 끝 문단에 포커스 — 이전 코드에서 실패 확인). `npm run test:extension` 61개.
- **교훈**: ① 화면이 여러 프레임으로 나뉜 편집기에서 "한 프레임의 개수 변화"로 성공을 판단하지 말고 편집기 문서의 실제 상태로 판단한다 ② 단계마다 커서를 다시 잡는 로직은 "처음 빈 문단" 같은 위치 추측을 쓰지 말고 항상 문서 끝으로 고정한다. 둘 다 모의 시험으로는 드러나지 않고 실제 화면 시험(주인님 PC)으로 찾았다 — 문서 정확 비교 덕분에 잘못된 입력이 한 단계 만에 안전하게 멈춘 점은 설계대로 동작했다.

## 2026-10-10 v1.47 — 추천 링크가 마지막 문단 중간에 들어가던 문제 수정 (실제 시험 3차)

- **3차 실제 시험(v1.46)**: v1.46의 링크 중복 입력은 사라졌고(링크가 한 번만 걸림) 이미지 3장·본문도 정상이었다. 그러나 추천 링크가 **맨 끝이 아니라 마지막 문단 중간(둘째 줄 시작 부근)**에 들어가 문서 비교(`7번째 글, 다른 글자 501번째부터`)가 안전 중지했다. 길이는 같고 순서만 달라 "다른 글자"로 보고됐다.
- **원인**: SmartEditor는 **클릭한 화면 위치**에 커서를 둔다(DOM selection이 아니라 마우스 위치가 기준). v1.41 엔진은 링크·글 블록 앞에서도 매번 `focusBody()`로 마지막 문단을 다시 클릭했고, 클릭 지점은 문단 사각형의 **세로 중앙·왼쪽 8~40px**였다. 여러 줄 문단이면 가운데 줄 왼쪽 끝이 되어 링크가 문단 중간에 들어갔다. 예전 확장은 링크 앞에서 다시 클릭하지 않아 드러나지 않았다.
- **수정**: ① 엔진: 입력 위치를 새로 잡는 때는 **본문 첫 블록(제목 직후)과 이미지 바로 뒤**뿐(`needsFocus`). 글·링크를 입력한 직후에는 커서가 이미 문서 끝에 있으므로 다시 클릭하지 않는다 ② `naver-page.js` `focus(body)`: 마지막 문단에 글이 이미 있으면 클릭하지 않고 `ok:false`(글 중간 입력 방지 안전장치) — 새로 클릭하는 대상은 비어 있는(한 줄) 새 문단뿐.
- **시험**: `tests/extension-engine.test.cjs` 28개(글·링크 뒤 재클릭 없음 — 이전 코드에서 실패 확인), `tests/extension-page.test.cjs` 5개(글이 있는 마지막 문단은 클릭 거부 — 이전 코드에서 실패 확인). `npm run test:extension` 63개.
- **교훈**: SmartEditor의 커서는 클릭 좌표가 결정한다. 여러 줄 문단을 다시 클릭하는 동작은 위치를 바꾼다. 커서를 이미 올바른 곳에 두고 있다면 다시 잡지 않는다(필요한 곳은 비어 있는 새 문단뿐).
