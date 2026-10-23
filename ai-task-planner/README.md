# AI 할 일·성과 관리

## 2026-10-13 최신 — v1.04

본인 Gemini 키의 등록 상태·분석 모델 저장·발급 매뉴얼, 서버 AI 성과 분석, 전체 JSON 가져오기와 CSV 내보내기를 연결했습니다. 키 등록·변경은 회원이 AIMaster 공통 API 설정에서 직접 합니다. 선택한 날짜·분류·검색 범위로 AI/CSV를 처리하고, JSON 가져오기는 미리보기·확정 후 기존 기록을 보존하며 누락 항목을 추가합니다. 설정 복원은 선택 사항입니다. 미측정 정확도·차트 척도도 수정했습니다.

[v1.04 변경·검수·운영 기록](docs/CONTINUATION_RELEASE.md). 빌드, 단위/SQL/API/공급사 모의22, 보이는 격리 Chrome30, 실제 Next 차단15 통과. **실제 회원 로그인·실제 Gemini·두 실제 기기 검수는 미완료**이며 아래 v1.03 기록과 구분합니다. [최신 작업 목록](docs/WORK_QUEUE.md)에서 재개 조건을 확인하세요.

## 다른 CLI 인수인계 · 작업 대기

2026-10-13 주인님 요청으로 후속 개발을 대기 목록에 보관했습니다. **[작업 재개 인수인계](docs/CLI_HANDOFF.md)**와 **[작업대기 목록](docs/WORK_QUEUE.md)**을 먼저 읽으세요. 현재 v1.03이며 최신 화면 개선의 회귀 검수, 본인 Gemini 키/모델/분석·매뉴얼, JSON 복원, CSV 보완·검수, 비관리자 실제 로그인·두 기기 검수가 남아 있습니다. 후속 UI에 날짜별 CSV 코드가 추가됐으므로 아래 초기 제공 범위와 구분합니다. 이번에는 문서만 정리하며 기능 개발·추가 운영 배포는 대기합니다.

2026-10-13: 참고 앱 전수 분석·개발 계획을 바탕으로 공통 틀과 핵심 기록 기능을 구현·배포했습니다. 현재 운영 버전은 **v1.03**입니다(첫 출시 v1.01).

**프로그램:** AI 할 일·성과 관리 / `ai-task-planner`, **v1.03**. [운영 주소](https://ai-task-planner.buylife.xyz). 공유 DB·공통 인증·카탈로그·기본 요금제·도메인·실사 썸네일 연결 및 프로덕션 배포 완료. FREE 없이 공통 이용 권한을 적용합니다. 실제 Chrome의 관리자 SSO·저장·타이머·완료·노트·JSON 다운로드 검수를 완료했고 비관리자 시험 계정의 실제 로그인과 두 기기 검수는 남아 있습니다.

- [v1.03 통합 대시보드 변경·검수·배포](docs/OVERVIEW_RELEASE.md)
- [구현 내용·검수 결과·운영 적용안](docs/PHASE1_IMPLEMENTATION.md)
- [새 작업 화면 검수 결과](docs/evidence/implementation/browser-results.json)

- [원본 전체 로직·옵션·결과 분석](docs/REFERENCE_ANALYSIS.md)
- [구현 순서·데이터 설계·검수 기준](docs/DEVELOPMENT_PLAN.md)
- [33개 Chrome 재현 시나리오의 관측값](docs/evidence/browser-results.json)
- [수집 파일 목록·해시·소스 지도](docs/evidence/source-manifest.json)
- [인수인계](AGENTS.md)

참고 앱: [오늘의 할 일 & 성과](https://aistudio.google.com/apps/drive/1iLQSTMxTbksuw5yv54XUgYP9q79ITS3I?showAssistant=true&showPreview=true).

Drive 연결 도구로 **20개 파일·23,446바이트 원본 소스 ZIP**을 확보하고 모든 파일을 읽었습니다. 별도 실제 Chrome에서 원본 소스를 실행해 기본 옵션·타이머·할 일·분류·수정·내보내기·모의 AI·새로고침·모바일 등 **33개 시나리오를 관측**했습니다. AI Studio 운영 미리보기 자체, 실제 Gemini 결과 및 AI Studio의 서버·프록시 내부는 미검증입니다. 재현에서는 AI SDK를 모의 응답으로 대체했고 CSS는 설치된 Tailwind 4를 사용했으므로 원본 CDN의 픽셀 단위 검증과 구분합니다.

개발 방향은 **회원별 기록 보존 → 정확한 집중 세션 → 날짜별 성과 → 본인 Gemini 키 분석**입니다. 새로고침 데이터 소실, 잘못된 일시정지, 완료 후 계속 계측, 수정 중 시간 소실, AI JSON 오류를 우선 해결합니다. 반복 일정·캘린더·외부 서비스 연동은 원본에 없으며 후속 확장 후보입니다.

현재 구현은 날짜별 할 일·분류·검색·정렬·정확한 집중/휴식 타이머·성과 수치/차트·노트 명시적 저장·휴지통/복원·JSON 다운로드입니다. AI 분석·모델 선택·키 등록 매뉴얼·JSON 복원·CSV는 후속 구현입니다. 회원 데이터는 기존 공유 DB에 저장합니다. 공통 인증 설정만 연결했으며 AI 키나 다른 프로그램의 설정은 바꾸지 않았습니다.

## 실행과 검수

```powershell
cd D:\Antigravity\AIMaster\ai-task-planner
npm ci
npm run build
npm test
npm run test:browser
npm run test:runtime
```

`test:browser`는 실제 보이는 Chrome과 격리 API를 사용합니다. `npm run dev`에 인증 우회는 없고 설정 미등록 시 준비 화면만 표시합니다. 런타임 설정 이름은 `.env.example`, 적용 SQL은 `supabase/migrations/20261013065950_planner_workspace.sql`에 있습니다. 실제 값과 API 키는 문서·로그·Git에 남기지 않습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.07 (ai-task-planner)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
