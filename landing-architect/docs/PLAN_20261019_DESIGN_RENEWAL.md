# 🎯 AI 랜딩페이지 기획 자동화 (landing-architect) — 디자인 리뉴얼 및 가이드북 구축 개발 플랜

> **문서 버전**: `v1.10 Plan`  
> **작성일**: 2026-10-19  
> **작성 에이전트**: Antigravity CLI (agy, 윈도우)  
> **대상 프로그램**: 69번 AI 랜딩페이지 기획 자동화 (`landing-architect`, https://landing-architect.buylife.xyz)  
> **규격 준수**: 루트 `CLAUDE.md`, `DESIGN.md`, `docs/PROGRAM_DESIGN_STANDARD.md`

---

## 1. 개요 및 목적

### 1.1 배경 및 목적
- `landing-architect`는 주제와 타겟 고객, 전환 목표를 입력받아 전환율 높은 6개 핵심 섹션(히어로, 문제점, 솔루션, 소셜 프루프, 특징/혜택, 최종 CTA)의 기획안(JSON)을 자동 도출하고, 단일 HTML 인터랙티브 프로토타입으로 생성하는 전문 기획 자동화 도구입니다.
- 그러나 현재 단조로운 무채색 인터페이스로 구성되어 있어 전환율 중심의 역동적인 기획 도구로서의 비주얼 임팩트가 부족하며, **좌측 사이드바 표준화 및 비주얼 가이드북(`/guide`) 페이지가 누락**되어 신규 사용자의 접근이 어렵습니다.
- 본 리뉴얼을 통해 **플로우 위저드 스타일 — 단계별 랜딩페이지 기획 에디션(`Flow Wizard Style — Landing Architect Edition`)**으로 전면 탈바꿈하고, 독립 비주얼 가이드북(`/guide`)을 신규 구축하여 누구나 3분 만에 설득력 있는 랜딩페이지를 완성할 수 있도록 혁신합니다.

---

## 2. 디자인 시스템 및 테마 스펙

- **공식 템플릿 명칭**: **플로우 위저드 스타일 — 단계별 랜딩페이지 기획 에디션 (`Flow Wizard Style — Landing Architect Edition`)**
- **컬러 팔레트 (CSS Tokens)**:
  - **Base Background**: 소프트 슬레이트 화이트 (`#f8fafc`) — 산뜻하고 가독성이 뛰어난 모던 클린 테마
  - **Card Surface**: 퓨어 화이트 (`#ffffff`), 소프트 보더 (`#e2e8f0`)
  - **Primary Accent**: 로열 인디고 블루 (`#2563eb` / `#1d4ed8`) — 주요 액션, 전환 CTA
  - **Secondary Accent**: 바이올렛 퍼플 (`#8b5cf6`) — AI 기획 및 6개 섹션 맵 강조
  - **Hero Banner**: `linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 50%, #0369a1 100%)`
  - **Guide Highlight**: 앰버 골드 (`#f59e0b`) — 사이드바 매뉴얼 메뉴 하이라이트

---

## 3. 핵심 작업 범위 및 구현 계획

### 3.1 버전 및 DB 메타데이터 3중 동기화 (`v1.10`)
1. `landing-architect/package.json` (`1.10.0`)
2. `landing-architect/src/lib/version.ts` (`v1.10`)
3. Supabase DB `programs` 메타데이터 (`slug: landing-architect`, `version: v1.10`) 갱신 스크립트 실행

### 3.2 글로벌 스타일 및 컴포넌트 토큰화 (`src/app/globals.css`)
- 플로우 위저드 전용 토큰, `.studio-hero` 배너 클래스, 입체 카드 섀도우 정의.
- 좌우 분할 스튜디오 작업실 및 미리보기 iframe 컨테이너 스타일 정돈.

### 3.3 대시보드 리뉴얼 (`src/app/(workspace)/dashboard/page.tsx`)
- 웰컴 히어로 배너: "전환율 300%를 이끄는 AI 랜딩페이지 기획 작업실".
- 프로젝트 통계 지표 카드 3종 (내 기획안 수, 6대 필수 섹션 맵, 고해상도 HTML 프로토타입).
- 프로젝트 카드 그리드 (생성일시, 섹션 수, [기획안 열기] 및 복제/삭제 인터랙션).

### 3.4 독립 비주얼 가이드북 (`/guide/page.tsx`) 신설
- 상위 보안 원칙 (BYOK) 안내: 회원 본인 Gemini 및 이미지 제공자(Unsplash/Pexels) 키 독립 연동 가이드.
- **4단계 랜딩페이지 기획 파이프라인 다이어그램**:
  1. `STEP 1. Strategy & Input`: 제품/서비스 카테고리(20종 프리셋), 타겟 페르소나, 핵심 소구점 설정.
  2. `STEP 2. 6-Block Planning`: AI가 히어로-문제점-해결책-사회적증거-특장점-CTA 6대 블록 기획안 자동 도출.
  3. `STEP 3. HTML Prototype`: 고화질 스톡 이미지 자동 치환 및 인터랙티브 웹 프로토타입 실시간 렌더링.
  4. `STEP 4. Export & Launch`: 단일 파일 HTML 다운로드, 마크다운 기획서 복사 및 개발팀 인수인계.
- 6대 필수 섹션 맵 쇼케이스 및 FAQ 5종 아코디언.

### 3.5 사이드바 및 네비게이션 표준화 (`src/components/layout/Sidebar.tsx`)
- 브랜드 뱃지 `v1.10 LANDING WIZARD` 적용.
- `📖 연동 & 사용 매뉴얼` (`/guide`) 앰버 골드 메뉴 신설.

---

## 4. 검수 및 배포 전략

1. **로컬 무결성 검증**:
   - `npm test`: 11개 순수 로직 단위 테스트 통과 확인.
   - `npx tsc --noEmit`: TypeScript 컴파일 에러 0건 확인.
   - `npm run build`: Next.js Turbopack 프로덕션 빌드 성공 확인.
2. **Vercel 프로덕션 배포**:
   - `vercel deploy --prod` ➔ `https://landing-architect.buylife.xyz` 반영.
3. **Microsoft Edge 최전면 포그라운드 실세션 검수 (headless: false)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션으로 데스크톱(1440px) 대시보드, 가이드북, 작업 스튜디오, 모바일(375px) 뷰포트 등 6종 캡처 및 10분간 화면 유지.
4. **산출물 인수인계 문서 6종 완비 및 Git 커밋/푸시**:
   - `AGENTS.md`, `README.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_BACKLOG.md` 완비.
   - `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 동기화 후 커밋 & 푸시.
