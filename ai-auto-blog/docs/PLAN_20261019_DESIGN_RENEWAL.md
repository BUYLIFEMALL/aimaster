# BLOG(원문)생성 자동화 (ai-auto-blog) 디자인 리뉴얼 및 가이드북 구축 사전 개발 플랜

> **작성 일시**: 2026-10-19  
> **작성자**: Antigravity CLI (Windows)  
> **대상 서브프로그램**: 59번 BLOG(원문)생성 자동화 (`ai-auto-blog`)  
> **공식 서비스 URL**: `https://ai-auto-blog.buylife.xyz`  
> **적용 템플릿 스타일**: **플로우 위저드 스타일 — 블로그 퍼블리싱 에디션 (Flow Wizard Blog Publishing Edition)**  
> **목표 버전**: `v1.75` (기존 `v1.74`에서 버전 3중 동기화 판올림)

---

## 1. 리뉴얼 배경 및 목적

1. **플로우 위저드 기반 블로그 자동화 경험 통합**:
   - `ai-auto-blog`는 주제/키워드 수집(HTTP/RSS/Perplexity/쇼츠) ➔ AI 다중 모델 본문 생성(OpenAI/Claude/Gemini) ➔ 나노바나나 고화질 삽화 생성 ➔ Tiptap 리치 에디터 검수 ➔ 발행 관리로 이어지는 고도화된 원문 생성 엔진을 보유하고 있습니다.
   - 기존의 단조로운 텍스트형 대시보드를 **플로우 위저드 스타일 — 블로그 퍼블리싱 에디션**으로 전면 탈바꿈하여, 사용자가 글감 수집부터 발행까지 직관적으로 단계를 파악할 수 있도록 개편합니다.

2. **사용 매뉴얼(`/guide`) 신설 및 사이드바 표준화 (`DESIGN.md` 9번 원칙)**:
   - 좌측 사이드바에 필수 유틸리티인 **`📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴가 누락**되어 있으며, 기존 `app/docs/page.tsx`는 단순 15줄 텍스트 줄글에 불과합니다.
   - 4단계 비주얼 프로세스 다이어그램, AI 본문/이미지 모델 매트릭스 표, 검색엔진 최적화(SEO) 7대 수칙, 크롬 확장 프로그램 연동법, FAQ 아코디언을 갖춘 **시각적 독립 가이드북(`/guide`)을 전면 신설**합니다.

3. **모바일 반응형 완성도 및 디자인 일관성 확보**:
   - 767px 이하 모바일 화면에서 사이드바가 상단에 넓게 노출되는 구조를 개선하고, 상단 모바일 전용 헤더 및 햄버거(☰) 슬라이드 드로어를 탑재합니다.
   - 단일 배경색(화이트/소프트 슬레이트)과 일관된 테마 스타일(`DESIGN.md` 13번 원칙)을 전 화면에 적용합니다.

---

## 2. 디자인 시스템 및 비주얼 스펙

### 컬러 팔레트 & 토큰
- **배경 테마**: 퓨어 화이트 (`#ffffff`) & 소프트 슬레이트 (`#f8fafc`)
- **주요 텍스트**: 다크 슬레이트 (`#0f172a` / `#1e293b`), 뮤티드 (`#64748b`)
- **포인트 악센트**:
  - 에디터 로열 블루 (`#005acc` / `#2563eb`)
  - SEO 에메랄드 그린 (`#059669` / `#10b981`)
  - 스마트 인디고 (`#4f46e5` / `#6366f1`)
- **카드 및 서피스**: 화이트 서피스 (`#ffffff`), 경계선 (`#e2e8f0` / `#e4e7ec`), 은은한 드롭 섀도우

### 시그니처 컴포넌트
1. `.studio-hero` 프리미엄 그라디언트 배너: 타이틀, `v1.75` 뱃지, 즉시 글쓰기 액션 버튼.
2. **3대 핵심 KPI 통계 카드**: 총 작성 글 수, 분류 카테고리 수, AI 생성 글 / 30일 보관 상태.
3. **4단계 파이프라인 가이드 바**: Step 1 주제 수집 ➔ Step 2 AI 글생성 ➔ Step 3 에디터 검수 ➔ Step 4 발행 관리.
4. **모바일 드로어 네비게이터**: 767px 이하 햄버거 토글 및 오버레이 드로어.

---

## 3. 단계별 세부 구현 계획

### 1단계: 글로벌 스타일 및 컴포넌트 보강 (`app/globals.css`, `BlogSidebar.tsx`)
- `app/globals.css`: `.studio-hero`, `.stat-card`, `.pipeline-badge`, `.guide-section` 등 공통 유틸리티 클래스 정의.
- `app/_components/BlogSidebar.tsx`:
  - `FLOW_STEPS` 단계별 시각화 보강.
  - `UTILITY_ITEMS`에 **`📖 연동 & 사용 매뉴얼` (`/guide`)** 신설.
  - 상단 모바일 햄버거 버튼 및 반응형 슬라이드 드로어 탑재.
  - `v1.75` 버전 뱃지 디자인 세련화.

### 2단계: 메인 게시글 관리 콘솔 리뉴얼 (`app/_components/HomePage.tsx`)
- 상단 히어로 섹션을 `.studio-hero` 프리미엄 그라디언트 배너로 교체.
- 3대 KPI 통계 카드 및 4단계 파이프라인 가이드 바 배치.
- 검색 입력창 및 카테고리 칩 필터 바의 모던 UI 다듬기.
- 게시글 그리드 카드의 태그, 작성일, 본문 요약 가독성 향상.

### 3단계: 독립 비주얼 가이드북 전면 신설 (`app/guide/page.tsx`)
- 라우트 생성: `app/guide/page.tsx`.
- 4단계 비주얼 파이프라인 다이어그램 (수집 ➔ 생성 ➔ 에디터 ➔ 발행).
- AI 본문/이미지 모델 지원 매트릭스 표 (GPT-4o, Claude 3.5 Sonnet, Gemini 2.5 Flash, NanoBanana).
- 네이버/구글 SEO 7대 작성 수칙 카드.
- 크롬 확장 프로그램 원클릭 연동 가이드.
- 100% BYOK 공용 DB 회원 소유 격리 보안 배너.
- FAQ 5종 아코디언 컴포넌트.

### 4단계: 버전 3중 동기화 (`v1.75`)
- `package.json` (`1.75.0`)
- `utils/version.ts` (`v1.75`)
- Supabase DB `programs` (`slug = 'ai-auto-blog'`, `version = 'v1.75'`)

### 5단계: 빌드 및 Vercel 배포
- `npm run build`를 통한 Next.js 16 프로덕션 빌드 통과.
- `vercel --prod` 프로덕션 배포 및 `https://ai-auto-blog.buylife.xyz` 도메인 응답 확인.

### 6단계: Microsoft Edge 포그라운드 실세션 검수
- Microsoft Edge(headless: false) 포그라운드 실행.
- 일반 회원 세션 주입 후 데스크톱(1440px) 및 모바일(375px) 7종 캡처 수집.
- 10분간(600초) 포그라운드 화면 유지.

### 7단계: 서브문서 6종 완비 및 루트 현황판 동기화, 선별 커밋/푸시
- 서브문서 6종 완비 (`PLAN_*.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_HANDOFF_20261019.md`, `AGENTS.md`, `README.md`).
- 루트 `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/DESIGN_TEMPLATE_CATALOG.md`, `docs/HANDOFF.md` 동기화.
- 선별 Git 커밋 및 푸시.
