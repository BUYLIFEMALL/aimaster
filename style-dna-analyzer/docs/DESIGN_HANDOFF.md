# 디자인 인수인계서 (DESIGN_HANDOFF.md) — 23번 이미지 스타일 분석기

> **프로그램명**: 이미지 스타일 분석기 (`style-dna-analyzer`)  
> **공식 URL**: https://style-dna-analyzer.buylife.xyz  
> **적용 버전**: `v1.22`  
> **적용 템플릿**: 크리에이티브 아틀리에 스타일 — 스타일 DNA 랩 에디션  
> **작업 일시**: 2026-10-19  
> **담당 에이전트**: Antigravity CLI (agy)

---

## 1. 디자인 시스템 토큰
- **배경색**: 딥 미드나잇 다크 네이비 (`#0c0f17`)
- **컨테이너 / 서피스**: 다크 흑요석 카드 (`#131824`)
- **보더 라인**: 텍스처 경계선 (`#222d42`)
- **포커스 / 호버 서피스**: 엘리베이션 카드 (`#182030`)
- **주 액센트**: 일렉트릭 시안 블루 (`#06b6d4`, `rgb(6, 182, 212)`)
- **보조 액센트**: 아티스틱 바이올렛 (`#8b5cf6`, `rgb(139, 92, 246)`)
- **텍스트 타이포그래피**:
  - Headings: `text-white font-extrabold tracking-tight`
  - Body: `text-slate-300 text-xs md:text-sm leading-relaxed`
  - Captions / Hints: `text-slate-400 text-[11px]`

---

## 2. 주요 리뉴얼 내역
1. **사이드바 네비게이션 표준화 (`Sidebar.tsx`)**:
   - `v1.22 DNA LAB` 브랜드 뱃지 및 그라데이션 아이콘 적용.
   - `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설 (앰버 골드 활성 배지).
   - 1-2-3 단계별 작업 워크플로우 번호 링과 세로 커넥터 디자인 적용.
   - 하단 사용자 세션 박스(`buylifemall@naver.com`) 및 로그아웃 버튼 배치.
2. **독립 비주얼 에디토리얼 가이드북 (`/guide/page.tsx`) 신설**:
   - 상단 히어로 배너: 그라데이션 타이틀, 비주얼 유전자 분석기 소개, 원클릭 CTA.
   - 표준 3단계 파이프라인 카드: 01 Ingestion & Scan, 02 Gene Mutation, 03 Synthesis & Bench.
   - 6대 DNA 비주얼 유전자 카드 (카메라, 조명, 색채 HEX, 텍스처, 무드, 네거티브).
   - 회원 본인 API 키 연동 보안 배너 및 AI Studio 바로가기.
   - FAQ 5종 인터랙티브 아코디언.
3. **공통 컴포넌트 (`ui.tsx`) 다크 아틀리에 테마 토큰화**:
   - `Card`, `INPUT`, `SELECT`, `BTN_PRIMARY`, `BTN_GHOST`, `StepHeader`, `ErrorNote`, `EnginePicker`, `CopyButton`의 색상을 모두 다크 톤으로 일원화하여 페이지 간 이질감 해소.
4. **보관함 대시보드 (`/dashboard`) 및 설정 화면 (`/settings`) 다크 테마 일치**:
   - 하얀색 배경 카드를 모두 `#131824` / `#222d42`로 일괄 통합.

---

## 3. 검수 증빙
- Microsoft Edge 최전면 포그라운드 실세션 검수 완료 (10분 창 유지)
- 아티팩트 스크린샷 6종:
  - 데스크톱 대시보드: `edge_style_dna_desktop_dashboard_v122.png`
  - 데스크톱 가이드북: `edge_style_dna_desktop_guide_v122.png`
  - 데스크톱 1단계 분석: `edge_style_dna_desktop_analyze_v122.png`
  - 데스크톱 2단계 보정: `edge_style_dna_desktop_refine_v122.png`
  - 데스크톱 설정 연동: `edge_style_dna_desktop_settings_v122.png`
  - 모바일 375px 뷰: `edge_style_dna_mobile_guide_v122.png`
