# [사전 개발 플랜] 76번 AI 썸네일 마스터 자동화 (thumbnail-master) 디자인 리뉴얼

> **작성 일시**: 2026-10-18  
> **대상 프로그램**: `thumbnail-master` (76번)  
> **공식 서비스 도메인**: [https://thumbnail-master.buylife.xyz](https://thumbnail-master.buylife.xyz)  
> **담당**: Antigravity CLI (윈도우)  
> **불변 원칙 준수**: 단일 작업 순차 진행, 본인 키 원칙, Edge 최전면 포그라운드 실세션 검수.

---

## 1. 개요 및 목적
- **목적**: 80번(바나나캔버스), 82번(패션스타일), 83번(포토리메이크)에 이어 동일 캔버스/이미지 생성 뼈대를 공유하는 **76번 AI 썸네일 마스터 자동화**를 크리에이티브 아틀리에 템플릿의 최신 변형인 **썸네일 매거진 변형**으로 전면 리뉴얼.
- **핵심 방향**:
  - 유튜브/SNS 크리에이터의 시선을 사로잡는 고대비 썸네일 A/B 테스트 스튜디오 무드 구축.
  - 전 페이지(프로젝트 대시보드, 썸네일 작업실, 가이드북, API 설정, 로그인) 단일 배경색 및 일관된 디자인 스타일 적용.
  - 리액트 핵심 로직 변경 없이 `globals.css` 상단 토큰 교체 + 하단 덮어쓰기 기법으로 신속하고 안전한 무결성 개발.

---

## 2. 디자인 템플릿 및 컬러 토큰 설계
- **공식 템플릿 명칭**: **크리에이티브 아틀리에 스타일 — 썸네일 매거진 변형 (Creative Atelier Style — Thumbnail Magazine Edition)**

```css
:root {
  --background: #0c0f17;      /* 딥 미드나잇 다크 */
  --foreground: #f1f5f9;      /* 소프트 화이트 */
  --brand: #8b5cf6;           /* 썸네일 바이올렛 (포인트) */
  --brand-ink: #1e103a;
  --brand-alt: #f97316;       /* 코랄 오렌지 (A/B 대조 포인트) */
  --card: #131722;            /* 서피스 카드 레벨 1 */
  --card2: #1b2030;           /* 서피스 카드 레벨 2 */
  --stage: #0f131c;           /* 캔버스 작업 영역 */
  --line: #222938;            /* 테두리 라인 */
  --line-strong: #333d54;     /* 강조 테두리 */
  --muted: #8c9bb0;           /* 보조 텍스트 */
  --warn: #fbbf24;
  --danger: #f87171;
  --ok: #10b981;
  color-scheme: dark;
}
```

---

## 3. 구현 단계별 상세 계획

### Step 1. 버전 판올림 및 의존성 동기화
- `src/lib/version.ts`: `v1.06` ➔ `v1.07`
- `package.json`: `1.0.3` ➔ `1.7.0`

### Step 2. `globals.css` 전면 리뉴얼
- 상단 `:root` 및 `body` 스타일을 썸네일 매거진 테마로 정의.
- 하단 전용 덮어쓰기 CSS 추가:
  - 프로젝트 대시보드 그리드 (`.project-grid`, `.project-card`)
  - 썸네일 제작 스튜디오 (`.tm`, `.tm-step`, `.tm-aud`, `.tm-opts`, `.tm-opt`, `.tm-canvas`, `.tm-prompt`, `.tm-results`)
  - A/B 배지 및 대조 강조 (`.tm-badge`, `.tm-badge.b`, `.tm-overlay`)
  - 사이드바 및 모바일 헤더 56px 슬림화 (`.desktop-sidebar`, `.mobile-sidebar`, `.mobile-header`)
  - 가이드북 비주얼 카드 및 FAQ (`.gd-toc`, `.gd-cards article`, `.gd-faq details`)

### Step 3. 사이드바 및 가이드북 고도화
- `Sidebar.tsx`: 브랜드 배지 🎬 아이콘 및 메뉴명 `📖 연동 & 사용 매뉴얼` (`/guide`) 유지 확인.
- `guide/page.tsx`:
  - `THUMBNAIL MASTER EDITORIAL GUIDE` 비주얼 히어로 배너.
  - 3단계 A/B 테스트 파이프라인 (1. 주제·피사체 ➔ 2. 타겟·전략 A/B ➔ 3. 2종 생성 & 고화질 다운로드).
  - 썸네일 칩 프리셋 (#숫자이득A안, #호기심B안, #고대비헤드라인, #클릭률극대화).
  - FAQ 6종 아코디언 컴포넌트 탑재.

### Step 4. 무결성 검증 (로컬 빌드 및 테스트)
- `npm test`: 단위 테스트 100% 통과 확인.
- `npx tsc --noEmit`: TypeScript 컴파일 에러 0건 확인.
- `npm run build`: Next.js Turbopack 최적화 빌드 완료.

### Step 5. Supabase DB 버전 동기화
- Supabase DB `programs` 테이블 (`slug: thumbnail-master`) `version` 컬럼을 `v1.07`로 업데이트.

### Step 6. Vercel 프로덕션 배포
- `vercel --prod --yes --scope buylife` 실행 및 도메인 확인 (`https://thumbnail-master.buylife.xyz`).

### Step 7. Microsoft Edge 최전면 포그라운드 실세션 검수 (`headless: false`)
- `scripts/capture_edge_thumbnail_master_v107.cjs` 스크립트 작성 및 실행.
- 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 검수.
- 데스크톱/모바일 6종 캡처 아티팩트 보존 및 주인님이 직접 보실 수 있도록 화면 최전면 10분간 유지.

### Step 8. 인수인계 문서 6종 작성 및 Git 동기화
- 서브폴더: `AGENTS.md`(7대 규격), `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`.
- 루트: `DESIGN.md`(76번 ✅ 완료 갱신, 누적 54개 완료), `docs/ACTIVE_WORK.md`(행 삭제), `docs/HANDOFF.md`(최상단 보고서 등록).
- Git Commit & Push.
