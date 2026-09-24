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
4. **유저 API 키**: `user_api_keys` 공용 테이블에서 `resolveApiKey(user_id, provider)`를 호출하여 유저 키를 조회한다. Replicate 기반 모델(FLUX 2.0, Z-Image, Seedream)은 provider `replicate` API 키(`r8_...`)를 원천으로 공유하여 호출한다.

## 지원 모델 및 레퍼런스 (2026-09-24 최신화)
- **ByteDance Official Seedream**: `bytedance/seedream-5-lite`, `bytedance/seedream-4.5` (Replicate OpenAPI 스키마 직대조 완료, 2K/3K/4K, 연작 생성 `sequential_image_generation`, `max_images` 1~15 지원, 실측 엔드포인트 검수 통과).
- **Black Forest Labs FLUX 2.0**: `black-forest-labs/flux-2-dev`, `flux-2-max`, `flux-2-pro`, `flux-2-flex`.
- **Alibaba Z-Image**: `prunaai/z-image-turbo`.
- **OpenAI / Gemini / Stability AI**: DALL-E 3, Nanobanana 등.
