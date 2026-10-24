# AI 바나나 캔버스 (banana-canvas) — 프리미엄 3D 나노바나나 스튜디오 전면 리뉴얼 플랜

- **작성일**: 2026-10-25
- **담당 에이전트**: Antigravity (`agy`, 윈도우 메인 PC, 네이버 웨일 브라우저)
- **대상 프로그램**: `banana-canvas` (`https://banana-canvas.buylife.xyz`)
- **현재 버전**: v1.37 → 목표 버전: v1.38
- **디자인 컨셉**: **「프리미엄 3D 나노바나나 스튜디오 (Premium 3D Nano Banana Studio)」** (카탈로그 11번 고도화)

---

## 1. 리뉴얼 배경 및 해결 과제

1. **사이드바 메뉴 위계 붕괴 및 모호성 해결**:
   - 기존 `🧽 무료 지우기(내 PC)`가 작업 흐름(Step 1~3) 바로 아래에 구분선 없이 큰 원색 버튼으로 튀어나와 있어, 프로그램 다운로드인지, 별도 설치인지 혼란을 초래함.
   - 사이드바 표준(`docs/SIDEBAR_LAYOUT_STANDARD.md`) 5단 구조(브랜딩 → 1~3 흐름 → 구분선 → 유틸리티/보조AI/매뉴얼 → 밀착 계정)로 전면 정돈.
   - `🧽 무료 지우기(내 PC)` ➔ **`🧼 AI 매직 지우개 (초고속 무료)`**로 명칭 및 위상 격상 (라벨: `브라우저 로컬 연산 · 0원`).

2. **누런 미숫가루톤 탈피 & 세련된 3D 럭셔리 나노바나나 무드 구축**:
   - 텁텁하고 누런 구형 `#fff8d6` 배경 대신, 맑고 화사한 **소프트 크림 글래스 (`#faf8f0` ~ `#fffdf7`)**와 부드러운 앰비언트 글로우 적용.
   - 3D 바나나 엠블럼, 3D 입체 번호 배지(1️⃣, 2️⃣, 3️⃣), 3D 작업 카드 헤더 아이콘(✨, ✂️, 🪄, 📸, 🎞️, 🧩, 📚 등) 전면 도입.
   - 본문 가독성 보장: 텍스트 대비 7:1 이상 딥 에스프레소 잉크(`#1e1b18`) 적용.

3. **스튜디오 대시보드 (`/studio`) 사용성 극대화**:
   - 상단 빠른 작업 바로가기 칩 띠(`.bc-nav-chips`)를 세련된 3D 필터 캡슐 형태로 리뉴얼.
   - 작업 카드(`GraphicCard`, `Card`)의 헤더를 글래스 서피스와 입체 뱃지로 세련되게 업그레이드.
   - 원본과 완성 비교(`Compare Slider`) 슬라이더 조작성 및 시인성 개선.

4. **비주얼 매뉴얼 (`/guide`) 8대 표준 규격화**:
   - 4단계 핵심 파이프라인 카드 뷰어, 팁 배너, 트러블슈팅 FAQ 아코디언 고도화.

---

## 2. 세부 구현 단계 (Step-by-Step)

### Step 1: 전역 스타일 토큰 및 3D 럭셔리 나노바나나 CSS 구축
- 대상 파일: `banana-canvas/src/app/globals.css`
- 소프트 크림 글래스 서피스, 3D 입체 섀도우, 리치 바나나 골드 그라데이션, 고대비 텍스트 토큰 정의.

### Step 2: 사이드바 (`Sidebar.tsx`) 표준화 및 3D UI 리뉴얼
- 대상 파일: `banana-canvas/src/components/layout/Sidebar.tsx`
- 3D 바나나 엠블럼, 1~3 입체 스텝퍼, 구분선, 유틸리티 영역(`🧼 AI 매직 지우개`, `내 결과 기록`, `API키등록`, `연동 매뉴얼`), 밀착 계정 블록.
- 모바일(767px 이하) 상단 바 및 ☰ 드로어 메뉴 동시 적용.

### Step 3: 스튜디오 (`Studio.tsx` & 카드 컴포넌트) 3D 리뉴얼
- 대상 파일: `banana-canvas/src/components/studio/Studio.tsx`, `GraphicCard.tsx`, `MaskEditor.tsx`
- 3D 카테고리 칩 띠, 입체 작업 카드, 업로드 드롭존 시각화, 프리미엄 CTA 버튼 적용.

### Step 4: 무료 지우개 화면 (`/erase`) & 매뉴얼 (`/guide`) 리뉴얼
- 대상 파일: `banana-canvas/src/app/(workspace)/erase/page.tsx`, `banana-canvas/src/components/erase/FreeEraseBoard.tsx`, `banana-canvas/src/app/(workspace)/guide/page.tsx`
- 클린 캔버스 툴바, 3D 가이드북 카드 뷰어 구축.

### Step 5: 버전 동기화, 로컬 빌드 검증 및 Vercel 배포
- 버전 업데이트: `v1.38` (`banana-canvas/src/lib/version.ts` 및 DB `programs.version`)
- 로컬 빌드 검증: `npm --prefix banana-canvas run build`
- Vercel 프로덕션 배포 (`node scripts/deploy.mjs banana-canvas --go`)

### Step 6: 네이버 웨일 브라우저 포그라운드 실세션 검수 & 문서 커밋/푸시
- 네이버 웨일 창에서 메인 스튜디오, AI 지우개, 매뉴얼, 모바일 반응형 직접 검수.
- `DESIGN.md`, `docs/HANDOFF.md`, `docs/roles/design.md` 갱신 및 원격 푸시.

---

## 3. 검수 기준 및 안전장치
- **비용**: 외부 유료 API 호출 0원, Vercel 빌드 순차 1회.
- **브라우저**: 네이버 웨일(Whale) 실제 창(포그라운드) 검수.
- **모바일**: 375px~390px 뷰포트에서 가로 넘침 0px, 좌측 메뉴 접힘 ☰ 정상 동작.
