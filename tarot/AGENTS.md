# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **AI 타로(tarot)** 프로젝트에서 AI Agent(Claude Code 등)가 협업할 때 준수해야
할 필수 가이드라인입니다. mbti-character를 스캐폴드 템플릿으로 삼아 만들었으며, 로그인
필수/API 키 표준 패턴 등 대부분의 구조를 그대로 따릅니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- Supabase 스키마 추가/마이그레이션(MCP 포함)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **환경변수와 API 키 변경**(카카오 공유 SDK 앱키 등)
5. **데이터베이스 실제 데이터 삭제**

### 3. 새 테이블에 의존하는 기능을 "완료"로 표시하기 전에 반드시 확인할 것
`supabase/migrations/`에 SQL 파일이 있고 로컬 빌드가 통과한다고 해서 그 테이블이 실제
운영 DB에 존재한다는 보장이 없다. 2026-09-19에 `tarot_readings` 테이블이 `0004_create_
tarot_readings.sql` 파일로는 저장소에 있었고 README/AGENTS.md Phase 표에도 "✅ 완료"로
적혀 있었지만, 실제 Supabase(`esgxyikcnnvmlhygjkth`)에는 **한 번도 적용된 적이 없어서**
카드 이미지/AI 해석 저장이 매번 조용히 실패하고 있었다(자세한 경위는 README.md "리딩 이력
저장" 참고). 새 테이블에 읽거나 쓰는 기능을 구현했다면, 완료 처리하기 전에 Supabase MCP의
`list_migrations`(그 마이그레이션 이름이 실제로 적용 이력에 있는지) 또는
`execute_sql`로 `select table_name from information_schema.tables where table_name =
'...'`를 직접 실행해 실제 존재 여부를 확인할 것 — 파일이 있다는 것과 적용됐다는 것은
별개다.

같은 날 이어서 발견한 연쇄 원인: `lib/supabase/server.ts`의 `createAdminClient()`는
`SUPABASE_SERVICE_ROLE_KEY`가 없으면 조용히 `NEXT_PUBLIC_SUPABASE_ANON_KEY`로
대체(fallback)한다 — 이 env var가 Vercel에 등록되지 않았어도 에러 없이 그냥 RLS를
우회하지 못하는 클라이언트가 된다. `createAdminClient()`를 쓰는 기능(레거시 공유 링크
복원, `/result?rid=...` 조회 등)을 새로 만들거나 디버깅할 때는 `vercel env ls
production`으로 이 env var가 실제로 등록돼 있는지도 함께 확인할 것.

---

## 🎯 프로젝트 목적

AIMaster 계정으로 **로그인해야 이용할 수 있는 AI 타로 리딩 웹사이트**. 랜딩 페이지(`/`)는
비로그인 방문자도 볼 수 있는 마케팅 화면이고, 카드 뽑기(`/draw`)와 결과(`/result`)는
로그인이 필요하다 — mbti-character와 동일하게 "AIMaster 회원가입 유도 채널" 역할도 겸한다.

핵심 흐름: 로그인 → 스프레드 선택(원카드/3카드 과거현재미래/3카드 궁합/5카드 심층분석/
켈틱크로스 10카드/말굽 7카드) +
화풍/AI모델 선택 → 질문 입력(선택) → 78장 중 스프레드에 맞는 카드 뽑기 → 결과 화면에서
카드를 하나씩 클릭하면 등록된 Gemini 키로 카드 일러스트 생성, 전체 카드가 공개되면
등록된 OpenAI 키로 AI 종합 해석 자동 생성 → 결과는 `tarot_readings`에 자동 저장되어
`/history`(내 타로 보관함)에서 다시 볼 수 있음 → 카카오톡/링크 공유. 설계 배경(왜 AI 생성
카드 이미지인지, 스프레드 종류가 왜 이렇게 구성됐는지, 왜 해석 생성에 OpenAI를 썼는지)은
README.md 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `tarot/`
* 모든 관련 소스 코드는 이 폴더 내에서 개발 및 관리합니다.

---

## ⚠️ 카드 이미지/콘텐츠 작성 시 반드시 지킬 것

- **특정 상업 타로 덱(예: Rider-Waite-Smith의 U.S. Games Systems 채색 재판)의 실제
  아트워크나 사진을 스캔·모사해서 쓰지 않는다.** 카드 이미지는 항상
  `app/api/generate-card-image/route.ts`가 카드 이름·수트·아르카나 종류·정/역방향 같은
  고정 메타데이터만으로 그때그때 새로 생성하는 AI 일러스트여야 한다. 참고 자료로 조사한
  타로 API/오픈소스 저장소의 이미지 에셋을 이 프로젝트에 복사해 쓰지 않는다.
- `lib/cards.ts`의 78장 카드 문구(키워드/정방향/역방향 설명)는 전통 타로 상징(공유
  민속 지식)을 참고하되 문장은 전부 새로 쓴 것이다. 카드를 추가/수정할 때도 특정 타로
  API·책·웹사이트의 문구를 그대로 베끼지 않는다.
- 카드 이미지 생성 프롬프트(`buildPrompt()`)에는 "사람이 등장하면 특별한 맥락이 없는 한
  한국인(동아시아인) 외모로 그린다"는 지시가 모든 카드에 공통으로 들어가 있다(루트
  CLAUDE.md 플랫폼 공통 원칙 3번). 프롬프트를 수정할 때 이 지시를 빼지 않는다.

---

## 🔗 AIMaster 플랫폼 공통 원칙 적용 현황

tarot은 AIMaster 저장소 안의 서브프로젝트이므로 "Platform-hub 구조"(서브폴더 안에서
자기완결적으로 개발·배포)를 그대로 따른다:
- `lib/access.ts`의 `requireProgramAccess()`(페이지/레이아웃)와 `checkProgramAccessApi()`
  (API route)로 로그인 + `tarot-reading` 프로그램 이용 권한을 확인한다. 새 페이지나 API
  route를 추가할 때 이 체크를 빠뜨리지 말 것.
- 로그인 확인이 들어가는 파일에는 `dynamic = "force-dynamic"` + `fetchCache =
  "force-no-store"`를 반드시 같이 선언한다 — `middleware.ts`, `app/layout.tsx`,
  `app/page.tsx`, `app/draw/page.tsx`, `app/result/page.tsx`, `app/settings/page.tsx`,
  `app/history/page.tsx`, `app/api/generate-card-image/route.ts`,
  `app/api/generate-reading/route.ts`에 이미 적용돼 있다.
- 공용 Supabase 프로젝트(esgxyikcnnvmlhygjkth)를 그대로 쓴다. 뽑힌 카드/질문은 URL
  쿼리스트링(`/result?cards=...&q=...`)으로 결과 화면까지 전달되고, 카드 이미지·AI 해석이
  생기는 대로 `tarot_readings` 테이블(`user_id` + RLS owner-only)에 자동 저장되어
  `/history`(내 타로 보관함)에서 다시 조회할 수 있다. `/result`의 레거시 공유 링크 복원
  로직(`createAdminClient()`로 RLS 우회)은 **`img` 파라미터(공유받은 정확한 이미지 URL)가
  있을 때만** 동작하고, 그 정확한 URL을 실제로 갖고 있는 리딩 한 건만 매칭한다 — 새로
  카드를 뽑을 때(파라미터 없음)는 절대 이 DB 조회를 타지 않는다(2026-09-18에 카드 조합만
  으로 매칭하던 옛 로직이 다른 회원의 질문/해석을 잘못 복원하던 크로스 유저 노출 버그를
  고치며 이렇게 바뀌었다). 이 로직을 다시 "카드 구성만으로" 매칭하는 방식으로 되돌리지
  말 것.
- **`user_api_keys` 표준 패턴을 그대로 쓴다.** `lib/apiKeys.ts`의 `resolveApiKey()`가
  공용 `user_api_keys`에서 회원 본인 키만 조회한다(provider: `gemini`, `openai`).
  `/settings`(헤더 라벨 "API키등록·플랫폼연동")에서 등록/수정/삭제한다. **새로운 유료
  API 연동을 추가할 때 BYOK/localStorage로 되돌아가지 말 것.**
- **예외: `/api/og`는 로그인 체크에서 제외한다.** 카카오톡/페이스북 크롤러가 로그인 없이
  이 URL을 긁어가야 공유 미리보기 카드가 정상 노출되므로, `middleware.ts`의 matcher에서
  `api/og` 경로 자체를 뺐다. 이 경로에 실수로 로그인 체크를 추가하지 말 것.

AIMaster 플랫폼과의 연결은 헤더의 "다른 프로그램 보기" 링크(`buylife.xyz/programs`)와,
`programs`/`pricing_plans` 카탈로그 등록으로 유지한다.

## 📦 Phase 진행 상태

상세 내용은 README.md의 "Phase 진행 상태" 표 참고.
