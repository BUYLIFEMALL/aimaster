# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **구글폼 신청접수 자동 응대 시스템(crm-google-form)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션 (기존 stepmail/real_estate_sales와 동일하게 자율 진행 가능)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **실제 이메일/SMS/카카오톡 발송(특히 테스트 발송이 아닌 실제 신청자 대상 발송)** —
   stepmail의 "실제 이메일 발송" 항목과 동일하게 취급한다. 본인 계정으로만 보내는 테스트
   발송은 자유롭게 해도 되지만, 실제 신청자에게 나가는 발송은 반드시 사전 확인.

---

## 🎨 적용 디자인 템플릿

**스마트 매트릭스 스타일 — 라이트 변형**(v1.09) — [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · 플랜 [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장 [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md)(🚨 웹훅 중복·횟수 제한 2건 승인 대기) · 인수인계 [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)

---

## 🎯 프로젝트 목적

구글폼에 새 응답이 들어오면 신청자에게 접수 확인(이메일/SMS/카카오 알림톡/카카오 친구톡)을
자동 발송하고, 운영자 본인 텔레그램으로 신청 내역을 요약해 전달하는 CRM 자동화 프로그램.

**기존에 Make.com으로 운영하던 자동화 시나리오
(`D:\PDS\@GoogleForm(신청접수)-Gmail-SOLAPI(SMS)-SOLAPI(알림톡)-SOLAPI(친구톡)-Telegram.blueprint.json`)를
AIMaster 서브프로젝트로 이식한 것**이다 — 자세한 설계 배경(왜 Google Forms API OAuth 대신
구글시트+Apps Script 웹훅 방식을 택했는지, 원본 시나리오의 버그 등)은
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `crm-google-form/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `crm-google-form/` 폴더 내에서
  개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

crm-google-form은 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub
구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- crm-google-form은 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "crm-google-form"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route(`app/api/*/route.ts`)는
  반드시 redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라
  프로그램 이용 권한까지 확인한다. **단, `app/api/webhooks/form-submit/[token]/route.ts`는
  예외다** — Apps Script가 보내는 진짜 외부 콜백이라 로그인 세션 자체가 없다. `webhook_token`이
  `crm_form_sources` 테이블의 실제 레코드와 매칭되는지로만 신뢰성을 확보한다(music의 Suno
  웹훅과 동일 원칙).
- 사용자 소유 데이터 테이블(`crm_form_sources`, `crm_submissions`)은 `user_id` + RLS
  owner-only 정책으로 격리한다.
- 발송 계정(이메일/문자·카카오/텔레그램)은 전부 **공용 테이블**을 쓴다 — API 키/발송 계정을
  공용 `user_api_keys` 구조(단일 문자열)에 억지로 끼워 넣지 않되, 프로그램 접두어도 붙이지
  않는다. 사용자 본인 발송 계정은 프로그램마다 다시 등록할 이유가 없기 때문이다
  (`docs/PLATFORM_PATTERNS.md` §9):
  - 이메일(SMTP): `user_smtp_accounts` (원래 stepmail 전용 `stepmail_smtp_accounts`였다가
    2026-08-18 공용으로 승격 — rename만으로 처리, 데이터 이전 없음)
  - SMS/카카오 알림톡·친구톡(SOLAPI): `user_solapi_accounts` (apiKey+apiSecret+발신번호+
    카카오 채널, 처음부터 공용으로 설계)
  - 텔레그램: `user_telegram_links` (real_estate_sales가 만든 공용 테이블)
  세 테이블 다 본인 계정만 허용하고 관리자 공용 계정으로 폴백하지 않는다.

## 📦 Make.com 시나리오 이식 현황 (Phase 진행 상태)

README.md의 Phase 표와 동기화해서 관리할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (crm-google-form)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://crm-google-form.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 / → /submissions 재로그인 없이 열림(시험 계정 표시), 구글폼 수신 API는 옛 주소 그대로
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.08 — 옛 vercel.app 삭제 대비: 구글폼 웹훅 주소 교체 안내 (Claude Code 윈도우)
- 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md` 항목 F. 웹훅 주소는 화면 주소(`window.location.origin`) 기준이라 SSO 이후 새 주소로 표시됨. 예전에 `crm-google-form.vercel.app`로 Apps Script를 만든 회원용 교체 안내 문구를 `components/sources/SourceCard.tsx` 웹훅 주소 아래 추가. 옛 주소 수신 API는 삭제 전까지 계속 동작.
- 검수: 빌드·배포, 새 주소 웹훅(없는 토큰) 404 = 경로 동작. 실제 구글폼 접수는 미시험(외부 발송 포함이라 사전 확인 대상).

## 2026-10-17 v1.09 — 스마트 매트릭스 라이트 변형 디자인 (Claude Code 맥미니)
- 롱테일 기반 부품 + `file-merge` 라이트 토큰, 사이드바 🏠·📢·📖 + 휴대폰 ☰(원칙 19 — 기존 누락), `/dashboard`·`/guide` 신설(`/` → `/dashboard`), 접수 내역 검색·상태/폼 필터·원본 펼치기, 기존 화면 색 토큰 일괄 치환, 시각 Asia/Seoul. 웹훅·발송·Cron·DB 변경 없음.
- 🚨 발견(미조치, 승인 대기): 웹훅 `response_id` 중복 미차단(이중 발송·요금), 크기·횟수 제한 없음 — [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) #1·#2.
- **빌드·배포·화면 검수는 윈도우 CLI 대기** — [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md).

## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-007(P1), F-011(P1)를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.10 — ⏰ 접수 후 팔로우업 발송 실행 방식 회원 선택 + 발송 전 선점(중복 방지)·이용 권한 확인·비밀값 검사 (Claude Code 윈도우)
- 주인님 「2순위도 적용하고 권한 확인도 넣어줘」. 지침 루트 `docs/SCHEDULER_POLICY.md`, 플랜 `docs/PLAN_20261020_MEMBER_SCHEDULER.md`, 기준 `booking-reminder` v1.21(같은 규칙 기반 구조).
- 정기형: 팔로우업 규칙을 켤 때(만들기 포함) 작업 켜기, 켜진 규칙이 0개면 끄기, 회원 cron-job.org는 **매일 09:00 KST**(운영자와 같은 시각). Next 14라 회원 실행 주소는 `@vercel/functions` `waitUntil`.
- 코드: `lib/schedulerMember/`(표 `crm_member_scheduler`, 토큰 `crm_…`, 끄기 스위치 `CRM_PLATFORM_SCHEDULER=off`), `lib/programAccess.ts`(사본), `/api/cron/followup`(제외 목록·`CRON_SECRET` 빈 값 401 — 분석 F-011 해결), 새 `/api/cron/dispatch-member`, `lib/actions/scheduler.ts`·`settings.ts`(cron-job.org 키 전용), `followupRules.ts` 만들기·켜기/끄기·삭제 때 `syncMemberScheduler`(켤 준비가 안 되면 규칙을 다시 끄고 안내 — **규칙 줄에 그 안내가 보이게 함**).
- 안전: **발송 전 선점** — `lib/crm/followupDispatch.ts`가 예전엔 「보냈는지 확인 → 발송 → 기록」이라 실행이 겹치면 두 번 보낼 수 있었다 → `crm_followup_sends`에 먼저 넣어 선점((rule_id, submission_id) 고유 제약), 「발송 중」은 failed로 넣고 끝나면 실제 결과로 고침. **이용 권한(사용기간) 확인 추가**(예전엔 핸드폰만).
- 화면: 설정 「⏰ 예약 발행」(방식 선택 + 키 칸), 구글폼 연결 화면 맨 위 상태 줄·일시정지/재개, `/guide` FAQ. DB(운영 `esgxyikcnnvmlhygjkth`): `supabase/migrations/20261020160000_crm_member_scheduler.sql` — 크롬 SQL Editor 적용, 결과 `crm_member_scheduler`·`v1.10`.
- 검수: tsc 0, build, 커밋 `5af88dd5`, 배포 `crm-google-form-2jvoxalyt`(Ready), 무인증·`Bearer undefined`·가짜 토큰 401(두 주소), `/login` 200. 크롬(관리자, **실제 발송 없음** — 접수 0건, 시험 규칙 채널 모두 끔): 설정 v1.10·공용 키 「등록됨」 → 「내 cron-job.org」 선택 → 상태 줄 「대기 · 켜진 규칙 0개」 → 시험 규칙 추가 → 작업 8679092 자동 켜짐 → 일시정지 정상 → **재개는 cron-job.org 하루 호출 한도(100회) 초과로 실패**(같은 코드가 예약 리마인드에서 정상 확인됨, 안내 문구 정상 표시) → 규칙 끄기 → 상태 「켜진 규칙 0개」 → Vercel 복귀 → 시험 규칙 삭제. 회원 실행 200·운영자 실행 200(매일 09시)은 미확인 — 다음 첫 단계.

## 2026-10-20 v1.11 — 예약 공용 코드 「실패 시 상태 되돌리기」 (Claude Code 윈도우)
- 주인님 「순서대로 진행해줘」(남은 일 4번). 「내 cron-job.org」로 바꿀 때 cron-job.org 작업 켜기가 실패하면(하루 호출 한도 초과·키 오류) **이전 방식으로 되돌림**(예전엔 cronjob으로 남아 운영자 실행에서도 빠져 예약이 멈출 수 있었음), 「재개」가 실패하면 **일시정지 상태로 되돌림**(예전엔 화면은 일시정지·DB는 대기로 어긋남). `memberScheduler.ts`의 `setMemberSchedulerMode`·`resumeMemberScheduler` 두 곳, 11개 사본 같은 수정. 커밋 `ccf80d68`, DB 버전 크롬 SQL Editor로 갱신, 11개 순차 배포 모두 Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `crm-google-form-isi69512a`.
- 실검수는 같은 코드인 booking-reminder에서 실패 경로 3가지를 실제로 확인(cron-job.org 하루 한도 소진 상태 이용).
