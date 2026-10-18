# 🎯 UI Canvas 자동화 (ui-canvas) — 디자인 리뉴얼 및 가이드북 구축 개발 플랜

> **문서 버전**: `v1.10 Plan`  
> **작성일**: 2026-10-19  
> **작성 에이전트**: Antigravity CLI (agy, 윈도우)  
> **대상 프로그램**: 70번 UI Canvas 자동화 (`ui-canvas`, https://ui-canvas.buylife.xyz)  
> **규격 준수**: 루트 `CLAUDE.md`, `DESIGN.md`, `docs/PROGRAM_DESIGN_STANDARD.md`

---

## 1. 개요 및 목적

### 1.1 배경 및 목적
- `ui-canvas`는 25종의 UI 컴포넌트(버튼, 입력창, 카드, 테이블 등)를 캔버스 위에 자유롭게 배치하고, Gemini Vision 및 구조화 AI를 통해 이미지에서 UI를 자동 역공학하거나 명세를 작성하는 고성능 프로토타이핑 도구입니다.
- 그러나 현재 대시보드와 에디터 인터페이스가 단조로운 무채색 위주로 구성되어 있어 전문 캔버스 툴(Figma, Canva 등) 수준의 시각적 완성도와 몰입감이 부족하며, **좌측 사이드바 표준화 및 비주얼 매뉴얼(`/guide`) 페이지가 누락**되어 신규 사용자의 접근 장벽이 높습니다.
- 본 리뉴얼을 통해 **크리에이티브 아틀리에 스타일 — 캔버스 프로 에디션(`Creative Atelier Style — Canvas Pro Edition`)**으로 전면 탈바꿈하고, 독립 비주얼 가이드북(`/guide`)을 신설하여 누구나 쉽게 UI 프로토타이핑을 시작할 수 있도록 혁신합니다.

---

## 2. 디자인 시스템 및 테마 스펙

- **공식 템플릿 명칭**: **크리에이티브 아틀리에 스타일 — 캔버스 프로 에디션 (`Creative Atelier Style — Canvas Pro Edition`)**
- **컬러 팔레트 (단일 일관 테마)**:
  - **Main Background**: 딥 미드나잇 다크 네이비 (`#0c0f17`) — 눈부심을 줄이고 캔버스 뷰포트에 집중시키는 프로페셔널 다크 톤
  - **Panel / Surface Card**: 슬레이트 다크 서피스 (`#131824`) & 보더 (`#222d42`)
  - **Canvas Workspace**: 퓨어 화이트 & 체커보드 그리드 캔버스 보드
  - **Primary Accent**: 일렉트릭 시안 블루 (`#06b6d4` / `#0284c7`) — 주요 액션, 활성 레이어, 마퀴 선택 바운딩
  - **Secondary Accent**: 아티스틱 바이올렛 (`#8b5cf6`) — AI 자동완성 및 이미지 분석 뱃지
  - **Guide Accent**: 앰버 골드 (`#f59e0b`) — 사이드바 매뉴얼 메뉴 하이라이트

---

## 3. 핵심 작업 범위 및 구현 계획

### 3.1 버전 및 DB 메타데이터 3중 동기화 (`v1.10`)
1. `ui-canvas/package.json` (`1.10.0`)
2. `ui-canvas/src/lib/version.ts` (`v1.10`)
3. Supabase DB `programs` 메타데이터 (`slug: ui-canvas`, `version: v1.10`) 갱신 스크립트 실행

### 3.2 글로벌 스타일 및 컴포넌트 토큰화 (`src/app/globals.css`)
- 캔버스 툴 전용 다크 토큰 및 `.studio-hero` 배너 클래스, 입체 카드 스타일 정의.
- 드래그 앤 드롭 바운딩 박스, 선택 핸들러, 레이어 트리 하이라이트 CSS 정돈.

### 3.3 대시보드 리뉴얼 (`src/app/dashboard/page.tsx`)
- 웰컴 히어로 배너: "상상을 인터랙티브 화면으로 그리는 UI Canvas 작업실".
- 프로젝트 통계 지표 카드 3종 (내 프로젝트 수, 25종 컴포넌트 라이브러리, AI 역공학 엔진).
- 프로젝트 카드 그리드 (썸네일 미리보기, 생성일시, [캔버스 열기] 및 복제/삭제 인터랙션).

### 3.4 독립 비주얼 가이드북 (`/guide/page.tsx`) 신설
- 상위 보안 원칙 (BYOK) 안내: 회원 본인 Gemini API 키 독립 연동 가이드.
- **4단계 UI 프로토타이핑 파이프라인 다이어그램**:
  1. `STEP 1. Project Setup`: 신규 캔버스 해상도(Desktop 1440px / Mobile 375px) 생성.
  2. `STEP 2. Component Layout`: 25종 도구상자 드래그 생성, Shift 마퀴 다중 선택, 그룹화.
  3. `STEP 3. AI Generative Engine`: 화면 스크린샷에서 UI 자동 역공학, 명세 채우기.
  4. `STEP 4. Export & Handover`: 1:1 고해상도 PNG 캡처, 컴포넌트 JSON / 명세 JSON 내보내기.
- 툴바 및 단축키 치트시트 쇼케이스.
- FAQ 5종 아코디언 컴포넌트.

### 3.5 사이드바 및 네비게이션 표준화 (`src/components/canvas/Panels.tsx` or Layout)
- 브랜드 뱃지 `v1.10 CANVAS PRO` 적용.
- `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설.

---

## 4. 검수 및 배포 전략

1. **로컬 무결성 검증**:
   - `npm test`: 12개 순수 로직 단위 테스트 통과 확인.
   - `npx tsc --noEmit`: TypeScript 컴파일 에러 0건 확인.
   - `npm run build`: Next.js Turbopack 프로덕션 빌드 성공 확인.
2. **Vercel 프로덕션 배포**:
   - `vercel deploy --prod` ➔ `https://ui-canvas.buylife.xyz` 반영.
3. **Microsoft Edge 최전면 포그라운드 실세션 검수 (headless: false)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션으로 데스크톱(1440px) 대시보드, 가이드북, 에디터 캔버스, 모바일(375px) 뷰포트 등 6종 캡처 및 10분간 화면 유지.
4. **산출물 인수인계 문서 6종 완비 및 Git 커밋/푸시**:
   - `AGENTS.md`, `README.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_BACKLOG.md` 완비.
   - `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 동기화 후 커밋 & 푸시.
