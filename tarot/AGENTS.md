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
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
1. **파일이나 폴더 삭제**
2. **환경변수와 API 키 변경**(카카오 공유 SDK 앱키 등)
3. **데이터베이스 실제 데이터 삭제**

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
켈틱크로스 10카드/말굽 7카드/관계 6카드/커리어 6카드/한 해 운세 12카드/생명의 나무
10카드/만다라 9카드/예·아니오 3카드, 총 12종) +
화풍(12종)/AI모델 선택 → 질문 입력(선택) → 78장 중 스프레드에 맞는 카드 뽑기 → 결과 화면에서
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

## 🖼 대표 이미지 (2026-09-29)

- 카탈로그 썸네일(`programs.thumbnail_url`)과 랜딩 상단 배너(`public/tarot-main-thumbnail.jpg`)는 같은 **실사 이미지**다
  (관리자 Gemini 키로 `scripts/generate-program-thumbnail.mjs` 생성, Storage `program-images/catalog/tarot-reading-thumbnail.jpg`).
- 예전 이미지(`/images/tarot-thumbnail.png`, `tarot-main-thumbnail.png`)는 일러스트 + 영문 문구 + 정사각형이라 루트
  `docs/PLATFORM_PATTERNS.md` §13(실사·문구 없음·16:9) 위반이어서 삭제했다. 대표 이미지를 바꿀 때 일러스트나 글자 박힌
  이미지를 다시 쓰지 말 것. (카드 이미지 자체는 AI 일러스트가 맞다 — 이 규칙은 프로그램 대표 이미지에만 해당.)

## 🆓 이용 권한 (2026-09-30, v1.03)

- 이 프로그램은 **FREE 배지**(`programs.badges`에 `free`)를 달아 "AIMaster에 가입만 하면 등급과 무관하게 무료 사용"으로 운영한다(회원가입 유도용).
- `lib/access.ts`는 루트 `CLAUDE.md` 핵심 원칙 6번의 공통 순서(정지→관리자→FREE→구독→최소 등급 없음→등급+사용기간)를 따른다. 예전의 "등급만 확인 / 등급 없으면 허용" 방식은 없앴다.
- 유료로 바꾸려면 코드가 아니라 관리자 프로그램 편집 화면에서 FREE 배지를 끄면 된다(그러면 사용기간을 받은 일반 이상 회원만 사용).

## 📦 Phase 진행 상태

상세 내용은 README.md의 "Phase 진행 상태" 표 참고.
- v1.05 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (tarot-reading)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.07 (Claude Code 윈도우)
- 새 주소 `https://tarot-reading.buylife.xyz`(Vercel `tarot`에 연결), `programs.app_url` 갱신(SQL `supabase/migrations/0006_sso_domain_v1_07.sql`). 로그인 쿠키를 `.buylife.xyz`로 공유: `lib/supabase/cookieDomain.ts` + `client.ts`·`server.ts`·`middleware.ts`(기준 `stepmail`).
- 옛 `*.vercel.app` 화면 주소 → 새 주소 308(API 제외, 옛 주소 유지). 메타·공유 기본 주소(환경변수 없을 때) 새 주소로. **Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`은 그대로**(변경은 승인 필요 — 옛 주소 공유 링크도 308로 이어짐).
- 검수: 메인 카탈로그 [실행하기] = 새 주소, 로그인 필요한 `/draw`가 재로그인 없이 열림(시험 계정), 옛 주소 308 확인.

## v1.08 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `app/api/generate-card-image/route.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.09 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (3묶음 단일 주소형, Claude Code 윈도우)
- `app/api/generate-card-image/route.ts`의 자체 모델 목록·호출을 공용 사본(`lib/ai/`)으로 교체(60초 시간 제한 유지, 주소 v1 → v1beta, 오류는 같은 JSON 응답 형식). 바뀐 값: 1K 등급 → flash-lite, Pro 모델 → `3-pro-image`.
- 개선: 키 머리글 전송, 시간 제한, 서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·비율·화질은 그대로.
- 검수: tsc·eslint(바뀐 파일) 0, build, 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.10 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.11 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.12 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).
