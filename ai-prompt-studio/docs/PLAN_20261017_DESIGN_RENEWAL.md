# AI Prompt 자동화 — 디자인 리뉴얼 및 비주얼 가이드북 개발 플랜 (PLAN_20261017_DESIGN_RENEWAL.md)

> **프로그램 공식 명칭**: AI Prompt 자동화 (`ai-prompt-studio`)  
> **공식 라이브 도메인**: https://ai-prompt.buylife.xyz/  
> **현재 버전**: `v1.04` ➔ **목표 버전**: `v1.05`  
> **적용 디자인 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 프롬프트 엔지니어링 스튜디오)**  
> **배경 테마**: 라이트(클린 슬레이트 `#f8fafc`)  
> **검수 브라우저**: Microsoft Edge 전용 (`msedge.exe`)  
> **작성 일자**: 2026-10-17  
> **담당 에이전트**: Antigravity(Windows) — `agy`  

---

## 1. 개요 및 배경

`ai-prompt-studio`는 사용자의 거친 아이디어를 분석하여 ChatGPT, Claude, Gemini 등에 바로 붙여넣어 실행할 수 있는 완성형 메타 프롬프트를 자동 생성하는 웹 스튜디오입니다.

현재 상태:
1. `src/components/PromptStudioApp.tsx`에서 배경이 `bg-neutral-50`으로 되어 있어 포커스 스튜디오 스타일 표준 단일 배경색 `#f8fafc`와 미세한 불일치가 존재합니다.
2. 사이드바의 유틸리티 메뉴가 단순 팝업 형태의 `💡 사용 가이드`(`HelpModal`)로만 연결되어 있어, 최상단 지침 7번(**"미구현 프로그램 발견 시 매뉴얼 메뉴 및 단계별 사용 매뉴얼 추가 기본 의무"**)을 충족하지 못하고 있습니다.
3. 단계별 파이프라인 인포그래픽, 프롬프트 엔지니어링 프레임워크 치트시트, FAQ 아코디언, 본인 키 연동 보안 원칙 배너를 갖춘 전면 비주얼 가이드북 화면 및 `/guide` 라우트 구축이 필수적입니다.

---

## 2. 핵심 작업 범위 및 구현 계획

### A. 전체 화면 단일 배경색 및 일관된 테마 스타일 준수 (최상단 지침 11번 준수)
- 메인 배경: `#f8fafc` (Clean Slate 50) 통일.
- 카드/패널: `#ffffff` (Pure White, `border-slate-200`, `shadow-xs`).
- 메인 브랜드 포인트: 바이올렛/인디고 그라디언트 (`#7c3aed` ~ `#4f46e5`).
- `PromptStudioApp.tsx` 컨테이너의 배경을 `bg-[#f8fafc]`로 고정.

### B. 📖 연동 & 사용 매뉴얼 (`/guide` & `currentTab = 'guide'`) 전면 신설 (최상단 지침 7번 준수)
- **5단계 파이프라인 인포그래픽**:
  1. Step 1: `Gemini API 키 1초 연동` (`user_api_keys.provider = 'gemini'`)
  2. Step 2: `5대 프로 모드 & 프리셋 선택` (RTSC, CoT, Few-Shot, System-Persona, Dynamic-Variable)
  3. Step 3: `실시간 AI 3단 스마트 어시스턴트` (Role, Task, Structure 추천)
  4. Step 4: `메타 프롬프트 원클릭 생성 & 검수` (Gemini 2.5 Flash 호출)
  5. Step 5: `클립보드 복사 & 실전 AI 실행` (ChatGPT, Claude, Gemini 즉시 붙여넣기)
- **5대 프롬프트 프레임워크 매트릭스 치트시트**:
  - RTSC(Role-Task-Structure-Chain), CoT(Chain-of-Thought), Few-Shot(예시 기반), Persona(전문가 페르소나), Dynamic(동적 변수화).
- **실전 프롬프트 모범 팁 카드 2종**:
  - 역질문 기법(Reverse Prompting), 출력 포맷 강제화(Markdown/JSON).
- **FAQ 아코디언 컴포넌트 4종**:
  - API 키 비용 및 무료 발급, 생성 속도, 프롬프트 호환성, 저장 및 보안.
- **보안 원칙 배너**: 회원 본인 Gemini API 키 직접 연동 원칙 안내.

### C. 사이드바 네비게이션 표준 정돈 (`src/components/Sidebar.tsx`)
- 사이드바 유틸리티 영역 최상단에 `📖 연동 & 사용 매뉴얼` 메뉴 추가 (`currentTab === 'guide'`).
- `🔑 API키등록·플랫폼연동` 메뉴 위치 및 클릭 이벤트 표준 유지.

### D. 독립 URL 라우팅 (`src/app/guide/page.tsx`)
- `/guide`로 직접 브라우저 접속 시에도 비주얼 가이드북을 온전히 열람할 수 있도록 독립 라우트 추가.

---

## 3. 검증 및 배포 절차

1. 버전 판올림: `v1.04` ➔ `v1.05` (`src/lib/version.ts`, `package.json`, Supabase 공유 DB `programs.version = 'v1.05'`).
2. Turbopack 로컬 빌드 검증: `npm run build` 오류 없음 확인.
3. Vercel 프로덕션 배포: `vercel deploy --prod --yes --scope buylife` (`https://ai-prompt.buylife.xyz/`).
4. Microsoft Edge (`msedge.exe`) 전용 실세션 검수 (데스크톱 1440px, 모바일 390px 화면 캡처 및 검증).
5. 인수인계 문서 및 상태 현황판 갱신, Git 커밋 및 푸시.
