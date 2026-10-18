# [사전 개발 플랜] 83번 AI 포토 리메이크 자동화 (photo-remake-studio) 디자인 리뉴얼

> **작성 일시**: 2026-10-18  
> **대상 프로그램**: `photo-remake-studio` (83번)  
> **공식 서비스 도메인**: [https://photo-remake-studio.buylife.xyz](https://photo-remake-studio.buylife.xyz)  
> **담당**: Antigravity CLI (윈도우)  
> **불변 원칙 준수**: 단일 작업 순차 진행, 본인 키 원칙, Edge 포그라운드 실세션 검수.

---

## 1. 개요 및 목적
- **목적**: 80번(바나나캔버스), 82번(패션스타일)에 이어 동일 이미지 처리 뼈대의 마지막 프로그램인 **83번 AI 포토 리메이크 자동화**를 크리에이티브 아틀리에 템플릿의 최신 변형인 **포토 리메이크 옵시디언 변형**으로 전면 리뉴얼.
- **핵심 방향**:
  - 오래된 흑백 사진 복원, 손상·스크래치 제거, 고해상도 확대, 자연스러운 사물 합성을 수행하는 전문 사진 복원 연구소의 품격을 전달하는 딥 옵시디언 다크 테마 구축.
  - 전 페이지(스튜디오, 사물 합성, 내 보관함, 가이드북, API 설정, 로그인) 단일 배경색 및 일관된 디자인 스타일 적용.
  - 리액트 핵심 비즈니스 로직 변경 없이 `globals.css` 상단 토큰 교체 + 하단 덮어쓰기 기법으로 신속하고 안전한 무결성 개발.

---

## 2. 디자인 템플릿 및 컬러 토큰 설계
- **공식 템플릿 명칭**: **크리에이티브 아틀리에 스타일 — 포토 리메이크 옵시디언 변형 (Creative Atelier Style — Photo Remake Obsidian Edition)**

```css
:root {
  --background: #090a0f;      /* 딥 옵시디언 블랙 */
  --foreground: #f3f4f6;      /* 뉴트럴 소프트 화이트 */
  --brand: #f59e0b;           /* 리메이크 앰버 골드 (포인트) */
  --brand-ink: #261602;
  --brand-alt: #10b981;       /* 복원 완료 에메랄드 그린 */
  --card: #12141c;            /* 옵시디언 다크 서피스 레벨 1 */
  --card2: #191c28;           /* 옵시디언 서피스 레벨 2 */
  --stage: #0d0f17;           /* 캔버스 및 슬라이더 무대 */
  --line: #222736;            /* 옵시디언 테두리 */
  --line-strong: #333a4f;     /* 강조 테두리 */
  --muted: #8c96a8;           /* 보조 텍스트 */
  --warn: #fbbf24;
  --danger: #f87171;
  --ok: #10b981;
  color-scheme: dark;
}
```

---

## 3. 구현 단계별 상세 계획

### Step 1. 버전 판올림 및 의존성 동기화
- `src/lib/version.ts`: `v1.08` ➔ `v1.09`
- `package.json`: `1.0.2` ➔ `1.9.0`

### Step 2. `globals.css` 전면 리뉴얼
- 상단 `:root` 및 `body` 스타일을 포토 리메이크 옵시디언 테마로 정의.
- 하단 전용 덮어쓰기 CSS 추가:
  - 2열 스튜디오 레이아웃 (`.studio-columns`, `.input-column`, `.result-column`)
  - Before/After 실시간 비교 슬라이더 (`.comparison`, `.before-layer`, `.compare-divider`, `.compare-label`)
  - 드롭존 및 이미지 업로더 (`.photo-upload`, `.upload-surface`, `.upload-icon`)
  - 사이드바 및 모바일 헤더 56px 슬림화 (`.desktop-sidebar`, `.mobile-sidebar`, `.mobile-header`)
  - 내 보관함 갤러리 (`.history-grid`, `.history-card`)

### Step 3. 사이드바 및 가이드북 고도화
- `Sidebar.tsx`: 브랜드 배지 🪄 마법봉 아이콘 강조, 메뉴명 `📖 연동 & 사용 매뉴얼` (`/guide`) 표준화.
- `guide/page.tsx`:
  - `PHOTO REMAKE LAB EDITORIAL GUIDE` 비주얼 히어로 배너.
  - 3단계 복원 파이프라인 (1. 원본 업로드 ➔ 2. AI 복원·컬러화·확대 ➔ 3. 슬라이더 전후 비교 & 저장).
  - 복원 칩 프리셋 (#오래된사진복원, #흑백컬러화, #얼굴선명화, #사물합성).
  - FAQ 6종 아코디언 컴포넌트 탑재.

### Step 4. 무결성 검증 (로컬 빌드 및 테스트)
- `npm test`: 내장 단위 테스트 100% 통과 확인.
- `npx tsc --noEmit`: TypeScript 컴파일 에러 0건 확인.
- `npm run build`: Next.js Turbopack 최적화 빌드 완료.

### Step 5. Supabase DB 버전 동기화
- Supabase DB `programs` 테이블 (`slug: photo-remake-studio`) `version` 컬럼을 `v1.09`로 업데이트.

### Step 6. Vercel 프로덕션 배포
- `vercel --prod --yes --scope buylife` 실행 및 도메인 확인 (`https://photo-remake-studio.buylife.xyz`).

### Step 7. Microsoft Edge 포그라운드 실세션 검수 (`headless: false`)
- `scripts/capture_edge_photo_remake_v109.cjs` 스크립트 작성 및 실행.
- 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 검수.
- 데스크톱/모바일 6종 캡처 아티팩트 보존 및 10분간 실제 창 유지.

### Step 8. 인수인계 문서 6종 작성 및 Git 동기화
- 서브폴더: `AGENTS.md`(7대 규격), `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`.
- 루트: `DESIGN.md`(83번 ✅ 완료 갱신, 53개 완료), `docs/ACTIVE_WORK.md`(행 삭제), `docs/HANDOFF.md`(최상단 보고서 등록).
- Git Commit & Push.
