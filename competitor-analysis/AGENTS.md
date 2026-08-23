# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **경쟁사 키워드 분석 자동화(competitor-analysis)** 프로젝트에서 AI Agent(Claude
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
6. **유료 API 호출** (SerpApi 검색, Perplexity 리서치, OpenAI/Anthropic 분석 등 — 키워드 1회
   "지금 분석하기"마다 SerpApi 1회 + 신규 도메인 수만큼 Perplexity/OpenAI 호출이 발생한다)

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
- 사용자 소유 데이터 테이블(`competitor_keywords`, `competitor_serp_jobs`,
  `competitor_serp_results`, `user_tracked_competitors`, `competitor_analyses`)은 `user_id` +
  RLS owner-only 정책으로 격리한다. **단, `competitor_profiles`(도메인→회사정보)는 예외적으로
  전역 공유 캐시다** — 회사 정보 자체는 사용자와 무관한 객관적 사실이라, 여러 회원이 같은
  도메인을 조회해도 Perplexity/GPT 리서치를 한 번만 하도록 의도적으로 공유 설계했다(비용 절감).
  이 테이블만 select/insert/update를 "로그인한 사용자면 누구나"로 열어둔다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 키워드 CRUD, SerpApi 검색(organic/ad/PAA 분류), 경쟁사 리서치(전역 캐시 dedup), GPT 분석, 선택적 Claude HTML 리포트 | ✅ 구현 완료 |
| 1 | 구글 외 네이버 검색엔진 지원 — 키워드마다 구글/네이버 선택(`competitor_keywords.engine`), `lib/serp/client.ts`의 `searchNaver()`(응답 필드가 구글과 달라 별도 파서: `web_results`→organic, `ads_results`→ad). 네이버는 PAA/지역결과에 대응하는 필드가 명확하지 않아 organic/ad만 채움 | ✅ 구현 완료 (2026-08-23) |
| 2 | Vercel Cron 정기 모니터링 + 이전 회차 대비 순위 변동 표시 | ⏳ 예정 |
| 2 | 여러 키워드를 가로지르는 "도메인별 노출 빈도(share of voice)" 대시보드 | ⏳ 예정 |
| 2 | PAA 질문 중 미대응 콘텐츠 갭 제안 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
