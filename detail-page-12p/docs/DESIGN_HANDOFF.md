# AI 12단 상세페이지 자동화 — 디자인 리뉴얼 인수인계서 (DESIGN_HANDOFF.md)

- **작업 일시**: 2026-10-16
- **작업자**: Antigravity CLI (agy, Windows PC)
- **적용 버전**: `v1.04` (이전 `v1.03`)
- **디자인 템플릿 고유 명칭**: **포커스 스튜디오 스타일 (Focus Studio Style)**
  - 서브 카테고리: 이커머스 상세페이지 스튜디오 (Clean Studio Light Slate)
- **실제 서비스 배포 URL**: [https://detail-12p.buylife.xyz](https://detail-12p.buylife.xyz)

---

## 1. 디자인 시스템 토큰 & 테마 원칙

최상단 지침 11번(**"프로그램 내 전체 페이지 단일 배경색 및 일관된 테마 스타일 준수 의무"**)을 철저히 준수하여 `tab=input`, `tab=studio`, `tab=history`, `tab=guide`(`/guide`) 전 화면을 단 하나의 동일한 클린 스튜디오 라이트 슬레이트 배경색과 포커스 스튜디오 스타일로 일치시켰습니다.

| 요소 | 컬러 토큰 / Tailwind 클래스 | 용도 및 설명 |
| :--- | :--- | :--- |
| **전체 배경색 (단일 배경)** | `#f8fafc` (`bg-[#f8fafc]`) | 클린 스튜디오 라이트 슬레이트 베이스 |
| **사이드바 배경** | `#ffffff` (`bg-white border-slate-200`) | 화이트 서피스 + 12px 간격 계정 프로필 밀착 |
| **카드 서피스** | `#ffffff` (`bg-white border-slate-200 shadow-sm`) | 입력 카드, 씬 카드, 보관함 카드 베이스 |
| **메인 포인트 컬러** | `#2563eb` ~ `#4f46e5` (`from-blue-600 to-indigo-600`) | 주요 CTA 버튼, 번호 배지, 활성 메뉴 하이라이트 |
| **서브 포인트 컬러** | `#10b981` (에메랄드) / `#f59e0b` (앰버) | 키 등록 상태 배지, 쿠팡 로켓 배지, 알림 |
| **입력 필드** | `bg-white border-slate-200 text-slate-900 focus:border-indigo-500` | 이커머스 폼 입력 가독성 극대화 |
| **텍스트 대비** | `text-slate-900` (제목), `text-slate-700` (본문), `text-slate-500` (메타) | 라이트 테마 표준 고대비 텍스트 |

---

## 2. 화면별 리뉴얼 내역

### 1) 📖 연동 & 사용 매뉴얼 (`/guide`, `tab=guide`) 전면 신설
- 사이드바 유틸리티 영역에 `📖 연동 & 사용 매뉴얼` 메뉴 탑재 및 블루 하이라이트 배지 적용.
- **5단계 상세페이지 제작 파이프라인 (Step-by-Step)**:
  - STEP 01: 본인 Google Gemini API 키 연동 (보안 및 플랫폼 가이드 연계)
  - STEP 02: 제품 기본정보 & 1초 스마트 스펙 자동검색 (사양서 파싱 지원)
  - STEP 03: 쿠팡 12단 · 네이버 9단 AI 전체 카피 기획 (2026년 기준 시점 및 월별 계절감 보정)
  - STEP 04: Nano Banana 멀티모달 상업용 씬별 렌더링 (SVG 벡터 프리셋 및 AI 이미지 생성)
  - STEP 05: 860px 쿠팡 표준 세로 통상세페이지 자동 합성 & 다운로드 (HTML5 Canvas 렌더링)
- **쿠팡 12단 씬 표준 구성표 (12-Section Architecture)**: 12개 씬별 역할 및 소구점 안내.
- **이커머스 플랫폼별 권장 규격표**: 쿠팡 860px 표준, 네이버 스마트스토어, 오픈마켓 권장 규격 안내.
- **자주 묻는 질문(FAQ) 4종**: 아코디언 인터랙션 지원.
- 직접 라우트 접근 지원: `src/app/guide/page.tsx` 신설.

### 2) 📝 1단계: 제품 정보 및 사양 입력 (`tab=input`)
- 단일 배경색 `bg-[#f8fafc]` 및 화이트 카드 서피스 적용.
- 쿠팡(12단+) / 스마트스토어(9단+) 규격 선택 탭.
- Nano Banana 표준 및 Nano Banana 2 Pro 엔진 선택 카드.
- 1초 스펙 자동검색 버튼 및 가격/할인율 실시간 자동 계산 지원.

### 3) 🎬 2단계: 12단 상세 스튜디오 (`tab=studio`)
- 12단 시퀀스 씬 리스트 카드와 우측 스마트폰 라이브 프리뷰어 듀얼 레이아웃.
- 각 씬별 배지, 제목, 서브 카피 실시간 인라인 편집 지원.
- 상단 860px 통상세 이미지 자동 합성 다운로드 버튼 탑재.

### 4) 📁 3단계: 보관함 & 백업 동기화 (`tab=history`)
- 프로젝트 카드 목록, 썸네일 미리보기, 렌더링 진행률 뱃지.
- JSON 백업 내보내기/가져오기 기능 및 단일 배경색 일체화.

---

## 3. Microsoft Edge 전용 실세션 검증 결과

최상단 지침에 따라 **Microsoft Edge 전용 (`msedge.exe`)**으로 일반 회원 테스트 계정(`buylifemall@naver.com`) 로그인 세션을 통해 검증을 완료하였습니다.

- **데스크톱 검수 (1440px)**:
  - `edge_detail12p_guide_desktop_v104.png`: 가이드북 헤더 & 5단계 파이프라인
  - `edge_detail12p_guide_pipeline_v104.png`: 12단 씬 구성표
  - `edge_detail12p_guide_faq_v104.png`: FAQ 아코디언 및 하단 CTA
  - `edge_detail12p_input_desktop_v104.png`: 1단계 입력 폼 화이트 카드 & `#f8fafc` 일체감
  - `edge_detail12p_studio_desktop_v104.png`: 2단계 스튜디오 씬 카드 & 스마트폰 뷰어 일체감
  - `edge_detail12p_history_desktop_v104.png`: 3단계 보관함 프로젝트 카드 일체감
- **모바일 반응형 검수 (390px)**:
  - `edge_detail12p_input_mobile_v104.png`: 모바일 1열 카드 배치 및 터치 타깃 검증
  - `edge_detail12p_guide_mobile_v104.png`: 모바일 가이드북 폰트 가독성 및 아코디언 반응 검증

---

## 4. 버전 및 배포 정보
- **버전**: `v1.04` (`src/lib/version.ts`, `package.json`, Supabase 공유 DB `programs.version = 'v1.04'`)
- **Next.js Turbopack 빌드**: 통과 (`npm run build`)
- **Vercel 프로덕션 배포**: 완료 (`https://detail-12p.buylife.xyz`)
