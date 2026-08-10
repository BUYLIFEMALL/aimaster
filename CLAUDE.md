# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

- 답변은 기술 용어(API, RLS, 파일 경로, 함수명, 라이브러리명 등)를 제외하고 한글로 작성한다.
- 전달 내용은 비전문가도 이해하기 쉽게, 쉬운 한글 표현으로 풀어서 설명한다. 불가피하게 기술/전문 용어를 쓸 때를 제외하면 어려운 표현이나 번역체를 피한다.
- 이 지침은 루트 AIMaster뿐 아니라 threads, blog, shots 등 모든 서브프로젝트 작업에도 동일하게 적용되는 메인 지침이다. 각 서브프로젝트의 CLAUDE.md/AGENTS.md는 이 파일을 함께 읽도록 안내한다.

## 작업 자율성 지침

- 작업 도중 사소한 선택이나 구현 방식은 재질문하지 말고 합리적으로 판단하여 진행한다.
- 기존 프로젝트의 코드 구조, 디자인, 명명 규칙을 우선하여 따른다.
- 필요한 파일 생성, 코드 수정, 패키지 설치, 테스트 및 오류 수정까지 연속해서 수행한다.
- 하나의 작업이 끝날 때까지 중간 확인을 최소화한다.
- 선택지가 여러 개이면 유지보수성, 안정성, 보편성을 기준으로 가장 적합한 방법을 선택한다.
- 비밀번호나 API 키가 필요한 경우, 비용이 발생하는 경우, 실제 데이터 삭제, 배포, Git Push처럼 외부에 영향을 주는 작업만 질문한다.
- 작업 완료 후 변경사항, 테스트 결과, 남은 문제만 정리해서 보고한다.

## Reusable Patterns

- 카테고리 블록 노출, AI 3종 콘텐츠 수집(HTTP/RSS/Perplexity), SNS 게시글 AI 생성 프롬프트 규격, 이메일(SMTP) 발송, 삭제 버튼 처리중 표시 등 여러 서브프로젝트에서 재사용 가능한 패턴과 트러블슈팅은 [`docs/PLATFORM_PATTERNS.md`](docs/PLATFORM_PATTERNS.md)에 정리되어 있다. 새 프로그램을 만들거나 비슷한 기능이 필요하면 먼저 이 문서를 확인할 것.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint check
```

## Architecture

**AI Master** — 마케팅 자동화 프로그램 판매 사이트

Stack: Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase + 페이앱(Payapp)

### Platform-hub 구조 (서브프로젝트 원칙)
- threads, blog 등 각 자동화 프로그램은 별개의 독립 프로젝트가 아니라, **AIMaster 저장소 하나 안의 서브폴더(서브프로젝트)**로 개발·관리한다.
- **앞으로 새로 추가하는 프로그램도 동일하게 AIMaster 안의 서브폴더(예: `AIMaster/<프로그램명>/`)로 만든다.** 별도 git 저장소를 새로 만들지 않는다.
- 각 서브프로젝트는 자체 `package.json`/`node_modules`/`tsconfig.json`과 자체 Vercel 배포(별도 프로젝트로 build & deploy)를 가진다.
- 단, Supabase DB(회원/인증/등급/결제 등 공용 테이블)는 AIMaster 전체가 하나만 공유한다. 새 프로그램용 테이블이 필요하면 이 공용 DB에 추가한다 — 별도 Supabase 프로젝트를 새로 만들지 않는다.
- 루트 AIMaster 앱의 `app/(main)/<프로그램>/` 라우트가 해당 서브프로젝트의 컴포넌트를 직접 import해서 렌더링하는 경우, `tailwind.config.ts`의 `content`에 그 서브프로젝트 경로를 추가해야 하고, `next.config.mjs`의 `typescript.ignoreBuildErrors`로 서브프로젝트 간 타입 교차오염을 우회하고 있다 (각 서브프로젝트는 자체 `npm run build`로 별도 타입 검증됨).

### 서브프로젝트 작업물은 반드시 해당 서브프로젝트 폴더 안에서 관리한다
- 새 서브프로젝트를 계획(plan)하거나 개발할 때, **실제 작업 산출물(코드, DB 마이그레이션 SQL, 설계 이유·아키텍처 결정 문서 등)은 전부 그 서브프로젝트 폴더(`<프로그램명>/`) 안에 저장**한다. 저장소 밖(예: Claude Code의 `~/.claude/plans/*.md` 같은 plan-mode 산출물)이나 루트 `docs/`에만 흩어놓고 끝내지 않는다.
  - DB 마이그레이션: MCP/대시보드로 즉시 적용했더라도, 적용한 SQL을 반드시 `<프로그램명>/supabase/migrations/`에 파일로 남긴다 (threads/real_estate_sales 참고).
  - 설계 배경/아키텍처 결정: `<프로그램명>/README.md`에 "왜 이렇게 만들었는지"를 정리한다 (환경변수, 배포 방법, 남은 작업 포함).
  - Claude Code의 plan-mode로 계획을 짰다면, 구현이 끝난 뒤 핵심 결정 사항을 위 README로 옮겨 남긴다 — plan 파일 자체는 저장소 밖에 있어 다른 작업 환경(예: 이 컴퓨터의 다른 로컬 클론 경로)에서는 보이지 않기 때문이다.
- 이렇게 해야 그 서브프로젝트 폴더 하나만 복사/동기화해도 코드·DB 이력·문서가 전부 따라온다 (실제로 이 저장소는 로컬에 여러 클론이 존재할 수 있음 — 서브프로젝트 폴더가 자기완결적이어야 다른 클론으로 옮겨도 바로 이어서 작업 가능).

### 멀티테넌시 원칙 (필독 — 모든 서브 자동화 프로그램에 적용)
**모든 서브 자동화 프로그램(threads, blog, 및 앞으로 추가되는 모든 프로그램)은 개발자 전용 도구가 아니라, AIMaster에 가입하고 해당 프로그램의 이용 권한(구독/개별부여/등급)을 가진 모든 회원이 각자 자신의 계정으로 동일하게 사용할 수 있는 멀티테넌트 서비스여야 한다.** 새 프로그램을 추가하거나 기존 프로그램을 수정할 때는 아래 5가지를 항상 지킬 것.

1. **로그인 ≠ 이용 권한. (필수 준수 — 예외 없음)** 페이지/레이아웃뿐 아니라 **실제로 쓰기 작업을 수행하는 모든 API route와 모든 Server Action("use server" 함수)은 하나도 빠짐없이** "로그인했는가"만이 아니라 "이 프로그램(`programs.slug`)에 대한 구독/개별부여/등급 권한이 있는가"까지 확인해야 한다. 페이지/레이아웃만 막고 실제 쓰기 함수는 `requireUser()`(로그인만 확인)로 남겨두면, 로그인한 비구독자가 그 화면을 그대로 우회해서(폼 직접 호출 등) 기능을 무료로 쓸 수 있다.
   - **판단 기준**: DB에 insert/update/upsert/delete 하는 함수, 유료 외부 API(OpenAI/Gemini/Perplexity 등)를 호출하는 함수, OAuth 연동/해제처럼 실제 부수효과를 일으키는 함수는 전부 대상이다. 로그인/로그아웃 액션(`signInAction`/`signOutAction`)만 예외 — 세션이 생기기 전에 실행되므로 프로그램 권한 검사 자체가 성립하지 않는다.
   - 페이지/레이아웃(서버 컴포넌트) + Server Action에서는 `requireProgramAccess()` 스타일(권한 없으면 `redirect()`)을 쓴다.
   - API route handler(특히 OAuth 콜백처럼 GET이지만 DB에 쓰는 라우트 포함)에서는 절대 `redirect()`를 쓰지 말고, `{allowed, error, status}` 형태의 결과 객체를 반환하는 버전(`checkProgramAccess()` / `checkProgramAccessApi()`)을 써서 JSON 에러 응답을 내려준다 (redirect를 fetch로 받으면 클라이언트의 `res.json()` 파싱이 깨진다). CRON_SECRET으로 보호되는 시스템 간 라우트(예: `dispatch-scheduled`)는 예외.
   - 새 서브프로젝트를 만들 때 `src/lib/access.ts`에는 `requireProgramAccess()`와 **`checkProgramAccessApi()`를 처음부터 같이 만든다** (나중에 API route/OAuth 콜백을 추가할 때 빠뜨리기 쉽다).
   - 참고 구현: `lib/access/checkProgramAccess.ts`(루트), `threads/src/lib/access.ts`, `shots/src/lib/access.ts`, `real_estate_sales/src/lib/access.ts`, `blog/utils/access.ts`(`requireProgramAccess` + `checkProgramAccessApi`).
   - **감사 이력**: 2026-08-06 blog의 `/api/auto-post`, `/api/posts/[id]` PUT/DELETE에서 발견·수정. 2026-08-10 전수 감사에서 threads(Server Action 17개 + Threads OAuth 콜백), shots(Server Action 30개 + Instagram/YouTube OAuth 콜백 2개), real_estate_sales(Server Action 6개)에서 전부 `requireUser()`만 쓰고 있던 것을 발견해 `requireProgramAccess()`/`checkProgramAccessApi()`로 일괄 수정함 — **거의 모든 신규 코드에서 반복되는 실수이니 새 Server Action/API route를 작성할 때마다 이 항목을 의식적으로 체크할 것.**
2. **사용자별 데이터는 완전히 격리한다.** 사용자 소유 데이터가 들어가는 테이블(게시글, 연결 계정, API 키 등)은 반드시 `user_id` 컬럼 + RLS owner-only 정책(`auth.uid() = user_id`)을 가진다. `createServiceClient()`/admin client(서비스 롤, RLS 우회)를 쓸 때는 코드에서 반드시 `user_id`로 직접 필터링해서 다른 사용자 데이터가 섞이지 않게 한다.
3. **API 키는 사용자 개인 키를 우선 사용한다.** 공용 `user_api_keys` 테이블(`resolveApiKey()` 패턴: 본인 키 → 없으면 앱 기본 키 폴백)을 그대로 재사용한다. 새 프로그램마다 다시 만들지 않는다.
4. **외부 서비스 연동(OAuth 등)은 사용자별로 저장한다.** threads의 `threads_accounts`처럼 `user_id`에 unique 제약을 걸고, OAuth `state` 파라미터에 `user.id`를 실어 콜백에서 세션 사용자와 일치하는지 검증한다 (다른 사용자 명의로 계정이 연결되는 것을 방지).
5. **새 프로그램 체크리스트**: (1) `programs` 테이블에 slug 등록 (2) 대시보드 레이아웃에 `requireProgramAccess()` 게이트 (3) 모든 쓰기 API에 entitlement 체크 (4) 사용자별 데이터 테이블에 `user_id` + RLS (5) 외부 계정 연동은 사용자별로 저장 (6) API 키는 공용 `user_api_keys` 재사용.

### Route Groups
- `app/(main)/` — Public pages (Header + Footer layout), `dynamic = "force-dynamic"` required for Supabase calls
- `app/(dashboard)/` — Authenticated user pages (Sidebar layout)
- `app/(auth)/` — Login/Register pages; use Suspense wrapper for pages that use `useSearchParams()`
- `app/admin/` — Admin-only pages (AdminSidebar layout, `is_admin=true` required)
- `app/api/` — API routes (payment/affiliate)

### Design System
Dark luxury theme defined in `tailwind.config.ts` + `app/globals.css`:
- Background: `#0a0a0f`
- Gold gradient: `#d4af37` → `#f5c842` (CSS class: `gold-text`, Tailwind: `text-gold`)
- Glass cards: `glass-card` CSS class
- Utility: `cn()` from `lib/utils/cn.ts`

### Key UI Components (`components/ui/`)
- `GlassCard` — glassmorphism card, props: `hover`, `glow`
- `GoldButton` — variants: `gold` | `outline` | `ghost`, sizes: `sm` | `md` | `lg`
- `Badge` — variants: `new` | `best` | `hot` | `sale` | `coming` | `free` | `custom`
- `GoldGradientText` — gold gradient text, prop `as` for HTML tag
- `Modal` — accessible modal with backdrop

### Supabase
- Client (browser): `lib/supabase/client.ts` → `createClient()`
- Server (RSC/API): `lib/supabase/server.ts` → `async createClient()`, `createServiceClient()` (bypasses RLS)
- Types: `types/database.types.ts`

### Auth & Middleware
- `middleware.ts` — protects `/dashboard`, `/affiliate`, `/settings` (auth), `/admin` (is_admin=true)
- Redirects unauthenticated users to `/login?redirect=<path>`
- Sets `affiliate_ref` cookie (30 days) from `?ref=` query param

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYAPP_MEMBER_ID=
PAYAPP_SECRET_KEY=
NEXT_PUBLIC_APP_URL=
```

### DB Tables (11개 — Supabase SQL 스키마는 plan 파일 참조)
`member_grades`, `profiles`, `categories`, `programs`, `pricing_plans`, `grade_program_access`, `subscriptions`, `payment_records`, `affiliate_rates`, `affiliate_earnings`, `settlement_requests`

### Billing Types
`monthly` (30일) | `biannual` (180일) | `annual` (365일) | `lifetime` (null expires_at)

### Payapp 결제 흐름
`POST /api/payment/initiate` → 페이앱 URL 생성 → `payment_records (pending)` → 팝업
`POST /api/payment/webhook` → 서명검증 → `payment_records (completed)` → `subscriptions` 생성 → 어필리에이트 수수료 계산 → "00" 응답
