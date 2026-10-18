# AI 할 일·성과 관리 (ai-task-planner) 개선사항 원장 (IMPROVEMENTS.md)

작성일: 2026-10-17 / 작성자: Antigravity (agy)

## 개선 과제 목록

| 번호 | 구분 | 과제명 | 우선순위 | 상태 | 관련 파일 | 설명 |
|---|---|---|---|---|---|---|
| #1 | UI/UX | 전체 페이지 단일 클린 슬레이트(#f8fafc) 배경 통일 | 높음 | 진행중 | `src/app/globals.css`, `overview.css` | 전 화면 단일 배경 및 카드 서피스 일체화로 몰입감 향상 |
| #2 | 기능 | 5단계 파이프라인 비주얼 가이드북 신설 | 높음 | 진행중 | `src/components/TaskPlannerGuideView.tsx`, `Planner.tsx` | 텍스트 목록 대신 5단계 파이프라인, 골든 팁, FAQ 아코디언, 보안 배너 비주얼화 |
| #3 | UI/UX | 사이드바 메뉴 명칭 표준화 및 가독성 개선 | 보통 | 진행중 | `src/components/Sidebar.tsx` | `📖 연동 & 사용 매뉴얼` 표준 메뉴 배치 및 브랜드 뱃지 스타일링 |
| #4 | 기능 | 독립 `/guide` 라우트 브라우저 직접 접근 지원 | 보통 | 진행중 | `src/app/(workspace)/[screen]/page.tsx` | 주소창에 `/guide` 입력 시 즉시 비주얼 매뉴얼 화면 렌더링 |
| #5 | 기능 | 뽀모도로 타이머 사운드 알림 옵션 | 낮음 | 제안 | `src/components/Planner.tsx` | 집중 시간 및 휴식 시간 종료 시 부드러운 차임벨 사운드 효과 |
| #6 | 데이터 | 주간/월간 누적 성과 리포트 내보내기 | 낮음 | 제안 | `src/lib/planner/metrics.ts` | 1일 단위 집계를 넘어 7일/30일 추세선 차트 및 PDF 리포트 지원 |

## 2026-10-19 Claude Code(윈도우) — 브라우저 테스트 판정으로 찾은 화면 회귀 (v1.08 처리)
| # | 구분 | 내용 | 우선순위 | 상태 | 관련 파일 |
|---|---|---|---|---|---|
| #7 | UI | 시간대별 차트 눈금(4·0)이 막대 꼭대기·바닥과 30px·10px 어긋남 | 중간 | **처리(v1.08)** | `src/app/overview.css` `.chart-grid-lines` |
| #8 | UI | 계정 영역 `margin-top: auto`로 큰 화면에서 메뉴와 떨어짐(플랫폼 규칙 위반) | 중간 | **처리(v1.08)** | `src/app/globals.css` `.sidebar-account` |
| #9 | 테스트 | 입력 패널 제목 변경(「새 할 일」→「할 일 추가」) 기대값 갱신 | 낮음 | **처리(v1.08)** | `tests/browser.mjs` |
| #10 | 기능 | 차트 눈금을 고정 여백 대신 막대 칸과 같은 격자로 묶기(글자 크기가 바뀌어도 자동 정렬) | 낮음 | 제안 | `Overview.tsx` `ChartPanel` |
