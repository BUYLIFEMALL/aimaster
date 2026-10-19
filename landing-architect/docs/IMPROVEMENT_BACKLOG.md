# AI 랜딩페이지 기획 자동화 (landing-architect) — 개선 백로그 (IMPROVEMENT_BACKLOG.md)

> **문서 번호**: `IB-20261019-69`  
> **프로그램**: 69번 AI 랜딩페이지 기획 자동화 (`landing-architect`)  
> **현재 버전**: `v1.10`  
> **최신 갱신일**: 2026-10-19  
> **상태**: 1차 디자인 리뉴얼 완료 (v1.10 플로우 위저드 스타일)

---

## 1. 완료된 작업 항목 (Done)
- [x] 플로우 위저드 스타일(Flow Wizard Style) 테마 시스템 구축 (`globals.css`)
- [x] 브랜드 뱃지 `v1.10 LANDING WIZARD` 및 사이드바 `📖 연동 & 사용 매뉴얼` 메뉴 신설
- [x] 대시보드 웰컴 히어로 배너(`.studio-hero`) 및 3대 KPI 카드(20종 템플릿, 6대 블록, 실시간 프로토타입) 탑재
- [x] 독립 비주얼 가이드북 (`/guide`) 신설: 4단계 파이프라인, BYOK 보안 안내, 6대 블록 쇼케이스, 산출물 테이블, FAQ 5종
- [x] 버전 3중 동기화 (`package.json`, `src/lib/version.ts`, Supabase DB `programs` v1.10)
- [x] 로컬 단위 테스트 12건 전원 통과 (`npm test`) 및 TypeScript 컴파일 오류 0건 무결성 확보
- [x] Next.js Turbopack 최적화 프로덕션 빌드 및 Vercel 배포 완료 (`https://landing-architect.buylife.xyz`)
- [x] Microsoft Edge 최전면 포그라운드 실세션 검수 완료 (6종 캡처 및 10분 창 유지)

---

## 2. 향후 우선순위 작업 백로그 (To-Do Backlog)

### [우선순위: P1 - 기능 고도화]
1. **섹션별 실시간 AI 스트리밍 렌더링**:
   - 기획안 생성 시 응답 지연 시간을 줄이기 위해 섹션별 스트리밍 출력 적용.
2. **원클릭 배포 연동 (Vercel / Netlify Direct Deploy)**:
   - 생성된 HTML 프로토타입을 원클릭으로 무료 호스팅 서버에 바로 배포하여 실제 라이브 URL 발급.

### [우선순위: P2 - UI/UX 개선]
1. **스플릿 뷰 에디터 (HTML Code + Live Iframe)**:
   - 프로토타입 편집 시 코드를 직접 타이핑하면 실시간으로 우측 화면에 렌더링되는 분할 화면 지원.
2. **기획 단계 스텝 인디케이터 상단 고정**:
   - `[1단계 정의] → [2단계 기획안] → [3단계 프로토타입]` 진행 바 상단 고정.

### [우선순위: P3 - 타 프로그램 연계]
1. **72번 `react-ui-showcase` (AI 웹 UI) 연동**:
   - 완성된 기획안과 Tailwind HTML을 풀스택 React/Next.js 프로젝트로 자동 변환하여 연계.
2. **68번 `ai-writing-editor` (AI 글쓰기) 연동**:
   - 기획안 카피라이팅을 글쓰기 자동화 엔진으로 교차 분석 및 정밀 튜닝.
