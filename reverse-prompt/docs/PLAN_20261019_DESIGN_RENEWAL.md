# 73번 AI 리버스 프롬프트 자동화 (reverse-prompt) 디자인 리뉴얼 & 가이드북 구축 플랜

## 1. 개요 및 목적
- **대상 프로그램**: AI 리버스 프롬프트 자동화 (`reverse-prompt`, 73번, https://reverse-prompt.buylife.xyz)
- **적용 템플릿**: **크리에이티브 아틀리에 스타일 — 리버스 프롬프트 아키텍트 에디션 (Creative Atelier Style — Reverse Prompt Architect Edition)**
- **작업 목적**:
  1. 기존의 평범한 라이트 테마를 크리에이티브 미디어 분석 툴에 최적화된 **크리에이티브 아틀리에 스타일(딥 미드나잇/다크 슬레이트 `#0b0e14`, 아틀리에 앰버 골드 `#f59e0b`, 인디고 바이올렛 `#8b5cf6`, 시안 `#06b6d4`)**로 전면 리뉴얼.
  2. 대형 미디어 드롭존/프리뷰 뷰포트 중심의 전문 아틀리에 워크스페이스 구축 및 상단 웰컴 배너(`.studio-hero`), 3대 KPI 지표 카드 신설.
  3. 좌측 사이드바 표준화(`DESIGN.md` 9번 원칙 충족: 브랜드 뱃지 `v1.10 ARCHITECT`, 1-2-3 워크플로우, 유틸리티 메뉴 그룹, 앰버 골드 하이라이트 배지 탑재).
  4. 독립 비주얼 가이드북 (`/guide`) 신설: 4단계 역추출 파이프라인(미디어 업로드 ➔ 멀티모달 정밀 역분석 ➔ 타겟 AI 프롬프트 최적화 ➔ 파라미터 복사 & 재조합), 10대 지원 AI 도구별 특성 비교표, BYOK 보안 안내, FAQ 5종 아코디언 제공.
  5. 모바일(375px~390px) 반응형 플로팅 햄버거 메뉴 및 슬라이드 드로어 완비.
  6. 버전 3중 동기화 (`v1.10`: `package.json`, `src/lib/version.ts`, Supabase DB `programs`).
  7. Turbopack 빌드 검증, Vercel 프로덕션 배포, Microsoft Edge 최전면 포그라운드(headless: false) 실세션 검수(6종 캡처 & 10분 유지).
  8. 필수 인수인계 문서 6종 완비 및 루트 마스터 현황판(`DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md`) 동기화.

---

## 2. 디자인 토큰 및 스타일 명세
- **공식 템플릿**: 크리에이티브 아틀리에 스타일 — 리버스 프롬프트 아키텍트 에디션
- **색상 토큰**:
  - `atelier-bg`: `#0b0e14` (딥 미드나잇 블랙)
  - `atelier-surface`: `#121722` (다크 아틀리에 패널)
  - `atelier-card`: `#182030` (카드 배경)
  - `atelier-border`: `#263246` (은은한 경계선)
  - `atelier-amber`: `#f59e0b` (프롬프트 골드 포인트)
  - `atelier-violet`: `#8b5cf6` (AI 분석 인디고 포인트)
  - `atelier-cyan`: `#06b6d4` (멀티모달 시안 포인트)
  - `atelier-emerald`: `#10b981` (완료 및 활성 칩)
  - `atelier-text-main`: `#f1f5f9` (고대비 텍스트)
  - `atelier-text-muted`: `#94a3b8` (보조 텍스트)

---

## 3. 핵심 구현 범위
1. **`src/app/globals.css` 리뉴얼**:
   - 크리에이티브 아틀리에 테마 토큰 및 컴포넌트 클래스(`atelier-*`, `.studio-hero`, `.kpi-card`, `.flow-wizard`, `.gd-*`) 정의.
   - 고해상도 미디어 프리뷰 뷰포트 및 10대 도구별 프롬프트 결과 카드 스타일 정돈.
2. **`src/components/layout/Sidebar.tsx` 표준화**:
   - `DESIGN.md` 9번 원칙 충족: 브랜드 뱃지 `v1.10 ARCHITECT`, 작업 흐름 1-2-3 넘버링.
   - 유틸리티 메뉴 그룹: 내 분석 기록, API키등록·플랫폼연동, **`📖 연동 & 사용 매뉴얼` (`/guide`)** (골드 뱃지).
   - 모바일 반응형 플로팅 햄버거 토글 버튼 및 풀스크린/드로어 네비게이션.
3. **`src/components/studio/Analyzer.tsx` 리뉴얼**:
   - 메인 스튜디오 상단 `.studio-hero` 웰컴 배너 및 3대 핵심 지표 KPI 카드 탑재.
   - 대형 드롭존 및 미디어 프리뷰어 UI 강화.
   - 분석 결과 카드, 프롬프트 복사 및 재조합 콘솔 고도화 (Claude Code의 예외 처리 로직 100% 무결 보존).
4. **`src/app/(workspace)/guide/page.tsx` 독립 비주얼 가이드북 리뉴얼**:
   - 시각적 4단계 역추출 파이프라인 컴포넌트 탑재.
   - 10대 지원 AI 생성 도구(Midjourney, DALL·E 3, Flux/SD, Sora, Veo 2, Runway Gen-3, Kling, Luma Dream Machine, Suno v3.5, Udio v1.5) 특성 매트릭스.
   - BYOK 보안 원칙 안내 및 키 발급 링크 버튼.
   - FAQ 5종 아코디언 및 실전 활용 팁.
5. **버전 3중 동기화 (`v1.10`)**:
   - `reverse-prompt/package.json` (`1.10.0`)
   - `reverse-prompt/src/lib/version.ts` (`v1.10`)
   - Supabase DB `programs` (`slug: reverse-prompt`, `version: v1.10`)

---

## 4. 검수 및 배포 계획
1. **로컬 빌드 검증**:
   - `npm run build` (Next.js Turbopack 최적화 프로덕션 빌드 무결성 확인)
2. **Vercel 프로덕션 배포**:
   - `vercel --prod` 배포 (`https://reverse-prompt.buylife.xyz`)
3. **Microsoft Edge 최전면 포그라운드(headless: false) 실세션 검수**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 실로그인 세션 확인
   - 6종 필수 캡처:
     1) `edge_rp_desktop_studio_v110.png` (데스크톱 메인 스튜디오)
     2) `edge_rp_desktop_guide_v110.png` (비주얼 가이드북 상단 및 파이프라인)
     3) `edge_rp_desktop_guide_faq_v110.png` (가이드북 FAQ 아코디언 오픈)
     4) `edge_rp_desktop_settings_modal_v110.png` (API 키 설정 화면)
     5) `edge_rp_desktop_history_v110.png` (내 분석 기록 화면)
     6) `edge_rp_mobile_guide_v110.png` (모바일 375px 반응형 뷰포트)
   - 검수 완료 후 데스크톱 스튜디오 창 최전면 10분 유지
4. **인수인계 문서 6종 및 현황판 동기화**:
   - `AGENTS.md`, `README.md`, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_BACKLOG.md`, `docs/PLAN_20261019_DESIGN_RENEWAL.md`
   - `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 동기화
5. **Git 커밋 및 `origin/master` 원격 푸시**
