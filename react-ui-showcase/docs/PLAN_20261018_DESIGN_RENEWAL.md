# AI 웹 UI 제작 자동화 (react-ui-showcase / ai-web-ui) — 디자인 리뉴얼 개발 플랜

- **작성일**: 2026-10-18
- **작성자**: Antigravity CLI (agy)
- **대상 프로그램**: `react-ui-showcase` (slug: `ai-web-ui`)
- **공식 서비스 URL**: [https://react-ui-showcase.buylife.xyz](https://react-ui-showcase.buylife.xyz)
- **현재 버전**: `v1.04` ➔ **목표 버전**: `v1.05` (package: `1.5.0`)
- **적용 템플릿**: **크리에이티브 아틀리에 스타일 — 리액트 쇼케이스 변형 (Creative Atelier Style — React Showcase Edition)**

---

## 1. 리뉴얼 목적 및 비주얼 컨셉
- 기존 밝은 라이트 그레이(`#f8fafc`) 톤에서 벗어나, 현대적인 프론트엔드 개발자 및 UI 디자이너들이 몰입할 수 있는 **미드나잇 다크 네이비 테마** 구축.
- 12대 컴포넌트 갤러리, 10종 인터랙티브 시뮬레이터, 클린 TSX 코드 뷰어, AI 컴포넌트 생성기 4대 탭의 컴포넌트 로직을 손상시키지 않고 **무결성 CSS 토큰 주입 및 상속 덮어쓰기** 기법으로 세련된 다크 아틀리에 무드 완성.
- 프로그램 전 페이지(갤러리 대시보드, 가이드북, API 설정, 로그인)의 배경색을 단일 미드나잇 다크 네이비(`#0a0d14`)로 일체화 (`DESIGN.md` 단일 배경색 원칙 준수).

---

## 2. 디자인 토큰 사양
```css
:root {
  --background: #0a0d14;       /* 미드나잇 다크 네이비 배경 */
  --surface: #111622;          /* 카드, 패널, 모달 표면 */
  --surface-alt: #182030;      /* 서브 컨테이너, 탭 버튼 */
  --border: #222d42;           /* 네이비 슬레이트 테두리 */
  --text-main: #f1f5f9;        /* 메인 텍스트 */
  --text-sub: #94a3b8;         /* 보조 설명 텍스트 */
  --brand: #38bdf8;            /* 리액트 사이언 블루 포인트 */
  --brand-alt: #a855f7;        /* 바이올렛 악센트 */
}
```

---

## 3. 세부 작업 단계
1. **버전 및 인프라 동기화**:
   - `react-ui-showcase/package.json`: `"1.5.0"`
   - `react-ui-showcase/src/lib/version.ts`: `"v1.05"`
   - Supabase DB `programs` (`slug: ai-web-ui`): `version: 'v1.05'`
2. **글로벌 CSS 토큰 및 덮어쓰기 (`src/app/globals.css`)**:
   - `:root` 테마 변수 선언 및 베이스 다크 네이비 배경 적용
   - 사이드바, 헤더, 갤러리 카드, 데모 모달, 코드 뷰어 다크 네이비 덮어쓰기 스타일
3. **비주얼 에디토리얼 가이드북 (`src/app/guide/GuideClient.tsx`) 고도화**:
   - 리액트 사이언/바이올렛 그라데이션 히어로 배너 및 `v1.05 리액트 쇼케이스 에디션` 배지 신설
   - 4-Step UI 제작 파이프라인 카드 및 컴포넌트 칩 4종 수록
4. **로컬 무결성 검증**:
   - `npx tsc --noEmit` 타입 검사 통과
   - `npm run build` Next.js Turbopack 빌드 성공
5. **Vercel 프로덕션 배포**:
   - `npx vercel --prod --yes --scope buylife`
6. **Microsoft Edge 최전면 포그라운드 실세션 검수 (headless: false, 10분 화면 유지)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션으로 6종 스크린샷 캡처 및 화면 최전면 유지
7. **인수인계 6종 작성 및 Git 커밋/푸시**:
   - `AGENTS.md`(7대 규격), `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`
   - 루트 마스터 현황판(`DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md`) 동기화
