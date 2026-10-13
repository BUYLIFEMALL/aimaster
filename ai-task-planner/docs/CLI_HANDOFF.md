# AI 할 일·성과 관리 — 작업 재개 인수인계

## 2026-10-13 재개 이후 최신 상태 — v1.04

주인님이 “남은 작업 이어가줘”로 대기를 해제했습니다. W01~W05 코드를 구현하고 빌드·단위/SQL/API/공급사 모의22·보이는 격리 Chrome30·실제 Next 차단15 검수를 완료했습니다. 상세와 운영 결과는 [CONTINUATION_RELEASE](CONTINUATION_RELEASE.md), 남은 실검수는 [WORK_QUEUE](WORK_QUEUE.md)를 먼저 보세요. 아래 v1.03 작성 시점의 ‘구현 대기’·미커밋 파일 기록은 과거 이력이며 현재 Git를 기준으로 확인합니다. 기존 다른 CLI의 수정·인덱스는 포함하지 않습니다.

새 코드 지도: `src/lib/planner/ai.ts`·`gemini.ts`·`api.ts`, `/api/analysis`·`/api/keys`, `src/lib/apiKeys.ts`, `AnalysisPanel.tsx`·`AiSettings.tsx`, `backup.ts`·`BackupImport.tsx`·`csv.ts`. JSONB 선택 필드 `settings.aiModel`, 원자적 `backup.merge` 명령. 키 API는 등록 여부만 반환하며 등록·변경은 기존 메인 공통 화면을 사용합니다. 백업은 기본적으로 기존 설정/노트를 유지하며 설정 적용은 선택 사항입니다.

실제 일반 회원 로그인·본인 Gemini 실제 호출·두 실제 기기는 미검수입니다. Chrome 초점 복원 실패, Chrome 실행 자동검토 차단, Aside 미실행으로 이를 격리 검수로 대신 완료 처리하지 않았습니다. 비밀번호·API 키 입력/변경은 회원이 직접 합니다.

작성: 2026-10-13, Codex. **주인님 요청으로 남은 개발과 검수는 작업대기 목록에 보관했습니다.** 재개 지시 전에는 아래 미완료 기능을 자동 구현하지 않습니다.

## 1. 먼저 읽을 문서

1. 루트 [AGENTS.md](../../AGENTS.md)·[HANDOFF](../../docs/HANDOFF.md).
2. [본인 계정·API 최상위 규칙](../../docs/TOP_RULE_PERSONAL_ACCOUNT_API.md), [에러 기록](../../docs/ERROR_LESSONS.md), [공통 자율 개발 절차](../../docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md).
3. 프로그램 [AGENTS.md](../AGENTS.md)·[README](../README.md), [작업대기 목록](WORK_QUEUE.md).
4. [통합 대시보드 검수 기록](OVERVIEW_RELEASE.md), [핵심 구현·운영 기록](PHASE1_IMPLEMENTATION.md), [원본 분석](REFERENCE_ANALYSIS.md)·[개발 계획](DEVELOPMENT_PLAN.md).

초기 개발 계획의7테이블·노트 자동 저장은 제안 기록입니다. 실제 저장 구조와 제공 기능은 이 인수인계·구현 기록·최신 코드를 기준으로 확인합니다.

## 2. 현재 환경

| 항목 | 상태 |
|---|---|
| 프로그램 | AI 할 일·성과 관리, `ai-task-planner` |
| 운영 버전 | v1.03. 코드 `src/lib/version.ts`, 공용 DB `programs.version`; package1.3.0 |
| 작업 폴더 | `D:\Antigravity\AIMaster\ai-task-planner` — AIMaster 저장소 내부 독립 Next.js 프로젝트 |
| 운영 주소 | https://ai-task-planner.buylife.xyz/dashboard |
| 메인 상세 | https://www.buylife.xyz/programs/ai-task-planner |
| Vercel | `buylife/ai-task-planner`, 프로젝트 `prj_63n8QA2nI24d6lzntGOgna8krucy` |
| 공유 Supabase | `esgxyikcnnvmlhygjkth` |
| 카탈로그 | 프로그램ID `48732172-d5ef-4db9-bbb6-63413183d5a5`, Tools·NEW·무료 배지 없음, 최소 일반·공통 이용 권한 적용 |
| 기본 요금제 | 1/2/3개월, 10,000/20,000/30,000원; 기존 VIP 전체 프로그램 정책 연결 |
| 저장 | `task_planner_workspaces.payload` 회원별 JSONB 한 행 + revision + 최근200 command ID |
| 인증 | 기존 AIMaster SSO·`.buylife.xyz` 쿠키·공용 회원 권한·핸드폰 정책. 별도 회원가입/인증 우회 없음 |
| AI | 본인 Gemini 연결/분석 구현 대기. 현재 준비 안내만 있으며 운영자 공용 키는 사용하지 않음 |

## 3. 완료된 기능과 변경 이력

- 회원별 날짜/분류/검색/정렬, 할 일 추가·메타데이터 수정·완료/취소·휴지통/복원·분류 관리.
- 집중/짧은 휴식/긴 휴식, deadline 기반 정지·재개·정산, 완료/휴지통 이동과 집중 세션 종료를 같은 서버 명령으로 처리.
- 한국 시간 기준 성과 집계·시간대 차트, 날짜별 노트의 명시적 저장과 서버 확인, 전체 JSON 다운로드.
- 흰색 통합 대시보드: 상단 타이머 / 왼쪽 목록 / 가운데 작성·성과 / 오른쪽 차트·노트. 대시보드에서 추가·수정·집중 시작 시 화면 이동 없음. 기존 상세 단계 화면 유지.
- 운영 DB·공통 인증 설정·메인 카탈로그·요금제·도메인·한국인 실사 썸네일 연결 완료.

| 커밋 | 내용 |
|---|---|
| `f07031b5`, `7fae5ee0` | 핵심 기록 구현·운영 연결 |
| `7034debf`, `9f524dee` | v1.02 창 초점 재조회/타이머 조작 수정·운영 증거 |
| `56951952`, `4fea50c4` | v1.03 통합 대시보드·운영 Chrome/DB 검수 기록 |
| `4acdce4d` | 다른 CLI의 후속 v1.03 화면/버튼/태그/완료율 개선 및 날짜별 CSV 코드. 이번 인수인계 작성 시 확인한 최신 커밋 |

`4acdce4d` 이후 로컬 `TaskEditor.tsx` 제출 버튼의 접근성 이름 변경이 미커밋 상태였고, 문서 작성 중 `Overview.tsx`·`Planner.tsx`에도 추가 변경이 생겼습니다. 다른 CLI가 계속 작업하므로 최신 코드를 다시 확인합니다. 이 변경을 임의로 되돌리거나 문서 커밋에 포함하지 않습니다.

## 4. 검수·운영 증거의 범위

**Codex가 확인한 통합 화면 검수 기준은 `56951952` 시점**입니다. 로컬 빌드 정상, 단위/SQL14개·보이는 격리 Chrome24개·실제 Next 설정 미등록 차단12개 통과. [검사 JSON](evidence/overview/browser-results.json)과 [운영 대조 기록](evidence/overview/live-results.json)에 근거가 있습니다.

당시 프로덕션은 `dpl_CpkjDmcngbNdqkRiu7psMjPvxB4B` READY, https://ai-task-planner-72lggweik-buylife.vercel.app 이었습니다. **이는 이전 검증 배포 ID입니다.** 다른 CLI의 후속 배포 기록이 있으므로 재개 때 현재 도메인에 연결된 배포·코드를 다시 확인합니다. 이 문서 작성 중 최신 후속 UI의 배포 ID·브라우저 검수는 새로 확인하지 않았습니다.

운영 실제 Chrome은 관리자 `buylifemall@gmail.com`이었습니다. 통합 화면에서 추가→집중→정지24:43→분류 필터→인라인 수정→완료→새로고침을 확인하고 DB revision11과 대조했습니다. 새 세션 ended, 집중 구간17,174ms; 이전 기록도 유지됐습니다. 익명 로그인200·보호 화면307·API401·private/no-store, 메인 목록/상세와 썸네일도 확인했습니다.

관리자 본인 검수 기록은 삭제하지 않았습니다: `운영 검수 20261013-1718 저장·타이머`, `통합 화면 운영 검수 v1.03 완료`. 노트도 기존 본인 기록 그대로 보존했습니다. 최신 값은 재개 시 읽기 조회로 확인합니다.

비관리자 시험 계정 `buylifemall@naver.com`은 당시 VIP·비관리자·권한1건을 DB에서 확인했지만 해당 회원의 실제 로그인 검수는 미완료입니다. 두 실제 기기·실제 Gemini 호출도 미검증입니다. 최신 화면의 회귀 검사와 미완료 기능은 [WORK_QUEUE](WORK_QUEUE.md)에 구분했습니다.

## 5. 코드·운영 지도

| 경로 | 역할 |
|---|---|
| `src/components/Planner.tsx` | 화면/필터·회원 snapshot·저장 명령·revision·초점 재조회·노트·백업 |
| `src/components/Overview.tsx`, `src/app/overview.css` | 통합 화면·타이머 툴바·목록·성과·차트·노트·준비 안내·CSV |
| `src/components/TaskEditor.tsx`, `Sidebar.tsx` | 작성/수정·표준 메뉴/계정 |
| `src/lib/planner/model.ts`, `engine.ts`, `metrics.ts` | Zod 입력/참조 검증·상태 전이·실측/한국 자정/범위 집계 |
| `src/lib/planner/repository.ts`, `src/app/api/workspace/route.ts` | 프로그램 권한·소유자 제한·CSRF·서버 저장/RPC·오류 응답 |
| `src/lib/auth.ts`, `access.ts`, `programAccess.ts`, `supabase/*` | 공용 회원·이용 권한·SSO |
| `supabase/migrations/20261013065950_planner_workspace.sql` | 적용된 테이블·RLS·service-only security-invoker RPC |
| `supabase/migrations/20261013075903_planner_catalog.sql`, `20261013093000_planner_overview_v103.sql` | 기존 카탈로그 등록/버전 갱신 근거. 이미 적용된 SQL을 무조건 재실행하지 않음 |
| `docs/THUMBNAIL.md`, `public/ai-task-planner-thumbnail.png` | 생성 프롬프트·실사 썸네일 |
| `tests/*.test.mjs`, `tests/browser.mjs`, `tests/runtime.mjs` | 단위/SQL·보이는 격리 Chrome·실제 Next 차단 검수 |

운영 테이블 열은 `payload`이며 `workspace`가 아닙니다. 일반 회원은 테이블/RPC를 직접 쓰지 못하며, 인증과 프로그램 이용 권한을 통과한 서버가 항상 로그인 회원 user_id로 한정합니다. 회원당8MiB·할 일5,000개·세션20,000개 제한을 보존합니다.

## 6. 재개 절차

```powershell
cd D:\Antigravity\AIMaster
git status --short
git log --oneline -10
git fetch origin master
git rev-list --left-right --count HEAD...origin/master
git diff --cached --name-only
```

먼저 [WORK_QUEUE](WORK_QUEUE.md)의 W01을 확인합니다. 같은 로컬에 여러 CLI가 있고 인덱스도 공유합니다. 이번 작성 시 다른 프로젝트의 스테이징이 있었으므로 `git add .`·전체 커밋을 하지 않습니다. 진행 중 파일은 담당자와 구분합니다.

재개 후 필요한 검수 명령:

```powershell
cd D:\Antigravity\AIMaster\ai-task-planner
npm run build
npm test
npm run test:browser
npm run test:runtime
vercel inspect https://ai-task-planner.buylife.xyz --scope buylife
```

최신 화면 이름과 검사 선택자를 먼저 맞추고 검사합니다. 로컬 `.env.local`이 공유 인증 설정을 갖췄다고 가정하지 않습니다. 인증 우회 없이 격리 검수와 운영 본인 로그인 검수를 구분합니다. 비밀번호·API 키를 대신 입력하지 않습니다. 실제 화면 확인은 보이는 Chrome에서 진행하고 DB/API 결과와 대조합니다.

기능 작업 완료 시 코드/DB 버전+0.01 → 검수 → 문서 → 대상 파일 커밋 → `git push origin master` → 앱 폴더에서 `vercel deploy --prod --yes --scope buylife` → 운영 확인 → 작업 내용·검수·커밋/푸시·배포/버전·라이브 링크·남은 작업 보고까지 처리합니다. 현재 문서 작성만으로 앱 버전이나 운영 배포를 변경하지 않습니다.

본인 계정·API 최상위 규칙, 서버 소유자/권한·명시적 저장·원자적 타이머 종료를 유지합니다. 새 스키마/환경변수·비밀 변경·파괴적 삭제·유료 대량 호출은 별도 사전 승인 대상이며 기존 연결 승인을 반복해서 묻지는 않습니다.

## 7. 다음 CLI에 전달할 재개 요청

> AI 할 일·성과 관리를 이어서 작업합니다. `ai-task-planner/docs/CLI_HANDOFF.md`와 `WORK_QUEUE.md`를 먼저 읽고, 최신 Git·다른 CLI의 미커밋/스테이징·운영 배포를 확인하세요. W01의 최신 화면 회귀 검수부터 진행하되 이번 주인님의 새 지시를 우선합니다. 본인 계정/API 규칙을 지키고 기능 단위로 검수·문서·커밋·푸시·프로덕션 배포·운영 확인·결과 보고까지 처리하세요.
