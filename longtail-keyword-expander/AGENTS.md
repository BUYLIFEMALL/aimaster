# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **롱테일 키워드분석 자동화(longtail-keyword-expander)** 프로젝트에서 AI
Agent(Claude Code 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

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
6. **유료 API 호출** (SerpApi 검색, OpenAI 분석 등 — 키워드 1회 "지금 확장하기"마다 SerpApi
   1회 + OpenAI 3회 호출이 발생한다)
7. **텔레그램 실제 발송** — 사용자 본인 봇으로 보내는 것이라 리스크는 낮지만, 연동 테스트가
   아닌 실제 실행 결과 발송은 6번과 동급으로 취급한다.

---

## 🎯 프로젝트 목적

키워드를 입력하면 네이버(또는 구글) 검색결과(SerpApi)를 분석해서 연관 키워드와 롱테일
키워드를 계층적으로 발굴하고, GPT가 "블로그 담당자에게 이번 주 뭘 써야 하는지" 작업 지시
메시지를 만들어주는 콘텐츠 기획 프로그램. 선택적으로 텔레그램으로 결과를 받아볼 수 있다.

**기존에 Make.com으로 운영하던 자동화 시나리오
(`D:\PDS\01🟣네이버 키워드분석-SERP-💰.blueprint.json`, 연동 Airtable `appWzz3bi7r4INt0G`)를
AIMaster 서브프로젝트로 이식한 것**이다 — 방금 완성한 [competitor-analysis](../competitor-analysis)
(경쟁사 식별용)와는 목적이 다른 도구다. 이식하며 바뀐 것과 설계 배경은
[README.md](README.md)의 "설계 배경" 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `longtail-keyword-expander/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은
  `longtail-keyword-expander/` 폴더 내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

longtail-keyword-expander는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- longtail-keyword-expander는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "longtail-keyword-expander"`) 이용 권한(구독/개별부여/등급)이 있는 모든
  사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), 향후 API route를 추가한다면
  redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램
  이용 권한까지 확인한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `serpapi`(검색결과, competitor-analysis와 공유)/`openai`(연관·
  롱테일 키워드 추출, 작업 지시 생성) 2개 provider를 쓴다.
- 텔레그램 알림은 프로그램 접두어 없는 공용 `user_telegram_links`(booking-reminder/
  real_estate_sales/crm-google-form과 공유, `docs/PLATFORM_PATTERNS.md` §9)를 재사용한다 —
  사용자 각자의 봇을 BotFather로 만들어 등록하는 방식이며, 다른 프로그램에서 이미 연동한
  사용자는 재연동이 필요 없다.
- 사용자 소유 데이터 테이블(`longtail_seed_keywords`, `longtail_related_keywords`,
  `longtail_expansions`, `longtail_runs`)은 `user_id` + RLS owner-only 정책으로 격리한다.
  competitor-analysis의 `competitor_profiles`와 달리 전역 공유 캐시는 없다 — 키워드
  발상은 사용자마다 다른 관점이 나오는 게 자연스럽기 때문.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Seed 키워드 CRUD, SerpApi 검색(네이버 6종 카테고리/구글 3종), GPT 3단계(연관 키워드 → 롱테일 확장 → 블로그 작업 지시), 텔레그램 알림(선택) | ✅ 구현 완료 |
| 2 | Vercel Cron으로 `is_active` Seed 정기 자동 확장(원본의 "매주 전체 순회") | ⏳ 예정 |
| 2 | 이메일 리포트 발송(`user_smtp_accounts` 재사용) | ⏳ 예정 |
| 2 | 여러 Seed를 가로지르는 "전체 키워드 사전" 뷰 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
