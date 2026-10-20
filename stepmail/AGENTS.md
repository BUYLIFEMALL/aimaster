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

## v1.11 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `lib/ai/emailImage.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.12 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (3묶음 단일 주소형, Claude Code 윈도우)
- `lib/ai/emailImage.ts` `generateEmailImage()`가 공용 사본(`lib/ai/`)으로 위임. 모델은 기본 등급(`gemini-nano-banana-2.1`, 이전과 같음), 16:9·1K 그대로. **버그 수정**: 응답 첫 조각만 보던 문제. vercel.json 크론 변경 없음, 실제 발송 없음.
- 개선: 키 머리글 전송, 시간 제한, 서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·비율·화질은 그대로.
- 검수: tsc·eslint(바뀐 파일) 0, build, 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.13 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.14 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.15 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.16 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-011(P1)를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-19 디자인 리뉴얼 & 가이드북 구축 — v1.20 (Antigravity Windows)
- **플로우 위저드 스타일 — 스텝메일 마케팅 에디션** 전면 개편:
  - 상단 `.studio-hero` 배너 (스텝메일 마케팅 콘솔 헤더, `v1.20` 배지, 분할 크론 디스패치 가동 상태 인디케이터, 빠른 액션 버튼 2종).
  - 3대 핵심 KPI 카드: 총 잠재고객 수(미발송/진행중/완료), 활성 발송 계정 수(다중 SMTP), 등록된 캠페인 수.
  - 4단계 플로우 파이프라인 가이드 바 (Step 1 리드 DB ➔ Step 2 초안 작성 ➔ Step 3 계정 연동 ➔ Step 4 예약 발송).
  - 사이드바 표준화: 4단계 스텝퍼 번호, `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설, 모바일 햄버거 토글 드로어.
  - 엑셀 업로드 폼, 차수별 필터 칩셋, 잠재고객 데이터 테이블 UI 세련화.
- **독립 비주얼 가이드북 (`/guide/page.tsx`) 전면 신설**:
  - 4단계 스텝메일 마케팅 프로세스 (DB ➔ 초안 ➔ 연동 ➔ 발송).
  - 메일 프로바이더별 일일 한도 및 특성 비교 매트릭스 표 (네이버 vs 다음 vs Gmail vs 사내 SMTP).
  - 스팸함 직행을 막는 7대 발송 황금률.
  - 100% BYOK 공용 DB 회원 소유 격리 보안 원칙 배너.
  - 자주 묻는 질문(FAQ 5종) 아코디언 컴포넌트.
- **버전 3중 동기화 (`v1.20`)**: `package.json` (`1.20.0`), `lib/version.ts` (`v1.20`), Supabase DB `programs` (`v1.20`).
- **검수 증거**: Microsoft Edge 포그라운드(headless: false) 7종 캡처 수집 및 10분간 화면 유지 세션 완료.
- **상세 문서**: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · [docs/IMPROVEMENT_HANDOFF_20261019.md](docs/IMPROVEMENT_HANDOFF_20261019.md)

## 2026-10-20 v1.21 — ⏰ 캠페인 예약 발송 실행 방식 회원 선택 + 중복 발송 방지·이용 권한 확인·비밀값 검사 (Claude Code 윈도우)
- 주인님 「2순위도 적용하고 권한 확인도 넣어줘」. 지침 루트 `docs/SCHEDULER_POLICY.md`, 플랜 `docs/PLAN_20261020_MEMBER_SCHEDULER.md`, 기준 `naver-cafe-poster` v1.21~v1.22.
- 정기형: 캠페인을 켤 때 작업 켜기, **보낼 차례가 남은 켜진 캠페인(이미 보낸 「한 번만」 제외)이 0개면 끄기**, 회원 cron-job.org는 **매시 0·30분**(운영자는 매시 정각 그대로).
- 코드: `lib/schedulerMember/`(cronJobOrg·memberScheduler·dispatch — 표 `stepmail_member_scheduler`, 토큰 `stepmail_…`, 끄기 스위치 `STEPMAIL_PLATFORM_SCHEDULER=off`), `lib/programAccess.ts`(사본, 카드뉴스와 같은 판정), `/api/cron/dispatch`(vercel·비일시정지 회원만, `CRON_SECRET` 비면 401), 새 `/api/cron/dispatch-member`(`after`), `lib/actions/scheduler.ts`, `campaigns.ts` 생성·켜기/끄기·삭제 때 `syncMemberScheduler`, `settings.ts` 키 허용·변경·삭제.
- 안전: 발송 전 `last_run_at` 조건부 선점(겹치면 먼저 가져간 실행만), **발송 도중 예외에도 선점을 되돌리지 않음**(일부 메일이 나갔을 수 있어 재발송 시 중복 — 예전 동작과 같음), **이용 권한(사용기간) 확인 추가**(예전엔 정지·핸드폰만). `vercel.json` 예약 호출은 바꾸지 않음.
- 화면: 설정 「⏰ 예약 발행」, 예약 발송 화면 상태 줄·일시정지/재개, `/guide` FAQ Q6. DB: `supabase/migrations/20261020140000_stepmail_member_scheduler.sql`(크롬 SQL Editor 적용). `package.json` 1.21.0.
- 검수: tsc 0, build, 배포 `stepmail-oriyijlug`(Ready), 무인증·`Bearer undefined`·가짜 토큰 401, `/login` 200. 크롬(관리자, **실제 발송 없음** — 시험 캠페인을 「꺼짐·매주 금 03시·마지막 실행=지금」으로 넣음): 「내 cron-job.org」 선택 → 관리자의 이미 보낸 「한 번만」 캠페인은 남은 일에서 빠져 작업 꺼진 채 「대기 · 보낼 캠페인 0개」 → 시험 캠페인 다시 활성화 → 작업 8678940 자동 켜짐 → 일시정지·재개 → 16:30 cron-job.org 회원 실행 200(발송 없음) → 캠페인 끄기 → 작업 즉시 꺼짐 → Vercel 복귀 → 시험 캠페인 삭제.

## 2026-10-20 v1.22 — 예약 공용 코드 「실패 시 상태 되돌리기」 (Claude Code 윈도우)
- 주인님 「순서대로 진행해줘」(남은 일 4번). 「내 cron-job.org」로 바꿀 때 cron-job.org 작업 켜기가 실패하면(하루 호출 한도 초과·키 오류) **이전 방식으로 되돌림**(예전엔 cronjob으로 남아 운영자 실행에서도 빠져 예약이 멈출 수 있었음), 「재개」가 실패하면 **일시정지 상태로 되돌림**(예전엔 화면은 일시정지·DB는 대기로 어긋남). `memberScheduler.ts`의 `setMemberSchedulerMode`·`resumeMemberScheduler` 두 곳, 11개 사본 같은 수정. 커밋 `ccf80d68`, DB 버전 크롬 SQL Editor로 갱신, 11개 순차 배포 모두 Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `stepmail-ojit52us6`.
- 실검수는 같은 코드인 booking-reminder에서 실패 경로 3가지를 실제로 확인(cron-job.org 하루 한도 소진 상태 이용).

## 2026-10-20 v1.23 — 일시정지 안전 처리·상태 줄 즉시 갱신 (Claude Code 윈도우)
- 예약 공용 코드 보강(주인님 「추가 개선 제안도 진행해줘」): ① `pauseMemberScheduler`가 **일시정지를 먼저 저장**하고 cron-job.org 끄기는 시도만 — 실패하면(하루 한도 등) 오류 대신 「일시정지했습니다. 작업 끄기는 다음 호출 때 다시 시도합니다」 안내(`pauseScheduledPublishing`의 `notice`). 대신 회원 실행 주소가 새 `skipPausedMember`로 **일시정지된 회원이면 실행하지 않고** 작업 끄기를 다시 시도(예전엔 회원 실행 주소가 일시정지를 확인하지 않아, 「먼저 저장」만 바꾸면 발송이 나갈 수 있었음). ② `SchedulePublishingControl`이 서버 값이 바뀌면 실행 상태도 따라 바꿈(`useEffect`) — 예전엔 규칙·예약을 켜서 작업이 켜져도 새로고침 전까지 「대기」로 남음. 커밋 `c380e793`, DB 버전 크롬 SQL Editor, 6개 순차 배포 Ready·`/login` 200·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `stepmail-7afkc500t`.
- 미확인: 일시정지 실패 경로·상태 줄 즉시 갱신의 크롬 실검수 — 본인 cron-job.org 키가 있는 관리자 로그인이 필요(검수 시점 크롬이 시험 회원으로 로그인돼 있었음). 다음 첫 단계: 관리자로 「내 cron-job.org」 → 규칙/예약 켜기 직후 상태 줄이 새로고침 없이 「실행 중」이 되는지 확인 → Vercel 복귀.

## 2026-10-20 v1.25 — 방식이 다른 회원 토큰 호출 시 cron-job.org 작업 끄기 (Claude Code 윈도우)
- 회원 토큰 확인(`memberIdForToken`)에서 토큰은 맞지만 실행 방식이 「내 cron-job.org」가 아니면 지금처럼 401을 돌려주되 **cron-job.org 작업을 끄고 `active: false`로 정리**(재개·방식 변경이 겹쳐 작업이 켜진 채 남으면 5분마다 401 헛호출이 이어지던 문제). 직전 배포(c69b0407)의 `skipPausedMember` 방식 조건은 토큰 확인이 먼저 401로 걸러 닿지 않는 코드였으므로 일시정지만 보는 원래 조건으로 되돌림. 커밋 `be5c5107`, DB 버전 크롬 SQL Editor, 15개 순차 배포 Ready·가짜 토큰 401.
- 재현 검수(상품소싱, 관리자): 작업을 켠 뒤 DB 방식만 Vercel로 → 11:00 회원 실행 401 + 작업 꺼짐(`active: false`) → 11:05~11:34 호출 없음. 시험 전 상태로 복귀.
