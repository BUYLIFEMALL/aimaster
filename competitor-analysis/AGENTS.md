# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **경쟁사 키워드 분석 자동화(competitor-analysis)** 프로젝트에서 AI Agent(Claude
Code 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

> **2026-10-23 최신(v1.08 운영):** 마케팅 병합 A로 롱테일 키워드분석이 「🌱 키워드 확장」으로 들어왔고 이름이 **키워드·경쟁사 분석 자동화**로 바뀌었습니다. v1.08 회원별 회사 조사·30일 자동 삭제는 주인님 승인(백업 후 적용)으로 운영 DB 적용·배포까지 끝났습니다. 맨 아래 「2026-10-23」 절을 먼저 읽습니다.
>
> **최상위 정정(2026-10-16):** 생성 데이터는 회원 본인 소유이며 30일 후 자동삭제 대상입니다. 초기 전역 회사 캐시 설계는 폐기됐습니다. v1.08 수정안은 검수됐으나 운영 적용은 승인 대기입니다(→ 2026-10-23 적용 완료). 아래 최신 인수인계를 먼저 읽습니다.

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

## 2026-10-17 v1.07 인수 완료 재확인

맥미니 ac41f83c의 Windows 인수는 기존 배포/DB v1.07·현황판 50번 완료 상태이며, 실제 일반 회원 Edge 1440px/375px 운영 재검수 12개도 통과했습니다. 제품 변경·유료 분석·DB 쓰기 없이 확인했습니다. 현재 소스 후보 v1.08의 DB/30일 정리 승인 대기와 구분합니다. [최신 재확인 인수인계](docs/V107_RECHECK_HANDOFF_20261017.md)를 읽고 v1.08 승인 상태부터 확인합니다.

## 2026-10-23 마케팅 병합 A + v1.08 운영 적용 — 키워드·경쟁사 분석 자동화 (Claude Code 윈도우)
- **무엇**: 롱테일 키워드분석(`longtail-keyword-expander`)을 「🌱 키워드 확장」(`/expand`·`/expand/[id]`·`/expand/[id]/runs/[runId]`·`/expand/history`)으로 합침. 씨드 키워드 → SerpApi 검색 맥락(`lib/serp/context.ts`) → OpenAI 연관 키워드·관련도 → 롱테일 확장 → 작업 지시문(`lib/ai/expansion.ts`), CSV, 텔레그램 알림. 옛 롱테일 표 4개를 그대로 읽고 씀(데이터 이동 없음). 메뉴 1 키워드 확장 → 2 경쟁사 분석 → 3 분석 결과. 이름·대시보드·매뉴얼·설정 문구 갱신. FREE 배지 유지(주인님 결정).
- **텔레그램**: 공용 사본 `lib/telegram/client.ts`(기준 instagram-comment-reply, `check-shared-modules.mjs`에 등록). `lib/telegramLink.ts`가 이 앱 연결(`program_slug=competitor-analysis`)을 먼저, 없으면 롱테일 때 연결(`longtail-keyword-expander`)을 읽음. 연결 해제는 둘 다 지움.
- **30일 보관**: v1.08 마이그레이션(`20261016115339_*`) + 롱테일 정리(`20261023120000_merge_a_longtail_retention.sql`, 매시 09분 UTC, 실행 기록 `executed_at`·연관/확장 `created_at` 기준, 씨드 키워드는 지우지 않음). 롱테일 표에는 「30일 지난 행 읽기 차단」 정책을 넣지 않음 — upsert가 정리 전 지난 행과 겹치면 막히기 때문(화면은 코드 필터로 숨김). 다시 확장하면 연관·롱테일 행의 `created_at`을 오늘로 갱신.
- **운영 DB(ref esgxyikcnnvmlhygjkth, 크롬 SQL Editor, 주인님 승인 「백업 후 적용」)**: 백업 `D:\Antigravity\AIMaster_backup\competitor-longtail-20261023\`(10개 표 198행 + 프로그램 행). 적용 직후 정리 1회 실행: 경쟁사 실행 2·검색 결과 38·분석 2·옛 공용 회사 정보 2, 롱테일 실행 4·연관 31·확장 73 삭제(모두 30일 경과, 관리자 1명·일반 회원 7명 자료). 남은 것: 경쟁사 키워드 7, 씨드 4, 30일 이내 롱테일 실행 1·연관 10·확장 22. 옛 `competitor_profiles` 회원 접근 정책 0개(차단). 예약 작업 2개 켜짐. 프로그램 행: 이름·v1.08·한 줄/상세 소개·detail_sections(`20261023130000_merge_a_programs_v1_08.sql`).
- **검사**: tsc·`npm run build`, `npm run test:retention` 7개, 새 `npm run test:expansion` 7개(본인 키만·생성일 갱신·텔레그램 옛 연결/새 연결 우선·키 없음 안내·다른 회원 씨드 차단) 통과.
- **배포**: `competitor-analysis-qu3arklzv` Ready(운영 주소 연결). 크롬(관리자 계정, 1697px): /expand·/expand/history·/keywords·/settings 정상(롱테일 씨드 2개·텔레그램 봇 이어서 보임), 콘솔 오류 0, 카탈로그에 새 이름만. 휴대폰 폭은 창이 최대화라 390px iframe으로 확인(좌측 메뉴 숨김·☰·가로 넘침 없음). **유료 확장 실행(SerpApi·OpenAI) 실시험은 하지 않음** — 서버 코드는 모의 시험으로만 확인.
- **남은 일**: 시험 계정으로 실제 확장 1회(유료 SerpApi 1 + OpenAI 3, 승인 필요) · 「키워드 확장 결과에서 고른 키워드를 경쟁사 분석으로 바로 등록」 버튼(지금은 메뉴 이동 링크만) · 커밋 `609e84731`에 다른 세션이 스테이징한 `scripts/deploy.mjs`가 섞였으나 그 세션이 `dce8e6164`에서 같은 내용으로 다시 반영함(내용 영향 없음).
- 링크: https://competitor-analysis.buylife.xyz/expand

## 2026-10-23 v1.09 — 확장 결과 → 경쟁사 분석 바로 등록 + 실제 확장 1회 시험 (Claude Code 윈도우)
- `components/expand/SendToAnalysis.tsx` + `registerKeywordsForAnalysisAction`(`lib/actions/expandSeeds.ts`): 결과 화면에서 씨드·연관·롱테일 키워드를 최대 10개 골라 `competitor_keywords`로 등록. 본인 씨드의 30일 안 결과에 있는 키워드만 허용, 같은 검색엔진에 이미 있는 키워드는 건너뜀, 검색엔진은 씨드 것·지역/언어 기본값(South Korea·ko). 유료 호출 없음(분석은 경쟁사 분석 화면에서 직접 실행).
- 시험: `npm run test:expansion` 12개(새 5: 등록·다른 회원 씨드 차단·결과에 없는 키워드 거부·30일 지난 결과 거부·10개 제한). 빌드·배포 `competitor-analysis-5f6merwx4` Ready·DB v1.09.
- 실제 확장 1회(주인님 승인, 관리자 계정·본인 SerpApi·OpenAI 키): 「가을 계절상품」 네이버 → 연관 6·롱테일 14·평균 관련도 73%·작업 지시문 정상, 등록 버튼으로 2개 등록 확인. 시험 계정에는 SerpApi 키가 없어 회원 계정 실시험은 못 함.
- **미배포 대기**: 경쟁사 분석 화면 안내 문구 정정(`87b773ef2`) — 「다른 회원이 조사한 회사 정보 재사용」이 v1.08 이후 사실과 달라 「본인 30일 안 조사만」으로. 다음 배포 때 버전 +0.01.
- 남은 확인: 텔레그램 알림 실제 수신, 등록 칩의 접근성 이름이 종류(`title`)로 읽히는 점(화면엔 키워드가 보임) — 급하지 않음.

## 2026-11-05 v1.11 배포 완료 (Claude Code 윈도우 `claude-win-blog`)
- 함께 나간 것(아래 맥미니 절의 미배포 대기):
  - 고칠 점 3개 `df911339e`: 연락처 숫자, 이름 꼬리 떼기, 스캔 탭을 앞으로
  - 엑셀 내려받기 `e645c227a`
  - 위쪽 안내 문구 `70e8d7202`
- 윈도우가 더한 것: 버전 표기 정리(팝업, 내려받기 버튼은 `APP_VERSION`), ZIP v1.11, 시험 PU05 이름 꼬리·PU09 엑셀(`af382a3c8`)
- 배포 `competitor-analysis-ov4f44ody`가 Ready이고, DB·확장·ZIP이 v1.11로 같습니다(check OK). DB 표 변경은 없습니다.
- 엑셀은 이 PC의 실제 엑셀 16에서 열어 한글, 전화번호 앞자리 0, 굵은 머리글을 확인했습니다.
- 남은 일: 맥미니가 시험 계정으로 「공동구매」 10곳 스캔과 엑셀 내려받기를 확인합니다.
- **이번 배포로 아래 「미배포 대기」 표시는 모두 내보냈습니다.**

## 2026-11-05 v1.10 배포 완료 (Claude Code 윈도우 `claude-win-blog`)
- 아래 맥미니 초안을 윈도우가 마무리했습니다.
  - 시험을 추가했습니다: `npm run test:partners-db` 8개, `npm run test:partners` 8개.
  - 주인님 승인으로 운영 DB에 적용했습니다.
  - 확장 ZIP을 만들고 내려받기 칸을 넣었습니다(동의 뒤 화면).
  - 배포 `competitor-analysis-nh5csc4q9`가 Ready이고, DB 버전·확장 버전이 v1.10, `check-extension-release`가 OK입니다.
  - 이메일 수집 기본값은 꺼짐으로 확정했습니다.
- 남은 일: 맥미니 실물 확인(동의 → 확장 설치 → 10곳 스캔, 쿠키 호출 확인)입니다. 다음 배포 때는 위쪽 안내 문구를 자동 스캔에 맞게 고칩니다.
- 상세: [`docs/PLAN_20261105_PARTNER_FINDER.md`](docs/PLAN_20261105_PARTNER_FINDER.md) §4 단계 5
- 링크: https://competitor-analysis.buylife.xyz/partners

## 2026-11-05 v1.10 초안 — 「🤝 제휴 타깃 찾기」 (Claude Code 맥미니, **미배포·DB 미적용** → 위 절에서 배포 완료)
- **무엇**: 키워드(예: 공동구매)로 그 주제의 네이버 블로그·업체(플레이스)·카페·쇼핑몰 채널을 **회원 본인 네이버 검색 키로 공식 검색 API**에서 찾아 담고, 회원이 채널 공개 페이지를 열어 **직접 확인한** 비즈니스 전화·이메일을 적어 두는 참고용 목록. CSV 내려받기. 주인님 「본인 비즈니스·채널 홍보하려고 연락처를 공개한 사람과 그런 사람을 찾는 사람을 연결」「개인 참고용·본인 책임 명시」「기본 엔진 먼저, 잘되면 유튜브·인스타·쓰레드 확장」.
- **근거·지정**: 마케팅 수집 예외 지침 §4(공개 비즈니스 연락처만·공개 목적 범위·회원 책임 고지) · 최상위 규칙 §8 지정 목록 2026-11-05 줄 · 플랜 [`../docs/analysis-biz-contact-finder-20261105/PLAN.md`](../docs/analysis-biz-contact-finder-20261105/PLAN.md) · 타당성 [`../docs/analysis-cafe-recruit-20261105/FEASIBILITY_PUBLIC_CONTACT_20261105.md`](../docs/analysis-cafe-recruit-20261105/FEASIBILITY_PUBLIC_CONTACT_20261105.md).
- **지키는 선**: 서버는 채널 페이지를 긁지 않음(공식 API만, 이메일 자동수집 프로그램 ❌ — 정보통신망법 제50조의2) · 연락처는 회원이 직접 확인해 적는 값만 · 숨긴 정보·탐지 회피·동의 없는 광고 발송 ❌ · 켤 때 고지 동의(`lib/partners/notice.ts`, 문구 바꾸면 `PARTNER_NOTICE_VERSION` 올림) · 회원 본인 소유·30일(관리자·시험 계정 열외).
- **바뀐 파일**: `lib/naver/search.ts`(신규, `blog-keyword/src/lib/kw/naver.ts` 방식: API HUB 먼저 → 401/403/404면 옛 주소, blog·local(최대 5)·cafearticle·shop) · `lib/actions/partners.ts`(동의·찾기·연락처 저장·삭제) · `lib/partners/notice.ts` · `components/partners/PartnerClient.tsx` · `app/(dashboard)/partners/page.tsx` · 메뉴 `components/layout/Sidebar.tsx`(🤝) · 설정 네이버 키 묶음(`app/(dashboard)/settings/page.tsx`, `lib/apiKeyLabels.ts`, `lib/actions/settings.ts` — 공용 이름 `naver_client_id`·`naver_client_secret`, 다른 프로그램에 등록한 키 그대로) · `types/database.types.ts` · DB 초안 `supabase/migrations/20261105140000_partner_channels.sql`(표 `competitor_partner_channels`·`competitor_partner_consents`, 회원 RLS, 연락처 칸만 수정 허용, 30일 조회 차단+열외, 매시 11분 정리).
- **검사**: 맥미니 `tsc --noEmit` 통과(0). **빌드·시험 미실행**(맥미니 esbuild·SWC가 윈도우용).
- **윈도우 할 일**: [`docs/INSTRUCTION_20261105_PARTNER_FINDER.md`](docs/INSTRUCTION_20261105_PARTNER_FINDER.md).
- **매칭 판정 추가(같은 날, 주인님 「주제·키워드에 맞지 않는 데이터는 의미가 없어, 매칭되는 사람만」)**: `lib/partners/match.ts` — 검색 반복 등장(최대 40)·채널 이름에 주제(30)·분류에 주제(20)·글에 주제(20)·보조 단어(개당 10, 최대 30) → 0~100점, 기준(엄격 60·보통 40·넓게 20) **미만은 저장 안 함**. 목록은 점수 높은 순, 「매칭 n점 + 이유」 표시, CSV에 점수·이유. 표 초안에 `match_score`·`match_reasons` 칸. 스캔(확장) 단계용 `scoreProfile`(프로필·소개글에 주제 +40)도 준비.
- **구조(주인님 재확인)**: 우리는 시스템·저장 공간만, 실제 수집은 회원 각자 PC·핸드폰(확장), 결과는 회원 계정에 모아 내려받기. 다음 단계 = 공개 연락처 자동 스캔 확장(`competitor-analysis/extension/`, 이름·핸드폰 > 일반전화 > 이메일 우선).
- **키워드 추천 추가(같은 날, 주인님 「어떤 키워드로 검색할지 모르는 사람이 많으니 메인·연관·많이 검색하는 키워드·카테고리 추천」)**: `lib/partners/suggest.ts`(기준 `blog-keyword/src/lib/kw/naver.ts`의 자동완성·검색광고 키워드도구) + `suggestPartnerTermsAction`. 화면: 추천 주제 버튼 15개(`STARTER_TOPICS`, `lib/partners/notice.ts`) · 「🔮 키워드 추천 받기」 → ① 메인 ② 연관(자동완성 ㄱ~ㅎ, 무료) ③ 많이 검색하는 키워드(검색광고 키 있을 때 월간 검색량 순, 없으면 등록 안내) ④ 카테고리(업체·쇼핑 실제 분류 빈도, 검색 키 필요). 칩 누르면 그 키워드로 찾기, ＋는 보조 단어에 더하기. 설정에 검색광고 키 3칸(선택, 공용 이름 `naver_ads_*`). 아무것도 저장하지 않음·AI 호출 없음.

- **미배포 대기(2026-11-05 맥미니)**: 제휴 타깃 찾기 안내 문구 2곳을 자동 스캔에 맞게 정정(「연락처 직접 적기」 → 「확장이 공개 연락처 자동으로 읽어 옴」) — `app/(dashboard)/partners/page.tsx`·`components/partners/PartnerClient.tsx`. 다음 배포 때 버전 +0.01.

## 2026-11-05 v1.10 맥미니 실물 확인 결과 + 다음 할 일 (Claude Code 맥미니 `claude-mac-20261101-blog`, 크레딧 소진으로 다른 계정이 이어 받음)
- **실물 확인(ego, 시험 계정 `buylifemall@naver.com`)**: 네이버 검색 키·검색광고 키 등록됨 · 책임 동의 완료 · 확장 설치(원본 폴더 `competitor-analysis/extension` 로드) · 「공공구매」(주인님 오타) 찾기 → 50곳 중 매칭 1곳 담김 · 스캔 1곳 성공 → 목록에 「📇 010-6296-7940 (핸드폰) · 광주행정사 : 네이버 블로그」(블로그 안쪽 틀 프로필 글자에서 읽음).
- **확정**: 확장이 **회원 로그인 쿠키로 서버 호출 가능**(기기 연결 방식 불필요) · 스캔 탭이 뒤에 있으면 「잠시 멈춤」 설계대로 · 끝나면 「모두 마쳤습니다 · 오늘 1곳」.
- **아직 못 한 것**: 「공동구매」(정확한 키워드)로 찾기 → 10곳 스캔 확인. 주인님이 「스캔 시작」 후 새 `about:blank` 탭을 앞에 둬야 함(아래 고칠 점 3).
- **고칠 점(미배포 대기에 추가, 다음 배포 때 버전 +0.01)**:
  1. KPI 「공개 연락처 적음」이 손으로 적은 연락처만 셈 → `primary_contact`(확장이 읽은 값)도 세기 — `app/(dashboard)/partners/page.tsx`.
  2. 공개 이름이 페이지 제목 그대로(「광주행정사 : 네이버 블로그」) → 「 : 네이버 블로그」 같은 꼬리 떼기 — `extension/background.mjs` `display_name`(또는 서버 `route.ts`에서 정리).
  3. 「스캔 시작」 뒤 스캔 탭이 앞에 오지 않음(팝업에서 시작하면 원래 탭이 앞에 남음) → `start()`에서 `chrome.tabs.update(tab.id,{active:true})` + `chrome.windows.update(win.id,{focused:true})`, 팝업 문구 「열린 스캔 탭을 앞에 두세요」.
  4. (이미 커밋 `70e8d7202`) 위쪽 안내 문구 정정.
- 고친 뒤: 확장은 manifest·ZIP·DB 버전 함께(핵심 원칙 10) — 윈도우 빌드·배포(빌드 1회 주인님 승인).
- **고칠 점 1~3 반영(같은 날 맥미니, 미배포 대기)**: KPI 「공개 연락처 있음」이 확장이 읽은 대표 연락처도 셈 · 이름 꼬리 「 : 네이버 블로그」 등을 서버 저장 때(`route.ts` `cleanName`)와 목록 표시 때 모두 뗌 · `start()`가 스캔 탭·창을 앞으로 + 팝업 안내 문구. 맥미니 `tsc` 0·확장 문법 OK. **확장 파일이 바뀌었으니 배포 때 버전 v1.11 + manifest·ZIP·DB 함께(핵심 원칙 10)**.
- **엑셀(.xlsx) 내려받기(같은 날 맥미니, 미배포 대기, 플랜 단계 4)**: 패키지 없이 만드는 최소 엑셀 생성기 `lib/partners/xlsx.ts`(압축 안 한 ZIP + XML, 모든 칸 글자 → 전화번호 앞자리 0 유지, 머리글 굵게·고정) + 목록 「⬇️ 엑셀 내려받기」(CSV는 옆 작은 버튼으로 유지). 맥미니 검증: ZIP·XML 6개 정상, `file` 판별 「Microsoft Excel 2007+」. **윈도우 확인 필요**: 내려받은 파일을 실제 엑셀에서 열어 한글·전화번호(010-…) 확인.

## 2026-11-05 v1.11 실물 확인 + 업체 스캔 멈춤 수정 (맥미니, 미배포 대기 → v1.12)
- **v1.11 운영 확인(ego 읽기)**: 이름 꼬리 떼기 ✅(「광주행정사」) · 「공개 연락처 있음 2」 ✅ · 블로그에서 일반전화 `031-994-7567` 읽기 ✅ · 엑셀·CSV 버튼 보임(파일 열기 미확인).
- **발견**: 「공동구매」 찾기 결과 업체 2곳이 계속 「스캔 대기」. 원인 = 네이버 지역 검색 `link`가 업체 자체 주소(`open.kakao.com/...`, `pocket.oopy.io`)라 확장 권한 밖 → `executeScript` 권한 오류 → 스캔 **전체가 멈추고** 대기로 되돌림.
- **수정**: `extension/background.mjs` — 네이버 읽기 허용 주소(`READABLE`, manifest와 같게) 밖이면 열지 않고 `scan_report status:"skipped"` 후 바로 다음 · 읽기 실패도 그 곳만 건너뜀. `route.ts` — `skipped` → `scan_status='stopped'`(기존 허용 값 재사용, DB 변경 없음, 다시 고르지 않음). 목록 — 「네이버 밖 주소라 자동으로 읽지 않음 — 링크를 열어 직접 확인」. 맥미니 `tsc` 0·확장 문법 OK.
- **주인님 결정 대기**: 「공동구매」 담긴 채널이 3곳뿐(보통 40점 기준). 추천 = 채널 이름·소개에 주제 있으면 가점(`lib/partners/match.ts`). 그 밖 선택지: 그대로(회원이 「넓게」 선택) / 검색 페이지 늘리기(하루 검색 한도 소모).
- 다음 배포 v1.12: 확장 파일 바뀜 → manifest·ZIP·DB 함께, 빌드 1회 주인님 승인.
- **v1.12 배포 완료(2026-11-06, 윈도우 claude-win-blog)**: 위 세 커밋 + 버전·ZIP `43b6a5bcb`. 시험 PU01~09·PD01~08, `tsc`, 빌드 통과 → 빌드 1회 배포 → DB `version`·`extension_version` v1.12 → `check-extension-release` OK(DB·확장·ZIP v1.12) → ego로 운영 화면 v1.12 확인(관리자는 동의 전 화면). DB 표 변경 없음(`scan_status` 'stopped'는 기존 제약에 있음). 참고: 건너뛴 줄(`stopped`)은 판정이 「후보 · 스캔 전」으로 남지만 목록 안내 줄이 「네이버 밖 주소 — 직접 확인」을 보여 줌. 다음: 맥미니가 확장 v1.12를 다시 받아 「공동구매」 다시 찾기 → 후보 개수 → 스캔 → 매칭/주제 약함 판정·업체 「네이버 밖 주소」 표시 확인.
- **매칭 후보 + 스캔 최종 판정(같은 날 맥미니, 주인님 「진행해」, 미배포 → v1.12)**: 원인 = 블로그 검색은 글 한 편만 줘서 한 번 나온 블로그는 「글에 주제」 20점뿐 → 기준 40 미만이라 저장조차 안 됨. 수정: `lib/partners/match.ts` — 기준-20점(최소 20)까지 「후보」로 담고(`CANDIDATE_MARGIN`), 매칭 이유 끝에 `기준 N점`을 적어 판정 기준을 줄마다 보관(DB 변경 없음, 옛 줄은 40), `verdict()` = 검색 점수 + 화면 점수 ≥ 기준 → ✅ 매칭 / 스캔 전 → 후보 / 스캔 뒤 모자람 → 주제 약함. 화면 점수(`scoreProfile`·확장 `background.mjs` 같은 규칙) = 채널 화면에 주제 3번 이상 +40, 1~2번 +10(전에는 1번만 나와도 +40이라 판정력 없음). 목록은 매칭→후보→약함·최종 점수 순, 엑셀에 「매칭 판정」 칸, 찾기 문구에 「그중 n곳은 후보」. 시험 PU01 기대값 수정·판정 4줄 추가. 맥미니 `tsc` 0·규칙 계산 확인.
