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
