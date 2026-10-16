# AI Prompt 자동화 — 디자인 리뉴얼 인수인계서 (DESIGN_HANDOFF.md)

> **프로그램 공식 명칭**: AI Prompt 자동화 (`ai-prompt-studio`)  
> **공식 라이브 도메인**: https://ai-prompt.buylife.xyz/  
> **배포 버전**: `v1.05` (2026-10-17 완료)  
> **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 엔지니어링 스튜디오)**  
> **배경 테마**: 라이트(클린 슬레이트 `#f8fafc`)  
> **검수 브라우저**: Microsoft Edge 전용 (`msedge.exe`)  
> **담당 에이전트**: Antigravity(Windows) — `agy`  

---

## 1. 디자인 시스템 & 컬러 토큰

- **단일 배경색 원칙 (최상단 지침 11번 준수)**:
  - 메인 배경: `#f8fafc` (Clean Slate 50) — `globals.css`의 `:root { --background: #f8fafc; }` 및 `PromptStudioApp.tsx` 컨테이너 일체화.
  - 서피스/카드: `#ffffff` (Pure White, `border-slate-200`, `shadow-2xs`).
  - 텍스트: 본문 `#0f172a` (Slate 900), 서브텍스트 `#64748b` (Slate 500), 뮤트 `#94a3b8` (Slate 400).
- **브랜드 포인트 컬러**:
  - 프라이머리: `#7c3aed` (Violet 600) ~ `#4f46e5` (Indigo 600) 그라디언트.
  - 상태 강조: 에메랄드 `#10b981` (API 연동/완료), 앰버 `#f59e0b` (빠른 팁/모달 안내).

---

## 2. 화면별 컴포넌트 구조 및 구현

### A. 단계별 비주얼 사용 매뉴얼 (`src/components/PromptGuideView.tsx` & `/guide`)
- **5단계 파이프라인 인포그래픽**:
  1. Step 1: `Gemini API 키 1초 연동` (`user_api_keys.provider = 'gemini'`)
  2. Step 2: `5대 프로 모드 & 프리셋 선택` (RTSC, CoT, Few-Shot, Persona, Dynamic)
  3. Step 3: `실시간 AI 3단 스마트 어시스턴트` (Role, Task, Structure 실시간 자동 제안)
  4. Step 4: `메타 프롬프트 원클릭 생성 & 검수` (환각 방지, 2026년 기준 연도 주입)
  5. Step 5: `클립보드 복사 & 실전 AI 실행` (ChatGPT, Claude, Gemini 즉시 투입)
- **5대 프롬프트 프레임워크 매트릭스 치트시트**:
  - RTSC(Role-Task-Structure-Chain), CoT(Chain-of-Thought), Few-Shot, Persona, Dynamic Variable.
- **프로 팁 카드 2종**:
  - 역질문 기법(Reverse Prompting), 엄격한 출력 서식 제약(Format Enforcement).
- **자주 묻는 질문(FAQ) 4종 아코디언 컴포넌트**:
  - Gemini API 무료 발급처, 멀티 LLM 호환성, 5대 모드 선택 가이드, 키 보안 및 데이터 격리.
- **보안 원칙 배너**: 회원 본인 API 키 직접 연동 원칙 안내.

### B. 표준 사이드바 정돈 (`src/components/Sidebar.tsx`)
- 사이드바 유틸리티 영역 최상단에 `📖 연동 & 사용 매뉴얼` 메뉴 탑재 (`currentTab === 'guide'`).
- `🔑 API키등록·플랫폼연동` (`onOpenApiKey`) 메뉴 표준화.
- 모드 선택, 정밀 엔지니어링 빌더, 메타 프롬프트 결과, 가이드북 전체 탭 간 자연스러운 화면 전환.

### C. 독립 URL 라우팅 (`src/app/guide/page.tsx`)
- `/guide`로 직접 접속 시 `initialTab="guide"`를 주입하여 비주얼 가이드북 페이지를 즉시 렌더링.

---

## 3. Microsoft Edge 실세션 검수 결과 증거

| 화면 구분 | 검수 해상도 | 증거 파일명 | 검수 결과 |
|---|:---:|---|:---:|
| 가이드북 헤더 & 5단계 파이프라인 | 1440 × 1200 | `edge_prompt_studio_guide_desktop_v105.png` | 정상 (배지, 인포그래픽 정렬) |
| 프레임워크 매트릭스 & 프로 팁 | 1440 × 1200 | `edge_prompt_studio_guide_pipeline_v105.png` | 정상 (매트릭스 표, 팁 카드) |
| FAQ 아코디언 & 보안 배너 | 1440 × 1200 | `edge_prompt_studio_guide_faq_v105.png` | 정상 (아코디언 토글, CTA 버튼) |
| 모드 선택 스튜디오 메인 화면 | 1440 × 1200 | `edge_prompt_studio_mode_desktop_v105.png` | 정상 (단일 배경색 `#f8fafc` 일체감) |
| 엔지니어링 빌더 화면 | 1440 × 1200 | `edge_prompt_studio_build_desktop_v105.png` | 정상 (단일 테마 일체감) |
| 모바일 스튜디오 홈 | 390 × 844 | `edge_prompt_studio_mobile_home_v105.png` | 정상 (햄버거 메뉴, 반응형 스택) |
| 모바일 가이드북 | 390 × 844 | `edge_prompt_studio_mobile_guide_v105.png` | 정상 (모바일 반응형 파이프라인 가독성) |

---

## 4. 인수인계 주의사항
- 본 프로그램의 모든 페이지는 라이트 슬레이트 `#f8fafc` 배경색을 단일 유지해야 합니다.
- 프롬프트 생성 시 호출되는 Gemini 모델은 회원 본인이 연동한 API 키(`gemini`)를 통해서만 실행됩니다.
