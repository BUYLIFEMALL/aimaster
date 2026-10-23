# 37번 AIMaster 타로점 (`tarot-reading`) 디자인 개발완료 보고서 (DESIGN_HANDOFF.md)

> **작성일**: 2026-10-19  
> **작성자**: Antigravity CLI (agy, 윈도우)  
> **적용 버전**: `v1.20`  
> **공식 서비스 링크**:  
> https://tarot-reading.buylife.xyz (대체: `https://tarot.buylife.xyz`)  
> **독립 비주얼 가이드북 링크**:  
> https://tarot-reading.buylife.xyz/guide  
> **적용 공식 템플릿**: **크리에이티브 아틀리에 스타일 — 신비로운 미드나잇 퍼플 랩 에디션 (Creative Atelier Style — Mystic Midnight Purple Lab Edition)**  

---

## 1. 디자인 컨셉 및 스타일 가이드

- **배경색 및 메인 테마**:
  - 딥 코즈믹 미드나잇 퍼플 (`--background: #090614`) 및 신비로운 바이올렛 서피스 (`--surface: #120d24`, `--surface-hover: #1c1536`, `--border: #2a1f4e`).
  - 신비주의 타로 덱과 카드 일러스트의 발광 효과를 극대화하는 딥 다크 환경을 구축.
- **브랜드 및 포인트 컬러**:
  - `--brand: #a855f7` (미스틱 퍼플): 주 액센트 및 활성 탭
  - `--brand-purple: #c084fc`: 발광 효과 및 텍스트 하이라이트
  - `--brand-gold: #f59e0b`: 타로 덱의 황금빛 상징 및 가이드북 배지
  - `--brand-cyan: #38bdf8`: 에테르 시안 포인트
  - `--foreground: #f1f5f9`: 고대비 슬레이트 화이트 텍스트

---

## 2. 컴포넌트별 리뉴얼 구조

### 1) 헤더 네비게이션 (`components/layout/HeaderNav.tsx`)
- 최상단 `v1.20 TAROT LAB` 바이올렛 발광 칩 배지.
- 메뉴 구성: 대시보드(`/`), 카드 뽑기(`/draw`), **`📖 연동 & 사용 매뉴얼` (`/guide`)**, 내 보관함(`/history`), API 키 설정(`/settings`).
- 모바일(767px 이하) 반응형 헤더 및 햄버거 토글 드로어 완비.

### 2) 메인 대시보드 (`app/page.tsx`)
- **상단 썸네일 히어로 배너**: 16:7 프리미엄 배너 내 [📖 사용 매뉴얼] 퀵 액션 연동.
- **3대 핵심 KPI 지표 카드**:
  - `78장 정통 아르카나 덱` (메이저 22장 + 마이너 56장)
  - `매번 새로 그리는 AI 일러스트` (12대 화풍 실시간 연성)
  - `맞춤형 AI 종합 해석 리포트` (유기적 심층 리딩 & 영구 보관)
- **API 키 연동 상태 다크 카드**: Gemini 및 OpenAI 키 마스킹 상태 시각화.

### 3) 독립 비주얼 가이드북 (`app/guide/page.tsx`)
- **4단계 정통 타로 리딩 파이프라인**: 1) 질문 정돈 ➔ 2) 화풍 & 셔플 ➔ 3) 카드 드로우 ➔ 4) AI 심층 해석.
- **12종 정통 스프레드 매트릭스 테이블**: 원카드, 3카드 시간흐름, 3카드 궁합, 5카드 심층, 켈틱크로스 등 상황별 추천 질문 및 해석 관점 해설.
- **78장 타로 덱 구조 인포그래픽**: 메이저 22장 및 마이너 4대 원소(완드/컵/소드/펜타클) 상징성 체계화.
- **100% BYOK 보안 배너**: 개인정보 및 리딩 내역 비공개 원칙 안내.
- **자주 묻는 질문 FAQ 5종 골드 아코디언 인터랙션**.

---

## 3. Microsoft Edge 최전면 포그라운드 실세션 검수 결과

- **검수 브라우저**: Microsoft Edge (최전면 최대화 창, 10분 유지)
- **검수 계정**: 일반 회원 테스트 계정 (`buylifemall@naver.com`)
- **보존된 6종 스크린샷 아티팩트**:
  1. `edge_tarot_desktop_main_v120.png`: 데스크톱 메인 대시보드 및 썸네일 히어로 배너
  2. `edge_tarot_desktop_kpi_v120.png`: 메인 하단 3대 KPI 카드 및 API 키 연동 상태
  3. `edge_tarot_desktop_guide_v120.png`: 비주얼 가이드북 상단 및 4단계 리딩 파이프라인 카드
  4. `edge_tarot_desktop_guide_matrix_v120.png`: 12종 스프레드 매트릭스, 78장 덱 구조 해설, FAQ 아코디언
  5. `edge_tarot_desktop_draw_v120.png`: 카드 뽑기(/draw) 신비로운 셔플 화면
  6. `edge_tarot_mobile_guide_v120.png`: 모바일 375px 반응형 뷰포트 (가로 스크롤 없음, 햄버거 메뉴 완비)
