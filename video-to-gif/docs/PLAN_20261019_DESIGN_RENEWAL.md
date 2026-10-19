# 36번 상세페이지 GIF 자동화 (`video-to-gif`) 디자인 리뉴얼 개발 플랜

> **작성일**: 2026-10-19  
> **작성자**: Antigravity CLI (agy, 윈도우)  
> **목표 버전**: `v1.10`  
> **적용 템플릿**: **크리에이티브 아틀리에 스타일 — 이커머스 GIF 랩 에디션 (Creative Atelier Style — eCommerce GIF Lab Edition)**  
> **대상 도메인**: `https://video-to-gif.buylife.xyz` (slug: `video-to-gif`)  

---

## 1. 추진 배경 및 심층 분석

- **프로그램 정체성**:
  - 온라인 쇼핑몰(스마트스토어, 쿠팡, 자사몰, 와디즈 등) 상세페이지에 필수적인 고화질 GIF 애니메이션을 브라우저 내에서 즉각 변환·생성하는 전문 자동화 도구.
- **기존 아키텍처 및 강점**:
  - 클라이언트 브라우저 WebAssembly FFmpeg (`@ffmpeg/ffmpeg`) 기술 적용으로 서버나 DB에 영상/GIF 파일을 전혀 저장하지 않는 100% 로컬 보안 구조.
  - 스마트스토어/쿠팡의 상세페이지 GIF 파일 업로드 제한(8MiB)에 맞춘 2-pass `palettegen`/`paletteuse` 및 8단계 최적화 사다리 알고리즘(`CANDIDATES`).
- **현행 문제점 및 개선 과제**:
  - **구형 라이트 톤 레이아웃**: 어두운 미디어 작업실 환경에 맞지 않는 단조로운 흰색/회색 위주 UI.
  - **메뉴바 표준 미준수**: 좌측 사이드바에 1-2-3 단계 넘버링 및 `/guide` 연동 & 사용 매뉴얼 메뉴 누락, 모바일 햄버거 토글 드로어 부재.
  - **가이드북 부재**: 상세페이지 GIF 제작 시 해상도, 프레임레이트(40/50fps), 플랫폼별 용량 제한(스마트스토어 20MB/쿠팡 10MB/네이버블로그 20MB)을 친절하게 안내하는 `/guide` 페이지가 없음.
  - **작업 공간 시각적 완성도**: 상단 웰컴 배너(`.studio-hero`), 3대 KPI 지표 카드 부재.

---

## 2. 디자인 및 기능 리뉴얼 상세 계획

### 1) 크리에이티브 아틀리에 다크 토큰 시스템 (`app/globals.css`)
- **배경 & 서피스**:
  - `--background: #0d1117` (딥 차콜 나이트)
  - `--surface: #161b22` (모던 깃허브 다크 서피스)
  - `--surface-hover: #1f2937`
  - `--border: #30363d`
- **브랜드 액센트 컬러**:
  - `--brand: #f59e0b` (이커머스 앰버 골드)
  - `--brand-gold: #fbbf24`
  - `--brand-emerald: #10b981` (고화질 최적화 성공 그린)
  - `--brand-cyan: #38bdf8` (WASM 초고속 처리 시안 블루)
  - `--foreground: #f0f6fc` (고대비 클린 슬레이트 텍스트)

### 2) 좌측 사이드바 표준화 (`components/layout/Sidebar.tsx`)
- 최상단 브랜드 뱃지: `v1.10 GIF LAB` 앰버 칩 발광.
- 1-2-3 단계 파이프라인 넘버링:
  - `1. 동영상 파일 등록` (최대 20개 일괄 큐)
  - `2. WASM 8MiB 최적화` (2-pass 고화질 팔레트)
  - `3. 고화질 GIF 다운로드` (원클릭 로컬 저장)
- 유틸리티 메뉴 그룹:
  - **`📖 연동 & 사용 매뉴얼` (`/guide`)** 신설 (골드 칩 하이라이트).
- 모바일(767px 이하) 반응형 헤더 & 햄버거 토글 드로어 완비.

### 3) 메인 워크스페이스 리뉴얼 (`components/ConverterWorkspace.tsx`)
- 상단 골드 앰버 발광 테두리의 `.studio-hero` 웰컴 배너 탑재.
- 3대 핵심 KPI 지표 카드:
  - `100% 클라이언트 WASM 무손실 엔진` (서버 무전송·프라이버시 완벽 보장)
  - `스마트스토어·쿠팡 8MiB 최적화 사다리` (2-pass 팔레트 자동 압축)
  - `최대 20개 동시 큐 일괄 처리` (다중 파일 드래그 앤 드롭 지원)
- 모던 다크 드롭존 및 변환 진행률 게이지 바, 완성된 GIF 실시간 미리보기 팝업 모달 제공.

### 4) 독립 비주얼 가이드북 전면 신설 (`app/guide/page.tsx`)
- **상세페이지 GIF 제작 4단계 파이프라인**:
  - 1단계: 고화질 원본 동영상 준비 (MP4, MOV, WEBM 등)
  - 2단계: 최적 프레임레이트 & 해상도 설정 (40/50fps, 560px~860px)
  - 3단계: 브라우저 WASM 2-Pass 팔레트 고속 렌더링
  - 4단계: 8MiB 초과 방지 사다리 압축 & 상세페이지 삽입
- **플랫폼별 GIF 권장 규격 비교 매트릭스**:
  - 네이버 스마트스토어, 쿠팡, 자사몰(카페24/메이크샵), 와디즈 상세페이지별 최적 해상도 및 용량 가이드.
- **WASM 로컬 렌더링 원리 및 프라이버시 100% 보안 배너**.
- **자주 묻는 질문 FAQ 5종 골드 아코디언 인터랙션**.

---

## 3. 버전 3중 동기화 계획 (`v1.10`)
1. `video-to-gif/package.json` -> `"version": "1.10.0"`
2. `video-to-gif/lib/version.ts` -> `export const APP_VERSION = "v1.10";`
3. Supabase DB `programs` (`slug: video-to-gif`) -> `version = 'v1.10'`

---

## 4. 검증 및 배포 계획
1. **로컬 빌드 검증**: `npm run build` Turbopack 빌드 성공 (exit code 0).
2. **Vercel 프로덕션 배포**: `npx vercel --prod --yes` (공식 도메인 `https://video-to-gif.buylife.xyz` 반영).
3. **Microsoft Edge 최전면 포그라운드 실세션 검수**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 쿠키 주입.
   - 데스크톱(1440px) 및 모바일(375px) 6종 캡처 보존.
   - Edge 창을 10분간 화면 최전면에 유지하여 실시간 검수.
4. **인수인계 문서 6종 완비 및 Git 푸시**:
   - `AGENTS.md`, `README.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_BACKLOG.md`, `docs/PLAN_20261019_DESIGN_RENEWAL.md`.
   - `DESIGN.md` 및 `docs/HANDOFF.md` 동기화.

---

## 5. 최종 구현 및 검증 결과 (2026-10-19 완료)

- **빌드 검증**: `npm run build` 통과 (경로 8개 생성, 오류 없음).
- **Vercel 프로덕션 배포**: 배포 ID `dpl_7rnbcAseCW2ZUMfsPBQRLe85PA1z`, 도메인 `https://video-to-gif.buylife.xyz` 반영 완료.
- **Edge 최전면 포그라운드 실세션 검수**: 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션으로 10분간 화면 유지 및 6종 캡처 보존 완료.
- **최종 상태**: ✅ 1차 작업완료 (`v1.10`, 크리에이티브 아틀리에 스타일).

