# AI Prompt 자동화 — 차기 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 공식 명칭**: AI Prompt 자동화 (`ai-prompt-studio`)  
> **현재 버전**: `v1.06` (2026-10-17 로그인·회원가입 표준 2탭 레이아웃 리뉴얼 완료)  
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
