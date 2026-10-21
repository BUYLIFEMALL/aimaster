# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **INSTA 댓글·DM 자동화(instagram-comment-reply, 2026-10-20 DM답변 자동화 병합)** 프로젝트에서 AI Agent(Claude Code
등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 📌 7대 핵심 항목 (2026-10-20 병합 B 완료 · v1.33 기준 — 다른 CLI는 여기부터 읽는다)

> 2026-10-20 「INSTA DM답변 자동화」(`instagram-dm-reply`)가 이 프로그램 안으로 병합되어 **「INSTA 댓글·DM 자동화」**가 되었다. 아래 이전 기록(Phase 표·버전별 항목)은 댓글 전용 시절 내용이 섞여 있으니, 현재 상태는 이 절과 맨 아래 v1.18~v1.24 항목을 기준으로 한다. 세션 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261020.md`](docs/IMPROVEMENT_HANDOFF_20261020.md)

1. **사용 목적·대상** — 인스타 비즈니스·크리에이터 계정 운영자(쇼핑몰·셀러·브랜드)가 게시물 **댓글**과 **DM 문의**에 빠르게 응대하도록, AI가 답변 초안을 만들고 사람이 「답변승인」으로 게시·발송한다. 인스타 연결 한 번(「DM 답변도 사용」)으로 둘 다 쓴다.
2. **기술 스택·스킬** — Next.js 14 App Router · TypeScript · Tailwind v3(`ig-*` 색상 토큰) · Supabase 공용 DB(`@supabase/ssr`, RLS) · Instagram API with Instagram Login(OAuth, 회원 본인 Meta 앱) · Meta 웹훅(DM 실시간 수신, 서명 검증) · OpenAI/Anthropic/Gemini(회원 본인 키) · 텔레그램 Bot API(승인 버튼 웹훅) · 공용 기준 코드(`memberIntegrations`·`program-notice-banner`, `scripts/check-shared-modules.mjs`).
3. **핵심 기능·구조·장단점**
   - 댓글: `/media`(동기화·대상 선택) → 예약 모니터링 또는 수동 확인 → `/comments`(초안 검토·승인 게시) → `/history`. 표 `ig_accounts`·`ig_media`·`ig_comments`·`ig_settings`. 게시물별 최근 20개.
   - DM: Meta 웹훅 `/api/instagram/dm-webhook/[userId]`(echo 필터·서명 검증) → `lib/dm/process` 초안 → `/dm/conversations` 검토·발송(첫 답장 전 자동 응답 고지, 24시간 창). 표 `dm_accounts`·`dm_settings`·`dm_conversations`·`dm_messages`. DM 전용 코드 `lib/dmApp/`·`components/dm/`.
   - 연결: 콜백 `/api/instagram/callback`이 메시지 권한이 있으면 `dm_accounts`·공용 `member_platform_accounts`에도 저장. 텔레그램은 댓글 봇(`program_slug=instagram-comment-reply`, `/api/telegram/webhook`)·DM 봇(`program_slug=instagram-dm-reply`, `/api/dm/telegram/webhook`) **봇 2개**.
   - 장점: 연결 한 번에 댓글·DM, 승인 후 게시(자동은 동의 후), 텔레그램 승인, 무리 없는 처리량. 단점: 전문 계정 전용, DM 24시간 제한, Meta 앱에 메시지 권한·웹훅을 회원이 직접 등록, 텔레그램 봇 2개 필요, 실제 고객 DM 왕복 시험은 아직 안 함.
4. **현재 버전·변경 히스토리** — **v1.35**. v1.35(2026-10-22) 그래프 막대를 누르면 그날 답한 목록(원래 댓글·DM + 보낸 답장). v1.34(2026-10-22) v1.34(2026-10-22) 대시보드에 「📊 최근 7일 응대」 그래프(댓글·DM 두 색, 공용 기준 코드 `week-reply-chart`). v1.33(2026-10-21) v1.33(2026-10-21) 텔레그램 승인 알림(댓글·DM)에 통합 받은편지함 링크 버튼. v1.32(2026-10-21) 게시 함수 처리 중 선점으로 이중 게시 방지, 대시보드에 통합 받은편지함 링크. v1.31(2026-10-21) 토큰 갱신 코드를 `lib/instagram/token.ts`·`lib/dmApp/instagram/token.ts`로 분리(동작 같음), 게시 묶음을 공용 기준 코드로 등록(사본 comment-inbox). v1.30(2026-10-21) 검토 화면 묶음 머리 공용 `review-group-header`(기준), 대시보드 목록 휴대폰 누르는 영역 44px. v1.29(2026-10-21) 대시보드 두 목록을 공용 기준 코드 `pending-review-list`(`components/PendingReviewList.tsx`, 이 프로그램이 기준)로 바꾸고, 대시보드에서 넘어간 묶음을 2초 강조하는 `hash-highlight`(`components/HashHighlight.tsx`, 기준)를 댓글·DM 검토 화면에 넣음. v1.28(2026-10-21) 대시보드 「검토를 기다리는 댓글」 항목 오른쪽에 게시물 썸네일, 누르면 `/comments#media-<게시물id>`(댓글 검토 화면 게시물 묶음)로 이동 — DM 목록과 같은 동작. v1.27(2026-10-21) 대시보드 「검토를 기다리는 DM」을 대화별 1건으로 묶어 24시간 답장 가능 시간 배지(4시간 미만 경고색·만료 빨강)와 함께 남은 시간이 적은 순(만료는 맨 뒤)으로 3건, 누르면 `/dm/conversations#conv-<대화id>`로 바로 이동. v1.26(2026-10-21) 댓글 검토 화면의 게시물 묶음 머리에 게시물 썸네일(`ig_media.thumbnail_url`, 누르면 인스타 원본 `permalink` 새 창, 없으면 🖼️) · 대시보드 왼쪽 열 댓글 목록 아래에 「💌 검토를 기다리는 DM」 최근 3건(`dm_messages` direction=in·pending_review + `dm_conversations.customer_username`, DM 미사용이면 켜는 안내). v1.25(2026-10-21) 다크 전환 뒤 4개 화면 점검: `/dm/history`·`/history` 선택 탭이 글자색(`bg-ig-text`)을 바탕으로 써서 밝은 알약으로 보이던 것을 `bg-ig-primary text-white`로 수정(나머지 화면·검토 카드는 밝은 색 없음). v1.18 DM 화면·기능 이식 / v1.19~v1.22 텔레그램 연동(봇 이름 표시·봇 구분 배지·`allowed_updates` 수정·실패 진단) / v1.23 대시보드·기록 통합·이름 통일 / v1.24 DM 설정 값 정리·통합 매뉴얼·플로우 위저드 스타일(다크)·공지 띠. 옛 `instagram-dm-reply` v1.17은 화면 이동·API 전달만.
5. **남은 작업·백로그** — [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md): 실제 DM 왕복 시험, 다크 전환 후 댓글·DM 검토·로그인 화면 대비 점검, 옛 instagram-dm-reply 폴더 코드 정리 시점 결정, 텔레그램 연동 공용화.
6. **연계·병합 아이디어** — INSTA 포스팅(같은 템플릿·같은 Meta 앱)에서 게시한 글의 댓글을 바로 모니터링 대상으로 / threads·유튜브 댓글자동화와 「통합 댓글 받은편지함」 / 텔레그램 승인 봇 연동 공용 모듈(`docs/SHARED_FEATURE_MAP.md` 10절).
7. **UI/UX 개선안** — 디자인 「플로우 위저드 스타일 (인스타 바이럴 변형)」(`docs/DESIGN_HANDOFF.md`). 제안(썸네일·DM 대기 목록은 v1.26 완료): 휴대폰에서 검토 카드 한 손 조작(버튼 하단 고정).

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
5. **실제 인스타그램 댓글 게시(`postReplyAction`)** — 공개적으로 남는 되돌리기 어려운 행동이다.
   기본값은 화면에서 사람이 "답변승인" 버튼을 직접 누르거나 텔레그램에서 승인하는 것이고, 이
   자체가 Meta Developer Policy §1.7이 요구하는 "사전의 명시적 동의"다. **(선택, 고급) 자동
   게시(`ig_settings.auto_approve`, 기본 false)**를 2026-08-26 사용자 요청으로 추가했지만,
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

인스타그램 게시물에 새 댓글이 달리면 AI가 내용을 읽고 자연스러운 답글(원하는 링크 포함)을
초안으로 만들고, 계정 운영자가 검토·수정 후(또는 텔레그램에서 바로) 게시하는 프로그램.
`youtube-auto-reply`(유튜브 댓글 자동 답글)를 만든 경험을 그대로 이식해서 설계했다 — 데이터
모델, 텔레그램 승인 버튼, 예약 모니터링, 다중 AI provider 지원 구조가 사실상 동일하다.

**차단당하지 않도록 설계한 방법**은 [README.md](README.md) 참고 — Meta 공식 개발자 문서/정책
문서/커뮤니티 사례/경쟁 서비스를 직접 조사한 뒤 결정한 내용이다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `instagram-comment-reply/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은
  `instagram-comment-reply/` 폴더 내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

instagram-comment-reply는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- instagram-comment-reply는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "instagram-comment-reply"`) 이용 권한(구독/개별부여/등급)이 있는 모든
  사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route
  (`app/api/instagram/callback/route.ts`)는 redirect 대신 결과 객체를 반환하는
  `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `meta_app_id`/`meta_app_secret`(인스타그램 OAuth, 이 프로젝트
  전용으로 새로 추가한 provider) + `openai`/`anthropic`/`gemini`(답글 생성 AI, 고른 모델의
  provider 키 하나만 있으면 됨) 총 5개 provider를 쓴다.
- 사용자 소유 데이터 테이블(`ig_accounts`, `ig_media`, `ig_settings`, `ig_comments`)은
  `user_id` + RLS owner-only 정책으로 격리한다. 전역 공유 캐시는 없다.
- 텔레그램 알림은 프로그램 접두어 없는 공용 `user_telegram_links`를
  `(user_id, program_slug='instagram-comment-reply')`로 스코프해서 재사용한다 — 다른
  프로그램에서 이미 연동한 봇과는 독립적이다.
- 텔레그램 승인 버튼(답변승인/답변보류/답변제외)은 사용자마다 자기 봇을 쓰는 구조라 사용자
  식별용 웹훅을 새로 등록한다(youtube-auto-reply와 완전히 동일한 `computeWebhookSecret`
  HMAC 검증 패턴).

### Meta App ID/Secret — "본인 앱으로 App Review 건너뛰기" 패턴
`google_client_id`/`google_client_secret`과 같은 철학이다: 사용자가 각자 Meta App Dashboard에서
자기 소유의 앱을 만들고, 그 앱의 "역할" 메뉴에서 자기 자신을 테스터로 추가하면, Meta의
App Review(전체 사용자 흐름 스크린캐스트 필수) 없이도 본인 계정만 즉시 연결해 쓸 수 있다 —
App Review는 "앱에 등록되지 않은 제3자에게 권한을 확장할 때"만 필요하기 때문이다. 설정
화면에 이 절차(앱 생성 → 리디렉션 URI 등록 → 본인을 테스터로 추가)를 안내한다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 인스타그램 계정 OAuth 연결(Instagram API with Instagram Login), 게시물 동기화 + 개별 모니터링 on/off + 링크 오버라이드, 신규 댓글 수집 + AI 답글 초안 생성(OpenAI/Anthropic/Gemini 중 선택), 검토 후 수동 게시 | ✅ 구현 완료 |
| 1 | 매일 Vercel Cron으로 연결 상태 점검 + 끊기면 텔레그램 알림, 화면 전체에 재연결 배너 표시 | ✅ 구현 완료 |
| 1 | 예약 모니터링 — 사용자별 확인 주기(5분~24시간) 선택 + 시작/중지 + "이 시점 이후 댓글만" 커트오프 | ✅ 구현 완료 |
| 1 | 텔레그램 승인 버튼 — 새 댓글+AI 초안을 텔레그램으로 보내면서 "✅ 답변승인/⏸ 답변보류/❌ 답변제외" 인라인 버튼 제공 | ✅ 구현 완료 |
| 1 | `/media` 일괄 작업 — 체크박스로 여러 게시물 모니터링 시작/중지·숨기기 일괄 처리 | ✅ 구현 완료 |
| 1 | 답글 이력 대시보드(`/history`) | ✅ 구현 완료 |
| 1 | `programs` 카탈로그 등록(카테고리: 인스타) + 썸네일(Gemini 생성) | ✅ 구현 완료 |
| 2 | Vercel Cron 활성화 — 2026-08-26 실제로는 별도 확인 없이 배포에 포함돼 잠깐 켜져 있었던 것을 발견해 `vercel.json`에서 비워서(`crons: []`) 껐다. 사용자가 실제 계정을 등록하고 정상 동작을 검수한 뒤, 다시 명시적으로 승인받고 켤 예정 | ⏳ 예정(의도적으로 꺼둠) |
| 2 | (선택, 고급) 자동 게시 옵션 — `ig_settings.auto_approve`, 기본 false. 켜면 검토 없이 AI 초안이 바로 게시되고, 텔레그램에는 버튼 없는 결과 알림만 발송(youtube-auto-reply와 동일 패턴). 본인 계정이 단 답글을 새 댓글로 잘못 인식하지 않도록 작성자 username 필터도 함께 추가 | ✅ 구현 완료 |
| 2 | Webhook 기반 실시간 댓글 수신(현재는 폴링) | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (instagram-comment-reply)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://instagram-comment-reply.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 /settings 재로그인 없이 열림(시험 계정 표시), 옛 주소 콜백 → 새 주소 307(시험 요청), 설정 화면 콜백 안내 옛 주소 그대로. 텔레그램 웹훅 기본 주소만 새 주소. 실제 계정 연결은 미시험
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.08 — 옛 vercel.app 삭제 대비 두 주소 지원 (Claude Code 윈도우)
- 기준 구현(threads-comment-reply v1.08)과 동일: `lib/oauthRedirect.ts`, 콜백 기본 옛 주소·[새 주소로 연결](callback=new), 옛 주소 307에 via=old, 교환 redirect_uri 선택, 연결 후 이동 SITE_ORIGIN, 설정 화면 두 주소 표시, 텔레그램 웹훅 새 주소 + `/api/telegram/migrate-webhooks`(관리자 로그인/CRON_SECRET). 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md`.
- 검수: 빌드·배포, 옛 콜백 → via=old 307, 새 콜백 → /login, migrate 비인증 401, 시험 계정 설정 화면 두 주소·버튼 표시. **시험 계정 연결은 기존 방식·새 주소 모두 Instagram "Invalid platform app" 오류** — 이번 변경 전부터 있던 시험 계정 앱 설정 문제로 판단(등록된 meta_app_id가 Instagram 로그인용 앱 ID가 아닐 가능성). 텔레그램 연동 1건(주인님 관리자 봇) 이전 미실행.

## 2026-10-16 v1.09 — Instagram 앱 ID 위치 안내 (Claude Code 윈도우)
- 원인 확인: 시험 계정(buylifemall@naver.com)의 `meta_app_id`에 Facebook(메타) 앱 ID가 들어 있음(같은 값으로 Facebook 인증 화면은 앱을 인식) → Instagram 로그인(`instagram.com/oauth/authorize`)이 "Invalid platform app"으로 거절. 코드 버그가 아니라 값 위치 혼동.
- 조치: 설정 화면 키 입력칸 위에 안내 상자(앱 대시보드 › Instagram › API 설정(Instagram 로그인)의 "Instagram 앱 ID/시크릿", 맨 위 "앱 ID"와 다름, 잘못 넣으면 Invalid platform app).
- 검수: 빌드·배포·DB 버전, 크롬에서 안내 상자 표시 확인. 시험 계정 값 교체는 주인님 직접(키 입력은 에이전트가 하지 않음).

## 2026-10-16 v1.10 — Instagram 앱 ID 안내 메뉴 이름 정정 (Claude Code 윈도우)
- 주인님이 보내준 실제 Meta 화면 기준으로 안내 경로를 "이용 사례 › 맞춤 설정 › (Instagram API) › Instagram 로그인이 포함된 API 설정"(화면 맨 위 Instagram 앱 이름·앱 ID·앱 시크릿 코드)으로 정정, 새 콜백은 같은 화면 "4. Instagram 비즈니스 로그인 설정"에 추가한다고 안내. 회원 매뉴얼(platform_guides cffe0d83…)도 같은 표현으로 정정.

## 2026-10-17 v1.11 — 등록 주소 한눈에 보기·복사 버튼 (Claude Code 윈도우)
- 주인님 요청(INSTA 포스팅 v1.14·쓰레드 3개와 같은 형식): 설정 화면에 `components/settings/InstagramMetaAddressSummary.tsx` 카드(앱 도메인 `buylife.xyz`+옛 호스트 / Instagram 로그인이 포함된 API 설정 › 4. Instagram 비즈니스 로그인 설정 › OAuth 리디렉션 URI 새·옛 / Instagram 앱 ID 위치(Facebook 앱 ID 넣으면 Invalid platform app) / 인스타 테스터 추가·초대 수락). 기존 콜백 주소 표시는 `CopyAddress`(복사 버튼)로 교체.
- 검수: 빌드·배포·DB v1.11, 크롬에서 카드 제목·복사 버튼 확인.

## 2026-10-17 v1.12 — 안내 상자 가독성 (Claude Code 윈도우)
- 주인님 요청: 노란 "Instagram 앱 ID" 안내 상자를 text-sm·leading-relaxed·문장별 단락으로(INSTA 포스팅 v1.14와 같게).
- 같은 날 시험 계정 Instagram 앱 ID 오류 원인 확인: 다시 저장하면서 맨 끝 1자리가 빠진 15자리 값 → Instagram "Invalid platform app". 주인님이 16자리로 재입력 후 시험 계정 DM [새 주소로 다시 연결] 성공(`dm_accounts` 갱신). 개선 제안: 앱 ID 저장 시 자릿수 검사.
- 검수: 빌드·배포·DB v1.12, 크롬에서 상자 모양 확인.

## 2026-10-17 v1.13 — 앱 ID·시크릿 저장 형식 검사 (Claude Code 윈도우)
- 주인님 승인 제안: 시험 계정 Instagram 앱 ID가 끝자리 빠진 15자리로 저장돼 "Invalid platform app"이 난 사례 → `saveApiKeyAction`에서 `*_app_id`는 숫자 15~16자리, `*_app_secret`은 영문·숫자 32자가 아니면 저장하지 않고 입력 글자 수와 함께 안내(기존 저장값은 영향 없음).
- 검수: 빌드·배포·DB v1.13. DM 화면(시험 계정)에서 "12345" 저장 시도 → 빨간 오류 표시·저장 안 됨·기존 값 유지 확인. 댓글·포스팅은 같은 코드.

## 2026-10-17 v1.14 — 디자인 리뉴얼: 스튜디오 댓글 콘솔 — 인스타 라이트 변형 (Claude Code 맥미니)
- `threads-comment-reply` v1.10 구성 이식 + 인스타 라이트(`ig-*`, 파랑 알약·그라데이션 포인트), 사이드바 그라데이션 막대·대기 배지·**휴대폰 ☰**, `/dashboard`·`/guide` 신설(`/`→`/dashboard`), 로그인까지 같은 배경. 서버 로직 변경 없음. 디자인: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md)
- **빌드·배포·화면 검수는 윈도우 CLI 대기.**
- 플랜: [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계: [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)

## 2026-10-17 v1.15 — 좌측 상단 제목 「INSTA 댓글 자동화」(유튜브 v1.11과 같은 형식, 플랫폼 구분) (Claude Code 맥미니)
- 주인님 승인(시험 계정 크롬 검수 중 발견·제안). 바뀐 파일: `components/layout/Sidebar.tsx`, 버전 파일. `tsc --noEmit` 오류 0.
- **빌드·배포·DB `v1.15`는 윈도우 CLI 대기**: `npm run build` → `vercel deploy --prod --yes` → `update programs set version='v1.15', updated_at=now() where slug='instagram-comment-reply';` → 1440·375px 제목 확인.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.16 — 실행 주소 비밀값 검사 보완 (Claude Code 윈도우)
- `app/api/cron/sync-comments`·`check-connection`(2곳)의 `auth === \`Bearer ${process.env.CRON_SECRET}\`` → `CRON_SECRET`이 비면 「Bearer undefined」를 보낸 누구나 통과하던 빈틈을 `Boolean(secret) && …`로 차단(회원 화면·동작 변화 없음). 지금은 Vercel에 `CRON_SECRET`이 등록돼 있어 실제로 뚫린 적은 없음 — 방어 보완. 근거·전체 목록: 루트 `docs/SCHEDULER_PRIORITY2_REVIEW_20261020.md` §2-1, `docs/ERROR_LESSONS.md` 2026-10-20.
- 검수: `tsc` 0, `npm run build`, 배포 `instagram-comment-reply-2wxr3mxiw`(Ready), DB `programs.version` v1.16, 운영 주소 실행 주소 무인증·`Bearer undefined` 모두 401, `/login` 200. 운영자 예약 호출이 원래 꺼져 있어 정상 호출 확인 대상 없음.
- 텔레그램 `migrate-webhooks`는 이미 「비밀값이 있을 때만」 검사, `webhookSecret.ts`는 비밀값이 없으면 오류로 멈춰 안전(변경 없음).

## 2026-10-20 v1.17 — 회원 연동 정보 공용 저장 ④단계 Instagram (Claude Code 윈도우)
- 연결 콜백이 `ig_accounts`와 공용 표 `member_platform_accounts`(platform `instagram`, `auth_method=instagram_login`, 댓글 권한)에 함께 저장. 읽는 곳(동기화·답글 게시·게시물 동기화·대시보드·연결 상태)은 `lib/instagram/memberAccount.ts` `getCommentAccount` — 댓글 권한 + Instagram 로그인 방식 + 재연결 필요 아님 + **계정 이름 있음**(자기 답글 거르기) 공용 계정 → 없으면 `ig_accounts`. 토큰 갱신·재연결 표시는 읽은 곳(공용이면 공용 표)에 기록. 해제는 공용 행도 삭제(설정 안내 문구). 매일 연결 점검 cron(`check-connection`)은 그대로 `ig_accounts`만 본다.
- 공용 부품 사본 `lib/memberIntegrations.ts`. 백필 `supabase/migrations/20261020160000_member_integrations_v1_17.sql`(공용 행 없는 회원만). 플랜 루트 `docs/PLAN_20261020_MEMBER_INTEGRATIONS_STEP4_INSTAGRAM.md`.

## 2026-10-20 v1.18 — 병합 B 1단계: INSTA DM답변 자동화를 이 앱 안으로 = 「INSTA 댓글·DM 자동화」 (Claude Code 윈도우)
- 주인님 결정·플랜: `docs/PLAN_20261020_DM_MERGE.md`(분석 루트 `docs/analysis-insta-consolidation-20261020/REPORT.md`). 두 프로그램 이용 권한 234명 동일 → 권한 이전 없음.
- DM 화면 `/dm`(홈)·`/dm/conversations`·`/dm/history`·`/dm/settings`·`/dm/guide`, 좌측 메뉴 「💬 DM 답변」 묶음, 좌측 상단 이름 「INSTA 댓글·DM 자동화」.
- 코드: DM 전용·내용 다른 lib 16개 `lib/dmApp/`(access는 이 앱 권한 `instagram-comment-reply`로), 컴포넌트 `components/dm/`, DB 형식 `types/database.types.ts`에 `dm_*` 표 추가. 같은 내용 공용 파일(supabase·auth·apiKeys·memberIntegrations·oauthState 등)은 이 앱 것을 씀.
- API: Meta DM 웹훅 `/api/instagram/dm-webhook/[userId]`(주소 그대로), DM 텔레그램 봇 웹훅 `/api/dm/telegram/webhook/[userId]`(댓글 봇과 분리, `user_telegram_links.program_slug='instagram-dm-reply'` 행 그대로), `/api/dm/telegram/migrate-webhooks`, `/api/dm/cron/check-connection`(자동 실행은 계속 꺼 둠). DM 웹훅·텔레그램 주소 기준 도메인은 이 앱(`lib/dmApp/oauthRedirect.ts`), 비밀값은 이 앱 `CRON_SECRET` 기준 → **기존 DM 연결(관리자 텔레그램 DM 봇, 관리자·시험 Meta DM 웹훅)은 한 번 다시 등록 필요**.
- **연결 한 번**: 설정 「계정 연결하기」에 「DM 답변도 사용」(기본 켬) → 메시지 권한(`instagram_business_manage_messages`)도 요청(`getInstagramAuthorizeUrl(..., withMessages)`), 콜백이 허락된 권한(`permissions`)에 메시지 권한이 있으면 `dm_accounts`에도 같은 토큰 저장 + 공용 표 권한 합쳐 기록. 이미 연결된 회원은 「💬 DM 답변도 쓰도록 다시 연결」. 연결 해제 시 `dm_accounts`도 삭제. DM 설정의 옛 DM 전용 연결 버튼은 안내로 교체.
- 남은 단계: 2단계(대시보드·기록 하나로), 3단계(옛 DM 주소 이동·카탈로그 DM 노출 중지·이름/소개 변경, 주인님 확인).

## 2026-10-20 v1.19 — 텔레그램 연동 실패 안내에 봇 이름 (Claude Code 윈도우)
- 주인님 DM 봇 재연동 중 「메시지를 찾지 못했어요」가 반복(봇 2개 — 댓글 `@aimaster_insta_bot`, DM `@aimaster_insta_dm_bot`). 원인 후보: 다른 봇 토큰 입력 / 옛 웹훅이 걸린 동안 보낸 메시지가 옛 앱으로 감. 실패 안내에 「입력한 토큰의 봇은 @○○ 입니다」(getMe)를 붙여 어느 봇에 메시지를 보내야 하는지 바로 보이게(`lib/actions/telegram.ts`·`lib/dmApp/actions/telegram.ts`의 `botNameHint`).
- Meta DM 웹훅 새 주소 등록 확인: 2026-10-20 Meta 확인 요청 GET `/api/instagram/dm-webhook/<관리자>` 200(주인님이 콜백 URL·인증 토큰 교체 후 확인 및 저장).

## 2026-10-20 v1.23 — 병합 B 2단계: 대시보드·기록 하나로, 이름 통일 (Claude Code 윈도우)
- 대시보드(`/dashboard`): 「검토 대기 DM」 카드, 「💌 DM 검토하기(n)」 버튼, 연결 상태에 「DM 답변(메시지 권한)」·「텔레그램 DM 알림」 추가(`dm_accounts`·`dm_messages`·`user_telegram_links` program_slug=instagram-dm-reply 조회).
- 기록: `components/HistoryTabs.tsx` — `/history`(댓글 답글)와 `/dm/history`(DM 답장)를 탭으로 오감.
- DM 홈·DM 매뉴얼의 「INSTA 댓글자동화와 함께 쓰면…」 외부 홍보 카드 → 같은 프로그램 안 댓글 메뉴 안내로 교체, FAQ 문구 수정.
- 회원에게 보이는 옛 이름(로그인 화면·브라우저 제목·권한 오류·연결 끊김 알림·텔레그램 연동 완료 메시지 등 10곳)을 「INSTA 댓글·DM 자동화」로 통일.
- 텔레그램 DM 봇 재연동은 v1.21 수정 후 성공(2026-10-20 18:56, 관리자) — 1단계 남은 재등록 항목 완료.
- 다음 첫 단계: 병합 B 3단계(주인님 확인 필요) — 옛 `instagram-dm-reply` 주소 이동·API 전달, 카탈로그 DM 노출 중지, DB 이름·소개 다시 쓰기, 역량 지도.

## 2026-10-20 v1.22 — 텔레그램 연동 실패 안내에 진단 정보 표시 (Claude Code 윈도우)
- v1.21 뒤에도 DM 봇이 「메시지를 찾지 못했어요」라서, 실패 안내 끝에 `[진단: 웹훅 걸림/없음(주소), 대기 수, 웹훅 오류, 받은 알림 개수·종류(채팅 종류)]`를 붙임(`telegramDiagnosis`, `lib/actions/telegram.ts`·`lib/dmApp/actions/telegram.ts`). 메시지 내용은 보여 주지 않음.
- 다음 첫 단계: 주인님 화면의 진단 문구로 원인 판단(웹훅이 다른 주소에 다시 걸림 → 다른 서비스가 봇 사용 중 / 받은 알림 0개 → 다른 곳이 getUpdates로 먼저 가져감 / message(group) → 그룹에서 보냄).

## 2026-10-20 v1.21 — 텔레그램 연동 확인이 메시지를 못 찾던 문제 수정 (Claude Code 윈도우)
- 증상: DM 봇(@aimaster_insta_dm_bot)에 말을 걸어도 「연동 확인하기」가 계속 「메시지를 찾지 못했어요」.
- 원인: 웹훅 등록 때 `allowed_updates: ["callback_query"]`로 지정하면 텔레그램이 그 값을 기억해, `deleteWebhook` 뒤 `getUpdates`(값 미지정)에서도 일반 메시지를 버림. 옛 DM 앱이 이 봇에 웹훅을 걸었던 상태였음.
- 수정: `lib/telegram/client.ts`·`lib/dmApp/telegram/client.ts`의 `findChatIdFromUpdates`가 `allowed_updates=["message"]`를 매번 지정. 수정 전에 보낸 메시지는 이미 버려졌으므로 「연동 확인하기」 한 번 → 메시지 보내기 → 다시 「연동 확인하기」.
- 남은 일: 옛 `instagram-dm-reply`에도 같은 코드가 있음(3단계에서 옛 앱 정리 예정이라 손대지 않음). 같은 패턴을 쓰는 다른 텔레그램 연동 프로그램 점검 필요.

## 2026-10-20 v1.20 — 텔레그램 칸에 댓글·DM 봇 구분 표시 (Claude Code 윈도우)
- 주인님 요청: 텔레그램 알림 연동 제목에 「💬 댓글 전용 봇」(API키등록·플랫폼연동)·「💌 DM 전용 봇」(DM 답변 설정) 배지와 「서로 다른 봇이어야 함(봇 하나에 연결 주소 하나)」 안내.

## 2026-10-20 v1.24 — 프로그램 공지 띠 추가 (Claude Code 윈도우)
- 공용 기준 코드 `program-notice-banner`(기준 `ai-webtoon-studio/src/components/ProgramNoticeBanner.tsx`) 사본을 받아 대시보드 레이아웃 `<main>` 맨 위에 표시. 메인 사이트 공지의 「관련 프로그램」에 이 프로그램이 있으면 최근 공지 1건(30일 이내), 「닫기」는 브라우저에 기억. 사본은 직접 고치지 않고 기준 수정 후 `node scripts/check-shared-modules.mjs --sync`.

## 2026-10-20 v1.24 — DM 설정 값 정리·매뉴얼 통합·INSTA 포스팅 템플릿 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261020_TEMPLATE_MANUAL.md`(주인님 승인). 같은 배포에 공지 띠 포함.
- ① `/dm/settings`: 제목 「DM 답변 설정」, Meta 키·OAuth 콜백(① 기존/② 새)·주소 요약 카드·AI 키 입력 중복 제거 → 「🔗 DM 답변 연결 상태」(Meta 키·인스타 DM 권한·AI 키 완료/필요) + API키등록 바로가기. 웹훅 안내: 옛 instagram-dm-reply 기준 등록이면 콜백 URL·확인 토큰 둘 다 교체(병합으로 토큰 바뀜). `/settings` 주소 요약 카드에 DM 웹훅 주소(③). 쓰이지 않게 된 `components/dm/settings/{ApiKeyRow,CopyAddress,InstagramMetaAddressSummary,InstagramConnectSection}.tsx` 삭제.
- ② `/guide` 통합 초보자 매뉴얼(5단계·복사 상자·텔레그램 봇 2개·옛 DM 회원 할 일·FAQ 6개), `/dm/guide` → `/guide`, 메뉴 「DM 매뉴얼」 제거. `docs/MANUAL_AND_INTEGRATION_GUIDELINES.md` 스타일 2·6·8.
- ③ 플로우 위저드 스타일(인스타 바이럴 변형) — 상세 `docs/DESIGN_HANDOFF.md`.
- 검수: tsc·build, 배포 `instagram-comment-reply-pk79kqebg` Ready, DB v1.24, 크롬 대시보드·매뉴얼·DM 설정·390px.

## 2026-10-21 — 텔레그램 연동 공용 모듈 `telegram-bot-client` (Claude Code 윈도우, 부계정)
- 이 프로그램의 텔레그램 `client.ts`는 공용 기준 파일(직접 고쳐도 됨 — 고친 뒤 `--sync`로 사본 9곳에 반영하고 그 프로그램들 확인). 동작 같음 — 다음 배포 때 버전 +0.01과 함께 나감.

## 2026-10-21 v1.26 — 댓글 검토 게시물 썸네일 · 대시보드 검토 대기 DM 목록 (Claude Code 윈도우)
- `app/(dashboard)/comments/page.tsx`: `ig_media` 조회에 `thumbnail_url, permalink` 추가, 게시물 묶음 머리의 🖼️ 자리에 40px 썸네일(누르면 인스타 원본 새 창, 썸네일 없으면 🖼️ 그대로).
- `app/(dashboard)/dashboard/page.tsx`: 검토 대기 DM 최근 3건(대화 검토 화면과 같은 조건 direction=in·status=pending_review, 고객 이름은 `dm_conversations` user_id 필터) 카드를 댓글 목록 아래에 추가. 빈 상태는 DM 사용 중이면 「검토할 DM이 없어요」, 아니면 켜는 안내. 댓글 빈 상태의 「DM 대기 n건」 문구는 새 카드로 옮겨 지움.
- 검수: tsc 0, `npm run build`, 배포 `instagram-comment-reply-oowmde9zx` Ready, DB v1.26, 메인 크롬(일반 회원)에서 대시보드 v1.26·새 DM 카드(빈 상태)·배치, 댓글 화면 정상. **시험 계정에 검토 대기 댓글·DM이 0건이라 썸네일·DM 목록이 실제로 그려진 모습은 미확인** — 첫 실제 대기 건이 생기면 확인. 비용: Vercel 빌드 1회, AI 0회.

## 2026-10-21 v1.27 — 대시보드 DM 카드: 24시간 남은 시간 · 급한 순 · 대화 바로가기 (Claude Code 윈도우)
- 주인님 지시(v1.26 보고의 추가개선 제안 1·2번).
- `app/(dashboard)/dashboard/page.tsx`: 대기 DM을 최근 50건까지 읽어 대화마다 최신 1건으로 묶고, `dm_conversations.last_inbound_at` + 24시간으로 남은 시간 계산(DM 검토 화면 `getWindowBadge`와 같은 기준). 남은 시간이 적은 순, 만료된 대화는 맨 뒤로 3건. 배지: ⏳ n시간 m분 남음(4시간 미만 경고색) / ⚠️ 답장 시간 만료. 항목 전체가 링크.
- `app/(dashboard)/dm/conversations/page.tsx`: 대화 묶음 `<section>`에 `id="conv-<id>"` + `scroll-mt-80`(고정 머리말에 가리지 않게).
- 검수: tsc 0, `npm run build`, 배포 `instagram-comment-reply-gcd6ieq1e` Ready, DB v1.27, 메인 크롬(일반 회원)에서 대시보드·DM 검토 화면(해시 주소 포함) v1.27 정상. **대기 DM 0건이라 배지·정렬·이동 위치는 실제 데이터로 미확인.** 비용: Vercel 빌드 1회, AI 0회. 커밋 `aa7fd5fc`.

## 2026-10-21 v1.28 — 대시보드 댓글 항목 썸네일 · 게시물 묶음 바로가기 (Claude Code 윈도우)
- 주인님 지시(v1.27 보고 추가개선 제안 1·2번). `app/(dashboard)/dashboard/page.tsx`: 검토 대기 댓글 조회에 `media_id`, `ig_media.thumbnail_url`(user_id 필터) 40px 썸네일, 항목 전체가 `/comments#media-<id>` 링크. `app/(dashboard)/comments/page.tsx`: 게시물 묶음 `<section>`에 `id="media-<id>"`+`scroll-mt-80`. 같은 형식을 쓰레드 v1.17·유튜브 v1.22에도 적용.
- 검수: tsc 0, build, 배포 `instagram-comment-reply-dt7ta1v0m` Ready, DB v1.28, 크롬(일반 회원) 대시보드 v1.28 정상. **대기 댓글 0건이라 썸네일·이동은 실제 데이터로 미확인.** 비용: Vercel 빌드 1회. 커밋 `a68fb4ff`.

## 2026-10-21 v1.29 — 공용 기준 코드 `pending-review-list`·`hash-highlight` 도입 (Claude Code 윈도우)
- 주인님 지시(v1.28 보고 추가개선 제안 1·2번). **이 프로그램이 두 공용 코드의 기준**: `components/PendingReviewList.tsx`(대시보드 검토 대기 목록 — 항목 배열 + 프로그램 색 `classes`), `components/HashHighlight.tsx`(주소 #id 묶음을 `color`로 2초 테두리 강조, hashchange도 처리). 사본은 `threads-comment-reply`·`youtube-auto-reply` 같은 경로 — **기준만 고치고 `node scripts/check-shared-modules.mjs --sync`**(등록: 스크립트·`docs/SHARED_MODULES.md`).
- 대시보드 댓글·DM 목록을 공용 부품으로 교체(모양·동작 같음, `LIST_CLASSES` ig 색). 댓글 검토(`#media-`)·DM 검토(`#conv-`) 화면에 `<HashHighlight color="#ec4899" />`.
- 검수: tsc 0, build, 배포 `instagram-comment-reply-3dpnktdri` Ready, DB v1.29, 크롬(일반 회원) 대시보드 v1.29·두 목록 빈 상태 정상, 댓글 화면에서 시험 칸을 만들어 # 이동 → 분홍 테두리 켜짐(`rgb(236, 72, 153) 0 0 0 2px`) → 2.2초 뒤 꺼짐 확인(시험 칸 즉시 삭제). 비용: Vercel 빌드 1회. 커밋 `aa745410`.

## 2026-10-21 v1.30 — 공용 기준 코드 `review-group-header` · 휴대폰 목록 누르는 영역 확대 (Claude Code 윈도우)
- 주인님 지시(v1.29 보고 추가개선 제안 1·2번). **새 기준 `components/ReviewGroupHeader.tsx`**(검토 화면 묶음 머리: 썸네일(원본 새 창) 또는 아이콘 · 제목 · 건수, 색은 `classes`) — 사본 `threads-comment-reply`·`youtube-auto-reply` 같은 경로, 기준만 고치고 `--sync`. `app/(dashboard)/comments/page.tsx` 묶음 머리를 이 부품으로(`HEADER_CLASSES` ig 색, 모양 같음).
- `components/PendingReviewList.tsx`(기준): 휴대폰(767px 이하)에서 항목 `min-h-[44px]`·위아래 12px·항목 간격 4px, 데스크톱(`md:`)은 예전 그대로. 사본 2곳도 같이 바뀜(각 배포에서 반영).
- 검수: tsc 0, build, 배포 `instagram-comment-reply-nhuzxugxz` Ready, DB v1.30, 크롬(일반 회원) 대시보드 v1.30, 400px iframe 안 시험 항목 계산값 min-height 44px·padding 12px / 데스크톱 0·4px, 댓글 화면 200. 대기 0건이라 실제 목록·묶음 머리 그림은 미확인. 비용: Vercel 빌드 1회. 커밋 `62d38496`.

## 2026-10-21 v1.31 — 토큰 갱신 코드 분리(동작 같음) + 게시 묶음 공용 기준 코드 등록 (Claude Code 윈도우)
- 통합 받은편지함(`comment-inbox`) 2단계 준비. `getValid…AccessToken`·`markNeedsReconnect`를 `"use server"` 연결 파일에서 `lib/instagram/token.ts`·`lib/dmApp/instagram/token.ts`로 그대로 옮기고(원래 함수와 글자까지 같음 확인) 쓰는 곳의 가져오기 경로만 바꿈. 덤: 연결 파일에서 내보내던 토큰 함수가 화면에서 부를 수 있는 서버 동작으로 노출될 여지도 없어짐.
- **이 프로그램의 게시 묶음(`lib/comments/post.ts`·계정 읽기·API 호출·토큰)은 이제 공용 기준 코드**(사본: `comment-inbox/`) — 고치면 `node scripts/check-shared-modules.mjs --sync` 후 받은편지함도 함께 배포. 등록부: `docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md` 15절.
- 검수: tsc·build, 배포 `instagram-comment-reply-2botsiudj` READY, DB v1.31, `/login` 200·연결 점검 실행 주소 무인증 401. 비용: Vercel 빌드 1회. 커밋 `f987efae`.

## 2026-10-21 v1.32 — 이중 게시 방지(처리 중 선점) · 통합 받은편지함 링크 (Claude Code 윈도우)
- **이중 게시 방지**: 공용 기준 게시 함수 `lib/comments/post.ts`·`lib/dmApp/dm/post.ts`에서 실제 게시 직전(`try` 앞)에 `replied_at`을 「처리 중 표시」로 조건부 선점(`status <> posted` 그리고 `replied_at`이 비었거나 2분 넘음 → 성공한 한 요청만 게시). 웹 승인·텔레그램 승인·자동 게시·통합 받은편지함이 동시에 와도 한 번만 게시. 실패하면 `status=failed, replied_at=null`로 표시 해제(DM은 고지 문구 미설정 조기 종료에서도 해제). DB 구조 변경 없음 — `replied_at`은 이력·통계 화면에서 `status=posted`와 함께만 읽혀 검토 대기 행에 남아도 화면 영향 없음(확인). 조건 문법은 없는 id로 운영 DB에 시험해 4개 표 모두 200·0행.
- **연계**: 대시보드 머리 버튼 줄에 「📥 통합 받은편지함에서 보기 ↗」(https://comment-inbox.buylife.xyz , 새 창).
- 검수: tsc·build, 배포 `instagram-comment-reply-a1ftgsvbn` READY, DB v1.32, 크롬 대시보드 새 버전·링크(새 창) 확인. 실제 동시 승인 시험은 대기 0건이라 미실행. 비용: Vercel 빌드 1회. 커밋 `77d2b9c8`.

## 2026-10-21 v1.33 — 텔레그램 승인 알림에 「📥 통합 받은편지함에서 보기」 링크 버튼 (Claude Code 윈도우)
- 공용 기준 `telegram-bot-client`(기준 `instagram-comment-reply/lib/telegram/client.ts`)의 `sendTelegramMessageWithButtons`에 선택 항목 `linkButton`(승인 버튼 줄 아래 URL 버튼 한 줄, 없으면 예전과 같음)을 추가하고 `lib/comments/sync.ts`(댓글, `?p=ig_comment`)·`lib/dmApp/dm/process.ts`(DM, `?p=ig_dm`)에서 받은편지함 주소를 넘김. 버튼을 눌러 처리하면 기존처럼 버튼 전체가 지워짐(링크 포함).
- 검수: tsc·build, 배포 `instagram-comment-reply-7rhrnsw0x` READY, DB v1.33, `/login` 200. 실제 텔레그램 알림은 새 댓글이 들어와야 나가서 미확인. 비용: Vercel 빌드 1회. 커밋 `802e89c8`.

## 2026-10-22 v1.34 — 대시보드에 「📊 최근 7일 응대」 그래프(통합 받은편지함과 같은 공용 기준 코드) (Claude Code 윈도우)
- 통계 카드 아래에 그래프: 회원 세션(RLS)으로 user_id·status=posted·replied_at ≥ 한국 시간 6일 전 0시(최대 5,000건)를 읽어 한국 시간 날짜별로 셈 — 댓글 답글(분홍)·DM 답장(보라) 두 색으로 쌓음, `ig_comments`·`dm_messages`. 기록이 없으면 「아직 응대 기록이 없어요」.
- 공용 기준 코드 사본(직접 고치지 말 것): `lib/weekChart/bucket.ts`(`week-reply-bucket`)·`components/weekChart/WeekReplyChart.tsx`(`week-reply-chart`), 기준은 `comment-inbox`. 고칠 때는 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- 검수: tsc·build, 커밋 `8dd8b1d2`(+ 버전 수정 `de75a1e6`), 배포 fjohgu63x → 952q4ho26 READY, DB v1.34, 크롬 대시보드에서 v1.34·그래프·합계 0건 확인, 400px 가로 넘침 없음(385=385). 기록 0건이라 높이 있는 막대는 미확인. 비용: Vercel 빌드 2회(버전 표시 실수로 다시 배포 1회 포함).

## 2026-10-22 v1.35 — 대시보드 그래프 막대를 누르면 그날 답한 목록(원래 댓글 + 보낸 답글) (Claude Code 윈도우)
- 공용 기준 코드 `week-reply-panel` 사본 `components/weekChart/WeekReplyPanel.tsx`(직접 고치지 말 것, 기준 comment-inbox) + 이 프로그램 서버 동작 `lib/actions/weekReplies.ts` `loadWeekDayRepliesAction`: 이용 권한 확인 → 회원 세션(RLS)·user_id·status=posted·한국 시간 그날 범위(최근 7일 안만, `weekDayRange`)·최근 50건, 원래 댓글·답글 앞 80자(`previewText`). 댓글(`ig_comments`)과 DM(`dm_messages` + `dm_conversations.customer_username`)을 합쳐 최근 것부터, 항목을 누르면 `/history`·`/dm/history`.
- 검수: tsc·build, 커밋 `472abe68`, 배포 `instagram-comment-reply-5u1lgetdy` READY, DB v1.35, 크롬 대시보드에서 v1.35·막대 7개·오늘 막대 누르면 「이날은 게시·발송한 답장이 없어요」(서버 왕복·오류 없음). 기록 0건이라 목록 항목 모양은 미확인. 비용: Vercel 빌드 1회.
- 같은 날 그래프 사본에 `noun` 선택 항목 추가(커밋 `10835a02`, 동작 같음) — **다음 배포 때 함께 나감**.

## 2026-10-22 미배포 공용 변경 안내
- **미배포 공용 변경 안내(2026-10-22, Claude Code 윈도우) — 다음에 이 프로그램을 배포할 때 버전 +0.01과 함께 나감**: 공용 기준 코드 사본 `components/weekChart/WeekReplyChart.tsx`·`WeekReplyPanel.tsx`·`lib/weekChart/bucket.ts`(문구 선택 항목·썸네일·`publicImageUrl`)이 저장소에서 바뀌었지만 이 프로그램 화면·동작은 같다(기본값 그대로). 사본은 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 배포 뒤 이 줄을 「배포됨(버전)」으로 바꾼다. 목록: 루트 `docs/SHARED_MODULES.md`.

## 2026-10-22 ⏸ 보류 — 7일 그래프 글자 크게 (주인님 지시: 「놔뒀다가 다음에 수정할때 그때 같이 빌드」)
- 무엇: 공용 그래프 사본 `components/weekChart/WeekReplyChart.tsx`·`WeekReplyPanel.tsx` 글자 한 단계씩 크게(제목 14→16px, 합계 12→14px, 막대 위 건수 11→14px, 날짜·요일 10→12px, 흐린 글자 투명도 60→80%, 그날 목록도 한 단계씩). 커밋 `9479f0bc`로 저장소에는 이미 반영됨.
- **이 프로그램 단독 배포는 하지 않는다.** 다음에 이 프로그램을 다른 이유로 수정해 배포할 때 **함께 빌드**되며, 그때 버전 +0.01·DB 버전 갱신·크롬에서 그래프 글자 크기 확인 후 이 항목을 「배포됨(버전)」으로 바꾼다. 쓰레드 쇼핑제휴(v1.79)에는 이미 배포됨.
