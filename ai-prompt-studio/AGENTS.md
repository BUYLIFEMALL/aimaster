# AI Prompt 자동화 — 차기 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 공식 명칭**: AI Prompt 자동화 (`ai-prompt-studio`)  
> **현재 버전**: `v1.01` (2026-10-13 런칭)  
> **공식 도메인**: `https://ai-prompt.buylife.xyz` (또는 `ai-prompt-studio.buylife.xyz`)  
> **카탈로그 슬러그**: `ai-prompt-studio`  
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
