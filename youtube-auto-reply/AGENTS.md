# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **유튜브 댓글자동화(youtube-auto-reply)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 변경은 루트 최신 지침에 따라 사전 승인 범위를 확인한 뒤 진행(초기 템플릿의 자율 허용 문구 정정)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (OpenAI 답글 초안 생성 등)
5. **실제 유튜브 댓글 게시(`postReplyAction`)** — 공개적으로 남는 되돌리기 어려운 행동이다.
   화면에서 사람이 "답변승인" 버튼을 직접 누르는 것 자체가 유튜브 개발자 정책(III.I.2조)이 요구하는
   "사전의 명시적 동의"이므로, 이 흐름을 우회해서 자동/일괄 게시하는 코드를 추가하지 말 것
   (Phase 2에서 "자동 승인" 옵션을 만들더라도 반드시 사용자가 설정에서 명시적으로 켠 경우에만).
6. **Vercel Cron(vercel.json의 crons) 활성화/배포** — `/api/cron/check-connection`은 실제
   댓글을 읽거나 게시하지 않는 순수 상태 점검용이라 다른 발송 cron보다 리스크는 낮지만, 배포되는
   순간부터 매일 자동 실행되며 사용자에게 텔레그램 알림을 실제로 보낼 수 있으므로 다른 cron과
   동일하게 배포 전 확인한다.

---

## 🎯 프로젝트 목적

유튜브 채널에 새 댓글이 달리면 AI가 내용을 읽고 자연스러운 답글(원하는 링크 포함)을 초안으로
만들고, 채널 운영자가 검토·수정 후 게시하는 프로그램. 기본은 채널의 모든 영상이 대상이고,
영상별로 개별 on/off할 수 있다.

**참고할 Make.com 시나리오 없이 완전 신규로 기획한 서브프로젝트**다. 유튜브 정책 준수 설계
배경(왜 "사람이 검토 후 게시"가 핵심 안전장치인지, `quotaUser` 사용 이유 등)은
[README.md](README.md) 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `youtube-auto-reply/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `youtube-auto-reply/` 폴더
  내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

youtube-auto-reply는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- youtube-auto-reply는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "youtube-auto-reply"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route
  (`app/api/youtube/callback/route.ts`)는 redirect 대신 결과 객체를 반환하는
  `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `google_client_id`/`google_client_secret`(유튜브 OAuth,
  shots와 provider 공유 가능하나 리디렉션 URI는 별도 등록 필요) + `openai`/`anthropic`/`gemini`
  (답글 생성 AI, `/settings`에서 고른 모델의 provider 키 하나만 있으면 됨 — `lib/ai/models.ts`의
  `getReplyModelProvider()`로 판정) 총 5개 provider를 쓴다.
- 사용자 소유 데이터 테이블(`ytreply_accounts`, `ytreply_videos`, `ytreply_settings`,
  `ytreply_comments`)은 `user_id` + RLS owner-only 정책으로 격리한다. 전역 공유 캐시는 없다
  (채널/댓글 데이터는 사용자마다 완전히 독립적이어야 함).
- 텔레그램 알림은 프로그램 접두어 없는 공용 `user_telegram_links`(real_estate_sales가 만듦,
  `docs/PLATFORM_PATTERNS.md` §9)를 `(user_id, program_slug='youtube-auto-reply')`로 스코프해서
  재사용한다 — 다른 프로그램에서 이미 연동한 봇과는 독립적이다.
- 텔레그램 승인 버튼(답변승인/답변보류/답변제외)은 사용자마다 자기 봇을 쓰는 구조라 사용자 식별용
  웹훅을 새로 등록한다(`setTelegramWebhook`, `lib/actions/telegram.ts`의 연동/해제 시점에
  등록/해제). 웹훅 URL(`/api/telegram/webhook/[userId]`)에 담긴 user_id만으로는 제3자가
  URL을 알아내 가짜 승인 요청을 보낼 수 있으므로, `CRON_SECRET`을 시드로 한 HMAC
  (`computeWebhookSecret()`)을 텔레그램의 `secret_token`으로 함께 등록해 매 요청마다
  `X-Telegram-Bot-Api-Secret-Token` 헤더로 검증한다. "보류"는 별도 상태값 없이 그냥
  `pending_review`로 남겨서 웹 검토 화면에 계속 보이게 하는 방식이다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 유튜브 채널 OAuth 연결, 영상 동기화 + 영상별 모니터링 on/off + 링크 오버라이드, 신규 댓글 수집 + AI 답글 초안 생성, 검토 후 수동 게시 | ✅ 구현 완료 |
| 2 | 매일 Vercel Cron으로 채널 연결 상태 점검 + 끊기면 텔레그램 알림(`/api/cron/check-connection`), 화면 전체에 재연결 배너 표시 | ✅ 구현 완료 |
| 2 | 예약 모니터링 — 사용자별 확인 주기(5분~24시간) 선택 + 시작/중지 + "이 시점 이후 댓글만" 커트오프, Vercel Cron이 5분마다 깨워서 사용자별 주기를 판정(`/api/cron/sync-comments`, `real_estate_sales`의 dispatch 패턴 재사용). 자동으로는 초안 생성까지만, 게시는 여전히 사람 승인 | ✅ 구현 완료 |
| 2 | 텔레그램 승인 버튼 — 새 댓글+AI 초안을 텔레그램으로 보내면서 "✅ 답변승인/⏸ 답변보류/❌ 답변제외" 인라인 버튼을 함께 제공. 웹 화면 없이도 텔레그램에서 바로 승인 가능(초안 수정이 필요하면 여전히 웹 화면 이용) | ✅ 구현 완료 |
| 2 | (선택) "자동 게시" 토글 — 사용자가 설정에서 체크박스로 위험 고지에 동의하고 명시적으로 켠 경우에만 검토 없이 바로 게시(`ytreply_settings.auto_approve`, 기본값 false) | ✅ 구현 완료 |
| 2 | 답글 이력 대시보드(`/history`) — 총 게시 수/최근 7일 게시 수/검토 대기 수 + 최근 게시된 답글 목록(최대 50건) | ✅ 구현 완료 |
| 2 | 답글 생성 AI 다중 provider 지원 — OpenAI 외 Anthropic Claude/Google Gemini 모델 추가(`lib/ai/models.ts`, `lib/ai/reply.ts`). 각 provider 최신 세대 모델을 실제 API 호출로 검증 후 반영, 폐기된 모델(`gemini-2.5-flash-lite` 등)은 제외 | ✅ 구현 완료 |
| 2 | `/videos` 일괄 작업 — 체크박스로 여러 영상 모니터링 시작/중지·숨기기 일괄 처리(`VideosList.tsx`, stepmail의 벌크 선택 패턴 재사용) | ✅ 구현 완료 |
| 2 | 웹훅 재등록 버튼(`ReregisterWebhookButton.tsx`) — 텔레그램 승인 버튼이 응답하지 않을 때 사용자가 직접 웹훅을 다시 등록하는 자가 복구 기능 | ✅ 구현 완료 |
| 2 | 채널 소유자 본인 댓글 필터 — `commentThreads.list`는 최상위 댓글만 반환하는 구조라 threads-comment-reply에서 발견한 "본인 답글을 새 댓글로 착각"하는 무한 루프는 구조적으로 재현되지 않지만, 채널 소유자가 본인 명의로 남긴 최상위 댓글까지 AI가 답글 달지 않도록 방어적으로 필터 추가(2026-08-26) | ✅ 구현 완료 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (youtube-auto-reply)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://youtube-auto-reply.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 /settings 재로그인 없이 열림(시험 계정 표시), 옛 주소 콜백 → 새 주소 307(시험 요청), 설정 화면 콜백 안내 옛 주소 그대로(회원 Google 앱 변경 불필요). 텔레그램 웹훅 기본 주소만 새 주소. 실제 계정 연결은 미시험
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.08 — 옛 vercel.app 삭제 대비 두 주소 지원 (Claude Code 윈도우)
- 기준 구현(threads-comment-reply v1.08)과 동일: `lib/oauthRedirect.ts`, 콜백 기본 옛 주소·[새 주소로 연결](callback=new), 옛 주소 307에 via=old, 교환 redirect_uri 선택, 연결 후 이동 SITE_ORIGIN, 설정 화면 두 주소 표시, 텔레그램 웹훅 새 주소 + `/api/telegram/migrate-webhooks`(관리자 로그인/CRON_SECRET). 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md`.
- 검수: 빌드·배포, 옛 콜백 → via=old 307, 새 콜백 → /login, migrate 비인증 401, 시험 계정 설정 화면 두 주소·[새 주소로 연결] 표시. 시험 계정에 Google Client ID 미등록이라 구글 인증 화면 확인은 못 함. 텔레그램 연동 1건(주인님 관리자 봇) 이전 미실행.

## 2026-10-17 v1.09 — 디자인 리뉴얼: 유튜브 다크 콘솔 스타일 — 스튜디오 댓글 콘솔 변형 (Claude Code 맥미니)
- `#0f0f0f` + 유튜브 레드, 사이드바 빨간 막대·대기 배지·휴대폰 ☰, `/dashboard`·`/guide` 신설(`/` → `/dashboard`), 댓글을 유튜브 댓글 모양(아바타·들여쓴 답글 초안)으로, 로그인까지 다크. 서버 로직 변경 없음. 디자인: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md)
- **Windows 빌드·배포·무료 화면 검수 완료(v1.09, 소스 a7d5dc62).** 운영 DBv1.09, 실제 Edge로컬8/운영8·합성9·권한/키/시간14 통과. 실제 게시/AI/영상동기화0.
- 플랜: [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계: [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)

## Windows v1.09 인수 완료 (2026-10-17 Codex)

[최신 검수·배포 기록](docs/IMPROVEMENT_HANDOFF_20261017.md)의 마지막 절을 먼저 읽습니다. Next15.5.27/React19 호환·보안, 소유자 제목 조회/빈 UUID, 권한 관리자 조회, 한국시간 및375px 오류를 보완했습니다. 미연결 일반 회원 화면과 합성 페이지를 분리 검사하며 실제 게시/AI/동기화·텔레그램 이전은 이 작업에서 실행하지 않습니다. 기존 Cron 정의 유지.

운영 배포 dpl_A8cU1FgnHP9dHuUxTERFp9MNp28W READY. 관리자 텔레그램 이전·잔여 의존성·30일 보관 적용 확인은 미완료로 인수인계하며 전체 연동 성공으로 확대하지 않습니다.

## 2026-10-17 v1.10 — v1.09 후속 마무리: 이력 검색·페이지·조회 오류 안내·30일 보관 (Claude Code 윈도우)
- 주인님 지시 "마무리해줘"(IMPROVEMENT_HANDOFF_20261017 후속 항목).
- **#7** `/history`: 최근 50건 고정 → 검색(댓글·답글·작성자, GET `?q=`, PostgREST or 문법 깨는 문자 제거·50자 제한) + 20건씩 페이지(`?page=`, 이전/다음·n/총 페이지·건수).
- **#13** `components/ui/LoadErrorNotice.tsx`: `/history`·`/comments` 조회 실패 시 "없음" 대신 "불러오지 못했어요" 안내.
- **#16** 30일 보관: `/api/cron/cleanup-comments`(CRON_SECRET, `vercel.json` 매일 18:40 UTC=03:40 KST). **행은 지우지 않고 내용만 비움** — sync가 `youtube_comment_id`로 처리 여부를 판단하므로 행 삭제 시 같은 댓글 재초안(유료)·자동 게시 회원 중복 공개 게시 위험. 30일 지난 `pending_review`는 `skipped`(만료), 30일 지난 모든 기록은 `comment_text=''`·작성자·AI 답글 null. 이력 목록은 비워진 기록 제외(개수엔 포함). 운영 첫 실행 대상: 11건(1명, 모두 30일 경과, 대기 2건).
- **#8** 관리자 텔레그램 웹훅 이전: 2026-10-16 이미 완료(`docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md` §8 — getWebhookInfo로 새 주소·오류 없음 확인). 미완 아님.
- 범위 밖: #6 선택 일괄 승인(실제 공개 게시 기능, 별도 승인), #11 잔여 의존성 경고(Next16·Tailwind4 이전 필요), #12 토큰 갱신.

## 2026-10-17 v1.11 — 좌측 상단 제목 「YOUTUBE 댓글 자동화」 (Claude Code 맥미니)
- 주인님 지시: 사이드바 로고 옆 제목 `댓글자동화` → `YOUTUBE 댓글 자동화`(`components/layout/Sidebar.tsx` Brand — 데스크톱·휴대폰 위쪽 바 공통). `tsc --noEmit` 오류 0.
- **빌드·배포·DB v1.11은 윈도우 CLI 대기**(맥미니 원칙 18-④). 확인: 1440·375px에서 제목이 잘리지 않는지(`truncate`).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.12 — ⏰ 예약 댓글 모니터링 실행 방식 회원 선택 + 중복 실행 방지·이용 권한 확인·비밀값 검사 (Claude Code 윈도우)
- 주인님 「2순위도 적용하고 권한 확인도 넣어줘」. 지침 루트 `docs/SCHEDULER_POLICY.md`, 플랜 `docs/PLAN_20261020_MEMBER_SCHEDULER.md`, 기준 `booking-reminder`·`stepmail` v1.21.
- 정기형: 모니터링을 **시작하면** 회원 cron-job.org 작업 켜기, **중지하면** 끄기(「남은 일」 = 모니터링 켜짐 1/0). 회원 cron-job.org도 **5분마다** 깨우고 실제 확인은 회원이 고른 주기(5분~24시간)로 판단. Next 15라 회원 실행 주소는 `after`.
- 코드: `lib/schedulerMember/`(표 `ytreply_member_scheduler`, 토큰 `ytreply_…`, 끄기 스위치 `YTREPLY_PLATFORM_SCHEDULER=off`), `dispatch.ts`(운영자 주소에서 옮긴 실행 로직 + **이용 권한 확인** + **조건부 `last_run_at` 선점**), `lib/programAccess.ts`(사본), `/api/cron/sync-comments`(제외 목록), 새 `/api/cron/dispatch-member`, `lib/actions/monitoring.ts` 시작/중지 때 작업 맞추기(준비가 안 되면 모니터링을 다시 끄고 안내), `settings.ts`·타입·이름표에 `cronjob_org_api_key`. **예약 주소 4곳 모두 `CRON_SECRET` 빈 값이면 401**(sync·dispatch-member·check-connection·cleanup-comments). 연결 점검·30일 정리는 운영 관리 작업이라 운영자 실행 그대로.
- 화면: 설정 「⏱ 예약 모니터링」 위 실행 상태 줄·일시정지/재개, 새 「⏰ 예약 발행」 구역(방식 선택 + 키 칸, 유튜브 다크 색), `/guide` FAQ. DB(운영 `esgxyikcnnvmlhygjkth`): `supabase/migrations/20261020170000_ytreply_member_scheduler.sql` — 크롬 SQL Editor 적용, 결과 `ytreply_member_scheduler`·`v1.12`. `package.json` 1.12.0.
- 검수: tsc 0, build, `test:permissions` 전부 PASS(`test:runtime`은 로컬 서버를 따로 띄우는 Codex 도구라 미실행, 결과 파일 되돌림), 커밋 `3091a189`, 배포 `youtube-auto-reply-1ehpbw5to`(Ready), 예약 주소 4곳 무인증·`Bearer undefined`·가짜 토큰 401, `/login` 200. 크롬(관리자): 설정 v1.12·상태 줄 「AIMaster 기본(Vercel) 실행 중 · 모니터링 켜짐」·예약 발행 구역·공용 키 「등록됨」 → 일시정지 → 재개 정상(DB paused false 복귀, 관리자 실제 모니터링 24시간 주기·마지막 확인 시각 그대로). **「내 cron-job.org」 실검수는 미실행** — 2026-10-20 cron-job.org 하루 호출 한도 소진, 관리자 실제 모니터링이 켜져 있어 방식 전환은 한도가 풀린 뒤.
- 발견(공용, 미수정): 「내 cron-job.org」로 바꿀 때 `setMemberSchedulerMode`가 방식을 먼저 저장한 뒤 작업을 켠다 → cron-job.org가 실패하면 방식은 cronjob인데 작업이 없어 운영자 실행에서도 빠져 **모니터링이 멈춘다**(화면엔 오류 안내). 공용 기준 수정 때 실패하면 방식을 되돌리기 — 루트 `docs/SCHEDULER_POLICY.md` 공용 개선 대기.

## 2026-10-20 v1.13 — 예약 공용 코드 「실패 시 상태 되돌리기」 (Claude Code 윈도우)
- 주인님 「순서대로 진행해줘」(남은 일 4번). 「내 cron-job.org」로 바꿀 때 cron-job.org 작업 켜기가 실패하면(하루 호출 한도 초과·키 오류) **이전 방식으로 되돌림**(예전엔 cronjob으로 남아 운영자 실행에서도 빠져 예약이 멈출 수 있었음), 「재개」가 실패하면 **일시정지 상태로 되돌림**(예전엔 화면은 일시정지·DB는 대기로 어긋남). `memberScheduler.ts`의 `setMemberSchedulerMode`·`resumeMemberScheduler` 두 곳, 11개 사본 같은 수정. 커밋 `ccf80d68`, DB 버전 크롬 SQL Editor로 갱신, 11개 순차 배포 모두 Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `youtube-auto-reply-f4kb8eca2`.
- 실검수는 같은 코드인 booking-reminder에서 실패 경로 3가지를 실제로 확인(cron-job.org 하루 한도 소진 상태 이용).

## 2026-10-20 v1.14 — 회원 연동 정보 공용 저장 ⑤단계 YouTube (Claude Code 윈도우)
- 연결 콜백이 `ytreply_accounts`와 공용 표 `member_platform_accounts`(platform `youtube`, 권한 `youtube.force-ssl`, 갱신 토큰, `app_ref`=회원 `google_client_id`)에 함께 저장. 읽는 곳(영상 동기화·댓글 동기화·답글 게시·대시보드·연결 상태)은 `lib/youtube/memberAccount.ts` `getYtReplyAccount` — 채널 관리 권한 + 갱신 토큰 있음 + 재연결 필요 아님 + **공용 계정의 앱이 지금 등록한 Client ID와 같음**(갱신 토큰은 발급 앱으로만 쓸 수 있음) → 없으면 `ytreply_accounts`. 접근 토큰 갱신·재연결 표시는 읽은 곳에 기록, 해제는 공용 행도 삭제(설정 안내 문구). 매일 연결 점검·30일 정리 cron은 그대로 `ytreply_accounts`만 본다.
- shots(업로드 권한)와 권한이 달라 서로의 공용 토큰은 쓰지 않는다(권한 합치지 않음). 공용 부품 사본 `lib/memberIntegrations.ts`. 백필 `supabase/migrations/20261020200000_member_integrations_v1_14.sql`. `package.json` 1.14.0. 플랜 루트 `docs/PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md`.

## 2026-10-20 v1.16 — YouTube 연결 하나로 합치기 (Claude Code 윈도우)
- 버전 정정: 처음 v1.15로 커밋(`b8b6ded6`)했으나 다른 세션이 4분 앞서 예약 공용 코드 수정(`630027f0`)을 v1.15로 배포해 번호가 겹쳐 v1.16으로 다시 매김. v1.16 배포에는 두 수정이 모두 들어 있다.
- 연결 화면에 「다른 YouTube 프로그램 권한도 함께 받기」(연결 전: 체크칸, 연결 후: 「…함께 받아 다시 연결」 버튼). 켜면 `force-ssl`·`upload`·`readonly`를 `include_granted_scopes=true`로 한 번에 요청(`lib/youtube/client.ts` `getYoutubeAuthorizeUrl` 선택 인자, `ALL_YOUTUBE_SCOPES`는 `lib/youtube/memberAccount.ts`). 콜백은 공용 표 `granted_scopes`에 **Google 토큰 응답의 실제 받은 권한(`scope`)** 을 기록 → shots(업로드 권한)도 같은 공용 토큰을 쓸 수 있다. 회원이 동의 화면에서 일부를 빼면 받은 것만 기록돼 각 프로그램은 자기 표로 돌아간다. 기본(체크 안 함)은 예전과 같다.
- 플랜 루트 `docs/PLAN_20261020_YOUTUBE_SCOPES_AND_SHOTS_FB_KEY.md`. `package.json` 1.16.0.

## 2026-10-20 v1.15 — 일시정지 안전 처리·상태 줄 즉시 갱신 (Claude Code 윈도우)
- 예약 공용 코드 보강(구글폼 CRM v1.12 등 6개와 같은 수정): ① `pauseMemberScheduler`가 일시정지를 먼저 저장하고 cron-job.org 끄기는 시도만(실패 시 「작업 끄기는 다음 호출 때 다시 시도」 안내), 회원 실행 주소가 `skipPausedMember`로 일시정지 회원을 건너뛰고 작업 끄기를 다시 시도 ② 상태 줄이 서버 값 변화를 따라감(`useEffect`). 커밋 `630027f0`, DB 버전 크롬 SQL Editor, 배포 `youtube-auto-reply-b4ves98m3` Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401.

## 2026-10-20 v1.18 — 방식이 다른 회원 토큰 호출 시 cron-job.org 작업 끄기 (Claude Code 윈도우)
- 회원 토큰 확인(`memberIdForToken`)에서 토큰은 맞지만 실행 방식이 「내 cron-job.org」가 아니면 지금처럼 401을 돌려주되 **cron-job.org 작업을 끄고 `active: false`로 정리**(재개·방식 변경이 겹쳐 작업이 켜진 채 남으면 5분마다 401 헛호출이 이어지던 문제). 직전 배포(c69b0407)의 `skipPausedMember` 방식 조건은 토큰 확인이 먼저 401로 걸러 닿지 않는 코드였으므로 일시정지만 보는 원래 조건으로 되돌림. 커밋 `be5c5107`, DB 버전 크롬 SQL Editor, 15개 순차 배포 Ready·가짜 토큰 401.
- 재현 검수(상품소싱, 관리자): 작업을 켠 뒤 DB 방식만 Vercel로 → 11:00 회원 실행 401 + 작업 꺼짐(`active: false`) → 11:05~11:34 호출 없음. 시험 전 상태로 복귀.

## 2026-10-20 (버전 변경 없음·미배포) — 회원 예약 실행 방식 코드를 공용 기준 코드 `member-scheduler` 사본으로 (Claude Code 윈도우)
- 한 일: `lib/schedulerMember/memberScheduler.ts`를 **공용 기준 코드 `member-scheduler`의 사본**으로 바꿨다(기준 `cardnews-studio/src/lib/instagram/memberScheduler.ts`, 인스타 4개 + 예약 프로그램 11개 = 15개). 이 프로그램만의 값(사이트 주소·실행 방식 표·토큰 앞글자·관리자 끄기 환경변수·설치 키트 여부·「남은 일」 세기·실행 주소)은 같은 폴더에 새로 만든 `schedulerConfig.ts`로 옮겼다(원래 파일 값과 자동 대조 일치). **앞으로 `memberScheduler.ts`는 직접 고치지 말고** 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- 동작 변경 없음(관리자가 Vercel 방식을 끈 경우의 오류 문구만 운영/키트로 나뉨). DB 변경 없음. 플랜 `cardnews-studio/docs/PLAN_20261020_MEMBER_SCHEDULER_SHARED.md`.
- 검수: tsc·build 통과(테스트가 있는 프로그램은 테스트도), 공용 코드 점검 일치, 설치 키트 DB 대조 통과.
- **미배포**(내부 정리): 다음 배포 때 함께, 버전 +0.01도 그때. 그 배포 때 예약 상태 화면과 회원 실행 주소 가짜 토큰 401을 확인.

## 2026-10-20 v1.19 — 텔레그램 연동 확인이 메시지를 못 찾는 문제 예방 (Claude Code 윈도우)
- 원인: 웹훅 등록 때 `allowed_updates:["callback_query"]`를 지정하면 텔레그램이 그 값을 기억해, 웹훅을 지운 뒤 `getUpdates`(값 미지정)에서도 일반 메시지를 버림 → 연동 해제 후 다시 연동하면 「메시지를 찾지 못했어요」가 반복됨(2026-10-20 instagram-comment-reply v1.21에서 실제 발생·해결). 수정: `telegram/client.ts` `findChatIdFromUpdates`가 `allowed_updates=["message"]`를 매번 지정.
- 검수: tsc 통과, 배포·DB 버전 v1.19. 실제 텔레그램 재연동 시험은 하지 않음(회원 봇 없음).

## 2026-10-20 v1.20 — 프로그램 공지 띠 추가 (Claude Code 윈도우)
- 공용 기준 코드 `program-notice-banner`(기준 `ai-webtoon-studio/src/components/ProgramNoticeBanner.tsx`) 사본을 받아 대시보드 레이아웃 `<main>` 맨 위에 표시. 메인 사이트 공지의 「관련 프로그램」에 이 프로그램이 있으면 최근 공지 1건(30일 이내), 「닫기」는 브라우저에 기억. 사본은 직접 고치지 않고 기준 수정 후 `node scripts/check-shared-modules.mjs --sync`.

## 2026-10-21 — 텔레그램 연동 공용 모듈 `telegram-bot-client` (Claude Code 윈도우, 부계정)
- 이 프로그램의 텔레그램 `client.ts`는 공용 사본(직접 고치지 말 것 — 기준 `instagram-comment-reply/lib/telegram/client.ts`만 고치고 `--sync`). 동작 같음 — 다음 배포 때 버전 +0.01과 함께 나감.

## 2026-10-21 v1.21 — 대시보드 검토 대기 목록 형식을 INSTA와 맞춤 (Claude Code 윈도우)
- 주인님 지시(INSTA 댓글·DM v1.26 보고의 추가개선 제안 3번 — 나중에 「통합 댓글 받은편지함」으로 묶기 쉽게). `app/(dashboard)/dashboard/page.tsx`: 「🕒 검토를 기다리는 댓글」 제목 옆에 `{pending}건`, 「전체 보기 →」를 제목 줄 오른쪽 위로 옮겨 항상 표시(대기 0건이면 사라지던 목록 아래 「모두 보기」 제거). 목록 항목·서버 로직은 그대로. `package.json` 버전이 1.18.0에 머물러 있어 1.21.0으로 맞춤.
- 같은 배포에 저장소에만 반영돼 있던 공용 사본 2개(예약 `member-scheduler` 사본 전환, 텔레그램 `telegram-bot-client`)도 함께 나감 — 둘 다 동작 같음.
- 검수: tsc 0, `npm run build`, 배포 `youtube-auto-reply-lyon4v0rf` Ready, DB v1.21, 회원 실행 주소 `/api/cron/dispatch-member` 가짜 토큰 401·`/login` 200, 메인 크롬(일반 회원) 대시보드 v1.21·「0건」·「전체 보기 →」, 설정 화면 예약 상태 줄(「AIMaster 기본(Vercel) 실행 중 · 모니터링 꺼짐」)·예약 발행 구역 정상. 비용: Vercel 빌드 1회, AI 0회. 커밋 `bb422f1d`.
- `docs/evidence/permissions.json`·`runtime-local.json`의 미커밋 변경은 다른 CLI 것이라 건드리지 않음.

## 2026-10-21 v1.22 — 대시보드 댓글 항목 영상 썸네일 · 영상 묶음 바로가기 (Claude Code 윈도우)
- 주인님 지시(INSTA v1.27 보고 추가개선 제안 1·2번, 세 댓글 프로그램 동작 통일 — INSTA v1.28·쓰레드 v1.17과 같은 형식). `app/(dashboard)/dashboard/page.tsx`: 검토 대기 댓글 조회에 `video_id`, `ytreply_videos.thumbnail_url`(user_id 필터, 빈 목록이면 조회 생략 — 댓글 화면과 같은 방식) 16:10 썸네일, 항목 전체가 `/comments#video-<id>` 링크. `app/(dashboard)/comments/page.tsx`: 영상 묶음 `<section>`에 `id="video-<id>"`+`scroll-mt-80`. `package.json` 1.22.0.
- 검수: tsc 0, build, 배포 `youtube-auto-reply-p9snxg1y6` Ready, DB v1.22, 크롬(일반 회원) 대시보드 v1.22·댓글 화면 200. **대기 댓글 0건이라 썸네일·이동은 실제 데이터로 미확인.** 비용: Vercel 빌드 1회. 커밋 `077d81c8`. `docs/evidence/*.json` 미커밋 변경은 다른 CLI 것이라 건드리지 않음.

## 2026-10-21 v1.23 — 공용 기준 코드 `pending-review-list`·`hash-highlight` 사본 적용 (Claude Code 윈도우)
- 대시보드 「검토를 기다리는 댓글」 목록을 공용 부품 `components/PendingReviewList.tsx`로(영상 썸네일 `thumbShape="wide"`), 댓글 검토 화면에 `components/HashHighlight.tsx`(`#video-<id>`로 넘어온 묶음을 빨간색 2초 강조). **두 파일은 사본 — 직접 고치지 말고 기준 `instagram-comment-reply/components/`만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.** 색은 대시보드 `LIST_CLASSES`(yt 토큰). 모양·동작은 v1.22와 같음. `package.json` 1.23.0.
- 검수: tsc 0, build, 배포 `youtube-auto-reply-kfi23xlr0` Ready, DB v1.23, 크롬(일반 회원) 대시보드 v1.23 빈 상태 정상, 댓글 화면 시험 칸 # 이동 → `rgb(255,0,51)` 테두리 켜짐·2.2초 뒤 꺼짐(시험 칸 즉시 삭제). 비용: Vercel 빌드 1회. 커밋 `d96623b7`. `docs/evidence/*.json` 미커밋 변경은 다른 CLI 것.

## 2026-10-21 v1.24 — 공용 `review-group-header` 사본(영상 썸네일 추가) · 휴대폰 목록 누르는 영역 확대 (Claude Code 윈도우)
- 댓글 검토 화면 묶음 머리를 공용 부품 `components/ReviewGroupHeader.tsx`(사본 — 기준 `instagram-comment-reply/components/`만 고치고 `--sync`)로. 영상 조회에 `thumbnail_url, youtube_video_id`를 더해 **영상 썸네일(16:10, 누르면 유튜브 원본 새 창)** 표시, 썸네일이 없으면 예전 ▶ 표시. 대시보드 목록(`PendingReviewList` 사본)은 휴대폰에서 항목 44px 이상. `package.json` 1.24.0.
- 검수: tsc 0, build, 배포 `youtube-auto-reply-rjt238hfu` READY, DB v1.24, 크롬(일반 회원) 대시보드 v1.24·댓글 화면 200. 대기 0건이라 썸네일 그림은 미확인. 비용: Vercel 빌드 1회. 커밋 `c59129f8`.

## 2026-10-21 v1.25 — 토큰 갱신 코드 분리(동작 같음) + 게시 묶음 공용 기준 코드 등록 (Claude Code 윈도우)
- 통합 받은편지함(`comment-inbox`) 2단계 준비. `getValid…AccessToken`·`markNeedsReconnect`를 `"use server"` 연결 파일에서 `lib/youtube/token.ts`로 그대로 옮기고(원래 함수와 글자까지 같음 확인) 쓰는 곳의 가져오기 경로만 바꿈. 덤: 연결 파일에서 내보내던 토큰 함수가 화면에서 부를 수 있는 서버 동작으로 노출될 여지도 없어짐.
- **이 프로그램의 게시 묶음(`lib/comments/post.ts`·계정 읽기·API 호출·토큰)은 이제 공용 기준 코드**(사본: `comment-inbox/`) — 고치면 `node scripts/check-shared-modules.mjs --sync` 후 받은편지함도 함께 배포. 등록부: `docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md` 15절.
- 검수: tsc·build, 배포 `youtube-auto-reply-d04h1u291` READY, DB v1.25, `/login` 200·연결 점검 실행 주소 무인증 401. 비용: Vercel 빌드 1회. 커밋 `26eecc96`.

## 2026-10-21 v1.26 — 이중 게시 방지(처리 중 선점) · 통합 받은편지함 링크 (Claude Code 윈도우)
- **이중 게시 방지**: 공용 기준 게시 함수 `lib/comments/post.ts`에서 실제 게시 직전(`try` 앞)에 `replied_at`을 「처리 중 표시」로 조건부 선점(`status <> posted` 그리고 `replied_at`이 비었거나 2분 넘음 → 성공한 한 요청만 게시). 웹 승인·텔레그램 승인·자동 게시·통합 받은편지함이 동시에 와도 한 번만 게시. 실패하면 `status=failed, replied_at=null`로 표시 해제(DM은 고지 문구 미설정 조기 종료에서도 해제). DB 구조 변경 없음 — `replied_at`은 이력·통계 화면에서 `status=posted`와 함께만 읽혀 검토 대기 행에 남아도 화면 영향 없음(확인). 조건 문법은 없는 id로 운영 DB에 시험해 4개 표 모두 200·0행.
- **연계**: 대시보드 머리(📖 매뉴얼 옆)에 「📥 통합 받은편지함에서 보기 ↗」(https://comment-inbox.buylife.xyz , 새 창).
- 검수: tsc·build, 배포 `youtube-auto-reply-az81848ua` READY, DB v1.26, 크롬 대시보드 새 버전·링크(새 창) 확인. 실제 동시 승인 시험은 대기 0건이라 미실행. 비용: Vercel 빌드 1회. 커밋 `77d2b9c8`.

## 2026-10-21 v1.27 — 텔레그램 승인 알림에 「📥 통합 받은편지함에서 보기」 링크 버튼 (Claude Code 윈도우)
- 공용 기준 `telegram-bot-client`(기준 `instagram-comment-reply/lib/telegram/client.ts`)의 `sendTelegramMessageWithButtons`에 선택 항목 `linkButton`(승인 버튼 줄 아래 URL 버튼 한 줄, 없으면 예전과 같음)을 추가하고 `lib/comments/sync.ts`(`?p=youtube`)에서 받은편지함 주소를 넘김. 버튼을 눌러 처리하면 기존처럼 버튼 전체가 지워짐(링크 포함).
- 검수: tsc·build, 배포 `youtube-auto-reply-cbnn6nw5a` READY, DB v1.27, `/login` 200. 실제 텔레그램 알림은 새 댓글이 들어와야 나가서 미확인. 비용: Vercel 빌드 1회. 커밋 `802e89c8`.
