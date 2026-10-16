# AI 프롬프트 템플릿 자동화 — 차기 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 공식 명칭**: AI 프롬프트 템플릿 자동화 (`prompt-template-studio`)  
> **현재 버전**: `v1.04` (2026-10-16 포커스 스튜디오 디자인 리뉴얼 & 비주얼 가이드 신설)
> **공식 도메인**: `https://prompt-template.buylife.xyz`  
> **카탈로그 슬러그**: `prompt-template-studio`  
> **배지**: `['free', 'new']` (가입 회원 누구나 이용 가능)
> **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 템플릿 스튜디오)**
> **인수인계 문서**:
> - 개발 플랜: [`docs/PLAN_20261016_DESIGN_RENEWAL.md`](docs/PLAN_20261016_DESIGN_RENEWAL.md)
> - 개선사항 대장: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
> - 개선사항 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261016.md`](docs/IMPROVEMENT_HANDOFF_20261016.md)
> - 디자인 인수인계: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)

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


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.02)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.03 (prompt-template-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.


## 2026-10-16 Antigravity(Windows) — 포커스 스튜디오 디자인 리뉴얼 & 전 화면 단일 배경색(#f8fafc) 일체화 및 비주얼 가이드 신설 (v1.04)

- **디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 템플릿 스튜디오)**
- **단일 배경색 통일**: 라이트 슬레이트 `#f8fafc`, 화이트 카드, 블루/인디고 포인트 테마 적용.
- **비주얼 사용 매뉴얼 (`/guide` & `?tab=guide`) 전면 신설**: 5단계 파이프라인(API 키 ➔ 템플릿 탐색/제작 ➔ AI 3단 어시스턴트 ➔ AI 변수 자동채우기/실행 ➔ JSON 백업), `{{변수}}` 문법 가이드, 프롬프트 엔지니어링 골든 룰, FAQ 4종 아코디언 탑재.
- **사이드바 유틸리티 추가**: `📖 연동 & 사용 매뉴얼` 메뉴 추가 및 계정 정보 12px 간격 정렬.
- **배포 및 검수**: Vercel 프로덕션 배포 (`https://prompt-template.buylife.xyz/`), Microsoft Edge 실세션 데스크톱/모바일 반응형 검수 완료.
