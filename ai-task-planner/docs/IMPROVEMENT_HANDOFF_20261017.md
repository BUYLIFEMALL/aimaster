# AI 할 일·성과 관리 (ai-task-planner) 개선사항 인수인계서 (2026-10-17)

- **작성일**: 2026-10-17
- **작성자**: Antigravity (agy)
- **작업 대상**: `ai-task-planner/` (https://ai-task-planner.buylife.xyz)
- **버전**: `v1.06` ➔ `v1.07`
- **적용 템플릿**: 스마트 매트릭스 스타일 (Smart Matrix Style, 클린 슬레이트 `#f8fafc`, 화이트 카드, 인디고 포인트)

---

## 1. 추진 배경 및 목표
- 루트 최상단 지침 11번 준수: 전체 페이지 단일 배경색(`#f8fafc`) 및 일관된 테마 스타일 구축
- 루트 최상단 지침 7번 준수: 미구현된 비주얼 매뉴얼 메뉴 및 5단계 파이프라인 가이드북 구축
- 최상위 절대 불변 규칙 준수: 회원 본인 Gemini API 키 연동 보안 원칙 배너 포함

---

## 2. 작업 내용 요약
1. **버전 판올림**: `v1.06` ➔ `v1.07` (`version.ts`, `package.json`, Supabase `programs` DB)
2. **테마 일관성 정비**: 전체 배경 `#f8fafc`, 카드 `#ffffff`, 테두리 `#e2e8f0`, 포인트 `#4f46e5`
3. **사이드바 메뉴 정비**: `📖 연동 & 사용 매뉴얼` 및 `🔑 API키등록·플랫폼연동` 표준 명칭화
4. **비주얼 가이드북 컴포넌트 신설**: `src/components/TaskPlannerGuideView.tsx` (5단계 파이프라인, 4대 골든 팁, FAQ 4종, 보안 배너)
5. **검수**: Microsoft Edge 전용 실세션 검수 (1440px / 390px)

---

## 3. 다른 CLI 인수인계 사항
- 본 프로그램은 Next.js 16 App Router 기반이며, 회원별 작업 공간은 Supabase DB JSONB 한 행과 revision 원자적 락으로 관리됩니다.
- 타이머 로직과 기존 데이터 구조(`workspaceSchema`)를 100% 보존해야 합니다.
