# AI 할 일·성과 관리

2026-10-13: 참고 앱 전수 분석·개발 계획을 바탕으로 공통 틀과 핵심 기록 기능을 구현했습니다. 첫 출시 버전은 **v1.01**입니다.

**프로그램:** AI 할 일·성과 관리 / `ai-task-planner`, **v1.01**. [운영 주소](https://ai-task-planner.buylife.xyz). 주인님의 일괄 진행 지시에 따라 공유 DB·공통 인증 환경변수·카탈로그·기본 요금제·도메인을 연결했습니다. FREE 없이 공통 이용 권한을 적용합니다. 배포 후 검수는 구현 문서에 기록합니다.

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
