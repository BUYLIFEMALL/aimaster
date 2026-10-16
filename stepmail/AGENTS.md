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
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **실제 이메일 발송(특히 대량/예약 발송, 캠페인 "지금 실행")** — 다른 프로젝트의 "유료 API
   호출"과 동급으로 취급한다. 리드 수십~수천 명에게 실제로 메일이 나가는 행위라 스팸/평판/법적
   리스크가 있다. 테스트 발송(본인 계정으로만 보내는 `testSmtpAccountAction`)은 예외로 자유롭게
   써도 되지만, 실제 리드 대상 발송은 반드시 사전 확인.
5. **Vercel Cron(vercel.json의 crons) 활성화/배포** — 배포되는 순간부터 등록된 활성 캠페인이
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
- v1.07 (2026-10-15, **주인님 승인 후 푸시·배포**): 패키지 보안 업데이트 — `next` 14.2.35 → **15.5.27**(14에는 패치판 없음) + `react`/`react-dom` 19.2.4·`eslint-config-next` 15.5.27, `@tiptap/*` 전부 3.32.0(편집기 XSS·__proto__ 결함 수정, 구버전 core 3.30.1 제거), `nodemailer` 6.10.1 → **10.1.1**(SMTP 기본 발송만 사용 — 7~10의 큰 변경인 SES 제거·NoAuth 코드명·원격 첨부 TLS·Node 20 이상 모두 해당 없음, Vercel Node 24.x), `npm audit fix`. Next 15 대응 코드: `params`(drafts/[id])·`searchParams`(campaigns/new·leads)를 Promise로 받아 await(`cookies()`·`headers()`는 이미 await). 운영 의존성 취약점 37 → **2**(Next 15 안의 postcss 8.4.31 — 우리 CSS만 빌드 때 처리해 실사용 위험 낮음, Next 16으로 올려야 사라짐). 검수: 빌드, 로컬 `next start`(공용 DB 값을 실행 때만 전달) — 로그인 200·보호 화면 307·API 401, 프로덕션 배포·운영 같은 확인·로그인 화면 렌더링. `vercel.json`(매시 발송 cron) 변경 없음, 실제 메일 발송 없음. 로그인 상태 화면은 엣지가 이 주소에 로그인되어 있지 않아 미확인.
- 정정(2026-10-15): v1.06(xlsx 교체)은 이 문서 "사전 승인 필수"(Git push·프로덕션 배포)를 확인하지 못하고 승인 없이 푸시·배포했다. 변경은 xlsx뿐이었고 vercel.json은 그대로였다.

- **v1.08 (2026-10-15, 주인님 승인 후 배포)** — 도메인 연동(SSO): 새 주소 **https://stepmail.buylife.xyz**(`programs.app_url`·메인 `/stepmail` 단축 주소 갱신). `lib/supabase/cookieDomain.ts` + client·server 쿠키 `domain=.buylife.xyz`(buylife.xyz 계열에서만), `middleware.ts`가 옛 `stepmail-kappa.vercel.app` 화면 요청을 새 주소로 308(쿼리 유지). API(크론 `/api/cron/dispatch` 등)는 옛 주소에서도 그대로 동작. 메인 사이트 로그인 상태로 새 주소에 재로그인 없이 들어가는 것 확인(엣지, 시험 계정). vercel.json cron 변경 없음, 실제 발송 없음. 마이그레이션 `supabase/migrations/20261015130000_stepmail_v1_08_sso_domain.sql`.
- **v1.09 (2026-10-15, B1 Next 16 이전 — 맥미니 세션이 코드 수정, 윈도우 보조 계정 세션이 설치·검증)** — `next` 15.5.27 → **16.4.1**(Turbopack 빌드), `eslint` 9·`eslint-config-next` 16.4.1, `lint` 스크립트 `next lint` → `eslint` + `eslint.config.mjs`(kakao_auto_poster와 같음), `middleware.ts` → **`proxy.ts`**(함수명 `proxy`, 내용 동일 — 옛 주소 308·`x-pathname` 헤더·matcher 유지). 빌드가 `tsconfig.json`을 자동 수정(`jsx: react-jsx`, `.next/dev/types` include). 계획서: `docs/NEXT16_MIGRATION_PLAN.md`.
  - 검수: `npm audit --omit=dev` **0건**(이전 2건 = Next 15 내장 postcss). 전체(개발 도구 포함)는 9건(tailwind 3·eslint 계열 braces 등, 운영 미포함 — B2). `npm run build` 통과, 로컬 `next start`(공용 DB 값은 실행 때만 전달): 로그인·가입 200, `/` 307→`/leads`, 보호 화면 307→`/login?redirect=<원래 경로+쿼리>`(proxy 헤더 동작), API 401, 옛 호스트 `stepmail-kappa.vercel.app`(Host·x-forwarded-host 둘 다) 화면 308→`https://stepmail.buylife.xyz/…`(쿼리 유지), 옛 호스트 API는 리다이렉트 없이 401. 엣지에서 로그인 화면 렌더링 확인. `eslint .` 오류 0·경고 2(기존 코드, 이번 범위 밖). 로컬 빌드 경고: 저장소 루트에도 락 파일이 있어 작업 루트 추론 경고(로컬 한정, Vercel에는 stepmail만 올라감).
  - `vercel.json` cron 변경 없음, 실제 발송 없음. 마이그레이션 `supabase/migrations/20261015220000_stepmail_v1_09_next16.sql`. 되돌리기: Vercel에서 직전 배포(v1.08)로 롤백.
  - 운영(2026-10-15, 커밋 `0834c451`, 배포 `stepmail-6ankww44c`): 로그인 200, `/` 307, 보호 화면 307(redirect 경로·쿼리 유지), API 401, 옛 주소 화면 308·옛 주소 크론 401, `X-Vercel-Cache: MISS`. 엣지 시험 계정(메인 로그인 공유)으로 리드 목록·이메일 초안·예약 발송 목록·새 캠페인 화면 정상, 메뉴 v1.09 표시. 실제 발송·"지금 실행" 없음.


## 2026-10-16 DB 연동 변수 호환 — v1.10 (stepmail)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
