# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **쓰레드 댓글자동화(threads-comment-reply)** 프로젝트에서 AI Agent(Claude Code
등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (OpenAI/Anthropic/Gemini 답글 초안 생성 등)
5. **실제 쓰레드 댓글 게시(`postReplyAction`)** — 공개적으로 남는 되돌리기 어려운 행동이다.
   기본값은 화면에서 사람이 "답변승인" 버튼을 직접 누르거나 텔레그램에서 승인하는 것이고, 이
   자체가 Meta Developer Policy §1.7이 요구하는 "사전의 명시적 동의"다. **(선택, 고급) 자동
   게시(`th_settings.auto_approve`, 기본 false)**를 2026-08-26 사용자 요청으로 추가했지만,
   사용자가 설정 화면에서 위험 고지를 읽고 명시적으로 동의 체크 후 켠 경우에만 동작한다 — 이
   흐름을 우회해서 기본값을 바꾸거나 동의 없이 자동/일괄 게시하는 코드를 추가하지 말 것. 자동
   게시 중에도 댓글마다 AI가 매번 새로 생성한 답글만 게시되고, 고정 템플릿 반복 게시는 여전히
   금지다(Meta 정책 §5.2.2(d)).
6. **Vercel Cron(vercel.json의 crons) 활성화/배포** — `/api/cron/check-connection`은 실제
   댓글을 읽거나 게시하지 않는 순수 상태 점검용이라 다른 발송 cron보다 리스크는 낮지만, 배포되는
   순간부터 매일 자동 실행되며 사용자에게 텔레그램 알림을 실제로 보낼 수 있으므로 다른 cron과
   동일하게 배포 전 확인한다.

---

## 🎯 프로젝트 목적

쓰레드 게시물에 새 댓글이 달리면 AI가 내용을 읽고 자연스러운 답글(원하는 링크 포함)을
초안으로 만들고, 계정 운영자가 검토·수정 후(또는 텔레그램에서 바로) 게시하는 프로그램.
`instagram-comment-reply`(INSTA 댓글자동화)를 만든 경험을 그대로 이식해서 설계했다 — 데이터
모델, 텔레그램 승인 버튼, 예약 모니터링, 다중 AI provider 지원 구조가 사실상 동일하다.

**차단당하지 않도록 설계한 방법**은 [README.md](README.md) 참고 — Meta 공식 개발자 문서를
직접 확인한 뒤 결정한 내용이다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `threads-comment-reply/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은
  `threads-comment-reply/` 폴더 내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

threads-comment-reply는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- threads-comment-reply는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "threads-comment-reply"`) 이용 권한(구독/개별부여/등급)이 있는 모든
  사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route
  (`app/api/threads/callback/route.ts`)는 redirect 대신 결과 객체를 반환하는
  `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `threads_app_id`/`threads_app_secret`(쓰레드 OAuth) + `openai`/
  `anthropic`/`gemini`(답글 생성 AI, 고른 모델의 provider 키 하나만 있으면 됨) 총 5개 provider를 쓴다.
  (2026-09-28까지는 인스타 프로그램과 `meta_app_id`/`meta_app_secret` 칸을 공유했는데, Meta의 Instagram 앱 ID와
  Threads 앱 ID는 서로 다른 값이라 한쪽 저장이 다른 쪽을 덮어써서 OAuth가 깨졌다 — 쓰레드 3개 프로그램을 전용 칸으로 분리함.)
- 사용자 소유 데이터 테이블(`th_accounts`, `th_posts`, `th_settings`, `th_comments`)은
  `user_id` + RLS owner-only 정책으로 격리한다. 전역 공유 캐시는 없다.
- 텔레그램 알림은 프로그램 접두어 없는 공용 `user_telegram_links`를
  `(user_id, program_slug='threads-comment-reply')`로 스코프해서 재사용한다 — 다른
  프로그램에서 이미 연동한 봇과는 독립적이다.
- 텔레그램 승인 버튼(답변승인/답변보류/답변제외)은 사용자마다 자기 봇을 쓰는 구조라 사용자
  식별용 웹훅을 새로 등록한다(instagram-comment-reply와 완전히 동일한 `computeWebhookSecret`
  HMAC 검증 패턴). **주의: 같은 봇을 다른 승인-버튼 프로그램(예: youtube-auto-reply)과 같이
  쓰면 텔레그램 웹훅은 봇당 1개만 등록 가능해서 슬롯이 충돌한다 — 반드시 이 프로그램 전용의
  새 봇을 만들어 연결하도록 설정 화면에서 안내한다** (2026-08-26 인스타/유튜브 댓글자동화
  운영 중 실제로 발견/정리한 규칙).

### Meta App ID/Secret — "본인 앱으로 App Review 건너뛰기" 패턴
`google_client_id`/`google_client_secret`, instagram-comment-reply의 `meta_app_id`/
`meta_app_secret`과 같은 철학이다: 사용자가 각자 Meta App Dashboard에서 자기 소유의 앱을
만들고(또는 이미 있는 본인 앱에 "Threads API" 이용 사례를 추가하고), 그 앱의 "역할" 메뉴에서
자기 자신을 테스터로 추가하면, Meta의 App Review(전체 사용자 흐름 스크린캐스트 필수) 없이도
본인 계정만 즉시 연결해 쓸 수 있다. **기존 `threads/`(Threads 자동 포스팅) 서브프로젝트가 쓰는
공용 Meta 앱을 확장하지 말 것** — 그 앱은 이미 `threads_content_publish`로 다수 사용자를 받는
라이브 상태라, `threads_manage_replies` 권한을 추가하면 새 App Review가 필요해진다.

## 🔑 Meta 앱 권한 점검 (2026-09-29)

- 이 프로그램은 OAuth에서 `threads_basic`, `threads_content_publish`, `threads_read_replies`, `threads_manage_replies`를 요청한다.
  운영자 Meta 앱(www.buylife.xyz)에 `threads_manage_replies`가 빠져 있어 2026-09-29 추가함(API 호출 0회 = 이 앱으로 답글 게시 이력 없음).
  **남은 일**: `threads_read_replies` 추가 여부 확인, naver(일반 회원) 계정 재연결 후 댓글 수집→답글 게시 실사용 검증.
  이 두 권한은 앱 검수에 올리지 않는다(본인 테스터 계정은 심사 없이 사용 가능).
- Threads 앱 자격증명 provider는 `threads_app_id`/`threads_app_secret`(인스타 `meta_app_*`와 분리). Meta 제거·삭제 콜백은
  threads-affiliate-poster의 `/api/threads/uninstall`·`/api/threads/delete`가 이 프로그램의 `th_accounts`/`th_posts`까지 처리한다.
- `/api/telegram/webhook/[userId]`에 `fetchCache = "force-no-store"` 추가.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 쓰레드 계정 OAuth 연결, 게시물 동기화 + 개별 모니터링 on/off + 링크 오버라이드, 신규 댓글 수집 + AI 답글 초안 생성(OpenAI/Anthropic/Gemini 중 선택), 검토 후 수동 게시 | ✅ 구현 완료 |
| 1 | 매일 Vercel Cron으로 연결 상태 점검 + 끊기면 텔레그램 알림, 화면 전체에 재연결 배너 표시 | ✅ 구현 완료 |
| 1 | 예약 모니터링 — 사용자별 확인 주기(5분~24시간) 선택 + 시작/중지 + "이 시점 이후 댓글만" 커트오프 | ✅ 구현 완료 |
| 1 | 텔레그램 승인 버튼 — 새 댓글+AI 초안을 텔레그램으로 보내면서 "✅ 답변승인/⏸ 답변보류/❌ 답변제외" 인라인 버튼 제공 | ✅ 구현 완료 |
| 1 | `/media` 일괄 작업 — 체크박스로 여러 게시물 모니터링 시작/중지·숨기기 일괄 처리 | ✅ 구현 완료 |
| 1 | 답글 이력 대시보드(`/history`) | ✅ 구현 완료 |
| 1 | `programs` 카탈로그 등록(카테고리: 쓰레드) + 썸네일(Gemini 생성) | ✅ 구현 완료 |
| 2 | (선택, 고급) 자동 게시 옵션 — `th_settings.auto_approve`, 기본 false. 켜면 검토 없이 AI 초안이 바로 게시되고, 텔레그램에는 버튼 없는 결과 알림만 발송(youtube-auto-reply와 동일 패턴) | ✅ 구현 완료 |
| 2 | Vercel Cron 활성화 — 사용자가 실제 계정을 등록하고 정상 동작을 검수한 뒤, 명시적으로 승인받고 켤 예정 | ⏳ 예정(의도적으로 꺼둠) |
| 2 | Webhook 기반 실시간 댓글 수신(현재는 폴링) | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (threads-comment-reply)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://threads-comment-reply.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 /settings 재로그인 없이 열림(시험 계정 표시), 옛 주소 콜백 → 새 주소 307(시험 요청), 설정 화면 콜백 안내 옛 주소 그대로. 텔레그램 웹훅 등록 기본 주소만 새 주소(같은 서버 API라 동작 동일). 실제 계정 연결은 미시험
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.08 — 옛 vercel.app 삭제 대비 두 주소 지원 (Claude Code 윈도우)
- 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md`(이 프로그램이 기준 구현). `lib/oauthRedirect.ts`(SITE_ORIGIN·NEW_REDIRECT_URI·`oldRedirectUri()`=기존 환경변수·`redirectUriFor(mode)`).
- 콜백: 기본 연결은 옛 콜백(환경변수), 설정 화면 [새 주소로 연결]/[새 주소로 다시 연결](callback=new)은 새 콜백. 옛 주소로 돌아오면 새 주소로 307 + `via=old`, 토큰 교환은 via=old면 옛 주소·없으면 새 주소(인증·교환 주소 일치). 연결 후 이동은 SITE_ORIGIN 기준. 설정 화면에 두 콜백 주소 모두 표시·"둘 다 등록" 안내.
- 텔레그램 웹훅 등록 기준을 SITE_ORIGIN으로. 기존 등록분 일괄 이전 `GET|POST /api/telegram/migrate-webhooks`(CRON_SECRET Bearer 또는 관리자 로그인, getWebhookInfo로 이미 새 주소면 건너뜀, 같은 secret_token). **현재 연동 1건(주인님 관리자 계정 봇) — 관리자 로그인 상태로 이 주소를 한 번 열면 이전됨(미실행)**. `vercel env pull`로 받은 CRON_SECRET은 운영 값과 달라 401(민감 변수는 실제 값이 내려오지 않음) → 관리자 로그인 방식 추가.
- 검수: 빌드·배포(v1.08), 옛 콜백 → `...?via=old` 307, 새 콜백(비로그인) → /login, migrate 비인증 401. 시험 계정 설정 화면에 두 주소·버튼 표시, [새 주소로 다시 연결] → Meta가 "리디렉션 URI 화이트리스트에 없음"(시험 계정 앱에 새 주소 미등록 = 새 콜백 전송 확인). 실제 연결 성공은 앱에 새 주소 등록 후 확인 필요.
- 남은 일(삭제 직전): 기본 연결을 새 콜백으로 바꾸고 옛 버튼·307 코드 제거.

## 2026-10-17 v1.09 — 등록 주소 한눈에 보기·복사 버튼 (Claude Code 윈도우)
- 주인님 요청(INSTA 포스팅 v1.14·threads v1.09·쇼핑제휴 v1.55와 같은 형식): 설정 화면 맨 위 `components/settings/ThreadsMetaAddressSummary.tsx`(앱 도메인·리디렉션 콜백 새·옛·제거/삭제 콜백(쇼핑제휴 `threads-affiliate-poster.buylife.xyz/api/threads/uninstall`·`/delete` — 그 처리기가 `th_accounts`까지 정리)·Threads 앱 ID 위치·테스터 추가/초대 수락). 콜백 주소 표시는 `CopyAddress`(복사 버튼)로 교체.
- 같은 날 주인님이 Meta 앱에 새 콜백 등록 → 관리자 [새 주소로 다시 연결] 성공(댓글 권한 동의 후 `th_accounts` 확인).
- 검수: 빌드·배포·DB v1.09, 크롬에서 카드 제목·사이드바 v1.09 확인.

## 2026-10-17 v1.10 — 디자인 리뉴얼: 스튜디오 댓글 콘솔 — 쓰레드 모노 변형 (Claude Code 맥미니)
- `youtube-auto-reply` v1.09 구성 이식 + Threads 흑백(`th-*`, 흰 알약 버튼), 사이드바 흰 막대·대기 배지·**휴대폰 ☰**, `/dashboard`·`/guide` 신설(`/`→`/dashboard`), 댓글을 쓰레드 답글 모양으로, 로그인까지 다크. 서버 로직 변경 없음. 디자인: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md)
- **빌드·배포·화면 검수는 윈도우 CLI 대기.**
- 플랜: [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계: [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)

## 2026-10-17 v1.11 — 좌측 상단 제목 「THREADS 댓글 자동화」(유튜브 v1.11과 같은 형식, 플랫폼 구분) (Claude Code 맥미니)
- 주인님 승인(시험 계정 크롬 검수 중 발견·제안). 바뀐 파일: `components/layout/Sidebar.tsx`, 버전 파일. `tsc --noEmit` 오류 0.
- **빌드·배포·DB `v1.11`는 윈도우 CLI 대기**: `npm run build` → `vercel deploy --prod --yes` → `update programs set version='v1.11', updated_at=now() where slug='threads-comment-reply';` → 1440·375px 제목 확인.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.12 — 실행 주소 비밀값 검사 보완 (Claude Code 윈도우)
- `app/api/cron/sync-comments`·`check-connection`(2곳)의 `auth === \`Bearer ${process.env.CRON_SECRET}\`` → `CRON_SECRET`이 비면 「Bearer undefined」를 보낸 누구나 통과하던 빈틈을 `Boolean(secret) && …`로 차단(회원 화면·동작 변화 없음). 지금은 Vercel에 `CRON_SECRET`이 등록돼 있어 실제로 뚫린 적은 없음 — 방어 보완. 근거·전체 목록: 루트 `docs/SCHEDULER_PRIORITY2_REVIEW_20261020.md` §2-1, `docs/ERROR_LESSONS.md` 2026-10-20.
- 검수: `tsc` 0, `npm run build`, 배포 `threads-comment-reply-hit3ns3w8`(Ready), DB `programs.version` v1.12, 운영 주소 실행 주소 무인증·`Bearer undefined` 모두 401, `/login` 200. 이 프로그램은 운영자 예약 호출(`vercel.json` crons)이 원래 꺼져 있어 정상 호출 확인 대상 없음.
- 텔레그램 `migrate-webhooks`는 이미 「비밀값이 있을 때만」 검사, `webhookSecret.ts`는 비밀값이 없으면 오류로 멈춰 안전(변경 없음).

## 2026-10-20 v1.13 — 회원 연동 정보 공용 저장 ②단계: Threads 계정 한 번 연결 → 여러 Threads 프로그램 함께 사용 (Claude Code 윈도우)
- 루트 [`docs/MEMBER_INTEGRATIONS.md`](../docs/MEMBER_INTEGRATIONS.md)·플랜 [`docs/PLAN_20261020_MEMBER_INTEGRATIONS.md`](../docs/PLAN_20261020_MEMBER_INTEGRATIONS.md). 공용 부품 사본 `lib/memberIntegrations.ts`(기준 루트 `lib/memberIntegrations.ts`, `check-shared-modules.mjs` 「member-integrations」 — 사본 직접 수정 금지).
- `lib/threads/memberAccount.ts` `getReplyAccount()`: 공용 표 `member_platform_accounts`에 **댓글 권한까지 있고 재연결 필요 아니고 계정 이름이 있는** Threads 계정이 있으면 그것, 없으면 `th_accounts`. 게시물 동기화(`actions/media.ts`)·댓글 수집(`comments/sync.ts`)·답글 게시(`comments/post.ts`)·연결 상태/상단 배너(`actions/threads.ts`)·대시보드가 모두 이 함수로 읽음. 계정 이름 조건은 「내 답글에 다시 답하는 무한 반복」 방지(`sync.ts`)에 이름이 꼭 필요해서.
- 토큰 자동 갱신·「다시 연결 필요」 표시: 공용 계정에서 읽은 토큰이면 공용 표에 기록(`updateMemberAccountToken`·`markMemberAccountNeedsReconnect`), 아니면 지금처럼 `th_accounts`. 매일 연결 점검 cron(`/api/cron/check-connection`, 원래 꺼져 있음)은 `th_accounts` 기준 그대로.
- 연결 콜백: `th_accounts` + 공용 표 이중 기록(권한 4개, `app_ref`=회원 Threads 앱 ID). 연결 해제: 두 곳 모두 삭제 + 설정 화면 안내 「다른 Threads 프로그램에서도 해제」.
- 운영 DB: `supabase/migrations/20261020110000_member_integrations_v1_13.sql` — 정상 연결만, **공용 행이 없는 회원만** 백필(원본 유지) + 버전.

## 2026-10-20 v1.14 — 텔레그램 연동 확인이 메시지를 못 찾는 문제 예방 (Claude Code 윈도우)
- 원인: 웹훅 등록 때 `allowed_updates:["callback_query"]`를 지정하면 텔레그램이 그 값을 기억해, 웹훅을 지운 뒤 `getUpdates`(값 미지정)에서도 일반 메시지를 버림 → 연동 해제 후 다시 연동하면 「메시지를 찾지 못했어요」가 반복됨(2026-10-20 instagram-comment-reply v1.21에서 실제 발생·해결). 수정: `telegram/client.ts` `findChatIdFromUpdates`가 `allowed_updates=["message"]`를 매번 지정.
- 검수: tsc 통과, 배포·DB 버전 v1.14. 실제 텔레그램 재연동 시험은 하지 않음(회원 봇 없음).

## 2026-10-20 v1.15 — 프로그램 공지 띠 추가 (Claude Code 윈도우)
- 공용 기준 코드 `program-notice-banner`(기준 `ai-webtoon-studio/src/components/ProgramNoticeBanner.tsx`) 사본을 받아 대시보드 레이아웃 `<main>` 맨 위에 표시. 메인 사이트 공지의 「관련 프로그램」에 이 프로그램이 있으면 최근 공지 1건(30일 이내), 「닫기」는 브라우저에 기억. 사본은 직접 고치지 않고 기준 수정 후 `node scripts/check-shared-modules.mjs --sync`.

## 2026-10-21 — 텔레그램 연동 공용 모듈 `telegram-bot-client` (Claude Code 윈도우, 부계정)
- 이 프로그램의 텔레그램 `client.ts`는 공용 사본(직접 고치지 말 것 — 기준 `instagram-comment-reply/lib/telegram/client.ts`만 고치고 `--sync`). 동작 같음 — 다음 배포 때 버전 +0.01과 함께 나감.

## 2026-10-21 v1.16 — 대시보드 검토 대기 목록 형식을 INSTA와 맞춤 (Claude Code 윈도우)
- 주인님 지시(INSTA 댓글·DM v1.26 보고의 추가개선 제안 3번 — 나중에 「통합 댓글 받은편지함」으로 묶기 쉽게). `app/(dashboard)/dashboard/page.tsx`: 「🕒 검토를 기다리는 댓글」 제목 옆에 `{pending}건`, 「전체 보기 →」를 제목 줄 오른쪽 위로 옮겨 항상 표시(대기 0건이면 사라지던 목록 아래 「모두 보기」 제거). 목록 항목·서버 로직은 그대로.
- 같은 배포에 2026-10-21 저장소에만 반영돼 있던 텔레그램 공용 사본(`telegram-bot-client`, 동작 같음)도 함께 나감.
- 검수: tsc 0, `npm run build`, 배포 `threads-comment-reply-nyn9t7chb` Ready, DB v1.16, 메인 크롬(일반 회원) 대시보드 v1.16·「0건」·「전체 보기 →」 확인. 비용: Vercel 빌드 1회, AI 0회. 커밋 `b635fad5`.

## 2026-10-21 v1.17 — 대시보드 댓글 항목 글 앞부분 · 게시물 묶음 바로가기 (Claude Code 윈도우)
- 주인님 지시(INSTA v1.27 보고 추가개선 제안 1·2번, 세 댓글 프로그램 동작 통일). `app/(dashboard)/dashboard/page.tsx`: 검토 대기 댓글 조회에 `post_id`, `th_posts.text`(user_id 필터)로 항목 아래 「🧵 글 앞부분」(쓰레드 글은 썸네일 칸이 없어 글로 대신), 항목 전체가 `/comments#post-<id>` 링크. `app/(dashboard)/comments/page.tsx`: 게시물 묶음 `<section>`에 `id="post-<id>"`+`scroll-mt-80`.
- 검수: tsc 0, build, 배포 `threads-comment-reply-o3bw0hfdr` Ready, DB v1.17, 크롬(일반 회원) 대시보드 v1.17·댓글 화면 200. **대기 댓글 0건이라 글 앞부분·이동은 실제 데이터로 미확인.** 비용: Vercel 빌드 1회. 커밋 `856c680d`.
