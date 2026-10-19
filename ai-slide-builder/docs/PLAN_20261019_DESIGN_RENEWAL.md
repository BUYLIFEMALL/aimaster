# AI 슬라이드 자동화 (ai-slide-builder) — 디자인 리뉴얼 및 가이드북 구축 개발 플랜

> **문서 번호**: `PLAN-20261019-71`  
> **프로그램**: 71번 AI 슬라이드 자동화 (`ai-slide-builder`)  
> **공식 프로덕션 URL**: [https://ai-slide-builder.buylife.xyz](https://ai-slide-builder.buylife.xyz)  
> **추천 스타일 템플릿**: **플로우 위저드 스타일 — 단계별 슬라이드 기획 에디션 (Flow Wizard Style — Slide Builder Edition)**  
> **작업 일자**: 2026-10-19  
> **작업 에이전트**: Antigravity CLI (Windows)

---

## 1. 추진 배경 및 리뉴얼 목적
1. **디자인 통일성 및 완성도 제고**:
   - AIMaster 61개 완료 프로그램과 보조를 맞춰 소프트 슬레이트 화이트(`#f8fafc`) 배경과 로열 인디고 블루(`#2563eb`), 아티스틱 바이올렛(`#8b5cf6`), 앰버 골드(`#d97706`) 기반의 **플로우 위저드 스타일** 적용.
2. **미구현 가이드 페이지 신설 (`DESIGN.md` 9번 필수 원칙)**:
   - 현재 단순 모달로만 존재하던 도움말을 완전히 독립된 시각적 비주얼 가이드북 페이지(`/guide`)로 전면 구축.
   - 4단계 표준 슬라이드 기획 파이프라인(1. 자료 입력 ➔ 2. 22종 레이아웃 AI 생성 ➔ 3. 양방향 카드 편집 ➔ 4. 16:9 와이드 PPTX 내보내기).
   - 회원 본인 API 키 원칙 (BYOK Standard) 최상위 보안 안내 배너 및 발급 링크 제공.
3. **사이드바 메뉴 및 대시보드 히어로 배너 표준화**:
   - 브랜드 뱃지 `v1.10 SLIDE WIZARD` 및 유틸리티 영역에 **`📖 연동 & 사용 매뉴얼` (`/guide`)** 신설.
   - 메인 스튜디오 상단에 웰컴 히어로 배너(`.studio-hero`) 및 3대 핵심 지표 카드(22종 전문 레이아웃, 3대 생성 프롬프트 엔진, 16:9 와이드 PPTX 내보내기) 탑재.

---

## 2. 작업 범위 및 구현 순서

### Step 1: 작업 등록 및 마스터 현황판 동기화
- `docs/ACTIVE_WORK.md`에 `ai-slide-builder` 작업 중 등록.
- `DESIGN.md` 71번 행 상태를 `🔵 작업 중 (Antigravity(윈도우), 2026-10-19)`으로 갱신.

### Step 2: 버전 3중 동기화 (`v1.10`)
- `ai-slide-builder/package.json` (`1.10.0`)
- `ai-slide-builder/src/lib/version.ts` (`v1.10`)
- Supabase DB `programs` 메타데이터 (`slug: ai-slide-builder`, `version: v1.10`) 동기화.

### Step 3: 플로우 위저드 디자인 토큰 시스템 구축 (`src/app/globals.css`)
- 소프트 슬레이트 화이트 배경 토큰, 그라데이션 히어로 배너(`.studio-hero`), KPI 지표 카드(`.kpi-card`), 가이드북 파이프라인 컴포넌트 스타일 구축.

### Step 4: 사이드바 메뉴 표준화 (`src/components/layout/Sidebar.tsx`)
- 브랜드 뱃지 `v1.10 SLIDE WIZARD` 및 유틸리티 영역에 **`📖 연동 & 사용 매뉴얼` (`/guide`)** 앰버 골드 하이라이트 메뉴 신설.

### Step 5: 메인 스튜디오 상단 배너 및 지표 카드 탑재 (`src/components/studio/SlideBuilderApp.tsx`)
- `.studio-hero` 웰컴 배너 및 듀얼 CTA ([📖 사용 매뉴얼 보기], [🔑 API 키 설정]).
- 3대 핵심 지표 카드:
  1. 22종 전문 시각화 레이아웃
  2. 3대 맞춤 프롬프트 엔진 (표준, 대용량 표, C-Suite 임원보고)
  3. 원클릭 16:9 와이드 PPTX 파워포인트 내보내기

### Step 6: 독립 비주얼 가이드북 페이지 신설 (`src/app/guide/page.tsx`)
- 4단계 표준 슬라이드 기획 파이프라인 다이어그램.
- 최상위 보안 원칙 (BYOK Standard) 안내 배너.
- 22종 전문 슬라이드 타입 및 3대 프롬프트 엔진 비교 쇼케이스.
- FAQ 5종 아코디언 컴포넌트.

### Step 7: 로컬 무결성 테스트 및 Turbopack 프로덕션 빌드
- `npm run build`로 Next.js Turbopack 최적화 빌드 성공 검증.

### Step 8: Vercel 프로덕션 배포 (`vercel deploy --prod`)
- 공식 도메인 반영: `https://ai-slide-builder.buylife.xyz`.

### Step 9: Microsoft Edge 최전면 포그라운드 실세션 검수 (10분 화면 유지)
- 일반 회원 테스트 계정(`buylifemall@naver.com`) 매직링크 인증 기반 실세션 검수.
- 6종 스크린샷 캡처 및 화면 최전면 10분간 유지.

### Step 10: 규격 인수인계 문서 6종 작성 및 Git 커밋/푸시
- `AGENTS.md` (7대 규격 전면 갱신), `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`.
- `DESIGN.md` 및 `docs/HANDOFF.md` 동기화 후 커밋 & 푸시.

---

## 3. 검수 계획 및 성공 기준
- **성공 기준**:
  - `npm run build` 빌드 에러 0건.
  - Vercel 프로덕션 배포 `READY`.
  - Microsoft Edge 최전면 포그라운드에서 대시보드, 가이드북, 슬라이드 에디터, 설정 화면이 무결하게 표시되고 10분간 화면 유지.
  - 마스터 인수인계 문서 완비 및 원격 푸시 완료.
