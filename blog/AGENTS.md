<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AIMaster 플랫폼 공통 원칙

blog는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- blog는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug = "ai-auto-blog"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), **쓰기 작업을 하는 모든 API route(`/api/auto-post`, `/api/posts/[id]` PUT·DELETE 등)는 반드시 `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인**한다 (`getSessionUser()`만으로 로그인 여부만 확인하고 끝내지 말 것 — 2026-08-06 감사에서 이 부분이 빠져 있던 것을 발견해 수정함).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만 사용, 앱/운영자 공용 키로 폴백하지 않음 — 2026-08-12 정책, 2026-09-03에 이 서브프로젝트에 남아있던 옛 폴백 로직 제거)을 그대로 쓴다. 본인 키가 없으면 `null`을 반환하니, 호출부는 조용히 실패시키지 말고 "API 키 등록 필요" 안내로 이어가야 한다.
- `blog_posts`/`blog_categories`/`blog_authors`는 현재 사용자별로 격리되어 있지 않고 하나의 공유 블로그로 설계돼 있다 (누가 작성하든 같은 게시판에 게시됨). 이 설계를 바꾸려면(사용자별 개인 블로그로 전환) 먼저 사용자와 상의할 것 — 스키마/RLS 전면 변경이 필요한 큰 결정이다.

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
- 남은 과제: 이미지 저장이 아직 Cloudinary(회원 설정) 또는 본문 base64다. 루트 `CLAUDE.md`의 "AI 이미지는 Supabase Storage" 규칙에 맞추는
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
- `blog/utils/version.ts`의 `APP_VERSION`을 새로 만들고, 사이드바(`app/_components/BlogSidebar.tsx`) 제목 밑에 표시한다. **수정할 때마다 이 파일과
  DB `programs.version`(slug `ai-auto-blog`)을 같이 올릴 것.**

# 독립 배포 분리 (2026-10-01, 프로그램 버전 v1.06)

주인님 지시("BLOG만 왜 www.buylife.xyz/blog 고유 주소를 쓰나 — 다른 프로그램처럼 분리하고, 메인 카탈로그에 교체 등록해 새 배포를 본 프로그램으로 쓰자")로
루트 앱 내장을 없애고 **자체 Vercel 프로젝트 `ai-auto-blog`** 로 배포한다.

- **주소**: https://ai-auto-blog-one.vercel.app (`ai-auto-blog.vercel.app`은 이미 다른 사람 것이라 `-one` 별칭이 붙음).
  `programs.app_url`도 이 주소로 바꿨다(메인 카탈로그 교체 등록). 루트 `next.config.mjs`가 예전 `/blog`, `/blog/:path*` 주소를 같은 경로의 새 주소로 넘긴다.
- **배포**: `cd blog && npx vercel deploy --prod --yes --scope buylife` (`.vercel/project.json`이 `ai-auto-blog`에 연결됨).
  `vercel.json`의 `framework: nextjs`는 지우지 말 것(없으면 전 페이지 404). 루트 앱 배포에서는 `.vercelignore`의 `/blog`로 이 폴더를 뺀다.
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
- **원인**: Vercel 환경변수를 `blog/.env.local`에서 옮겼는데, 그 파일에는 **BLOG를 처음 만들 때 쓰던, 지금은 없어진 Supabase 프로젝트 주소**
  (`rjjtjakljjxsgjelqgek`)가 남아 있었다. 루트에 내장돼 있던 동안은 루트의 공용 DB 설정값을 써서 드러나지 않았다.
  서버 로그: `getaddrinfo ENOTFOUND rjjtjakljjxsgjelqgek.supabase.co`.
- **수정**: Vercel(ai-auto-blog, production/preview)의 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 루트 `.env.local`의
  공용 DB(`esgxyikcnnvmlhygjkth`) 값(`NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`)으로 교체. 로컬 `blog/.env.local`도 같은 값으로 맞춤.
  배포된 화면 코드에 공용 DB 주소만 들어 있는 것 확인.
- 로그인 화면 문구 정리: 버튼 "세션 인증" → "로그인", 부제 "모든 빌드를 위한 정밀한 환경." → "AIMaster 계정(이메일·비밀번호)으로 로그인하세요.",
  로그인 완료 문구 "세션이 정상적으로 인증되었습니다." → "로그인되었습니다.". DB 연결 실패 시 "fetch failed" 대신
  "로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."를 보여준다(`app/auth/actions.ts`).
