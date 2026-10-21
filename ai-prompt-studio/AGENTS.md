# AI
## 2026-10-21 Claude Code(윈도우) — 내 템플릿 저장 때 {{변수}} 자동 제안 (v1.08)
- **무엇**: 결과 화면 「📁 내 템플릿으로 저장」으로 저장 창이 열리고 본문에 변수가 0개이면, AI가 한 번 「쓸 때마다 바뀌는 부분」(최대 8개)을 찾아 `{{변수명}} ← "원래 문구"` 체크 목록으로 제안합니다. 고른 것만 바꾸고, 본문 옆 「🪄 변수 찾기」로 언제든 다시 받을 수 있습니다. 플랜: [docs/PLAN_20261021_TEMPLATE_VARIABLE_SUGGEST.md](docs/PLAN_20261021_TEMPLATE_VARIABLE_SUGGEST.md).
- **방식**: `/api/templates/suggest-field`에 `field:"variables"` 추가 — AI는 본문을 다시 쓰지 않고 `[{name, original}]` JSON만 돌려주며(본문에 실제로 있는 문구·중복 없는 이름만 통과), 화면이 긴 문구부터 정확히 찾아 바꿉니다(`PromptFormModal.applyVariables`). 나머지 문장은 그대로 유지됩니다.
- **검수(2026-10-21, 일반 회원 `buylifemall@naver.com`, 메인 크롬)**: 빠른 만들기 → 결과 → 저장 창 열림과 동시에 자동 제안 8개 → 2개 해제 후 바꾸기 → 6개만 변수로 바뀌고 해제한 「10월」은 그대로 → 저장 `variables` 6개 확인. Gemini Flash: 설계 1회 + 변수 찾기 1회(회원 본인 키).
- 커밋 `b1687b6d`, 배포 https://ai-prompt-studio-d3wsympd4-buylife.vercel.app → https://ai-prompt.buylife.xyz , DB `programs.version=v1.08`(`supabase/migrations/20261021235000_version_v1_08.sql`).

## 2026-10-21 Claude Code(윈도우) — 병합 C: 「📁 내 템플릿 보관함」 추가 (v1.07)
- **무엇**: 「AI 프롬프트 템플릿 자동화」(`prompt-template-studio`)의 보관·`{{변수}}`·AI 변수 채우기·바로 실행을 이 앱으로 옮겼습니다. 플랜: [docs/PLAN_20261021_MERGE_C_PROMPT_TEMPLATES.md](docs/PLAN_20261021_MERGE_C_PROMPT_TEMPLATES.md), 인수인계: [docs/IMPROVEMENT_HANDOFF_20261021_MERGE_C.md](docs/IMPROVEMENT_HANDOFF_20261021_MERGE_C.md).
- **저장**: 새 표 `ai_prompt_templates`(운영 DB `esgxyikcnnvmlhygjkth`, 회원별 `user_id` + RLS 본인만, 회원당 300개, 본문 20,000자). 마이그레이션 `supabase/migrations/20261021230000_merge_c_prompt_templates.sql`. 템플릿은 회원이 직접 만드는 보관함이라 30일 자동 삭제 대상이 아닙니다(AI 실행 결과는 저장하지 않음).
- **코드**: `src/lib/templates.ts`(서비스 롤 + 모든 쿼리 `user_id` 필터), API `/api/templates`(GET/POST/PUT/DELETE·백업 가져오기) · `/api/templates/execute` · `/api/templates/auto-fill` · `/api/templates/suggest-field`(모두 `checkProgramAccessApi` + 회원 본인 Gemini 키 + 캐시 방지 두 줄), `src/components/templates/*`, 좌측 메뉴 「📁 내 템플릿 보관함」, 결과 화면 「📁 내 템플릿으로 저장」. 보관함이 비면 예제 9개를 보여 줍니다.
- **검수(2026-10-21, 메인 크롬·관리자)**: 빌드 통과 → 배포 Ready → 저장·변수 자동 추출·목록·수정·중복 건너뛰기·삭제 API 정상, 새로고침 뒤에도 유지, 실행 1회(Gemini, 관리자 본인 키) 결과 정상, 390px iframe에서 좌측 메뉴 숨김·☰ 표시·가로 넘침 없음. 시험 템플릿은 모두 삭제. **AI 변수 채우기(`auto-fill`)는 비용 절감으로 실제 호출하지 않음**(다음 사용 때 확인).
- 커밋 `f0a3f529`, 배포 https://ai-prompt-studio-ljy8f1xf2-buylife.vercel.app → https://ai-prompt.buylife.xyz , DB `programs.version='v1.07'`(상세 소개·핵심 특징 갱신 완료).

 Prompt 자동화 — 차기 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 공식 명칭**: AI Prompt 자동화 (`ai-prompt-studio`)  
> **현재 버전**: `v1.08` (2026-10-21 내 템플릿 저장 때 {{변수}} 자동 제안)  
> **공식 도메인**: `https://ai-prompt.buylife.xyz` (또는 `ai-prompt-studio.buylife.xyz`)  
> **카탈로그 슬러그**: `ai-prompt-studio`  
> **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 엔지니어링 스튜디오)**  
> **인수인계 문서**: [로그인 플랜](docs/PLAN_20261017_LOGIN_RENEWAL.md) · [로그인 인수인계](docs/IMPROVEMENT_HANDOFF_20261017_LOGIN.md) · [디자인 인수인계](docs/DESIGN_HANDOFF.md) · [가이드 플랜](docs/PLAN_20261017_DESIGN_RENEWAL.md) · [개선 대장](docs/IMPROVEMENTS.md)  
> **배지**: `['free', 'new']` (가입 회원 누구나 이용 가능)

---

## 1. 프로젝트 개요 및 아키텍처

- **목적**: 사용자의 거친 아이디어를 분석하여 ChatGPT, Claude, Gemini 등에 바로 붙여넣어 실행할 수 있는 완성형 메타 프롬프트를 자동 생성하는 웹 스튜디오.
- **핵심 기술 스택**:
  - Next.js 16 (App Router, Turbopack)
  - React 19, TypeScript
  - Tailwind CSS 4 (화이트 베이스 클린 테마)
  - `@google/genai` (Gemini 2.5 Flash SDK, JSON Structured Outputs)
  - `@supabase/ssr`, `@supabase/supabase-js` (통합 회원 인증 및 API 키 보관)

---

## 2. 불변 규칙 및 플랫폼 규격

1. **최상위 절대 불변 규칙**:
   - 모든 사용자는 본인의 Google Gemini API 키(`user_api_keys.provider = 'gemini'`)를 직접 등록하여 사용한다.
   - 운영자/타인의 키로 대신 처리하지 않는다. 키가 없으면 "본인 키를 등록해주세요" 안내 모달을 띄운다.
2. **사이드바 레이아웃 규격 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**:
   - `← 다른 프로그램 보기`, `대시보드 홈`
   - 번호형 핵심 3단계 흐름 (`1. 모드 선택 & 프리셋` ➔ `2. 정밀 엔지니어링` ➔ `3. 메타 프롬프트 완성`)
   - `🔑 API키등록·플랫폼연동` (정확한 표준 명칭)
   - `💡 사용 가이드`
   - 하단 계정 이메일 및 로그아웃 버튼 (8~16px 바짝 밀착)
3. **화이트 베이스 테마 (Rule 8)**:
   - 본문·카드·입력 영역은 흰색/밝은 중성색 베이스.
4. **기준 연도 2026년 동적 주입 (Rule 9)**:
   - 프롬프트 생성 시 `new Date().getFullYear()`(현재 2026년)를 반드시 주입하여 과거 연도로 후퇴하지 않음.

---

## 3. 핵심 디렉토리 구조

```
ai-prompt-studio/
├── public/
│   └── ai-prompt-auto-thumbnail.jpg (16:9 카탈로그 썸네일)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx     # 로그인 페이지
│   │   ├── api/
│   │   │   ├── auth/logout/route.ts  # 로그아웃 API
│   │   │   ├── generate-prompt/      # 메타 프롬프트 생성 및 피드백 수정 API
│   │   │   ├── ai-suggest/           # 실시간 단계별 필드 AI 제안 API
│   │   │   └── user-key/             # 회원 본인 Gemini API 키 조회/저장 API
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 메인 페이지 (requireProgramAccess)
│   ├── components/
│   │   ├── ApiKeyModal.tsx           # 본인 Gemini API 키 연동 모달
│   │   ├── HelpModal.tsx             # 5대 모드 및 엔지니어링 가이드
│   │   ├── IntroSection.tsx          # 퀵 매직 + 5대 모드 카드 + 50종 프리셋
│   │   ├── StepBuilder.tsx           # 4단계 입력기 + AI 실시간 제안 + 기능 제한
│   │   ├── ResultSection.tsx         # 마크다운 프롬프트 뷰 + 원클릭 복사 + 피드백
│   │   ├── Sidebar.tsx               # 플랫폼 표준 좌측 사이드바
│   │   └── PromptStudioApp.tsx       # 최상위 통합 상태 관리
│   ├── data/
│   │   └── presets.ts                # 5대 모드 메타 & 50종 실전 예제 프리셋 라이브러리
│   ├── lib/
│   │   ├── actions/auth.ts
│   │   ├── supabase/                 # admin, client, server, cookieDomain
│   │   ├── access.ts
│   │   ├── apiKeys.ts
│   │   ├── auth.ts
│   │   ├── programAccess.ts
│   │   ├── prompt-engine.ts          # 프롬프트 빌더 및 Gemini 2.5 Flash 호출 엔진
│   │   └── version.ts                # APP_NAME, APP_VERSION(v1.01), APP_SLUG
│   └── types/
│       └── prompt.ts
└── MANUAL.md
```


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.03)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.04 (ai-prompt-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.


## 2026-10-17 Antigravity(Windows) — 포커스 스튜디오 디자인 리뉴얼 & 전 화면 단일 배경색(#f8fafc) 일체화 및 비주얼 가이드북 전면 신설 (v1.05)

- **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 엔지니어링 스튜디오)**
- **단일 배경색 일체화**: 라이트 클린 슬레이트 `#f8fafc`, 퓨어 화이트 카드, 바이올렛/인디고 포인트 (`PromptStudioApp.tsx`, 전 화면 통일).
- **비주얼 사용 매뉴얼 (`/guide` & `currentTab = 'guide'`) 전면 신설**: 5단계 파이프라인 인포그래픽, 5대 프롬프트 프레임워크 매트릭스 치트시트, 모범 팁 카드, FAQ 4종 아코디언, 본인 키 연동 보안 원칙 배너 탑재.
- **사이드바 메뉴 표준화**: 유틸리티 영역을 표준 `📖 연동 & 사용 매뉴얼` 및 `🔑 API키등록·플랫폼연동`으로 정돈.
- **독립 라우트 지원**: `/guide` 직접 접속 라우트 지원 (`src/app/guide/page.tsx`).
- **배포 및 검수**: Vercel 프로덕션 배포 (`https://ai-prompt.buylife.xyz/`), Microsoft Edge 실세션 데스크톱/모바일 검수 완료.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-22 v1.09 — 좁은 칸 버튼 줄바꿈/잘림 수정 (Claude Code 윈도우)
- **v1.09 (2026-10-22, Claude Code 윈도우) — 좁은 칸 버튼 줄바꿈/잘림 수정**: 결과 액션 바(설정 수정·MD 저장·복사)가 768~1024px에서 꺾이던 것 수정 — 가로 배치를 `lg`부터, 버튼 묶음 `shrink-0 flex-wrap whitespace-nowrap`(`src/components/ResultSection.tsx`), 템플릿 만들기 모달의 본문 머리 버튼 줄도 휴대폰에서 다음 줄로 내려가게(`src/components/templates/PromptFormModal.tsx`). 기능·문구 변경 없음. 근거·전체 목록: 루트 `docs/UI_WRAP_AUDIT_20261022.md`, 규칙 `DESIGN.md` 원칙 19.
