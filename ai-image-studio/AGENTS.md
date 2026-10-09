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
- 대시보드 첫 화면과 메타 설명은 프로그램 상세 설명과 동일하게 `OpenAI GPT Image, Google Gemini(Nano Banana), FLUX.2, Z-Image`로 표기한다. 현재 버전은 `v1.06`.


## 권한 표준화 — 로그인 필수·본인 키만·공유 프롬프트는 관리자만 (2026-10-09, v1.06)

최상위 규칙(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`)에 맞춰 `lib/access.ts`를 다른 프로그램과 같은 표준으로 되돌렸다.

- **예전(2026-09-23 `f93a0b7b` "게스트 즉시 열람 허용")**: 비로그인 방문자를 하드코딩된 회원(`buylifemall@naver.com` 테스트 계정)으로 간주, `checkProgramAccessApi()`가 인증·권한 확인 없이 항상 허용, `getUserApiKey()`가 본인 키가 없으면 **아무 회원의 키**를 사용, 공유 추천 프롬프트 쓰기 API에 관리자 확인 없음.
- **지금**: `requireUser`는 비로그인이면 `/login?redirect=<원래 경로>`로 보낸다(`middleware.ts`가 `x-pathname` 헤더를 실어줌). `requireProgramAccess`/`checkProgramAccessApi`는 로그인 + 이용 권한을 `createAdminClient()`로 판정하고, API는 401/403 JSON을 돌려준다. `getUserApiKey`는 **로그인한 회원 본인의 키만**(없으면 null → "API 키 등록 필요" 안내). `checkAdminApi`(= 이용 권한 + 관리자)를 `/api/prompts` POST·PUT·DELETE와 `/api/prompts/seed`에 적용, `GET /api/prompts`도 로그인 필요(응답의 `canEdit`으로 화면이 관리자에게만 추가·수정·삭제·초기 주입 버튼을 보여준다).
- 로그인 화면은 `app/login`(AIMaster 같은 계정, 회원가입은 메인 사이트). 도메인이 달라 세션이 메인 사이트와 공유되지 않으므로 이 프로그램에서 한 번 로그인해야 한다(다른 독립 배포 프로그램과 같음). 사이드바 로그아웃은 이 앱의 세션을 끊고 `/login`으로 간다. 시험은 `buylifemall@naver.com`으로 실제 로그인해서 한다.
- 점검용 코드 `lib/checkFlux2Max.ts`(아무 회원의 replicate 키를 읽던 미사용 코드)를 삭제했다.
- 테스트: `npm run test:access`(메모리 DB — 비로그인 401, 이용 권한, 관리자 전용, 타인 키 폴백 없음, 소스에 게스트 우회 재발 방지).
- **남은 문제(별도 처리 필요)**: `lib/supabase/server.ts`에 관리자 서비스 키가 base64로 소스에 박혀 있고(`DEFAULT_SERVICE_ROLE_KEY`), `scripts/test-flux-pipeline.mjs`에도 있다. 이 프로젝트의 Vercel에는 환경변수가 하나도 없어 지금은 그 박힌 키로만 DB에 접근한다. 키를 새로 발급해 Vercel `SUPABASE_SERVICE_ROLE_KEY`로 등록한 뒤 코드의 기본값을 지워야 한다(순서를 지키지 않으면 서비스가 멈춤). 기록: `docs/ERROR_LESSONS.md` 최상단.

### 배포 주의 — 운영 주소는 자동으로 새 배포를 가리키지 않는다 (2026-10-09)

- `vercel deploy --prod`를 해도 `https://ai-image-studio.vercel.app`(= `programs.app_url`)은 **이전 배포에 그대로 남는다**(새 배포에는 `-swart`·`-buylife` 주소만 붙음). v1.06 배포 직후 운영 주소가 이전 코드를 계속 서비스한 것을 확인했다.
- 배포 후 반드시 `vercel alias set <새 배포 주소> ai-image-studio.vercel.app --scope buylife`로 운영 주소를 옮기고, 읽기 요청(예: `GET /api/user-keys`가 401, `/login`이 200)으로 새 코드가 서비스되는지 확인한다.
- 검증용 요청으로 `POST`(쓰기) API를 두드리지 않는다 — 이전 코드가 살아 있으면 실제로 실행된다(`/api/prompts/seed`가 비로그인으로 실행되어 `style_preset_prompts`에 160행이 들어간 사고, 아래 참고).
