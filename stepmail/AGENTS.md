# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **이메일 자동발송 (STEP Mail)** 프로젝트에서 AI Agent(Claude Code 등)가 협업할 때
준수해야 할 필수 가이드라인 및 규칙입니다.

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
6. **실제 이메일 발송(특히 대량/예약 발송, 캠페인 "지금 실행")** — 다른 프로젝트의 "유료 API
   호출"과 동급으로 취급한다. 리드 수십~수천 명에게 실제로 메일이 나가는 행위라 스팸/평판/법적
   리스크가 있다. 테스트 발송(본인 계정으로만 보내는 `testSmtpAccountAction`)은 예외로 자유롭게
   써도 되지만, 실제 리드 대상 발송은 반드시 사전 확인.
7. **Vercel Cron(vercel.json의 crons) 활성화/배포** — 배포되는 순간부터 등록된 활성 캠페인이
   자동으로 실제 발송을 시작하므로, 사용자가 리드/이메일계정/초안/캠페인을 충분히 검토한 뒤
   명시적으로 "이제 자동발송 켜도 된다"고 확인한 시점에만 배포한다.

---

## 🎯 프로젝트 목적

리드(잠재고객) 목록을 엑셀로 업로드하고, 사용자가 등록한 여러 이메일 계정(구글/네이버/다음 등,
SMTP)으로 AI가 작성한 이메일을 원하는 수량/시간대/반복주기에 맞춰 예약 발송하는 프로그램.

**기존에 `D:\PDS\01🟡(Stepmail)-...blueprint.json`(Make.com + 구글시트 CRM으로 운영하던
"신규 리드 Naver 1차 발송 → 30일 후 Gmail 2차 리마인드" 콜드메일 자동화)을 참고했지만, 실제
요구사항은 그보다 훨씬 넓다** — 자세한 배경은 README.md "설계 배경" 참고.

---

## 📂 프로젝트 작업 디렉토리

- **메인 모듈 경로**: `stepmail/`
- 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `stepmail/` 폴더 내에서
  개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

stepmail은 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub
구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- stepmail은 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "stepmail"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자
  자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route(`app/api/*/route.ts`)는
  반드시 redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라
  프로그램 이용 권한까지 확인한다. **단, `app/api/cron/dispatch/route.ts`는 예외다** — Vercel
  Cron이 보내는 시스템 간 호출이라 로그인 세션 자체가 없다(CRON_SECRET Bearer 인증으로 보호).
- 사용자 소유 데이터 테이블(`stepmail_leads`, `stepmail_email_drafts`, `stepmail_campaigns`,
  `stepmail_campaign_smtp_accounts`, `stepmail_send_log`)은 `user_id` + RLS owner-only 정책으로
  격리한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `openai`(이메일 초안 작성) + `gemini`(초안 생성 시 핵심 주제를
  반영한 이미지 자동 생성, 선택 사항 — blog의 NanoBanana 이미지 생성 패턴 참고, 키 없으면
  이미지만 건너뛰고 텍스트 초안은 정상 생성) provider를 쓴다. 실제 발송 계정
  (SMTP)은 `user_api_keys`(단일 api_key 문자열 구조)와 안 맞아서 별도 테이블
  `user_smtp_accounts`(host/port/user/password)로 관리한다 — 본인 키만 허용 원칙은
  동일하게 적용(관리자 공용 SMTP로 절대 폴백하지 않음). 이 테이블은 텔레그램
  (`user_telegram_links`)과 같은 이유로 프로그램 접두어 없이 공용으로 설계됐다 —
  crm-google-form 등 다른 이메일 발송 프로그램에서도 그대로 재사용한다
  (2026-08-18, `supabase/migrations/0006_promote_smtp_accounts_to_shared.sql`).
- 발송은 루트 `lib/email/`(nodemailer, `docs/PLATFORM_PATTERNS.md`의 네이버 SMTP 트러블슈팅)과
  동일한 패턴을 쓰되, 계정을 여러 개(사용자별로 임의 개수) 등록할 수 있게 확장했다.
  **네이버 SMTP는 동시 연결 제한이 있어(421 Too many concurrent connection) 반드시 순차
  발송**해야 한다 — `lib/dispatch.ts`의 for 루프가 이 규칙을 지킨다(Promise.all 금지).
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.
- v1.06 (2026-10-15): 엑셀 라이브러리 `xlsx`를 npm 0.18.5(배포 중단·알려진 취약점)에서 **SheetJS 공식 CDN 패키지 0.20.3**(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`)으로 교체 — 회원이 올린 엑셀을 서버에서 읽는 `lib/leads.ts parseLeadsWorkbook`와 양식 다운로드 라우트가 대상. 사용 API(read·sheet_to_json·aoa_to_sheet·write) 변경 없음. 검수: 빌드, `server-only`를 뺀 임시 사본으로 새 판에서 실제 파싱 함수 실행(중복 이메일 제거·상태 판정 동일), `npm audit`에서 xlsx 항목 사라짐(다른 패키지 취약점은 남아 있음), 프로덕션 배포·비로그인 401 확인. 로그인 상태 양식 다운로드는 엣지가 `vercel.app` 주소에 로그인되어 있지 않아 미확인.
