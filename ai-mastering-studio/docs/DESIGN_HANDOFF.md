# AI 마스터링 스튜디오 — 디자인 리뉴얼 인수인계 (DESIGN_HANDOFF.md)

- **작성 일자**: 2026-10-19
- **프로그램**: AI 마스터링 스튜디오 (`ai-mastering-studio`, 77번)
- **적용 버전**: `v1.10`
- **적용 테마**: **사이버 네온 다크 콘솔 스타일 — 오디오 마스터링 콘솔 에디션 (Cyber Neon Dark Console Style — Audio Mastering Console Edition)**
- **라이브 도메인**: [https://ai-mastering-studio.buylife.xyz](https://ai-mastering-studio.buylife.xyz)
- **배포 ID**: `dpl_E6JZSt7m9z33pgdnA1bDV9nDRg9a`

---

## 1. 디자인 시스템 토큰
- **배경색**:
  - 앱 전체 배경: `#060911` (Deep Space Dark)
  - 랙마운트 섀시 및 카드: `#0d121f`
  - 서브 패널 및 인풋 영역: `#080d19` / `#131b2e`
- **네온 포인트 컬러**:
  - 메인 시안 네온: `#00f0ff` (슬라이더, 활성 뱃지, 발광 테두리)
  - 보조 퍼플 네온: `#7000ff` (배경 블러, 하이라이트)
  - 앰버 골드: `#f59e0b` (가이드 뱃지)
- **타이포그래피**:
  - 본문 텍스트: `text-slate-100`, `text-slate-300`, `text-slate-400`
  - 수치 및 라우드니스 지표: 모노스페이스 폰트 (`font-mono`)

---

## 2. 주요 리뉴얼 컴포넌트
1. **상단 웰컴 배너 (`.studio-hero`)**:
   - `Cyber Neon Audio Mastering Console` 타이틀 및 네온 발광 효과.
   - `v1.10 MASTER CONSOLE`, `12종 프로페셔널 사운드 프로필`, `5대 하드웨어 마스터링 랙` 뱃지.
   - 가이드북 및 API 설정 다이렉트 링크 버튼.
2. **3대 핵심 KPI 지표 카드**:
   - 12종 사운드 프로필, 5대 정밀 아날로그 랙, 무손실 브라우저 렌더.
3. **사이드바 메뉴 표준화 (`Sidebar.tsx`)**:
   - 브랜드 뱃지 `v1.10 MASTER CONSOLE`.
   - 1-2-3 넘버링 단계 메뉴.
   - `📖 연동 & 사용 매뉴얼` (`/guide`) 골드 뱃지.
   - 모바일 반응형 햄버거 드로어 완비.
4. **5대 마스터링 아날로그 랙 (`Rack.tsx`)**:
   - 다크 랙마운트 섀시 스타일, 네온 시안 슬라이더, 값 인디케이터.
5. **독립 비주얼 가이드북 (`/guide/page.tsx`)**:
   - 4단계 마스터링 워크플로우 카드, 5대 랙 작동 원리, 12종 프로필 매트릭스, 100% 로컬 보안 보증, FAQ 5종 아코디언.

---

## 3. Microsoft Edge 최전면 포그라운드 실세션 검수 증빙
- **검수 환경**: Microsoft Edge 포그라운드 최전면(`headless: false`, `--start-maximized`)
- **검수 계정**: 일반 회원 테스트 계정 (`buylifemall@naver.com`, SSR 세션 쿠키 주입)
- **보존된 6종 캡처**:
  1. `edge_mastering_desktop_studio_v110.png` (메인 스튜디오 전경)
  2. `edge_mastering_desktop_rack_v110.png` (5대 마스터링 랙 상세)
  3. `edge_mastering_desktop_guide_v110.png` (비주얼 가이드북 상단)
  4. `edge_mastering_desktop_guide_faq_v110.png` (가이드북 FAQ 아코디언 오픈)
  5. `edge_mastering_desktop_settings_v110.png` (API 키 설정)
  6. `edge_mastering_mobile_guide_v110.png` (모바일 375px 반응형 뷰)
- **유지 상태**: 검수 완료 후 메인 스튜디오 대시보드를 최전면에 10분간 유지.
