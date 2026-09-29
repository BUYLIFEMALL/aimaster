<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AIMaster 플랫폼 공통 원칙

threads는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- threads는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug = "auto-threads-posting"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), API route는 반드시 redirect 대신 결과 객체를 반환하는 방식으로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블은 `user_id` + RLS owner-only 정책으로 격리한다 (`posts`, `threads_accounts`, `user_api_keys` 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만 사용, 앱/운영자 공용 키로 폴백하지 않음 — 2026-08-12 정책, 2026-09-03에 이 서브프로젝트에 남아있던 옛 폴백 로직 제거)을 그대로 쓴다. 본인 키가 없으면 `null`을 반환하니, 호출부는 조용히 실패시키지 말고 "API 키 등록 필요" 안내로 이어가야 한다.
- **Threads OAuth도 2026-09-16부터 BYOK로 전환됨**: 예전엔 `THREADS_APP_ID`/`THREADS_APP_SECRET` 환경변수(앱 공용 Meta 앱)로 OAuth를 했으나, 그 Meta 앱이 Development 모드라 앱의 Tester로 등록된 계정(운영자 본인)만 연결할 수 있는 문제가 있었다. `threads-comment-reply`와 동일하게, 회원마다 본인이 만든 Meta 앱의 Threads App ID/Secret을 설정 페이지에서 `user_api_keys`(2026-09-28부터 `threads_app_id`/`threads_app_secret` — 인스타 프로그램의 `meta_app_*`와 분리)에 등록하고 `resolveApiKey()`로 조회해서 쓰는 방식으로 바꿨다(`src/lib/threads/client.ts`가 `appId`/`appSecret`을 파라미터로 받음). `THREADS_APP_ID`/`THREADS_APP_SECRET` env var 자체는 Vercel에 남아있지만 코드에서는 더 이상 읽지 않는다. `threads-affiliate-poster`도 이 프로젝트의 옛 공용 앱 방식을 재사용하고 있었는데 같은 이유로 함께 BYOK로 전환됐다.

## 2026-09-29 수정 기록 (다른 CLI 인수인계용)

- **카테고리 저장 버그 수정**: `0004_threads_categories.sql`이 운영 DB에 적용되지 않아, 코드가 카테고리 JSON(`CAT_JSON:`)과
  글감→카테고리 매핑(`CAND_MAP_JSON:`)을 `user_api_keys`의 `openai`/`perplexity`/`meta_app_*` 행에 덮어쓰고 있었다.
  0004 적용 + `0005_restore_categories_from_api_keys.sql`로 카테고리 4개·매핑 29건을 제자리로 복원하고 오염 행 삭제,
  `src/lib/actions/categories.ts`/`candidates.ts`의 대체 저장 코드를 제거했다. **`user_api_keys`에는 API 키만 저장할 것.**
  관리자(gmail) 계정의 OpenAI·Perplexity 키는 덮어써져 복구 불가 → 주인님이 나중에 재등록 예정.
- Threads 앱 ID/시크릿 provider를 `threads_app_id`/`threads_app_secret`로 분리(인스타 `meta_app_*`와 덮어쓰기 충돌 해결).
- `/api/posts/dispatch-scheduled`에 `force-dynamic` + `force-no-store` 추가.
- 글감 등 대시보드 페이지의 `requireUser()`는 위반이 아니다 — `(dashboard)/layout.tsx`가 `requireProgramAccess()`로 게이트한다.
