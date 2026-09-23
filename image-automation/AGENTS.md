# image-automation — AI 에이전트 인수인계 문서

이 문서는 `image-automation` 서브프로젝트 전용 개발 지침이다. 상위 지침은 루트 `../AGENTS.md` 및 `../docs/PLATFORM_PATTERNS.md`를 따른다.

## 핵심 규칙
1. **권한 게이트**: 대시보드 및 모든 API 라우트에서 `requireProgramAccess("image-automation")` / `checkProgramAccessApi("image-automation")`를 사용한다.
2. **캐싱 방지 2줄 세트**: 모든 `layout.tsx`, `page.tsx`, `route.ts` 상단에 다음 두 줄을 명시한다.
   ```ts
   export const dynamic = "force-dynamic";
   export const fetchCache = "force-no-store";
   ```
3. **확장형 어댑터 구조**: 신규 플랫폼/모델 추가 시 `lib/providers/registry.ts`에 스키마 정의를 등록하고 `lib/providers/adapters/` 하위에 API 어댑터를 구현한다. UI를 직접 수정하지 않고 스키마 기반 렌더링을 활용한다.
4. **유저 API 키**: `user_api_keys` 공용 테이블에서 `resolveApiKey(user_id, provider)`를 호출하여 유저 키를 조회한다.
