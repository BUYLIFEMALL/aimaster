# 페르소나 문체 자동화 — 디자인 리뉴얼 인수인계서 (DESIGN_HANDOFF.md)

> **프로그램 공식 명칭**: 페르소나 문체 자동화 (`persona-style-studio`)  
> **공식 라이브 도메인**: https://persona-style-studio.buylife.xyz/  
> **배포 버전**: `v1.07` (2026-10-16 완료)  
> **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 문체 변환 스튜디오)**  
> **배경 테마**: 라이트(클린 슬레이트 `#f8fafc`)  
> **검수 브라우저**: Microsoft Edge 전용 (`msedge.exe`)  
> **담당 에이전트**: Antigravity(Windows) — `agy`  

---

## 1. 디자인 시스템 & 컬러 토큰

- **단일 배경색 원칙 (최상단 지침 11번 준수)**:
  - 메인 배경: `#f8fafc` (Clean Slate 50) — `globals.css`의 `:root { --background: #f8fafc; }` 및 `DashboardLayout` 컨테이너 일체화.
  - 서피스/카드: `#ffffff` (Pure White, `border-slate-200`, `shadow-xs`).
  - 텍스트: 본문 `#0f172a` (Slate 900), 설명 `#64748b` (Slate 500), 뮤트 `#94a3b8` (Slate 400).
- **브랜드 포인트 컬러**:
  - 프라이머리: `#7c3aed` (Violet 600) ~ `#4f46e5` (Indigo 600) 그라디언트.
  - 상태 배지: 에메랄드 `#10b981` (API 연동/완료), 앰버 `#f59e0b` (초고속 변환/키 안내).

---

## 2. 화면별 컴포넌트 구조 및 구현

### A. 단계별 비주얼 사용 매뉴얼 (`src/app/(dashboard)/guide/page.tsx`)
- **5단계 파이프라인 인포그래픽**:
  1. Step 1: `Gemini API 키 1초 연동` (`user_api_keys.provider = 'gemini'`)
  2. Step 2: `원문 텍스트 입력 & 언어 탐지` (한/영 자동 감지)
  3. Step 3: `8대 페르소나 프리셋 선택` (친절, 전문, 위트, 냉철, 감성 등)
  4. Step 4: `5대 문체 이퀄라이저 미세 조정` (공손도, 문장길이, 전문용어, 이모지, 스토리텔링)
  5. Step 5: `실시간 2단 스플릿 비교 & 클립보드 복사` (원문 vs 변환문 대조 및 TXT/JSON 내보내기)
- **5대 문체 파라미터 매트릭스 치트시트**:
  - 공손도(Politeness), 문장 호흡(Sentence Length), 전문성(Formality), 이모지(Emoji Density), 서사성(Narrative).
- **프로 팁 카드 2종**:
  - 안심 되돌리기 기능, 초안 복사 및 기기간 동기화 팁 제공.
- **자주 묻는 질문(FAQ) 4종 아코디언 컴포넌트**:
  - Gemini API 비용, 맞춤형 페르소나 등록, 긴 글 분량 제한, API 키 보안.
- **보안 원칙 배너**: 회원 본인 API 키 직접 연동 원칙 안내.

### B. 표준 사이드바 정돈 (`src/components/layout/Sidebar.tsx`)
- 사이드바 유틸리티 영역 최상단에 `📖 연동 & 사용 매뉴얼` 메뉴 명시 (`/guide`).
- `🔑 API키등록·플랫폼연동` (`/settings`) 메뉴 표준화.
- 대시보드 스튜디오(`/studio`), 프로젝트 보관함(`/projects`), 가이드(`/guide`), 설정(`/settings`) 간 완벽한 단일 테마 톤앤매너 유지.

---

## 3. Microsoft Edge 실세션 검수 결과 증거

| 화면 구분 | 검수 해상도 | 증거 파일명 | 검수 결과 |
|---|:---:|---|:---:|
| 가이드북 헤더 & 5단계 파이프라인 | 1440 × 1200 | `edge_persona_guide_desktop_v107.png` | 정상 (배지, 인포그래픽 정렬) |
| 문체 파라미터 치트시트 & 프로 팁 | 1440 × 1200 | `edge_persona_guide_pipeline_v107.png` | 정상 (매트릭스 표, 팁 카드) |
| FAQ 아코디언 & 보안 배너 | 1440 × 1200 | `edge_persona_guide_faq_v107.png` | 정상 (아코디언 토글, CTA 버튼) |
| 변환 스튜디오 메인 화면 | 1440 × 1200 | `edge_persona_studio_desktop_v107.png` | 정상 (단일 배경색 `#f8fafc` 일체감) |
| API 키 연동 설정 화면 | 1440 × 1200 | `edge_persona_settings_desktop_v107.png` | 정상 (연동 폼 및 단일 테마 유지) |
| 모바일 스튜디오 | 390 × 844 | `edge_persona_studio_mobile_v107.png` | 정상 (스플릿 패널 스택, 햄버거 메뉴) |
| 모바일 가이드북 | 390 × 844 | `edge_persona_guide_mobile_v107.png` | 정상 (모바일 반응형 파이프라인 가독성) |

---

## 4. 인수인계 주의사항
- 본 프로그램의 모든 페이지는 라이트 슬레이트 `#f8fafc` 배경색을 단일 유지해야 합니다.
- 문체 변환 시 호출되는 Gemini 모델은 회원 본인이 연동한 API 키(`gemini`)를 통해서만 실행됩니다.
