# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **경쟁사 키워드 분석 자동화(competitor-analysis)** 프로젝트에서 AI Agent(Claude
Code 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

> **최상위 정정(2026-10-16):** 생성 데이터는 회원 본인 소유이며 30일 후 자동삭제 대상입니다. 초기 전역 회사 캐시 설계는 폐기됐습니다. v1.08 수정안은 검수됐으나 운영 적용은 승인 대기입니다. 아래 최신 인수인계를 먼저 읽습니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 기존 DB 스키마 조회·검토(스키마·RLS 변경은 루트 지침에 따라 사전 승인 필수)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (SerpApi 검색, Perplexity 리서치, OpenAI/Anthropic 분석 등 — 키워드 1회
   "지금 분석하기"마다 SerpApi 1회 + 신규 도메인 수만큼 Perplexity/OpenAI 호출이 발생한다)
5. **DB 스키마·RLS 정책 변경** (루트 최상위 지침 우선)

---

## 🎨 적용 디자인 템플릿

**스마트 매트릭스 스타일**(v1.07, 기준 구현 `longtail-keyword-expander`와 같은 뼈대) — [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · 플랜 [docs/PLAN_20261016_DESIGN_RENEWAL.md](docs/PLAN_20261016_DESIGN_RENEWAL.md) · 개선 원장 [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계 [docs/IMPROVEMENT_HANDOFF_20261016.md](docs/IMPROVEMENT_HANDOFF_20261016.md)

---

## 🎯 프로젝트 목적

키워드를 입력하면 구글 검색결과(SerpApi)를 분석해서 상위 노출 도메인을 경쟁사로 식별하고,
Perplexity로 그 회사 정보를 리서치하고, GPT로 "경쟁사/USP/콘텐츠 아이디어" 분석 리포트를
만들어주는 프로그램. 선택적으로 Claude로 보기 좋은 HTML 리포트도 만들 수 있다.

**기존에 Make.com으로 운영하던 자동화 시나리오
(`D:\PDS\00@🟣경쟁사 키워드분석-SERP-💰.blueprint.json`, 연동 Airtable `appzAYWz0W0j3xEZY`)를
AIMaster 서브프로젝트로 이식한 것**이다 — 원본은 Airtable 1개 베이스 + 고정 수신 이메일 하나로
동작하는 1인용 자동화였다. 이식하며 바뀐 것과 설계 배경은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `competitor-analysis/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `competitor-analysis/` 폴더
  내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

competitor-analysis는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- competitor-analysis는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "competitor-analysis"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), 향후 API route를 추가한다면
  redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램
  이용 권한까지 확인한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `serpapi`(구글 검색결과)/`perplexity`(경쟁사 리서치)/
  `openai`(분석 리포트)/`anthropic`(HTML 리포트 변환, 선택) 4개 provider를 쓴다.
- 모든 회원 데이터는 `user_id` + RLS owner-only 정책으로 격리합니다. 회사 조사 정보도 예외가 아니며 다른 회원이 만든 자료를 사용하지 않습니다. 생성 자료는 건별 생성일 기준 30일 후 자동 삭제합니다. 운영 v1.07의 옛 전역 저장소는 알려진 위반이며 v1.08 적용 전까지 해결됐다고 보고하지 않습니다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 키워드 CRUD, SerpApi 검색(organic/ad/PAA 분류), 경쟁사 리서치(본인 조사만 재사용; 전역 캐시 폐기 전환 중), GPT 분석, 선택적 Claude HTML 리포트 | ✅ 구현 완료 |
| 1 | 구글 외 네이버 검색엔진 지원 — 키워드마다 구글/네이버 선택(`competitor_keywords.engine`), `lib/serp/client.ts`의 `searchNaver()`(응답 필드가 구글과 달라 별도 파서: `web_results`→organic, `ads_results`→ad). 네이버는 PAA/지역결과에 대응하는 필드가 명확하지 않아 organic/ad만 채움 | ✅ 구현 완료 (2026-08-23) |
| 2 | Vercel Cron 정기 모니터링 + 이전 회차 대비 순위 변동 표시 | ⏳ 예정 |
| 2 | 여러 키워드를 가로지르는 "도메인별 노출 빈도(share of voice)" 대시보드 | ⏳ 예정 |
| 2 | PAA 질문 중 미대응 콘텐츠 갭 제안 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.05 (competitor-analysis)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.06 (Claude Code 윈도우)
- 새 주소 `https://competitor-analysis.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 옛 주소 / → /keywords → 새 주소 308, 새 주소에서 재로그인 없이 열림(시험 계정 표시)
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 스마트 매트릭스 디자인 리뉴얼 — v1.07 (Claude Code 맥미니)
- 롱테일 기반 파일 이식(다크 차콜 토큰·히어로·KPI·Asia/Seoul 시각·복사 버튼), 사이드바 🏠·내 경쟁사·📖 + 휴대폰 ☰(원칙 19 — 기존에 없었음), `/dashboard`·`/guide` 신설(`/` → `/dashboard`), 키워드·결과 목록 검색·필터·표/카드, 결과 상세 KPI·유형별 표·리포트 복사, 내 경쟁사 노출 횟수 표.
- 롱테일 v1.06에서 Codex가 찾은 같은 오류 수정: 등록 후 폼 초기화, 삭제 확인, 빈 목록 `"__none__"` UUID 조회(3곳), 시각 UTC. 검색결과 링크는 http(s)만.
- **맥미니 작성 당시 대기, 현재 Windows 완료(아래 최종 기록)** — [docs/IMPROVEMENT_HANDOFF_20261016.md](docs/IMPROVEMENT_HANDOFF_20261016.md).


## Windows 인수 검수 (2026-10-16, v1.07)

플랜 [VERIFICATION_PLAN_20261016_WINDOWS.md](docs/VERIFICATION_PLAN_20261016_WINDOWS.md). 실제 일반 회원·보이는 Edge 1440px/375px 검수는 npm run test:runtime, 실제 컴포넌트/상세 페이지 합성 검수는 npm run test:browser입니다. 합성 어댑터는 tests/에서만 사용하며 프로덕션 인증/서버 동작을 바꾸지 않습니다. 테스트 서버는 node tests/local.mjs start(127.0.0.1:3035), 기존 루트 DB 연결은 자식 프로세스에만 사용합니다. 유료 분석·키 변경·실제 데이터 쓰기/삭제는 하지 않습니다.

기존 Next 14 보안 의존성(#11)과 전역 회사 캐시의 일반 회원 쓰기 정책(#12)은 미해결입니다. 최상위 공통 지침이 우선하며, 위의 초기 「캐시 예외」 설명을 신규 예외 승인으로 간주하지 않습니다. 새 구조/정책 변경 전 최신 근거·개발 플랜 및 DB 변경 승인을 확인합니다. 운영 결과는 DESIGN_HANDOFF와 같은 날짜 개선 인수인계의 Windows 최종 절을 읽습니다.


## Windows 최종 완료 — v1.07 (2026-10-16)

production dpl_2fSGbqZK3PrGWSSy85dyG8m2BmXt READY, 소스 c80a44af 푸시·DB v1.07. 타입/빌드 통과, 합성 15개·실제 일반 회원 Edge 로컬/운영 각 12개 통과. 유료 호출·실제 회원 데이터 쓰기 0회. DESIGN_HANDOFF 7절과 IMPROVEMENT_HANDOFF의 Windows 최종 절이 최신입니다. 기존 보안 #11/#12는 미해결이며 신규 캐시 예외를 허용하지 않습니다.

## 2026-10-16 회원 생성 데이터 격리·30일 자동삭제 — v1.08 적용 준비

**정책 확정, 수정안 검수 완료, 운영 DB 변경·만료 자료 삭제 승인 대기입니다. 운영은 v1.07입니다. 후보 코드를 먼저 배포하지 않습니다.**

주인님 재확정: 본인 계정·본인 API로 만든 자료는 본인만 사용하며 다른 회원과 공유·복사·재사용하지 않습니다. 공개 회사자료/비용 절감도 예외가 아닙니다. 공통 Supabase 기반 시설은 유지하고 회원별 `user_id`·RLS로 나눕니다.

후보 v1.08은 `competitor_company_profiles`에 회원별 조사를 새로 저장합니다. 소유자 없는 옛 `competitor_profiles`는 회원 읽기·쓰기를 차단하며 누구에게도 복사하지 않습니다. 생성 자료는 30일 시점부터 접근 차단하고 매시 07분(UTC) 정리합니다. 키워드 정의·추적 선택·계정·키·권한·결제·설정은 삭제 대상이 아닙니다. 분석 회차의 검색결과·리포트는 그 회차 생성일을 기준으로 함께 만료합니다.

재개 순서·검수 증거·승인 범위: [회원별 보관 정책 인수인계](docs/MEMBER_RETENTION_HANDOFF_20261016.md). 개발 플랜: [PLAN](docs/PLAN_20261016_MEMBER_DATA_RETENTION.md). 유료 외부 호출 0회입니다.
