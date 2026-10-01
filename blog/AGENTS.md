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
- **정리 작업**: `app/api/cron/cleanup-images/route.ts`. Vercel Cron(`blog/vercel.json`, `0 18 * * *` = 매일 한국 시간 03:00)이 호출한다.
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
