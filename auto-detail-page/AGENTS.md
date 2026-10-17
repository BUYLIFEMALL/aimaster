# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **AI 상세페이지 자동생성기(auto-detail-page)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션 (기존 threads/insta_auto_poster와 동일하게 자율 진행 가능)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (Claude 상세페이지 생성, 나노바나나/Replicate/GPT Image 1 이미지 생성 등)

### 3. 🚫 건드리면 안 되는 것: `shop-page-seven.vercel.app` 프로덕션 도메인
Vercel 프로젝트 이름은 `auto-detail-page`로 바꿨지만, **실제 프로덕션 URL은
`shop-page-seven.vercel.app`을 그대로 쓴다** — 이름이 안 맞다고 지우거나 새 걸로 바꾸려 하지 말 것.
Vercel이 프로젝트당 인증벽 면제 대표 도메인을 최초 생성 시점에 영구 고정해서, 이름을 바꾸거나
`vercel alias set`으로 새 별칭을 만들어도 새 별칭은 전부 로그인 필요 인증벽에 막힌다(실제 검증함,
2026-08-13). 이 별칭을 지워도 다음 배포 때 **똑같은 이름으로 자동 재생성**될 뿐이니, `vercel alias`/
`vercel domains` 관련 명령을 이 프로젝트에 실행할 때 이 도메인을 대상으로 삼지 말 것. 자세한 이유는
README.md "프로덕션 URL이 shop-page-seven인 이유" 참고.

---

## 🎯 프로젝트 목적

제품 이미지/정보를 입력하면 Claude가 쿠팡/스마트스토어/프리미엄 스타일의 완성된 HTML
상세페이지를 생성해주는 웹. 이미지가 필요하면 나노바나나/Replicate/GPT Image 1로 추가 생성할
수 있고, 완성된 페이지는 HTML 또는 Puppeteer로 렌더링한 긴 이미지(PNG)로 내려받을 수 있다.

---

## 📂 프로젝트 작업 디렉토리

- **메인 모듈 경로**: `auto-detail-page/`
- 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `auto-detail-page/` 폴더 내에서
  개발 및 관리합니다.
- 이 프로젝트는 원래 별도 위치(다른 로컬 클론, 별도 GitHub 저장소 `BUYLIFEMALL/ShopPage`)에서
  독립적으로 개발되다가 2026-08-13 AIMaster 서브프로젝트로 편입됐다. **지금부터는 이 폴더가
  유일한 소스**이고, 옛 저장소는 더 이상 반영하지 않는다 (README.md "설계 배경" 참고).

---

## 🔗 AIMaster 플랫폼 공통 원칙

auto-detail-page는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조",
"멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- auto-detail-page는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "auto-detail-page"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route(`app/api/*/route.ts`)는
  반드시 redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라
  프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블(`detail_pages`)은 `user_id` + RLS owner-only 정책으로 격리한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 본인 키가 없으면 `/settings`로 안내하고 생성을 막는다 — 절대 조용히 관리자 키로
  대체하지 않는다.
- 새 provider(`replicate`)를 추가할 때처럼 공용 `user_api_keys_provider_check` 제약을 넓히는 건
  괜찮지만, 이 프로그램만 쓰는 새 테이블을 `user_api_keys`와 별도로 만들지 않는다.
- v1.05 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (auto-detail-page)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://auto-detail-page.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 옛 shop-page-seven.vercel.app 화면 → 새 주소 308(그 별칭 자체는 지우지 않음), 새 주소가 Vercel 인증벽이 아닌 프로그램 로그인으로 이어짐, 재로그인 없이 열림(시험 계정 표시)
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## v1.08 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `app/api/generate-image/route.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).
