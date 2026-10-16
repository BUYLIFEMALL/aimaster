# AI Prompt 자동화 — 개선사항 인수인계서 (IMPROVEMENT_HANDOFF_20261017.md)

> **프로그램 공식 명칭**: AI Prompt 자동화 (`ai-prompt-studio`)  
> **공식 라이브 도메인**: https://ai-prompt.buylife.xyz/  
> **작업 일시**: 2026-10-17  
> **작성자**: Antigravity(Windows) — `agy`  
> **관련 문서**: [`PLAN_20261017_DESIGN_RENEWAL.md`](PLAN_20261017_DESIGN_RENEWAL.md), [`IMPROVEMENTS.md`](IMPROVEMENTS.md)  

---

## 1. 인수인계 개요

본 문서는 `ai-prompt-studio` 프로그램의 포커스 스튜디오 디자인 리뉴얼 및 비주얼 가이드북 전면 신설(v1.05) 작업을 다른 CLI(Codex, Claude Code)가 언제든 이어받아 검증하거나 후속 개발할 수 있도록 인수인계 내용을 기록한 문서입니다.

---

## 2. 작업 상세 및 변경 파일

1. **단일 배경색 및 일관된 테마 적용 (최상단 지침 11번)**:
   - `src/app/globals.css`: `:root { --background: #f8fafc; --foreground: #0f172a; }` 표준 유지.
   - `src/components/PromptStudioApp.tsx`: 최상위 컨테이너 `min-h-screen bg-[#f8fafc]` 적용으로 모드 선택, 빌더, 결과, 가이드북 전체 탭에서 단일 배경색 유지.

2. **비주얼 가이드북 컴포넌트 신설 (`src/components/PromptGuideView.tsx`)**:
   - 5단계 파이프라인 인포그래픽 (Step 1~5)
   - 5대 프롬프트 프레임워크 매트릭스 치트시트
   - 실전 프롬프트 모범 팁 카드 2종
   - FAQ 4종 아코디언 컴포넌트
   - 회원 본인 키 직접 연동 보안 원칙 배너

3. **사이드바 메뉴 표준화 (`src/components/Sidebar.tsx`)**:
   - 유틸리티 영역에 `📖 연동 & 사용 매뉴얼` 메뉴 추가 (`currentTab === 'guide'`).

4. **독립 URL 라우트 (`src/app/guide/page.tsx`)**:
   - `/guide` 직접 브라우저 URL 접근 지원.

---

## 3. 남은 후속 과제 및 다음 첫 단계
- 완성된 프롬프트를 원클릭으로 Claude XML 태그 형식 또는 ChatGPT 형식으로 변경하는 포맷터 토글 기능.
- 프롬프트 템플릿 즐겨찾기 저장소 기능.
