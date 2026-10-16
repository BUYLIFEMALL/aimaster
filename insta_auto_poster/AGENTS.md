# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **인스타그램 자동 포스팅 관리 웹(insta_auto_poster)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제** (스키마 추가/마이그레이션은 기존 threads/real_estate_sales와
   동일하게 자율 진행 가능 — README "설계 배경" 참고)
3. **환경변수와 API 키 변경**
4. **유료 API 호출**

---

## 🎯 프로젝트 목적
threads(`threads/`)와 동일한 구조로, 인스타그램 **피드 게시물**을 대상으로 한 AI 기반 자동 포스팅 웹입니다.
게시글 주제 수집(HTTP/RSS/Perplexity) → AI 캡션+해시태그+이미지 생성 → 즉시/예약 게시까지의 파이프라인을
threads와 동일한 패턴으로 제공하되, 인스타그램 피드는 이미지가 필수라는 차이를 반영했습니다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `insta_auto_poster/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `insta_auto_poster/` 폴더 내에서
  개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

insta_auto_poster는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조",
"멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- insta_auto_poster는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "auto-instagram-posting"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), API route는 반드시 redirect
  대신 결과 객체를 반환하는 방식으로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블은 `user_id` + RLS owner-only 정책으로 격리한다
  (`insta_posts`, `insta_accounts`, `insta_candidates` 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`)에서 **로그인한 회원 본인 키만** 쓴다(앱 기본 키·운영자 공용 Meta 앱 없음 — 최상위 규칙 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`, v1.04).
- v1.05 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.06 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.07 (auto-instagram-posting)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.08 (Claude Code 윈도우)
- 새 주소 `https://auto-instagram-posting.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 /settings 재로그인 없이 열림(시험 계정 표시), 옛 주소 화면 308. 콜백 2곳(/api/instagram/callback, /api/instagram/callback/byok) 옛 주소 → 새 주소 307(시험 요청). 설정 화면 콜백 안내 옛 주소 그대로. 실제 계정 연결은 미시험
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.09 — 옛 vercel.app 삭제 대비 두 주소 지원 (Claude Code 윈도우)
- 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md`(기준 구현 threads-comment-reply v1.08). `src/lib/oauthRedirect.ts`: SITE_ORIGIN(auto-instagram-posting.buylife.xyz), Facebook 방식 `FACEBOOK_REDIRECT_*`(env `META_INSTAGRAM_REDIRECT_URI`, /api/instagram/callback), Instagram 방식 `INSTAGRAM_REDIRECT_*`(env `META_INSTAGRAM_BYOK_REDIRECT_URI`, /callback/byok).
- 기본 연결은 옛 콜백, 설정 화면 [Facebook/Instagram 방식 새 주소로 (다시) 연결](hidden `callback=new`)은 새 콜백. 두 콜백 모두 옛 주소 307에 via=old·교환 시 via로 선택·연결 후 이동 SITE_ORIGIN. 설정 화면에 두 방식 콜백 모두 옛·새 주소 표시. 미사용 `getEnv` 제거.
- 검수: 빌드·배포, 옛 콜백 2곳 → via=old 307, 새 콜백 → /login. 시험 계정 [Facebook 방식 새 주소로 다시 연결] → Facebook 인증 URL에 `redirect_uri=https://auto-instagram-posting.buylife.xyz/api/instagram/callback` 확인(화이트리스트 미등록 오류 = 새 콜백 전송 확인). Instagram 방식은 기존부터 시험 계정 앱 "Invalid platform app" 오류(instagram-comment-reply `docs/IMPROVEMENTS.md`와 같은 원인 추정).

## 2026-10-16 v1.10 — Instagram 앱 ID 위치 안내 (Claude Code 윈도우)
- 원인 확인: 시험 계정(buylifemall@naver.com)의 `meta_app_id`에 Facebook(메타) 앱 ID가 들어 있음(같은 값으로 Facebook 인증 화면은 앱을 인식) → Instagram 로그인(`instagram.com/oauth/authorize`)이 "Invalid platform app"으로 거절. 코드 버그가 아니라 값 위치 혼동.
- 조치: 설정 화면 키 입력칸 위에 안내 상자(앱 대시보드 › Instagram › API 설정(Instagram 로그인)의 "Instagram 앱 ID/시크릿", 맨 위 "앱 ID"와 다름, 잘못 넣으면 Invalid platform app). 이 프로그램은 Facebook 방식(Facebook 앱 ID 필요)과 Instagram 방식(Instagram 앱 ID 필요)이 같은 칸을 함께 써서 한 번에 한 방식만 가능 — 안내에 명시, 칸 분리는 `docs/IMPROVEMENTS.md` 제안(공용 provider 추가 = DB 스키마 변경, 사전 승인 필요).
- 검수: 빌드·배포·DB 버전, 크롬에서 안내 상자 표시 확인. 시험 계정 값 교체는 주인님 직접(키 입력은 에이전트가 하지 않음).
