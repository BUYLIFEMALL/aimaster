# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

> **2026-10-16 윈도우 인수:** [v1.06 검수·오류 수정 인수인계](docs/IMPROVEMENT_HANDOFF_20261016.md)와 [개선 원장](docs/IMPROVEMENTS.md)을 먼저 확인합니다. 로컬 빌드·Edge 합성 화면 12개·일반 회원 로컬 11개 통과, 운영 결과는 인수인계의 최신 릴리스 기록에서 확인합니다.

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
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (SerpApi 검색, OpenAI 분석 등 — 키워드 1회 "지금 확장하기"마다 SerpApi
   1회 + OpenAI 3회 호출이 발생한다)
5. **텔레그램 실제 발송** — 사용자 본인 봇으로 보내는 것이라 리스크는 낮지만, 연동 테스트가
   아닌 실제 실행 결과 발송은 6번과 동급으로 취급한다.

---

## 🎨 적용 디자인 템플릿

| 항목 | 값 |
|---|---|
| 적용 디자인 템플릿 | **스마트 매트릭스 스타일** (루트 `DESIGN.md` 템플릿 4번의 기준 구현, v1.06) |
| 디자인 인수인계 | [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) |
| 개선사항 | [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) |

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
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.05 (longtail-keyword-expander)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.


## 2026-10-16 스마트 매트릭스 스타일 디자인 개편 — v1.06 (Claude Code 맥미니)

- 다크 차콜 + 모던 블루·앰버 토큰(`mx-*`), 대시보드(`/dashboard`, `/` 접속 시 이동)·사용 매뉴얼(`/guide`) 신설, 씨드·결과 목록에 검색·필터·표/카드 전환, 결과 상세에 KPI·관련도 막대·복사 버튼, 휴대폰 ☰ 메뉴(원칙 19), 시각 `Asia/Seoul` 고정, 삭제 확인창.
- 서버 액션·DB·권한 판정은 바꾸지 않았다. 로그인 화면은 공통 밝은 디자인 유지.
- **빌드·배포·화면 검수는 윈도우 CLI 대기**(맥미니 빌드 금지). 절차: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) 6절. 개선 제안: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md).
