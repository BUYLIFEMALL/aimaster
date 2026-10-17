# image-automation (AI Image Studio) — AI 에이전트 인수인계 문서

이 문서는 `image-automation` (`ai-image-studio`) 서브프로젝트 전용 개발 지침이다. 상위 지침은 루트 `../AGENTS.md` 및 `../docs/PLATFORM_PATTERNS.md`를 따른다.

## 개발 및 아키텍처 규칙
1. **권한 게이트**: 대시보드 및 모든 API 라우트에서 `requireProgramAccess("image-automation")` / `checkProgramAccessApi("image-automation")`를 사용한다.
2. **캐싱 방지 2줄 세트**: 모든 `layout.tsx`, `page.tsx`, `route.ts` 상단에 다음 두 줄을 명시한다.
   ```ts
   export const dynamic = "force-dynamic";
   export const fetchCache = "force-no-store";
   ```
3. **확장형 어댑터 구조**: 신규 플랫폼/모델 추가 시 `lib/providers/registry.ts`에 스키마 정의를 등록하고 `lib/providers/adapters/` 하위에 API 어댑터를 구현한다. UI를 직접 수정하지 않고 스키마 기반 렌더링을 활용한다.
4. **유저 API 키**: `user_api_keys` 공용 테이블에서 `resolveApiKey(user_id, provider)`를 호출하여 유저 키를 조회한다. Replicate 기반 모델(FLUX 2.0, Z-Image, Seedream, Ideogram)은 provider `replicate` API 키(`r8_...`)를 원천으로 공유하여 호출한다.

## 지원 모델 및 레퍼런스 (2026-09-24 최신화)
- **Recraft (Vector SVG & Design Graphic)**: `recraft-ai/recraft-v4.1`, `recraft-ai/recraft-v4.1-svg`, `recraft-ai/recraft-v3`, `recraft-ai/recraft-v3-svg` (Replicate OpenAPI 스키마 직대조 완료, pure SVG 벡터 생성으로 Figma/Illustrator 레이어 편집 지원, 실측 HTTP 201 Created & succeeded 검수 완료).
- **Ideogram (Typo & Text Special)**: `ideogram-ai/ideogram-v4-quality`, `ideogram-ai/ideogram-v4-balanced`, `ideogram-ai/ideogram-v4-turbo`, `ideogram-ai/ideogram-character`, `ideogram-ai/ideogram-v3-turbo`, `ideogram-ai/ideogram-v2-turbo`, `ideogram-ai/ideogram-v2` (Replicate OpenAPI 스키마 직대조 완료, 오타 극복 타이포그래피 특화, 캐릭터 일관성 `character_reference_image`, `enable_copyright_detection` 제어, 실측 HTTP 201 Created 검수 완료).
- **ByteDance Official Seedream**: `bytedance/seedream-5-pro`, `bytedance/seedream-5-lite`, `bytedance/seedream-4.5` (Replicate OpenAPI 스키마 직대조 완료, 1K/1.5K/2K/3K/4K, 레이어 분해 `layer_decomposition`, 연작 생성 `sequential_image_generation`, `max_images` 1~15 지원, 실측 엔드포인트 검수 통과).
- **Black Forest Labs FLUX 2.0**: `black-forest-labs/flux-2-dev`, `flux-2-max`, `flux-2-pro`, `flux-2-flex`.
- **Alibaba Z-Image**: `prunaai/z-image-turbo`.
- **OpenAI / Gemini / Stability AI**: DALL-E 3, Nanobanana 등.

## 프롬프트 생성 엔진 및 관리자 카테고리 연동 (2026-09-25 업데이트)
1. **make.com Nanobanana Photorealism 규격**:
   - `app/api/enhance-prompt/route.ts`에 make.com Nanobanana 전용 포토리얼리즘 프롬프트 엔진 적용.
   - 단일 영문 문장 규격 (`Create a sense of adventure, courage, and realism with - the landscape of...`).
   - 모든 인물은 `realistic Korean / East Asian` 기본 지정.
   - 카메라 메타데이터 (`Sony A7R IV`, `50mm/35mm/85mm prime`, `f/1.8~f/2.8`, `ISO 100-400`, `WB 5200-5600K`, `shallow depth of field`).
   - 3종 조명 프리셋 (Outdoor Daylight, Indoor/Lab, Night/Neon).
   - 필수 포토리얼리즘 보강키 블록 (`photorealistic, real-world photography, physically plausible lighting and materials...`) 및 네거티브 차단 블록 (`no illustration, no painting, no vector...`) 100% 자동 결합.
2. **애니메이션 & 화풍 프리셋 연동 (Pixar 3D, Studio Ghibli, 일본 2D 극장판)**:
   - `pixar_3d` (픽사 3D 애니메이션): Disney/Pixar 3D 캐릭터, 입체 볼류메트릭 조명, Cinema 4D Octane 렌더 감성.
   - `ghibli_anime` (지브리 감성 애니): 미야자키 하야오풍 수채화 배경, 뭉게구름, 따뜻하고 몽환적인 감성.
   - `japanese_anime` (일본 2D 극장판 애니): 신카이 마코토 / 교토 애니메이션풍 극장판 2D 애니 screencap, 화려한 광원과 렌즈 플레어.
3. **관리자 프롬프트 추천 연동 (admin/prompts)**:
   - 프로그램 선택 변경 시 드롭다운 카테고리가 해당 프로그램의 카테고리 목록으로 연동되며, 카테고리가 `all`(전체 카테고리)로 자동 리셋되어 빈 결과 화면 출력을 방지함.
   - `app/api/prompts/seed/route.ts` 및 UI 태그 맵에 픽사 3D 10종, 지브리 애니 10종, 일본 2D 애니 10종 등 각 화풍별 10개 완벽 데이터 동기화.

## 카탈로그 썸네일 설명 (2026-10-04)

- `programs.short_desc`: `GPT Image·Gemini·FLUX.2·Z-Image 등 다양한 AI 엔진으로 1~10장 연속 생성과 세부 옵션 설정을 지원합니다.`
- 카탈로그 카드가 두 줄로 자르는 구조이므로, 상세 모델명과 프리미엄 소개는 `description`에만 둔다.
- 대시보드 첫 화면과 메타 설명은 프로그램 상세 설명과 동일하게 `OpenAI GPT Image, Google Gemini(Nano Banana), FLUX.2, Z-Image`로 표기한다. 현재 버전은 `v1.07`.


## 권한 표준화 — 로그인 필수·본인 키만·공유 프롬프트는 관리자만 (2026-10-09, v1.06)

최상위 규칙(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`)에 맞춰 `lib/access.ts`를 다른 프로그램과 같은 표준으로 되돌렸다.

- **예전(2026-09-23 `f93a0b7b` "게스트 즉시 열람 허용")**: 비로그인 방문자를 하드코딩된 회원(`buylifemall@naver.com` 테스트 계정)으로 간주, `checkProgramAccessApi()`가 인증·권한 확인 없이 항상 허용, `getUserApiKey()`가 본인 키가 없으면 **아무 회원의 키**를 사용, 공유 추천 프롬프트 쓰기 API에 관리자 확인 없음.
- **지금**: `requireUser`는 비로그인이면 `/login?redirect=<원래 경로>`로 보낸다(`middleware.ts`가 `x-pathname` 헤더를 실어줌). `requireProgramAccess`/`checkProgramAccessApi`는 로그인 + 이용 권한을 `createAdminClient()`로 판정하고, API는 401/403 JSON을 돌려준다. `getUserApiKey`는 **로그인한 회원 본인의 키만**(없으면 null → "API 키 등록 필요" 안내). `checkAdminApi`(= 이용 권한 + 관리자)를 `/api/prompts` POST·PUT·DELETE와 `/api/prompts/seed`에 적용, `GET /api/prompts`도 로그인 필요(응답의 `canEdit`으로 화면이 관리자에게만 추가·수정·삭제·초기 주입 버튼을 보여준다).
- 로그인 화면은 `app/login`(AIMaster 같은 계정, 회원가입은 메인 사이트). 도메인이 달라 세션이 메인 사이트와 공유되지 않으므로 이 프로그램에서 한 번 로그인해야 한다(다른 독립 배포 프로그램과 같음). 사이드바 로그아웃은 이 앱의 세션을 끊고 `/login`으로 간다. 시험은 `buylifemall@naver.com`으로 실제 로그인해서 한다.
- 점검용 코드 `lib/checkFlux2Max.ts`(아무 회원의 replicate 키를 읽던 미사용 코드)를 삭제했다.
- 테스트: `npm run test:access`(메모리 DB — 비로그인 401, 이용 권한, 관리자 전용, 타인 키 폴백 없음, 소스에 게스트 우회 재발 방지).
- **(v1.07에서 해결 — 아래 참고)** ~~`lib/supabase/server.ts`에 관리자 서비스 키가 base64로 소스에 박혀 있었다.~~ 이 프로젝트의 Vercel에는 환경변수가 하나도 없어 지금은 그 박힌 키로만 DB에 접근한다. 키를 새로 발급해 Vercel `SUPABASE_SERVICE_ROLE_KEY`로 등록한 뒤 코드의 기본값을 지워야 한다(순서를 지키지 않으면 서비스가 멈춤). 기록: `docs/ERROR_LESSONS.md` 최상단.

### 배포 주의 — 운영 주소는 자동으로 새 배포를 가리키지 않는다 (2026-10-09)

- `vercel deploy --prod`를 해도 `https://ai-image-studio.vercel.app`(= `programs.app_url`)은 **이전 배포에 그대로 남는다**(새 배포에는 `-swart`·`-buylife` 주소만 붙음). v1.06 배포 직후 운영 주소가 이전 코드를 계속 서비스한 것을 확인했다.
- 배포 후 반드시 `vercel alias set <새 배포 주소> ai-image-studio.vercel.app --scope buylife`로 운영 주소를 옮기고, 읽기 요청(예: `GET /api/user-keys`가 401, `/login`이 200)으로 새 코드가 서비스되는지 확인한다.
- 검증용 요청으로 `POST`(쓰기) API를 두드리지 않는다 — 이전 코드가 살아 있으면 실제로 실행된다(`/api/prompts/seed`가 비로그인으로 실행되어 `style_preset_prompts`에 160행이 들어간 사고, 아래 참고).

## 서비스 키 소스 내장 제거 (2026-10-09, v1.07)

- `lib/supabase/server.ts`의 `createAdminClient()`가 `SUPABASE_SERVICE_ROLE_KEY` 환경변수만 쓴다(없으면 시작 실패). 예전의 base64 내장 키(`DEFAULT_SERVICE_ROLE_KEY`)와 `NEXT_PUBLIC_…SERVICE_ROLE_KEY` 폴백을 삭제했고, `scripts/test-flux-pipeline.mjs`·`inspect_flux2_max.mjs`의 내장 키도 제거했다. Vercel `ai-image-studio`에는 새 키를 환경변수로 등록했다(production·preview).
- 이 키는 공개 저장소에 올라가 있던 공용 키라 교체했다(전체 경위·절차: 루트 `docs/ERROR_LESSONS.md` "서비스 키가 공개 저장소에 올라가 있었다"). **배포 후 운영 주소를 새 배포로 옮겨야 한다**(위 "배포 주의" 참고).
- v1.08 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.09 (ai-image-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.10 (Claude Code 윈도우)
- 새 주소 `https://ai-image-studio.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 / → /dashboard 재로그인 없이 열림(시험 계정 표시), 옛 주소 화면 → 새 주소
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-17 v1.11 — 구글 이미지 모델 최신 정식 교체 + 이미지 레퍼런스 프로그램 지정 (Claude Code 윈도우, 주인님 승인)
- **이 프로그램은 이미지 자동화의 레퍼런스(기준) 프로그램이다**(주인님 지시, 루트 `CLAUDE.md` 「이미지 생성 레퍼런스 규칙」). 최신 모델은 여기 먼저 구현·유지하고 다른 프로그램은 `lib/providers/adapters/*.ts`의 로직·프롬프트·모델·엔드포인트를 참고한다.
- 발견: 구글 모델 4개가 종료·구형 모델을 쓰고 있었음 — 2-2K·Standard → `gemini-2.5-flash-image`(공식 가격표 2026-10-02 종료 예정 구형, 화면 설명은 "Gemini 3.1 Flash"로 실제와 다름), Pro·2-4K → `gemini-3-pro-image-preview`(2026-06-25 종료 예정 미리보기판).
- 교체(`lib/providers/adapters/gemini.ts`): 2-2K(추천) → `gemini-nano-banana-2.1` 기본 2K, 2-4K → `gemini-nano-banana-2.1` 4K, Pro → `gemini-3-pro-image`(정식) 기본 4K(기존 동작 유지), Standard → `gemini-3.1-flash-lite-image` 1K 고정. 모델별 허용 화질(`sizes`) 밖의 값은 기본 화질로. 화면 설명(`registry.ts`)을 실제 모델명으로.
- 가격(1장, 2026-10-17 공식 가격표): nano-banana-2.1 1K $0.0336·2K $0.0504·4K $0.113 / 3-pro-image 1K·2K $0.134·4K $0.24 / 3.1-flash-lite-image 1K $0.0336. 모든 이미지 모델 무료 등급 없음.
- 검수: tsc·build, 배포·DB v1.11. **유료 시험 3회**(시험 계정 본인 Gemini 키, 전부 1K·16:9·1장, 합계 약 $0.20): nano-banana-2.1 200·1376×768·18초 / 3.1-flash-lite-image 200·1376×768·7초 / 3-pro-image 200·1376×768·22초(상위 모델 — 모델 이름·요청 형식 확인 목적 1회), 모두 저장소 저장 정상, 눈으로 확인(한국 포장마차, 인물 한국인). 시험 이미지 3장은 시험 계정 갤러리에 남음.
- 다른 제공사(OpenAI·Replicate FLUX 2·Stability) 모델 이름 유효성은 이번에 확인하지 않음(다음 점검).
- 플랫폼 전체: 구형 이미지 모델 이름을 쓰는 프로그램 44곳 — 목록·순서는 루트 [`docs/IMAGE_MODEL_AUDIT_20261017.md`](../docs/IMAGE_MODEL_AUDIT_20261017.md).
