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

## 2026-10-20 v1.15 — YouTube 연결 하나로 합치기 (Claude Code 윈도우)
- 연결 화면에 「다른 YouTube 프로그램 권한도 함께 받기」(연결 전: 체크칸, 연결 후: 「…함께 받아 다시 연결」 버튼). 켜면 `force-ssl`·`upload`·`readonly`를 `include_granted_scopes=true`로 한 번에 요청(`lib/youtube/client.ts` `getYoutubeAuthorizeUrl` 선택 인자, `ALL_YOUTUBE_SCOPES`는 `lib/youtube/memberAccount.ts`). 콜백은 공용 표 `granted_scopes`에 **Google 토큰 응답의 실제 받은 권한(`scope`)** 을 기록 → shots(업로드 권한)도 같은 공용 토큰을 쓸 수 있다. 회원이 동의 화면에서 일부를 빼면 받은 것만 기록돼 각 프로그램은 자기 표로 돌아간다. 기본(체크 안 함)은 예전과 같다.
- 플랜 루트 `docs/PLAN_20261020_YOUTUBE_SCOPES_AND_SHOTS_FB_KEY.md`. `package.json` 1.15.0.
