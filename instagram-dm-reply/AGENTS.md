# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **INSTA DM답변 자동화(instagram-dm-reply)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

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
4. **유료 API 호출** (OpenAI/Anthropic/Gemini 답장 초안 생성 등)
5. **실제 인스타그램 DM 발송(`postReplyAction`/`postDmReplyForUser`)** — 실제 고객에게 도달하는
   되돌리기 어려운 행동이다. **Meta 비즈니스 메시징 정책상으로는 DM 자동 응답 자체가 허용된다**
   (사람 승인을 요구하지 않음 — 대화 시작 시 "자동 응답임을 고지"하기만 하면 됨, ManyChat 등
   상용 서비스도 이 방식). 하지만 이 저장소는 **기존 3개 댓글자동화 프로그램과의 안전 철학
   일관성을 위해 기본값을 "검토 후 발송"으로 정했다**(2026-08-26 실사용자 결정) —
   `dm_settings.auto_approve`(기본 false)를 사용자가 설정 화면에서 위험 고지를 읽고 명시적으로
   동의 체크 후 켠 경우에만 검토 없이 즉시 발송된다. 이 흐름을 우회해서 기본값을 바꾸거나 동의
   없이 자동/일괄 발송하는 코드를 추가하지 말 것.
6. **대화별 자동 응답 고지 메시지 생략** — `postDmReplyForUser`는 그 대화에서 아직 고지를
   보낸 적이 없으면(`dm_conversations.disclosure_sent_at`이 비어있으면) 실제 답장보다 먼저
   고지 메시지를 반드시 보낸다. 이 순서를 건너뛰거나 고지 없이 답장만 나가게 하는 코드 변경은
   금지 — Meta 정책 요건이자 이 프로그램의 정책 준수 근거다.
7. **Vercel Cron(vercel.json의 crons) 활성화/배포** — `/api/cron/check-connection`은 실제
   DM을 읽거나 발송하지 않는 순수 상태 점검용이라 다른 발송 cron보다 리스크는 낮지만, 배포되는
   순간부터 매일 자동 실행되며 사용자에게 텔레그램 알림을 실제로 보낼 수 있으므로 배포 전
   확인한다.
8. **Meta 웹훅 실제 구독(App Dashboard에서 `messages` 필드 subscribe)** — 구독하는 순간부터
    실제 고객 DM이 이 앱으로 실시간 전달되기 시작한다. `dm_settings.bot_enabled`이 꺼져 있으면
    수신은 되어도 응답은 생성하지 않지만, 웹훅 자체를 켜는 것은 사용자가 직접 Meta 대시보드에서
    하는 행동이므로 에이전트가 대신 수행하지 않는다.

---

## 🎯 프로젝트 목적

인스타그램 비즈니스 계정으로 들어오는 DM(다이렉트 메시지)을 AI가 읽고 자연스러운 답장
초안을 만들어, 검토 후(또는 설정에서 켠 경우 자동으로) 발송하는 프로그램.
`instagram-comment-reply`(인스타 댓글자동화)와 `threads-comment-reply`/`youtube-auto-reply`를
만든 경험을 그대로 이식했다 — 다만 DM은 댓글과 달리 **1:1 사적 대화라 Meta 정책상 완전 자동
응답이 허용된다**는 점이 가장 큰 구조적 차이다(자세한 내용은 README.md 참고).

**댓글 3개 프로그램과 다른 점**: 저쪽은 폴링(Vercel Cron)으로 새 댓글을 주기적으로 확인하지만,
이 프로그램은 **Meta 웹훅으로 실시간 수신**한다 — 그래서 "예약 모니터링 주기" 개념이 없고, 대신
"봇 활성화" 온/오프 스위치(`dm_settings.bot_enabled`)만 있다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `instagram-dm-reply/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은
  `instagram-dm-reply/` 폴더 내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

instagram-dm-reply는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- instagram-dm-reply는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "instagram-dm-reply"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route
  (`app/api/instagram/callback/route.ts`)는 redirect 대신 결과 객체를 반환하는
  `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다. 단,
  `app/api/instagram/dm-webhook/[userId]/route.ts`와 `app/api/telegram/webhook/[userId]/route.ts`는
  Meta/Telegram 서버가 직접 호출하는 서버 간 웹훅이라 로그인 세션이 없다 — 대신 서명/시크릿
  검증(`verifyInstagramWebhookSignature`/`computeWebhookSecret`)으로 인증한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `meta_app_id`/`meta_app_secret`(인스타그램 OAuth + 웹훅 서명 검증) +
  `openai`/`anthropic`/`gemini`(답장 생성 AI, 고른 모델의 provider 키 하나만 있으면 됨) 총 5개
  provider를 쓴다(instagram-comment-reply와 완전히 동일 — 신규 provider 추가 없음).
- 사용자 소유 데이터 테이블(`dm_accounts`, `dm_settings`, `dm_conversations`, `dm_messages`)은
  `user_id` + RLS owner-only 정책으로 격리한다. 전역 공유 캐시는 없다.
- 텔레그램 알림은 프로그램 접두어 없는 공용 `user_telegram_links`를
  `(user_id, program_slug='instagram-dm-reply')`로 스코프해서 재사용한다 — 다른 프로그램에서
  이미 연동한 봇과는 독립적이다.

### Meta App ID/Secret — "본인 앱으로 App Review 건너뛰기" 패턴
instagram-comment-reply와 동일한 철학이다: 사용자가 각자 Meta App Dashboard에서 자기 소유의 앱을
만들고, 그 앱의 "역할" 메뉴에서 자기 자신을 테스터로 추가하면, Meta의 App Review 없이도 본인
계정만 즉시 연결해 쓸 수 있다. `instagram_business_manage_messages` 권한도 본인 테스터 계정
25개까지는 App Review 없이 즉시 사용 가능하다.

### 자기 자신 응답 무한 루프 방지 — echo 메시지 필터
threads-comment-reply에서 "봇이 방금 단 답글을 새 댓글로 착각해 또 답글을 다는 무한 루프"
버그를 발견/수정한 적이 있다. DM 웹훅에도 같은 버그 계열이 구조적으로 존재할 수 있어
(`app/api/instagram/dm-webhook/[userId]/route.ts`), Meta가 이 계정 스스로 보낸 메시지에 대해
`message.is_echo === true`로 표시해 웹훅으로 되돌려주는 이벤트는 항상 무시한다. 이 필터를
제거하거나 우회하는 변경은 절대 하지 말 것.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 인스타그램 계정 OAuth 연결(Instagram API with Instagram Login, `instagram_business_manage_messages` 스코프), Meta 웹훅 실시간 DM 수신, AI 답장 초안 생성(OpenAI/Anthropic/Gemini 중 선택), 검토 후 수동 발송 | ✅ 구현 완료 |
| 1 | 대화별 최초 1회 자동 응답 고지 메시지(`dm_conversations.disclosure_sent_at`) | ✅ 구현 완료 |
| 1 | "봇 활성화" 온/오프 스위치(`dm_settings.bot_enabled`/`bot_started_at`) — 웹훅 등록과 별개로 실제 응답 시작 여부를 사용자가 명시적으로 켠다 | ✅ 구현 완료 |
| 1 | 텔레그램 승인 버튼 — 새 DM+AI 초안을 텔레그램으로 보내면서 "✅ 답변승인/⏸ 답변보류/❌ 답변제외" 인라인 버튼 제공 | ✅ 구현 완료 |
| 1 | (선택, 고급) 자동 발송 옵션 — `dm_settings.auto_approve`, 기본 false. 켜면 검토 없이 AI 초안이 바로 발송(고지 메시지 포함)되고, 텔레그램에는 버튼 없는 결과 알림만 발송(youtube-auto-reply와 동일 패턴) | ✅ 구현 완료 |
| 1 | echo 메시지 필터(자기 응답 무한 루프 방지) | ✅ 구현 완료 |
| 1 | 발송 이력 대시보드(`/history`) | ✅ 구현 완료 |
| 2 | `programs` 카탈로그 등록(카테고리: 인스타) + 썸네일(Gemini 생성) | ✅ 구현 완료(2026-08-26) |
| 2 | Vercel 프로젝트 생성/배포(`vercel deploy --prod`, team `buylife`) — `programs.thumbnail_url`처럼 실사용자 계정 등록 전에도 먼저 진행함(2026-08-26) | ✅ 구현 완료 |
| 2 | Meta 앱 등록(본인 앱 + 테스터) + 인스타그램 계정 연결 + DM 웹훅 실제 구독 + 텔레그램 봇 연동 — 실사용자가 직접 완료, 가짜 웹훅 이벤트 주입 테스트로 서명검증→AI 초안 생성→텔레그램 승인 메시지까지 전체 파이프라인 정상 확인(2026-08-26/27) | ✅ 구현 완료 |
| 2 | 실제 인스타그램 계정 간 진짜 DM 테스트(Meta→우리 서버 실제 전송 경로 확인) + Vercel Cron 활성화 — 실사용자가 실제 DM을 주고받아 최종 검수한 뒤 진행 | ⏳ 예정(의도적으로 미착수) |
| 2+ | 퀵리플라이/버튼 등 `messaging_postbacks` 활용, `human_agent` 태그로 24시간 윈도우 연장, 대화 목록에 실제 프로필 사진 표시 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.05 (instagram-dm-reply)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.06 (Claude Code 윈도우)
- 새 주소 `https://instagram-dm-reply.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 /settings 재로그인 없이 열림(시험 계정 표시), 옛 주소 콜백 → 새 주소 307(시험 요청), 설정 화면 콜백 안내 옛 주소 그대로. 텔레그램 웹훅 기본 주소만 새 주소. 실제 계정 연결은 미시험
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.07 — 옛 vercel.app 삭제 대비 두 주소 지원 (Claude Code 윈도우)
- 기준 구현(threads-comment-reply v1.08)과 동일: `lib/oauthRedirect.ts`, 콜백 기본 옛 주소·[새 주소로 (다시) 연결](callback=new), 옛 주소 307에 via=old, 교환 redirect_uri 선택, 연결 후 이동 SITE_ORIGIN, 설정 화면 두 콜백 주소, 텔레그램 웹훅 새 주소 + `/api/telegram/migrate-webhooks`(관리자 로그인/CRON_SECRET). 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md`.
- **DM 웹훅(회원 Meta 앱 Webhooks의 콜백 URL, 앱당 1개)**: 설정 화면 안내를 새 주소(`SITE_ORIGIN/api/instagram/dm-webhook/<userId>`)로 바꾸고 "예전 vercel.app 주소로 등록했다면 새 주소로 바꿔주세요(지금 바꿔도 동작)" 안내 추가. 옛 주소도 삭제 전까지 계속 수신. 이미 등록한 회원은 본인이 Meta 앱에서 바꿔야 함(공지 대상).
- 검수: 빌드·배포, 옛 콜백 → via=old 307, 새 콜백 → /login, migrate 비인증 401, 새 주소 dm-webhook 검증 요청(틀린 토큰) 403 = 경로 동작. 시험 계정 설정 화면에 두 콜백 주소·새 DM 웹훅 주소·[새 주소로 다시 연결] 표시. 실제 연결·DM 수신은 미시험. 텔레그램 연동 1건(주인님 관리자 봇) 이전 미실행.

## 2026-10-16 v1.08 — Instagram 앱 ID 위치 안내 (Claude Code 윈도우)
- 원인 확인: 시험 계정(buylifemall@naver.com)의 `meta_app_id`에 Facebook(메타) 앱 ID가 들어 있음(같은 값으로 Facebook 인증 화면은 앱을 인식) → Instagram 로그인(`instagram.com/oauth/authorize`)이 "Invalid platform app"으로 거절. 코드 버그가 아니라 값 위치 혼동.
- 조치: 설정 화면 키 입력칸 위에 안내 상자(앱 대시보드 › Instagram › API 설정(Instagram 로그인)의 "Instagram 앱 ID/시크릿", 맨 위 "앱 ID"와 다름, 잘못 넣으면 Invalid platform app).
- 검수: 빌드·배포·DB 버전, 크롬에서 안내 상자 표시 확인. 시험 계정 값 교체는 주인님 직접(키 입력은 에이전트가 하지 않음).

## 2026-10-16 v1.09 — Instagram 앱 ID 안내 메뉴 이름 정정 (Claude Code 윈도우)
- 주인님이 보내준 실제 Meta 화면 기준으로 안내 경로를 "이용 사례 › 맞춤 설정 › (Instagram API) › Instagram 로그인이 포함된 API 설정"(화면 맨 위 Instagram 앱 이름·앱 ID·앱 시크릿 코드)으로 정정, 새 콜백은 같은 화면 "4. Instagram 비즈니스 로그인 설정"에 추가한다고 안내. 회원 매뉴얼(platform_guides cffe0d83…)도 같은 표현으로 정정.
