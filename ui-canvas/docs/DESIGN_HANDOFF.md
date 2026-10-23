# 🎨 UI Canvas 자동화 (ui-canvas) — 디자인 리뉴얼 인수인계서

> **문서 버전**: `v1.10`  
> **작성일**: 2026-10-19  
> **작성 에이전트**: Antigravity CLI (agy)  
> **공식 서비스 URL**: https://ui-canvas.buylife.xyz  
> **적용 디자인 템플릿**: 크리에이티브 아틀리에 스타일 — 캔버스 프로 에디션 (`Creative Atelier Style — Canvas Pro Edition`)

---

## 1. 디자인 리뉴얼 개요 및 목적

### 1.1 배경 및 목적
- 기존 `ui-canvas`는 건조한 라이트 그레이 위주의 화면 구성으로 인해 Figma나 Canva 같은 전문 디자인 툴 수준의 몰입감과 세련미가 부족했습니다.
- 상위 지침(2026-10-16 디자인 메인지침 및 템플릿화 의무)에 따라 본 프로그램을 **크리에이티브 아틀리에 스타일 — 캔버스 프로 에디션(`Creative Atelier Style — Canvas Pro Edition`)**으로 전면 리뉴얼하여, 장시간 작업에도 눈의 피로를 최소화하는 딥 미드나잇 다크 네이비(`#0c0f17`)와 슬레이트 다크 서피스(`#131824`), 일렉트릭 시안 블루(`#06b6d4`) & 아티스틱 바이올렛(`#8b5cf6`)의 감각적인 하이테크 룩앤필을 구현했습니다.
- 사이드바 메뉴 표준화 및 신규 사용자 온보딩을 위해 좌측 사이드바에 앰버 골드 하이라이트의 **`📖 연동 & 사용 매뉴얼` (`/guide`)** 메뉴를 신설하고, 4단계 파이프라인과 BYOK 보안 원칙, 단축키 치트시트, FAQ가 완비된 독립 비주얼 가이드북을 구축했습니다.

---

## 2. 디자인 시스템 및 토큰 스펙 (`src/app/globals.css`)

| 역할 | 토큰 / HEX | 적용 부위 및 용도 |
|---|---|---|
| **Main Background** | `#0c0f17` (`--background`) | 전체 페이지 바탕 배경, 프로페셔널 딥 미드나잇 다크 네이비 |
| **Surface & Card** | `#131824` / `#151c2c` | 사이드바, 도구 패널, 대시보드 카드, 모달 서피스 |
| **Line & Border** | `#222d42` / `#2f3e5c` | 컴포넌트 경계선, 모눈 보더, 패널 디바이더 |
| **Primary Accent** | `#0284c7` / `#06b6d4` | 주요 CTA 버튼, 활성 탭 인디케이터, 마퀴 선택 바운딩 |
| **Secondary Accent**| `#8b5cf6` (`--accent-violet`)| Gemini AI 역공학 뱃지, 컴포넌트 그룹화 하이라이트 |
| **Guide Highlight** | `#f59e0b` (`--guide-amber`) | 사이드바 매뉴얼 메뉴 앰버 골드 뱃지 및 아이콘 |
| **Text Foreground** | `#ffffff` / `#f8fafc` | 헤더 및 주요 텍스트 타이포그래피 |
| **Text Muted** | `#94a3b8` / `#64748b` | 보조 설명, 라벨, 단축키 힌트 |

---

## 3. 페이지별 리뉴얼 상세

### 3.1 사이드바 (`src/components/layout/Sidebar.tsx`)
- **브랜드 뱃지**: `v1.10 CANVAS PRO` 시안/바이올렛 그라데이션 아이콘 및 뱃지 배치.
- **작업 워크플로우**: 1) 프로젝트 생성 ➔ 2) 캔버스 디자인 ➔ 3) 내보내기 & 공유 넘버링 스텝 뱃지 적용.
- **매뉴얼 메뉴 신설**: 유틸리티 영역에 `📖 연동 & 사용 매뉴얼` (`/guide`) 앰버 골드 메뉴 추가.
- **로그인 세션 바**: 하단에 일반 회원 테스트 계정(`buylifemall@naver.com`) 및 사용자 상태가 정돈된 텍스트와 로그아웃 버튼으로 표시.

### 3.2 대시보드 (`src/app/(workspace)/dashboard/page.tsx`)
- **웰컴 히어로 배너**: 딥 네이비 그라데이션 바탕의 `.studio-hero` 배너 적용 (`Canvas Pro 에디션 v1.10` 뱃지, [캔버스 바로 열기], [사용 매뉴얼 보기] 듀얼 CTA).
- **3대 기능 지표 카드**:
  1. `25종 UI 컴포넌트` (버튼·입력창·카드·표·모달 등)
  2. `Gemini AI 역공학` (화면 스크린샷 이미지에서 UI 구조 자동 추출)
  3. `1:1 실측 내보내기` (고해상도 PNG 캡처 & 컴포넌트/명세 JSON)
- **프로젝트 목록 그리드**: 다크 서피스 카드에 레이어 수 뱃지, 마지막 수정 일시, [캔버스 열기] 및 삭제 버튼 정돈.

### 3.3 독립 비주얼 가이드북 (`src/app/(workspace)/guide/page.tsx`)
- **가이드 히어로 헤더**: "상상을 완벽한 프로토타입으로 만드는 UI Canvas 완전 가이드" 배너.
- **4단계 표준 프로토타이핑 파이프라인**: 1) 캔버스 해상도 설정 ➔ 2) 25종 컴포넌트 드래그 ➔ 3) AI 스크린샷 역공학 ➔ 4) 실측 PNG & JSON 명세.
- **최상위 보안 원칙 (BYOK) 연동 가이드**: 회원 본인 Gemini API 키 연동 안내 및 [Google AI Studio 무료 키 발급], [API 키 등록하러 가기] 직결 버튼.
- **25종 컴포넌트 도구상자 쇼케이스 & 단축키 치트시트**: Z-Index, 그룹화, 복제, 미세 이동 단축키 완비.
- **FAQ 5종 인터랙티브 아코디언**: 자동 저장 주기, PNG 해상도 보정, 스크린샷 권장 포맷, 그룹 편집 방법, 무료 요금제 안내.

### 3.4 캔버스 에디터 (`/editor/[id]`)
- 상단 도구줄과 좌우 패널을 다크 네이비 테마로 일체화하여 캔버스 중앙 작업판의 시각적 몰입도 극대화.
- 다크/라이트 격자 모눈 캔버스 배경 토글 유지.

---

## 4. 검수 완료 내역 (Microsoft Edge 최전면 포그라운드)

- **검수 브라우저**: Microsoft Edge (`channel: 'msedge'`, `headless: false`, `--start-maximized`)
- **검수 계정**: 일반 회원 테스트 계정 `buylifemall@naver.com`
- **검수 산출물 6종**:
  1. `edge_ui_canvas_desktop_dashboard_v110.png` — 대시보드 히어로 배너 및 3대 지표 카드
  2. `edge_ui_canvas_desktop_guide_v110.png` — 비주얼 가이드북 4단계 파이프라인 및 BYOK 배너
  3. `edge_ui_canvas_desktop_guide_faq_v110.png` — 가이드북 FAQ 아코디언 인터랙션
  4. `edge_ui_canvas_desktop_settings_v110.png` — API 키 연동 설정 화면
  5. `edge_ui_canvas_desktop_editor_v110.png` — 다크 아틀리에 캔버스 에디터 화면
  6. `edge_ui_canvas_mobile_guide_v110.png` — 375px 모바일 반응형 뷰포트
- **화면 유지**: 검수 완료 후 10분간 브라우저 최전면 화면 유지 확인 완료.
