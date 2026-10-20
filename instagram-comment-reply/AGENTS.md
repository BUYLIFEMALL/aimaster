# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **인스타그램 댓글자동화(instagram-comment-reply)** 프로젝트에서 AI Agent(Claude Code
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
