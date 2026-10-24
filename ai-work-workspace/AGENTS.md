# AI 업무 워크스페이스 자동화 (`ai-work-workspace`) — 에이전트 인수인계

- 주소: https://ai-work-workspace.buylife.xyz · 메인 상세: https://www.buylife.xyz/programs/ai-work-workspace
- 카테고리: **업무자동화**(2026-10-24 신설) · 이용 권한: 최소 등급 「일반」, FREE 없음(일반 등급 이상 + 관리자 사용기간 또는 구독)
- 현재 버전: **v1.03** (1단계) · 대상 프로젝트: ① AIMaster 운영(공용 DB ref `esgxyikcnnvmlhygjkth`, 전용 스키마 `aww`)
- 원본: [litmers-dev/litpage](https://github.com/litmers-dev/litpage) 커밋 `81665d4` (MIT, © 씨그로 주식회사(리트머스)) — `LICENSE`·`THIRD_PARTY_NOTICES.md` 유지. 화면 이름 「Litpage」는 주인님 지시로 「Workspace」, 「Litpage AI」는 「AIMaster」로 모두 바꿈(2026-10-24).
- 개발 플랜·결정 기록: [`docs/PLAN_20261024_INITIAL_BUILD.md`](docs/PLAN_20261024_INITIAL_BUILD.md)(§7 주인님 결정, §7-1 구현 중 바뀐 결정)

## 1. 사용 목적 및 대상
문서·회의록·업무 위키·프로젝트 보드를 한곳에 모아 정리하는 노션형 업무 워크스페이스. 대상: 회의록·위키를 정리하는 팀장, 프로젝트 일정을 챙기는 1인 사업자, 흩어진 메모를 모으려는 직장인. 회원마다 워크스페이스가 분리되어 다른 회원과 섞이지 않는다.

## 2. 기술 스택·개발 기법
- **Next.js 16(App Router) 껍데기 + 원본 litpage 화면(React 19)·서버·공용 엔진 이식**: `src/litpage/{web,server,shared}`(원본 그대로가 기본, 바꾼 곳은 `이식판:` 주석).
- **동기 DB 다리**(`src/litpage/server/pg/bridge.ts` + `pgworker.mjs`): 원본 서버는 `node:sqlite` 동기 API 전제 4만 줄. 작업 스레드가 postgres.js로 질의하고 본체는 `Atomics.wait`로 결과를 받아 원본 코드를 거의 그대로 쓴다. Vercel 함수 지역 `icn1`(DB와 같은 서울).
- **SQL 변환기**(`pg/translate.ts`): `?`→`$n`, `INSERT OR IGNORE/REPLACE`, `LIKE`→`ILIKE`, camelCase 이름 따옴표, DDL 형식, `IS ?`, `sqlite_master`, upsert 갱신식 표 한정. `json_extract`·`json_num`·`json_true`·`json_valid`는 마이그레이션의 SQL 함수.
- **DB 접속**: 전용 계정 `aww_app`(스키마 `aww`만 소유, `public` 표 권한 없음). 비밀번호는 Supabase Vault가 생성·보관, 서버가 service role로만 부르는 `public.aww_db_password()`로 읽음(사람·화면·환경변수에 없음). 로컬 시험은 `AWW_DATABASE_URL`(Docker).
- **블록·보기·서버 기능 자동 등록**: 원본 `import.meta.glob` 대신 `scripts/gen-registry.mjs`(빌드 전 자동)가 `registry.generated.ts`·`modules.generated.ts` 생성.
- 권한: AIMaster 공용 `requireProgramAccess()`/`checkProgramAccessApi()` 사본(`src/lib/access.ts`·`programAccess.ts`), 로그인 쿠키 `.buylife.xyz` 공유.
- 시험: 원본 서버 시험 `upstream-tests/`(vitest, 로컬 Docker Postgres `aww-pg-test:55432`, `npx vitest run --config upstream-tests/vitest.config.mjs server/ --exclude "**/demo-mode.test.ts"` → **522/522**), 공용 엔진 159개, 연결부 시험 `tests/integration`(13개: 회원 생성·격리·단계 정책·운영자 AI 키 차단).

## 3. 핵심 기능·구조·장단점
- **기능(1단계)**: 블록 편집기 41종(`/` 메뉴·마크다운 단축키·끌어 옮기기), 데이터베이스 보기 12종(표·보드·목록·갤러리·캘린더·타임라인·차트·대시보드·피드·폼·지도·페이지)·수식·관계·집계·템플릿, 검색(pg_trgm, 한국어 부분 검색), 버전 기록, 휴지통(30일 후 삭제), 불러오기(Markdown·CSV·HTML·Word·PDF)·내보내기, 파일 첨부(DB 저장, 4MB), 한국어 화면·서울 시간대·한국어 날짜.
- **구조**: 화면 `/[[...path]]`(서버에서 권한 확인 → 원본 SPA 탑재) · `/api/rpc/[name]`(원본 RPC, `src/server/runtime.ts`가 회원 자동 생성·단계 정책·`createWorkspace` 한국어판 처리) · `/api/upload`·`/files/[id]/[name]` · `/api/cron/jobs`(하루 1회 03:00 KST, `CRON_SECRET`, 원본 `runDueJobs`) · `/guide`(매뉴얼) · `/login`.
- **1단계에서 닫은 것**(`src/server/stagePolicy.ts`가 서버에서 차단, 화면은 원본 「AI 끄기」 정책 `AI_STAGE_OPEN=false`로 숨김): 계정 관리(비밀번호·인증 → AIMaster), 초대·공유·공개 페이지·사이트(3단계), AI·회의록 받아쓰기·에이전트·개발자 API·MCP·자동화(2·4단계), 템플릿 후기(회원 간 노출).
- **최상위 규칙 장치**: 운영에서 환경변수 AI 키를 절대 읽지 않음(`ai/providers/config.ts`, `withMemberAiKeys()`로 회원 본인 키만 — 2단계에서 연결). 회원 데이터는 워크스페이스(space) 단위 권한 판정 + 전용 스키마 격리.
- **장점**: 원본의 완성도 높은 편집기·DB 기능과 보안 시험을 그대로 유지, 별도 서버 비용 없음. **단점**: 동기 다리라 한 함수 인스턴스 안 동시 요청은 줄을 서서 처리(소규모에 적합), 실시간 동시 편집·예약 알림은 아직 없음, 번역 파일에 없는 일부 원본 영어 문구가 남음.

## 4. 버전·변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| v1.03 | 2026-10-24 | 1단계 화면 보완 `2f0de2776`·`df7a628d3`·`db77b7a3b`: 회의록 블록 안내, 템플릿 10개 한국어(갤러리 버전 6), 날짜·시각 화면 언어 — 배포(`ai-work-workspace-l322zllr7`) |
| v1.02 | 2026-10-24 | 휴대폰 폭 문서 본문 여백 16px, 블록 메뉴 AI 항목 숨김(`5a9d5e564`) 배포(`ai-work-workspace-a33mgs4e5`) |
| v1.01 | 2026-10-24 | 1단계 첫 배포(`ai-work-workspace-kx1az0lyp` → 재배포 `nnv2yd6v0`). 이식·권한·매뉴얼·썸네일·카테고리 신설. 미배포 대기: 휴대폰 본문 여백 16px·블록 메뉴 AI 항목 숨김(`5a9d5e564`) |

## 5. 남은 작업
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) — 2단계(회원 본인 AI 키), 3단계(초대·공유·Supabase Realtime 동시 편집), 4단계(에이전트·자동화·API·MCP, 회원 cron-job.org), 템플릿 한국어화, 큰 파일 Storage 이전.

## 6. 다른 프로그램 연계·아이디어
블로그·SNS 원고/발행 기록 → 콘텐츠 캘린더 데이터베이스, `ai-task-planner` 할 일 ↔ 업무 보드, 회의 메모 → AI 에이전트 요약·담당자 알림(회원 본인 메신저 연동). 상세: `docs/IMPROVEMENTS.md`.

## 7. UI/UX 개선안
원본 디자인 값(`--lp-*`, 라이트·다크) 유지 + AIMaster 좌측 메뉴 규격(`AimasterSidebar.tsx`). 개선안: 시작 화면에 한국어 템플릿 묶음, 휴대폰 ☰ 메뉴에 매뉴얼 빠른 진입, 데이터베이스 빈 상태 안내 그림. 상세: `docs/DESIGN_HANDOFF.md`.

## 작업할 때 주의
- **배포**: 다른 명령과 같이 실행하지 말고 단독으로 `vercel deploy --prod --yes --scope buylife --cwd "D:/Antigravity/AIMaster/ai-work-workspace"`(2026-10-24 동시 실행으로 메인 사이트가 배포된 사고 — `docs/ERROR_LESSONS.md`). Git Bash의 `vercel api /v9/…`는 `MSYS_NO_PATHCONV=1`.
- 원본 서버 SQL은 SQLite 문법으로 써도 변환기를 거친다. JSON 값을 숫자로 비교·정렬하면 `json_num(data,'$.x')`, 참거짓은 `json_true(...)`.
- 모듈을 불러올 때 표 만들기(DDL)가 실행된다(원본 방식). 새 표도 `CREATE TABLE IF NOT EXISTS`로 쓰면 된다(`aww_app`이 스키마 주인).
- 운영 SQL은 크롬 SQL 편집기에서 **실행 버튼**으로 돌린다(단축키 Ctrl+Enter가 다른 탭 입력칸으로 가는 일이 있었음).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
