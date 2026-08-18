# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **예약 리마인드·노쇼 방지 자동화(booking-reminder)** 프로젝트에서 AI Agent(Claude
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
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **실제 이메일/SMS/카카오톡 발송(테스트 발송이 아닌 실제 고객 대상 발송)** —
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
