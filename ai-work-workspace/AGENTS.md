# AI 업무 워크스페이스 자동화 (`ai-work-workspace`) — 에이전트 인수인계

- 주소: https://ai-work-workspace.buylife.xyz · 메인 상세: https://www.buylife.xyz/programs/ai-work-workspace
- 카테고리: **업무자동화**(2026-10-24 신설) · 이용 권한: 최소 등급 「일반」, FREE 없음(일반 등급 이상 + 관리자 사용기간 또는 구독)
- 현재 버전: **v1.18** (13번 스마트 프로 인디고 워크스페이스 스타일) · 버전 SQL은 v1.18까지(v1.08~v1.09 건너뜀)
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
| v1.18 | 2026-10-25 | v1.18 — U7 업무 받은편지함: 공용 표 `public.work_inbox`(주인님 승인, RLS 본인만, insert는 각 프로그램 서버만, 30일 자동 삭제를 운영 정리 작업에 추가) + 「📨 받은 업무」 화면 `/inbox`(좌측 메뉴·새 항목 수, 목록·미리보기, 3D 버튼 「페이지로 만들기」(원본 importFiles 재사용)·「표에 행으로 넣기」(처음 「📨 받은 업무 표」 자동 생성 후 mergeCsv로 추가, 표 위치는 회원 설정에 저장)·「삭제」) + 보내기 기준 코드 `src/lib/workInbox.ts`·안내 `docs/WORK_INBOX.md` + 매뉴얼 구역 — `2697c16ba`, 배포 `ai-work-workspace-lvwfm67rq` |
| v1.17 | 2026-10-24 | v1.17 — 보기·속성·자동화 종류 메뉴 이름(공용 엔진 이름을 화면 표시 지점에서만 `tx()`), AI 채팅 검색 범위·통화·날짜 형식 이름 한국어 — `fe3e8e33f`(주인님 승인 추가 빌드) |
| v1.16 | 2026-10-24 | v1.16 — 한국어화 2~4차(AI 편집·기술 메뉴, 알림 70여 개, 조건부·대체 문구, 슬래시 메뉴 이름 한국어 + 영어/한국어 검색어, 보기 기본 이름) + 문맥 틀린 짧은 번역 수정(Empty→비어 있음 등) — `f0bf0d429`, 배포 `ai-work-workspace-7nxsyg7ao`(주인님 승인 추가 빌드) |
| v1.15 | 2026-10-24 | v1.15 — 화면 한국어화 1차(원본에 하드코딩된 영어 약 1,500종을 영어 원문 열쇠 번역 함수 `tx()` + 사전 `web/features/shell/i18n.literals.ko-KR.json`으로) + 회의록 수정(정지·일시정지 때 받아쓰기 엔진의 마지막 문장을 기다렸다 보냄 → 문장 손실·「세션이 끝났습니다」 오류 해결, 정지 뒤 요약을 `after()`로 끝까지 실행, 녹취 100자 미만이면 파란 안내 띠 + 「요약 만들기」, 마이크 0개면 「마이크를 찾지 못했습니다」, 서버 회의록 문구·화자 이름 「○○의 마이크」 한국어) + 3D 버튼(받아쓰기 시작·정지·요약 만들기·매뉴얼 버튼) + 매뉴얼 3구역(화면 구성 한눈에 보기·AI 회의록 4단계·마이크 연결 체크 4개와 문제 해결 표·FAQ 3개) — `e6c840bae`, 배포 `ai-work-workspace-72sdmisgo` |
| v1.14 | 2026-10-24 | Gemini 기본을 「쓸 수 있는 최신 정식 Flash-Lite」(지금 `gemini-3.5-flash-lite`)로 되돌림 — 운영 시험에서 `gemini-2.5-flash-lite`는 목록에 보여도 「새 사용자에게 더 이상 제공하지 않음」(404)이라 Gemini 키만 있는 회원의 「자동」이 실패하던 v1.13 회귀 수정, 차단 모델 한국어 안내 — `fc6dc321c`, 배포 `ai-work-workspace-14c4dj6e8`(주인님 승인 빌드) |
| v1.13 | 2026-10-24 | 회원 OpenAI 키 모델 목록을 채팅 모델만(음성·검열·실시간·받아쓰기·임베딩·이미지·날짜 붙은 옛 판 제외, 추천 3개) + Gemini 기본을 2.5 Flash-Lite로 바꿈(⚠ 회귀 — v1.14에서 되돌림) — `d9b099292`, 배포 `ai-work-workspace-i2klvx4og` |
| v1.12 | 2026-10-24 | U6-A AI 회의록 열기 — 브라우저 실시간 받아쓰기(크롬·엣지·사파리, 비용 없음) + 정지 뒤 회원 본인 키 AI 요약(요점·할 일·받아쓴 줄 인용), 받아쓰기 「자동」 언어 = 한국어·언어 이름 한국어, 요약 지시문에 당해 연도·한국어 기준 블록, 미지원 브라우저·참석자 알림 안내 문구 정리, 음성 파일 업로드 버튼·메뉴는 U6-B까지 숨김(서버도 단계 정책으로 닫음) — `b7a377b6d`, 배포 `ai-work-workspace-35j95l5vr` |
| v1.11 | 2026-10-24 | 기본 Gemini 모델을 가장 저렴한 Flash-Lite로(주인님 결정 — 최신 Flash는 7~9배 비쌈, Flash·Pro는 목록에서 직접 선택, `1111e7d9b`) + v1.10 검수 수정(767px 이하 좌측 메뉴 접기·표준 메뉴 이름 「API키등록·플랫폼연동」·도구줄 「내 페이지」, `59959ec28`) + 모델 목록 회원 키별(`404c1ee85`) — 배포 `ai-work-workspace-35qfy6cij` |
| v1.10 | 2026-10-24 | UI/UX 종합 리뉴얼 — 13번 「스마트 프로 인디고 워크스페이스 스타일」 전면 적용: 1) 공식 표준 2탭 로그인/회원가입 레이아웃(24px 모눈 격자·인디고 버튼), 2) 빈 페이지 온보딩 웰컴 퀵스타트 허브 4종 카드(회의록·칸반·위키·AI글쓰기), 3) 상단 툴바 퀵 액션 그룹(🔑 AI 연동 상태·📖 가이드·저장 배지), 4) 사이드바 브랜드 헤더 및 하단 유틸리티 카드 고도화, 5) 8대 표준 규격 비주얼 가이드북(/guide) 키캡 단축키 치트시트(kbd) & FAQ 5종 아코디언 인터랙션 탑재 |
| v1.07 | 2026-10-24 | 로그인·회원가입 화면을 공식 표준 2탭(DESIGN.md 14번, 기준 `threads-comment-reply`)으로 교체, 회원가입 버튼 404(`buylife.xyz/signup`) → `/register`, 비밀번호 찾기·약관 연결, 원본 로그인 화면 대신 서버 오류 「다시 시도」 안내 — `4e717d888`·`72ad69198`, 배포(`ai-work-workspace-kyrubh4hb`) |
| v1.06 | 2026-10-24 | U4 회원 본인 Gemini 키 연결 — 어댑터 `src/litpage/server/ai/providers/gemini.ts`·`geminiTranslate.ts`(키는 `x-goog-api-key` 머리글만, 도구 호출·생각 서명·웹 페이지 읽기, 웹 검색은 아직 제외, 한국어 오류, 한 번 재시도), 회원 키별 모델 목록 `geminiModels.ts`(기본 최신 정식 Flash·빠른 작업 Flash-Lite, 실패 시 공식 별칭 `gemini-flash-latest`), 회원이 키를 가진 회사 모델을 채팅 목록에 함께 표시하고 고른 모델의 회사 키 사용(자동은 Claude→OpenAI→Gemini, `availableProviders`·`providerForModel`), 키 화면 Gemini 칸(새 키 형식 `AQ.`도 허용), AI 채팅 기록 30일 자동 삭제 `src/server/aiRetention.ts`(매일 `/api/cron/jobs`), 슬래시 「AI 이미지」 숨김 — `60316a2d7`·`304f2ccb1`·`8dd6398e5`·`fcacdde40`·`8c269894a`, 배포(`ai-work-workspace-3l3mq5okd` → 재배포 `ai-work-workspace-3ndt12k9l`) |
| v1.05 | 2026-10-24 | U3 회원 본인 OpenAI·Claude 키로 AI 비서 열기 — 키는 공용 표 `user_api_keys`(`anthropic` 우선, 없으면 `openai`, 회원별 60초 캐시 `src/server/memberAiKeys.ts`), Next 스트림 라우트 `/api/ai/stream`, 「🔑 API키등록·플랫폼연동」 화면 `/settings/keys` + `/api/keys`(좌측 메뉴, 📖 연동 매뉴얼 팝업), 키 없음 안내 한국어, 서버 오류 문구·AI 지시문의 AI 이름 「AI 비서」, 기본 모델 Sonnet(빠른 작업 Haiku), 당해 연도·답변 언어 기준 블록, 회의록 AI는 별도 스위치로 계속 닫힘, 외부 연결·MCP·채팅 공유·AI 그림·에이전트 계속 닫힘 — `24c8602ba`·`6be13d77c`, 배포(`ai-work-workspace-hzp7uowv1` → 수정 재배포 `ai-work-workspace-fk4ffx35l`) |
| v1.04 | 2026-10-24 | U1 이름 바꾸기(AI 이름 「AIMaster」 → 「AI 비서」, 메뉴 이름 6종) + U2 불필요한 기능 숨기기(게시 탭·마켓플레이스·계정 화면·메일 알림·AI 그림/가짜 사진 탭·지도 보기·요금제 문구, 숨김 목록 `trimPolicy.ts`) — `1771f446f`·`04d6601b9`, 배포(`ai-work-workspace-9esamryua`) |
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
