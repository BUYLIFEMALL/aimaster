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
