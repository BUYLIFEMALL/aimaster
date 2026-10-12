# AI 프롬프트 템플릿 자동화 — 차기 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 공식 명칭**: AI 프롬프트 템플릿 자동화 (`prompt-template-studio`)  
> **현재 버전**: `v1.01` (2026-10-13 런칭)  
> **공식 도메인**: `https://prompt-template.buylife.xyz`  
> **카탈로그 슬러그**: `prompt-template-studio`  
> **배지**: `['free', 'new']` (가입 회원 누구나 이용 가능)

---

## 1. 프로젝트 개요 및 아키텍처

- **목적**: 동적 변수(`{{variable}}`)를 지원하는 프롬프트 템플릿을 저장·관리하고, AI 자동 채우기 및 원클릭 실행을 지원하는 웹 스튜디오.
- **핵심 기술 스택**:
  - Next.js 16 (App Router, Turbopack)
  - React 19, TypeScript
  - Tailwind CSS 4 (화이트 베이스 클린 테마)
  - `@google/genai` (Gemini 2.5 Flash SDK)
  - `@supabase/ssr`, `@supabase/supabase-js` (통합 회원 인증 및 API 키 보관)

---

## 2. 불변 규칙 및 플랫폼 규격

1. **최상위 절대 불변 규칙**:
   - 모든 사용자는 본인의 Google Gemini API 키(`user_api_keys.provider = 'gemini'`)를 직접 등록하여 사용한다.
   - 운영자/타인의 키로 대신 처리하지 않는다. 키가 없으면 등록 안내 모달을 띄운다.
2. **사이드바 레이아웃 규격 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**:
   - `← 다른 프로그램 보기`, `대시보드 홈`
   - 번호형 핵심 3단계 흐름 (`1. 템플릿 라이브러리` ➔ `2. 새 프롬프트 제작` ➔ `3. 백업 & 동기화`)
   - `🔑 API키등록·플랫폼연동` (정확한 표준 명칭)
   - `💡 사용 가이드`
   - 하단 계정 이메일 및 로그아웃 버튼 (8~16px 밀착)
3. **화이트 베이스 테마 (Rule 8)**:
   - 본문·카드·입력 영역은 흰색/밝은 슬레이트 톤 베이스.
4. **기준 연도 2026년 동적 주입 (Rule 9)**:
   - AI 실행 및 프롬프트 제안 시 `new Date().getFullYear()`(현재 2026년)를 반드시 주입.

---

## 3. 핵심 디렉토리 구조

```
prompt-template-studio/
├── public/
│   └── prompt-template-studio-thumbnail.jpg (16:9 카탈로그 썸네일)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx     # 로그인 페이지
│   │   ├── api/
│   │   │   ├── auth/logout/route.ts  # 로그아웃 API
│   │   │   ├── execute-prompt/       # 템플릿 변수 치환 후 Gemini 모델 실행 API
│   │   │   ├── auto-fill/            # 변수 AI 자동 채우기 API
│   │   │   ├── suggest-field/        # 제목/설명/본문 AI 3단 제안 API
│   │   │   └── user-key/             # 회원 본인 Gemini API 키 조회/저장 API
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 메인 페이지 (requireProgramAccess)
│   ├── components/
│   │   ├── Sidebar.tsx               # 플랫폼 표준 좌측 사이드바
│   │   ├── PromptLibrary.tsx         # 템플릿 그리드, 카테고리 필터, 검색
│   │   ├── PromptFormModal.tsx       # 템플릿 제작/수정 ({{변수}} 실시간 파싱)
│   │   ├── PromptExecuteModal.tsx    # 변수 입력, AI 자동 채우기, 원클릭 실행
│   │   ├── BackupModal.tsx           # JSON 내보내기 및 복원
│   │   ├── ApiKeyModal.tsx           # 본인 Gemini API 키 연동
│   │   ├── HelpModal.tsx             # 사용 가이드
│   │   └── PromptTemplateApp.tsx     # 최상위 통합 상태 관리
│   ├── data/
│   │   └── presets.ts                # 9종 기본 프리셋 및 카테고리 목록
│   ├── lib/
│   │   ├── actions/auth.ts
│   │   ├── supabase/                 # admin, client, server, cookieDomain
│   │   ├── access.ts
│   │   ├── apiKeys.ts
│   │   ├── auth.ts
│   │   ├── programAccess.ts
│   │   └── version.ts                # APP_NAME, APP_VERSION(v1.01), APP_SLUG
│   └── types/
│       └── prompt.ts                 # PromptTemplate 및 변수 추출/치환 유틸
└── MANUAL.md
```
