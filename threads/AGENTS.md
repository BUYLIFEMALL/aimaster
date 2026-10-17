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
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (auto-threads-posting)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://auto-threads-posting.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 /settings 재로그인 없이 열림(시험 계정 표시), 옛 주소 화면 308. **OAuth 콜백**: 옛 주소 /api/threads/callback으로 돌아오면 같은 쿼리로 새 주소에 307(시험 요청으로 확인) → 새 주소에서 토큰 교환, redirect_uri는 환경변수(옛 주소) 그대로라 회원 Meta 앱 설정 변경 불필요. 설정 화면의 콜백 주소 안내도 옛 주소 그대로 표시 확인(바꾸면 안 됨). 실제 Threads 계정 연결은 회원 앱이 필요해 미시험
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.08 — 옛 vercel.app 삭제 대비 두 주소 지원 (Claude Code 윈도우)
- 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md`(기준 구현 threads-comment-reply v1.08). `src/lib/oauthRedirect.ts`(SITE_ORIGIN=auto-threads-posting.buylife.xyz·`THREADS_REDIRECT_OLD()`=환경변수 `THREADS_REDIRECT_URI`(옛 `threads-nu-dusky.vercel.app`)·`THREADS_REDIRECT_FOR(mode)`).
- 기본 연결은 옛 콜백, 설정 화면 [새 주소로 (다시) 연결](`connectThreadsAccountNewCallbackAction`)은 새 콜백. 옛 주소 307에 via=old, 교환은 via로 선택, 연결 후 이동 SITE_ORIGIN. 설정 화면 두 콜백 주소 표시. `getThreadsAuthorizeUrl(state, appId, redirectUri)`·`exchangeCodeForToken(..., redirectUri)`, 미사용 `getEnv` 제거.
- 검수: 빌드·배포, 옛 콜백 → via=old 307, 새 콜백 → /login, 시험 계정 [새 주소로 다시 연결] → Meta "리디렉션 URI 화이트리스트에 없음"(새 콜백 전송 확인).

## 2026-10-17 v1.09 — 등록 주소 한눈에 보기·복사 버튼 (Claude Code 윈도우)
- 주인님 요청(INSTA 포스팅 v1.14와 같은 형식): 설정 화면 맨 위 `ThreadsMetaAddressSummary`(① 앱 도메인 `buylife.xyz`+옛 호스트 ② 이용 사례 › Threads API 액세스 › 설정 › 리디렉션 콜백 URL 새·옛 ③ Threads 앱 ID 위치 ④ Threads 테스터 추가·초대 수락). `src/components/settings/CopyAddress.tsx`(복사 버튼)로 콜백 주소 표시 교체.
- 같은 날 주인님이 Meta 앱에 새 콜백 등록 → 관리자 계정 [새 주소로 다시 연결] 성공(만료됐던 토큰 재발급, 만료 2026-12-15).
- 검수: 빌드·배포·DB v1.09, 크롬에서 카드·복사 버튼 표시 확인.
## 2026-10-17 v1.10 — 주소 카드에 제거·삭제 콜백 안내 (Claude Code 윈도우)
- 쇼핑제휴 `/api/threads/uninstall`·`/delete` 처리기(`threads-affiliate-poster/src/lib/threads/signedRequest.ts`)가 이 프로그램의 `threads_accounts`도 정리하는 것을 확인 → 카드 ③에 그 주소를 안내. 카드 컴포넌트는 쇼핑제휴판과 동일하게 맞춤(앱 도메인은 실제 주소에서 계산).
- 검수: 빌드·배포·DB v1.10, 크롬에서 제거 콜백 주소·사이드바 v1.10 확인.
## v1.11 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/ai/generator.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.12 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (2단계 SNS 생성기 묶음, Claude Code 윈도우)
- `src/lib/ai/generator.ts`의 모델 목록·호출 코드를 공용 사본으로 교체.
- 통합 값: 1K=`gemini-3.1-flash-lite-image`, 2K·4K=`gemini-nano-banana-2.1`, Pro=`gemini-3-pro-image`(온도 0.4). 개선: 키 머리글 전송, 시간 제한, 서버 오류·혼잡 1회 재시도, 모든 조각 탐색, 안전 차단·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·한국인 지시문·비율·기본 등급(`GEMINI_IMAGE_MODEL` 환경변수 포함)은 그대로.
- 이 프로그램에서 바뀐 값: 1K → flash-lite, Pro 모델 `nano-banana-2.1` → `3-pro-image`(가격 오름).
- 검수: tsc·eslint 0, build, 배포·DB(`auto-threads-posting`) v1.12. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`(호출)·`nanoBananaModels.ts`(등급별 모델)는 공용 기준 코드 `gemini-image-client`·`gemini-image-models`의 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.13 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.14 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.15 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.16 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).
