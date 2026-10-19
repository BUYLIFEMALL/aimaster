# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **예약(취소)방지 리마인드 자동화(booking-reminder)** 프로젝트에서 AI Agent(Claude
Code 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

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
4. **실제 이메일/SMS/카카오톡 발송(테스트 발송이 아닌 실제 고객 대상 발송)** —
   crm-google-form/stepmail과 동일하게 취급한다.

---

## 🎯 프로젝트 목적

병원·미용실·학원·스튜디오 등 예약 기반 업종을 위해, 예약일시 기준으로 리마인드
(전날/당일/방문 후 리뷰요청 등) 메시지를 자동 발송해 노쇼를 줄이는 프로그램.

SOLAPI(`solapi.com/crm`)가 소개한 "예약 자동화" 활용 사례를 벤치마킹해서 AIMaster
서브프로젝트로 제품화했다. crm-google-form의 팔로우업(Phase 4)과 컨셉이 비슷해 보이지만
**트리거 기준이 다르다**(접수 후 경과일 vs 예약일시 전후) — 자세한 설계 배경은
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `booking-reminder/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `booking-reminder/` 폴더
  내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

booking-reminder는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- booking-reminder는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "booking-reminder"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route는 반드시 redirect
  대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용
  권한까지 확인한다. **단, `app/api/cron/reminder/route.ts`는 예외다** — Vercel Cron이
  보내는 시스템 간 호출이라 로그인 세션 자체가 없다(CRON_SECRET Bearer 인증으로 보호).
- 사용자 소유 데이터 테이블(`booking_reservations`, `booking_reminder_rules`,
  `booking_reminder_sends`)은 `user_id` + RLS owner-only 정책으로 격리한다.
- 발송 계정(이메일/문자·카카오/텔레그램)은 **새 테이블을 만들지 않고** crm-google-form이
  설계한 공용 테이블을 그대로 재사용한다: `user_smtp_accounts`, `user_solapi_accounts`,
  `user_telegram_links` (전부 프로그램 접두어 없음, `docs/PLATFORM_PATTERNS.md` §9).
- 모든 cron/웹훅 라우트와 대시보드 페이지에는 `dynamic = "force-dynamic"`과 함께
  **반드시** `fetchCache = "force-no-store"`를 같이 선언한다 — crm-google-form에서 이걸
  빠뜨려 cron이 오래된 데이터를 계속 반환하는 버그를 실제로 겪었다
  (`docs/PLATFORM_PATTERNS.md` §10).

## 📦 Phase 진행 상태

README.md의 Phase 표와 동기화해서 관리할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (booking-reminder)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://booking-reminder.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 / → /reservations 재로그인 없이 열림(시험 계정 표시), 옛 주소 화면 → 새 주소(크론 API는 옛 주소 그대로)
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-008(P1), F-009(P1), F-010(P1), F-011(P1)를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 5개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-19 디자인 리뉴얼 & 가이드북 구축 — v1.20 (Antigravity Windows)
- **플로우 위저드 스타일 — 캘린더 리마인드 에디션** 전면 개편:
  - 상단 `.studio-hero` 배너 (캘린더 리마인드 콘솔, `v1.20` 배지, 15분 주기 자동 크론 가동 상태 인디케이터, 원클릭 액션 버튼).
  - 3대 핵심 KPI 카드: 총 등록 예약 현황, 활성 리마인드 규칙 수, 발송 채널 연동 현황(알림톡/문자, 메일, 텔레그램).
  - 3단계 플로우 파이프라인 가이드 바 (Step 1 예약 등록 ➔ Step 2 알림 규칙 ➔ Step 3 15분 자동 발송).
  - 사이드바 표준화: 3단계 스텝퍼 번호, `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설, 모바일 햄버거 토글 드로어.
  - 예약 등록 폼, 리마인드 규칙 섹션, 예약 행 컴포넌트 모던 카드 UI 세련화.
- **독립 비주얼 가이드북 (`/guide/page.tsx`) 전면 신설**:
  - 4단계 리마인드 시퀀스 파이프라인 (D-3, D-1, 당일 3시간 전, 방문 후 2시간).
  - 발송 채널별 비교 및 연동 매트릭스 표 (알림톡 vs SMS/LMS vs 메일 vs 텔레그램).
  - 동적 치환 태그 가이드 (`#{고객명}`, `#{예약일시}`, `#{메모}`).
  - 100% BYOK 공용 DB 회원 소유 격리 보안 원칙 배너.
  - 자주 묻는 질문(FAQ 5종) 아코디언 컴포넌트.
- **버전 3중 동기화 (`v1.20`)**: `package.json` (`1.20.0`), `lib/version.ts` (`v1.20`), Supabase DB `programs` (`v1.20`).
- **검수 증거**: Microsoft Edge 포그라운드(headless: false) 7종 캡처 수집 및 10분간 화면 유지 세션 완료.
- **상세 문서**: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · [docs/IMPROVEMENT_HANDOFF_20261019.md](docs/IMPROVEMENT_HANDOFF_20261019.md)
