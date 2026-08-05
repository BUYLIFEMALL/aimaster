# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

- 답변은 기술 용어(API, RLS, 파일 경로, 함수명, 라이브러리명 등)를 제외하고 한글로 작성한다.

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

### 멀티테넌시 원칙 (필독 — 모든 서브 자동화 프로그램에 적용)
**모든 서브 자동화 프로그램(threads, blog, 및 앞으로 추가되는 모든 프로그램)은 개발자 전용 도구가 아니라, AIMaster에 가입하고 해당 프로그램의 이용 권한(구독/개별부여/등급)을 가진 모든 회원이 각자 자신의 계정으로 동일하게 사용할 수 있는 멀티테넌트 서비스여야 한다.** 새 프로그램을 추가하거나 기존 프로그램을 수정할 때는 아래 5가지를 항상 지킬 것.

1. **로그인 ≠ 이용 권한.** 페이지/레이아웃뿐 아니라 **실제로 쓰기 작업을 수행하는 모든 API route/서버 액션**은 "로그인했는가"만이 아니라 "이 프로그램(`programs.slug`)에 대한 구독/개별부여/등급 권한이 있는가"까지 확인해야 한다. UI(레이아웃)만 막고 API는 막지 않으면, UI를 우회해 API를 직접 호출하는 방식으로 결제 없이 사용할 수 있다 — 2026-08-06 감사에서 blog의 `/api/auto-post`, `/api/posts/[id]` PUT/DELETE가 로그인 확인만 하고 이 확인이 빠져 있던 것을 발견해 수정한 사례가 있음.
   - 페이지/레이아웃(서버 컴포넌트)에서는 `requireProgramAccess()` 스타일(권한 없으면 `redirect()`)을 쓴다.
   - API route handler에서는 절대 `redirect()`를 쓰지 말고, `{allowed, error, status}` 형태의 결과 객체를 반환하는 버전(`checkProgramAccess()` / `checkProgramAccessApi()`)을 써서 JSON 에러 응답을 내려준다 (redirect를 fetch로 받으면 클라이언트의 `res.json()` 파싱이 깨진다).
   - 참고 구현: `lib/access/checkProgramAccess.ts`(루트), `threads/src/lib/access.ts`, `blog/utils/access.ts`(`requireProgramAccess` + `checkProgramAccessApi`).
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
