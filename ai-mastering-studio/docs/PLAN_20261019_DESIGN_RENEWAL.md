# 77번 AI 마스터링 스튜디오 (ai-mastering-studio) 디자인 리뉴얼 & 가이드북 구축 플랜

## 1. 개요 및 목적
- **대상 프로그램**: AI 마스터링 스튜디오 (`ai-mastering-studio`, 77번, https://ai-mastering-studio.buylife.xyz)
- **적용 템플릿**: **사이버 네온 다크 콘솔 스타일 — 오디오 마스터링 콘솔 에디션 (Cyber Neon Dark Console Style — Audio Mastering Console Edition)**
- **작업 목적**:
  1. 프로페셔널 하이테크 오디오 마스터링 콘솔에 걸맞은 **사이버 네온 다크 콘솔 스타일(딥 블랙 `#060911`, 네온 사이언 `#00f0ff` / `#38bdf8`, 일렉트릭 퍼플 `#8b5cf6`, 앰버 오렌지 `#f59e0b`)**로 전면 리뉴얼.
  2. 상단 `.studio-hero` 웰컴 배너 및 3대 KPI 지표 카드 신설 (12종 프로페셔널 사운드 프로필, 5대 마스터링 아날로그 랙, 무손실 일괄 렌더 & ZIP 내보내기).
  3. 사이드바 메뉴 표준화(`DESIGN.md` 9번 원칙 충족: 브랜드 뱃지 `v1.10 MASTER CONSOLE`, 1-2-3 작업 흐름, 유틸리티 메뉴 그룹, 앰버 골드 하이라이트 배지 탑재).
  4. 독립 비주얼 가이드북 (`/guide`) 신설: 4단계 오디오 마스터링 파이프라인(WAV 업로드 ➔ 프로필 선택 ➔ 5대 랙 정밀 튜닝 ➔ 무손실 렌더링), 12종 사운드 프로필 비교 가이드, 5대 마스터링 랙(EQ, 새추레이션, 컴프레서, 이미저, 리미터) 원리 해설, FAQ 5종 아코디언 제공.
  5. 모바일(375px~390px) 반응형 플로팅 햄버거 메뉴 및 슬라이드 드로어 완비.
  6. 버전 3중 동기화 (`v1.10`: `package.json`, `src/lib/version.ts`, Supabase DB `programs`).
  7. Turbopack 빌드 검증, Vercel 프로덕션 배포, Microsoft Edge 최전면 포그라운드(headless: false) 실세션 검수(6종 캡처 & 10분 유지).
  8. 필수 인수인계 문서 6종 완비 및 루트 마스터 현황판(`DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md`) 동기화.

---

## 2. 디자인 토큰 및 스타일 명세
- **공식 템플릿**: 사이버 네온 다크 콘솔 스타일 — 오디오 마스터링 콘솔 에디션
- **색상 토큰**:
  - `console-bg`: `#060911` (딥 옵시디언 블랙)
  - `console-surface`: `#0d121f` (다크 랙 패널)
  - `console-card`: `#131b2e` (카드 및 모듈 배경)
  - `console-border`: `#1e293b` (은은한 메탈릭 테두리)
  - `console-cyan`: `#00f0ff` / `#38bdf8` (네온 사이언 하이라이트)
  - `console-purple`: `#8b5cf6` (일렉트릭 퍼플)
  - `console-amber`: `#f59e0b` (따뜻한 진공관 앰버 오렌지)
  - `console-emerald`: `#10b981` (신호 정상 및 완료)
  - `console-text-main`: `#f8fafc` (고대비 텍스트)
  - `console-text-muted`: `#94a3b8` (보조 텍스트)

---

## 3. 핵심 구현 범위
1. **`src/app/globals.css` 리뉴얼**:
   - 사이버 네온 다크 콘솔 토큰 시스템 및 유틸리티 클래스 정의.
   - 오디오 랙 슬라이더, 피크 미터, 파형 캔버스 뷰포트의 네온 발광 효과 고도화.
2. **`src/components/layout/Sidebar.tsx` 표준화**:
   - `DESIGN.md` 9번 원칙 충족: 브랜드 뱃지 `v1.10 MASTER CONSOLE`, 1-2-3 넘버링 작업 흐름.
   - 유틸리티 메뉴 그룹: **`📖 연동 & 사용 매뉴얼` (`/guide`)** (골드 뱃지), API 키 설정 등.
   - 모바일 반응형 플로팅 햄버거 토글 버튼 및 슬라이드 오버레이 드로어 완비.
3. **`src/components/studio/MasteringStudio.tsx` 리뉴얼**:
   - 메인 스튜디오 상단 `.studio-hero` 웰컴 배너 및 3대 핵심 KPI 지표 카드 탑재.
   - 12종 사운드 프로필 선택 카드, 5대 정밀 마스터링 랙 컨트롤러 UI 정돈.
4. **`src/app/(dashboard)/guide/page.tsx` 독립 비주얼 가이드북 신설**:
   - 4단계 오디오 마스터링 파이프라인 시각화 컴포넌트.
   - 12종 프로페셔널 사운드 프로필 해설 매트릭스.
   - 5대 마스터링 아날로그 랙 작동 원리 및 팁.
   - FAQ 5종 아코디언 컴포넌트 탑재.
5. **버전 3중 동기화 (`v1.10`)**:
   - `ai-mastering-studio/package.json` (`1.10.0`)
   - `ai-mastering-studio/src/lib/version.ts` (`v1.10`)
   - Supabase DB `programs` (`slug: ai-mastering-studio`, `version: v1.10`)

---

## 4. 검수 및 배포 계획
1. **로컬 빌드 검증**:
   - `npm test` (신호 처리 및 접근 권한 테스트)
   - `npm run build` (Next.js Turbopack 최적화 프로덕션 빌드 무결성 확인)
2. **Vercel 프로덕션 배포**:
   - `vercel --prod` 배포 (`https://ai-mastering-studio.buylife.xyz`)
3. **Microsoft Edge 최전면 포그라운드(headless: false) 실세션 검수**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 로그인 검수
   - 6종 필수 캡처:
     1) `edge_mastering_desktop_studio_v110.png` (데스크톱 메인 마스터링 콘솔 스튜디오)
     2) `edge_mastering_desktop_guide_v110.png` (비주얼 가이드북 상단 및 4단계 파이프라인)
     3) `edge_mastering_desktop_guide_faq_v110.png` (가이드북 FAQ 아코디언 오픈)
     4) `edge_mastering_desktop_settings_modal_v110.png` (API 키 설정 화면)
     5) `edge_mastering_desktop_rack_v110.png` (5대 정밀 마스터링 랙 화면)
     6) `edge_mastering_mobile_guide_v110.png` (모바일 375px 반응형 뷰포트)
   - 검수 완료 후 데스크톱 스튜디오 창 최전면 10분 유지
4. **인수인계 문서 6종 및 현황판 동기화**:
   - `AGENTS.md`, `README.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_BACKLOG.md`, `docs/PLAN_20261019_DESIGN_RENEWAL.md`
   - `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 동기화
5. **Git 커밋 및 `origin/master` 원격 푸시**
