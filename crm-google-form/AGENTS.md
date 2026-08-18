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
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **실제 이메일/SMS/카카오톡 발송(특히 테스트 발송이 아닌 실제 신청자 대상 발송)** —
   stepmail의 "실제 이메일 발송" 항목과 동일하게 취급한다. 본인 계정으로만 보내는 테스트
   발송은 자유롭게 해도 되지만, 실제 신청자에게 나가는 발송은 반드시 사전 확인.

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
- 사용자 소유 데이터 테이블(`crm_form_sources`, `crm_submissions`, `crm_smtp_accounts`,
  `crm_solapi_accounts`)은 `user_id` + RLS owner-only 정책으로 격리한다.
- API 키/발송 계정은 공용 `user_api_keys` 구조에 억지로 끼워 넣지 않는다 — SMTP는 stepmail의
  `stepmail_smtp_accounts`와 동일 구조로 `crm_smtp_accounts`를 새로 만들고, SOLAPI는
  apiKey+apiSecret+발신번호+카카오 채널까지 필드가 많아 전용 테이블 `crm_solapi_accounts`를
  쓴다(둘 다 본인 계정만 허용, 관리자 공용 계정으로 폴백 없음).
- 텔레그램 알림은 새 테이블을 만들지 않고 기존 `user_telegram_links`(real_estate_sales가 만든
  공용 테이블, `docs/PLATFORM_PATTERNS.md` §9)와 그 클라이언트 코드를 그대로 재사용한다.

## 📦 Make.com 시나리오 이식 현황 (Phase 진행 상태)

README.md의 Phase 표와 동기화해서 관리할 것.
