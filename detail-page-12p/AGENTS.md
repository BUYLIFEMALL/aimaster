# AI 12단 상세페이지 자동화 — 차기 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 공식 명칭**: AI 12단 상세페이지 자동화 (`detail-page-12p`)  
> **현재 버전**: `v1.04` (2026-10-16 갱신)  
> **공식 도메인**: `https://detail-12p.buylife.xyz`  
> **카탈로그 슬러그**: `detail-page-12p`  
> **배지**: `['free', 'new']` (가입 회원 누구나 이용 가능)

---

## 1. 프로젝트 개요 및 아키텍처

- **목적**: 쿠팡(12장+) 및 네이버 스마트스토어(9장+) 규격에 맞추어, 상품명 1초 스펙 자동검색, PDF/TXT/MD 사양서 파싱, Nano Banana 멀티모달 AI 비주얼 렌더링을 통해 12단 풀 패키지 상세페이지를 원클릭으로 일괄 기획 및 제작하는 이커머스 전문 스튜디오.
- **핵심 기술 스택**:
  - Next.js 16 (App Router, Turbopack)
  - React 19, TypeScript
  - Tailwind CSS 4 (화이트 베이스 클린 테마)
  - `@google/genai` (Gemini 2.5 Flash, Gemini 3 Pro / Imagen 멀티모달 이미지 생성)
  - `@supabase/ssr`, `@supabase/supabase-js` (통합 회원 인증 및 API 키 보관)
  - HTML5 Canvas (860px 쿠팡 표준 세로 통상세페이지 자동 합성 및 원클릭 다운로드)

---

## 2. 불변 규칙 및 플랫폼 규격

1. **최상위 절대 불변 규칙**:
   - 모든 사용자는 본인의 Google Gemini API 키(`user_api_keys.provider = 'gemini'`)를 직접 등록하여 사용한다.
   - 운영자/타인의 키로 대신 처리하지 않는다. 키가 없으면 등록 안내 모달을 띄운다.
2. **사이드바 레이아웃 규격 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**:
   - `← 다른 프로그램 보기`, `대시보드 홈`
   - 번호형 핵심 3단계 흐름 (`1. 제품 정보 입력` ➔ `2. 12단 상세 스튜디오` ➔ `3. 보관함 & 다운로드`)
   - `🔑 API키등록·플랫폼연동` (정확한 표준 명칭)
   - `💡 사용 가이드`
   - 하단 계정 이메일 및 로그아웃 버튼 (8~16px 밀착)
3. **화이트 베이스 테마 (Rule 8)**:
   - 본문·카드·입력 영역은 흰색/밝은 슬레이트 톤 베이스.
4. **기준 연도 2026년 동적 주입 (Rule 9)**:
   - AI 카피 및 스펙 조사 시 `new Date().getFullYear()`(현재 2026년)를 반드시 주입.

---

## 3. 핵심 디렉토리 구조

```
detail-page-12p/
├── public/
│   └── detail-page-12p-thumbnail.jpg (16:9 카탈로그 썸네일)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx     # 로그인 페이지
│   │   ├── api/
│   │   │   ├── auth/logout/route.ts  # 로그아웃 API
│   │   │   ├── auto-search/          # 상품명 기반 1초 스펙/특징 자동조사 API
│   │   │   ├── generate-detail/      # 12단/9단 상세페이지 전체 카피 기획 API
│   │   │   ├── generate-image/       # Nano Banana/Imagen 씬별 이미지 렌더링 API
│   │   │   └── user-key/             # 회원 본인 Gemini API 키 조회/저장 API
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 메인 페이지 (requireProgramAccess)
│   ├── components/
│   │   ├── Sidebar.tsx               # 플랫폼 표준 좌측 사이드바
│   │   ├── ProductInputForm.tsx      # 1단계: 제품 정보/가격/사양서 입력 폼
│   │   ├── DetailStudioView.tsx      # 2단계: 12단 씬 카드 & 스마트폰 라이브 시뮬레이터
│   │   ├── SceneCard.tsx             # 씬별 개별 카드 (카피 편집, 개별 렌더링)
│   │   ├── DetailHistoryView.tsx     # 3단계: 보관함 & JSON 백업/복원
│   │   ├── ApiKeyModal.tsx           # 본인 Gemini API 키 등록 모달
│   │   ├── HelpModal.tsx             # 사용 가이드 모달
│   │   └── DetailPageApp.tsx         # 전체 상태 관리 머신
│   ├── lib/
│   │   ├── version.ts                # APP_NAME, APP_VERSION, APP_SLUG
│   │   ├── detailEngine.ts           # Gemini 2.5 Flash & Nano Banana 기획/렌더링 엔진
│   │   ├── apiKeys.ts                # 사용자 본인 키 보관/조회
│   │   ├── access.ts                 # 프로그램 권한 체크
│   │   ├── programAccess.ts          # FREE 배지 확인 및 권한 조회
│   │   └── supabase/                 # Supabase SSR 클라이언트 및 쿠키도메인
│   └── types/
│       └── detail.ts                 # 플랫폼, 모델, 12단 씬 인터페이스
```

---

## 4. 환경 변수 (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MAIN_SITE_URL=https://www.buylife.xyz`

## v1.02 (2026-10-15) — AI 지시문에 한국 시간 현재 월 추가 (Claude Code 보조 계정)
- 연도만 주면 AI가 계절을 지어내는 문제(10월에 "봄", 루트 `docs/ERROR_LESSONS.md` 2026-10-14) 예방: src/lib/detailEngine.ts 제품 분석·상세페이지 기획 2곳에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월… 계절·시기 표현은 현재 월에 맞춤]"(Asia/Seoul, 서버 UTC여도 한국 날짜). 빌드 통과·프로덕션 배포 READY·DB `programs.version` v1.02. 유료 AI 실제 생성 확인은 하지 않음.


## 2026-10-16 DB 연동 변수 호환 — v1.03 (detail-page-12p)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 포커스 스튜디오 디자인 리뉴얼 & 비주얼 가이드 신설 — v1.04 (완료)
- **적용 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 이커머스 상세페이지 스튜디오)**
- **단일 배경색 준수**: 전체 페이지(`tab=input`, `tab=studio`, `tab=history`, `tab=guide`/`/guide`) 동일한 `#f8fafc` 배경색 일체화.
- **개발 플랜**: [`docs/PLAN_20261016_DESIGN_RENEWAL.md`](docs/PLAN_20261016_DESIGN_RENEWAL.md)
- **개선사항 목록**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- **개선사항 인수인계**: [`docs/IMPROVEMENT_HANDOFF_20261016.md`](docs/IMPROVEMENT_HANDOFF_20261016.md)
- **디자인 완료 인수인계**: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
- **검수**: Microsoft Edge 전용 (`msedge.exe`) 실세션 테스트 계정(`buylifemall@naver.com`) 검증 완료 (데스크톱 6종 및 모바일 2종 캡처 확인).
