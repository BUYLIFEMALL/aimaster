# 37번 AIMaster 타로점 (`tarot-reading`, 폴더 `tarot/`) 디자인 리뉴얼 개발 플랜

> **작성일**: 2026-10-19  
> **작성자**: Antigravity CLI (agy, 윈도우)  
> **목표 버전**: `v1.10`  
> **적용 템플릿**: **크리에이티브 아틀리에 스타일 — 신비로운 미드나잇 퍼플 랩 에디션 (Creative Atelier Style — Mystic Midnight Purple Lab Edition)**  
> **대상 도메인**: `https://tarot.buylife.xyz` (slug: `tarot-reading`)  

---

## 1. 추진 배경 및 심층 분석

- **프로그램 정체성**:
  - AIMaster 계정 인증 기반으로 12종의 정통 타로 스프레드(원카드, 3카드 과거·현재·미래, 켈틱 크로스 10카드 등)와 78장의 카드를 셔플하고, Gemini AI 기반 고유 일러스트 카드 생성과 LLM 심층 해석을 제공하는 고감도 타로 플랫폼.
- **기존 아키텍처 및 강점**:
  - 12종 스프레드 + 12종 화풍(사이버펑크, 르네상스 유화, 수채화, 다크 고딕 등) 조합.
  - 셔플 및 드로우 애니메이션, `tarot_readings` DB 저장 및 `/history` 보관함 지원.
- **현행 문제점 및 개선 과제**:
  - **구형 라이트/단색 UI 혼재**: 신비로운 타로의 톤앤매너와 어긋나는 화면 요소 및 일관되지 않은 컬러.
  - **사이드바 메뉴 표준화 미흡**: 1-2-3-4 단계 넘버링 및 `/guide` 연동 & 사용 매뉴얼 부재, 모바일 토글 드로어 개선 필요.
  - **가이드북 부재**: 타로 초보자를 위한 12종 스프레드별 적합한 질문법 및 78장 메이저/마이너 아르카나 해설을 담은 독립 비주얼 가이드북 (`/guide`) 부재.

---

## 2. 디자인 및 기능 리뉴얼 상세 계획

### 1) 크리에이티브 아틀리에 미드나잇 퍼플 토큰 시스템 (`app/globals.css`)
- **배경 & 서피스**:
  - `--background: #090614` (딥 코즈믹 미드나잇 퍼플)
  - `--surface: #120d24` (신비로운 바이올렛 서피스)
  - `--surface-hover: #1c1536`
  - `--border: #2a1f4e`
- **브랜드 액센트 컬러**:
  - `--brand: #a855f7` (미스틱 퍼플)
  - `--brand-purple: #c084fc`
  - `--brand-gold: #f59e0b` (타로 황금빛 상징)
  - `--brand-cyan: #38bdf8` (에테르 시안)
  - `--foreground: #f1f5f9` (슬레이트 화이트 텍스트)

### 2) 좌측 사이드바 및 네비게이션 표준화 (`components/Sidebar.tsx` 등)
- 브랜드 뱃지: `v1.10 TAROT LAB` 바이올렛 칩 발광.
- 1-2-3-4 단계 파이프라인 메뉴 넘버링:
  - `1. 스프레드 & 질문 입력` (12종 스프레드 & 12종 화풍)
  - `2. 카드 셔플 & 드로우` (78장 아르카나 덱)
  - `3. AI 카드 일러스트 & 해석` (Gemini & LLM 실시간 연성)
  - `4. 내 타로 보관함 & 공유` (`/history` 영구 보관)
- 유틸리티 메뉴 그룹:
  - **`📖 연동 & 사용 매뉴얼` (`/guide`)** 신설 (골드 칩 하이라이트 배지).
- 모바일(767px 이하) 반응형 헤더 & 햄버거 토글 드로어 완비.

### 3) 메인 화면 리뉴얼
- 상단 신비로운 은하수 발광 테두리의 `.studio-hero` 웰컴 배너 탑재.
- 3대 핵심 KPI 지표 카드:
  - `12종 정통 타로 스프레드` (원카드부터 켈틱크로스까지)
  - `78장 AI 고유 일러스트 실시간 연성` (12대 화풍 엔진)
  - `100% BYOK 프라이빗 리딩 보관함` (`/history` 영구 저장)

### 4) 독립 비주얼 가이드북 전면 신설 (`app/guide/page.tsx`)
- **4단계 정통 타로 리딩 파이프라인**: 1) 마음 집중 & 질문 구체화 ➔ 2) 맞춤 스프레드 선정 ➔ 3) 직관적 카드 드로우 ➔ 4) AI 심층 리딩 & 조언.
- **12종 스프레드 비교 매트릭스**: 질문 주제별(연애/궁합, 재물/커리어, 내면 성찰, 양자택일) 추천 스프레드 안내.
- **78장 타로 덱 구조 인포그래픽**: 22장 메이저 아르카나(인생의 여정) + 56장 마이너 아르카나(4대 원소) 해설.
- 100% 회원 본인 API 키 원칙 (BYOK) 안내 및 자주 묻는 질문 FAQ 5종 골드 아코디언 인터랙션.

---

## 3. 버전 3중 동기화 계획 (`v1.20`)
1. `tarot/package.json` -> `"version": "1.20.0"`
2. `tarot/lib/version.ts` -> `export const APP_VERSION = "v1.20";`
3. Supabase DB `programs` (`slug: tarot-reading`) -> `version = 'v1.20'`

---

## 4. 검증 및 배포 계획
1. **로컬 빌드 검증**: `npm run build` Turbopack 빌드 성공 (exit code 0).
2. **Vercel 프로덕션 배포**: `npx vercel --prod --yes` (공식 도메인 `https://tarot-reading.buylife.xyz` 반영).
3. **Microsoft Edge 최전면 포그라운드 실세션 검수**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 쿠키 주입.
   - 데스크톱(1440px) 및 모바일(375px) 6종 캡처 보존.
   - Edge 창을 10분간 화면 최전면에 유지하여 실시간 검수.
4. **인수인계 문서 6종 완비 및 Git 푸시**:
   - `AGENTS.md`, `README.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_BACKLOG.md`, `docs/PLAN_20261019_DESIGN_RENEWAL.md`.
   - `DESIGN.md` 및 `docs/HANDOFF.md` 동기화.

---

## 5. 최종 구현 및 검증 결과 (2026-10-19 완료)

- **빌드 검증**: `npm run build` Next.js 14.2.35 빌드 성공 (11개 정적/동적 라우트 완벽 생성, exit code 0).
- **Vercel 프로덕션 배포**: 배포 ID `dpl_AUMFbgvscKDgVHENxYNuDu7jpQkq`, 도메인 `https://tarot-reading.buylife.xyz` 반영 완료.
- **Edge 최전면 포그라운드 실세션 검수**: 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션으로 10분간 화면 유지 및 6종 캡처 보존 완료.
- **최종 상태**: ✅ 1차 작업완료 (`v1.20`, 크리에이티브 아틀리에 스타일).

