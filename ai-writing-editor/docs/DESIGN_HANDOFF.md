# 🎨 AI 글쓰기 에디터 자동화 (ai-writing-editor) — 디자인 리뉴얼 인수인계서

> **문서 버전**: `v1.10`  
> **작성일**: 2026-10-19  
> **작성 에이전트**: Antigravity CLI (agy)  
> **공식 서비스 URL**: https://ai-writing-editor.buylife.xyz  
> **적용 디자인 템플릿**: 포커스 스튜디오 스타일 — 글쓰기 에디터 에디션 (`Focus Studio Theme — Writing Editor Edition`)

---

## 1. 디자인 리뉴얼 개요 및 목표

### 1.1 배경 및 목적
- 기존 `ai-writing-editor`는 무채색 중심의 다소 건조한 UI로 구성되어 있어, 장시간 글을 쓰고 교정해야 하는 에디터 특유의 몰입감과 편안함이 부족했습니다.
- 상위 지침(2026-10-16 디자인 메인지침 및 템플릿화 의무)에 따라 본 프로그램을 **포커스 스튜디오 스타일(`Focus Studio Theme`)**로 전면 리뉴얼하여, 눈의 피로를 최소화하는 소프트 크림 페이퍼 캔버스와 딥 인디고 & 로열 바이올렛의 프로페셔널한 액센트 시스템을 완비했습니다.
- 가이드 및 매뉴얼 페이지 부재 문제를 해결하기 위해, 좌측 사이드바에 앰버 골드 하이라이트의 **`📖 연동 & 사용 매뉴얼` (`/guide`)** 메뉴를 신설하고 독립 비주얼 가이드북을 신규 구축했습니다.

---

## 2. 디자인 시스템 및 토큰 규격

### 2.1 컬러 팔레트 (CSS Tokens in `src/app/globals.css`)
| 역할 | 토큰 / HEX | 적용 부위 및 용도 |
|---|---|---|
| **Base Background** | `#fdfbf7` (`studio-bg`) | 전체 페이지 바탕 배경, 장시간 집필에 눈이 편안한 소프트 크림 페이퍼 |
| **Card Surface** | `#ffffff` (`studio-card`) | 콘텐츠 카드, 폼 패널, 에디터 페이퍼 바탕, 부드러운 보더(`#f1ede2`) |
| **Primary Accent** | `#4f46e5` (`studio-primary`) | 딥 인디고, 주요 액션 버튼, 브랜드 심볼, 활성 상태 네비게이션 |
| **Secondary Accent**| `#8b5cf6` (`studio-secondary`)| 로열 바이올렛, 히어로 배너 그라데이션, AI 생성 뱃지, 강조 태그 |
| **Hero Banner** | `linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)` | 대시보드 및 가이드북 최상단 웰컴 히어로 배너 |
| **Highlight Guide** | `#f59e0b` / `#d97706` | 사이드바 가이드 메뉴 앰버 골드 뱃지 및 아이콘 강조 |
| **Border & Divider**| `#e5e0d3` / `#f3f0e6` | 섬세하고 따뜻한 크림 보더 라인 |

### 2.2 타이포그래피 및 레이아웃
- 기본 폰트 스택: `Pretendard`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
- 헤더 계층:
  - Hero Title: `text-2xl font-bold tracking-tight text-white`
  - Section Title: `text-lg font-bold text-slate-800`
  - Body Text: `text-sm font-normal text-slate-600 leading-relaxed`
- 섀도우: `box-shadow: 0 4px 20px -2px rgba(30, 27, 75, 0.05), 0 2px 6px -1px rgba(30, 27, 75, 0.03)`의 입체적인 소프트 섀도우 적용.

---

## 3. 페이지별 리뉴얼 상세

### 3.1 레이아웃 및 사이드바 (`src/components/layout/Sidebar.tsx`)
- **브랜드 뱃지**: `v1.10 FOCUS STUDIO` 인디고 뱃지 배치로 프로그램 정체성 확립.
- **가이드 메뉴 신설**: 좌측 메뉴 `메뉴얼 & 연동` 그룹에 `📖 연동 & 사용 매뉴얼` (`/guide`) 추가 (앰버 골드 하이라이트 및 매뉴얼 아이콘 적용).
- **사용자 세션 바**: 하단에 일반 회원 테스트 계정(`buylifemall@naver.com`) 및 사용자 상태가 정돈된 텍스트와 로그아웃 버튼으로 표시.

### 3.2 대시보드 (`src/app/(workspace)/dashboard/page.tsx`)
- **웰컴 히어로 배너**: 딥 인디고 그라데이션 바탕의 `.studio-hero` 배너 적용 (`Focus Studio 에디션 v1.10` 뱃지, [새 글 작성하기], [사용 매뉴얼 보기] 듀얼 CTA).
- **3대 기능 지표 카드**:
  1. `9종 글쓰기 템플릿` (블로그·뉴스레터·보고서 등)
  2. `Tiptap 리치 서식` (표·이미지·글자색·형광펜)
  3. `AI 심층 분석 & 교정` (문법·표현·구조 원클릭 적용)
- **시작 패널 & 최근 문서 목록**: 퓨어 화이트 카드에 크림 보더와 부드러운 포커스 링을 적용하여 깔끔한 집필 시작 화면 완성.

### 3.3 비주얼 에디토리얼 가이드북 (`src/app/(workspace)/guide/page.tsx`)
- **가이드 히어로 헤더**: "생각을 명작으로 완성하는 AI 글쓰기 에디터 완전 가이드" 배너.
- **4단계 표준 글쓰기 파이프라인**: 1) 주제 기획 & 파라미터 ➔ 2) AI 초안 생성 ➔ 3) Tiptap 정밀 편집 ➔ 4) 서식 복사 & 원클릭 발행.
- **Tiptap 파워 툴킷 쇼케이스**: 문장별 AI 버블 툴바, 스마트 표 편집, 이미지 클라우드 업로드, 글 전체 심층 분석 제안 카드 그리드.
- **상위 보안 원칙 (BYOK) 연동 가이드**: 회원 본인 Gemini API 키 독립 연동 안내 및 [Google AI Studio 키 발급], [API 키 등록하러 가기] 직결 버튼.
- **FAQ 5종 인터랙티브 아코디언**: 자동 저장 주기, 서식 복사 원리, 기존 서식 보존 여부, 이미지 용량, 요금 정책 안내.

### 3.4 에디터 (`/editor/[id]`) 및 서식 스타일 (`src/app/we.css`)
- 소프트 크림 배경 위에 중앙 집중형 퓨어 화이트 에디터 캔버스를 안정감 있게 배치.
- 마우스 드래그 플로팅 버블 툴바 및 서식 툴바의 버튼 호버/활성 스타일을 인디고 테마에 맞춰 조화롭게 연결.

---

## 4. 검수 완료 내역 (Microsoft Edge 최전면 포그라운드)

- **검수 브라우저**: Microsoft Edge (`headless: false`, `--start-maximized`)
- **검수 계정**: 일반 회원 테스트 계정 `buylifemall@naver.com`
- **검수 산출물 6종**:
  1. `edge_ai_writing_desktop_dashboard_v110.png` — 대시보드 웰컴 배너 및 3대 지표 카드
  2. `edge_ai_writing_desktop_guide_v110.png` — 비주얼 가이드북 및 FAQ 아코디언
  3. `edge_ai_writing_desktop_documents_v110.png` — 내 문서 보관함 화면
  4. `edge_ai_writing_desktop_settings_v110.png` — API 키 연동 설정 화면
  5. `edge_ai_writing_desktop_editor_v110.png` — Tiptap 리치 에디터 화면
  6. `edge_ai_writing_mobile_guide_v110.png` — 375px 모바일 반응형 뷰포트
- **화면 유지**: 검수 완료 후 10분간 브라우저 최전면 화면 유지 확인 완료.
