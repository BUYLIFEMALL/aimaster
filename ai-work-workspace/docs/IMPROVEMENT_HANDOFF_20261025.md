# [역할: workspace] 인수인계 — AI 업무 워크스페이스 자동화 (2026-10-25)

- 넘기는 사람: Claude Code(윈도우) 세션 `claude-win-20261024-workspace`
- 받는 사람: 새 Claude Code 세션(주인님 지시: 「너가 하던 업무를 다른 클로드에게 맡길 거야」)
- 대상: ① AIMaster 운영. 공용 DB ref `esgxyikcnnvmlhygjkth`, 워크스페이스 전용 스키마 `aww`
- 이 문서 하나로 이어서 일할 수 있게 썼습니다. 자세한 근거는 각 절의 링크 문서에 있습니다.

## 0. 시작하자마자 할 일 (순서대로)
1. `node scripts/dev-requests.mjs list --role workspace`를 실행합니다. 관리자 지시·역할 메모는 절대 지시이므로 먼저 처리합니다.
2. [`docs/roles/workspace.md`](../../docs/roles/workspace.md)를 읽고 「담당」 줄을 새 세션 이름으로 바꿉니다. [`docs/roles/README.md`](../../docs/roles/README.md) 역할 표도 함께 바꾸고, 공용 문서라 `safe-commit.mjs`로 커밋합니다.
3. [`docs/HANDOFF.md`](../../docs/HANDOFF.md) 맨 위 `[역할: workspace]` 항목들(U8-B·U8-A·U7)과 [`docs/ACTIVE_WORK.md`](../../docs/ACTIVE_WORK.md)를 확인합니다.
4. 루트 `CLAUDE.md` 최상위 규칙을 확인합니다. 특히 아래 다섯 가지입니다.
   - 한국어 진행 안내
   - 회원 본인 계정·키
   - 비용 사전 승인
   - 커밋·배포 규칙
   - 포그라운드 크롬 검수
5. 이 문서 §6 「남은 일」의 1번부터 시작합니다. 코드를 고치기 전에 플랜과 비용을 먼저 보고합니다.

## 1. 맡은 프로그램
| 프로그램 | 폴더 | 운영 버전 | 주소 | 마지막 배포 |
|---|---|---|---|---|
| AI 업무 워크스페이스 자동화 | `ai-work-workspace/` | **v1.19** | https://ai-work-workspace.buylife.xyz | `ai-work-workspace-ho0fq9vle` |
| AI 할 일·성과 관리 (U8 연계로 함께 고침) | `ai-task-planner/` | **v1.12** | https://ai-task-planner.buylife.xyz | `ai-task-planner-fva6qqy1q` |

- 할 일 플래너는 역할 파일의 「맡은 폴더」에 아직 없습니다. U8은 주인님 승인을 받고 연계 작업으로 고쳤고, 다른 전담 역할은 없습니다.
- 할 일 플래너를 계속 이 역할이 맡을지는 주인님께 여쭤 정합니다.
- 워크스페이스는 오픈소스 litpage를 이식한 프로그램입니다.
  - 원본 코드: `src/litpage/`
  - AIMaster 연결부(로그인·권한·회원 키·받은편지함·운영 정리 작업): `src/server/`, `src/lib/`, `src/app/`
- 디자인(U5)은 디자인 역할(agy)이 맡습니다. 이 역할은 기능·로직 담당입니다.
- 첫 단계부터 따로 정리된 문서: [`../AGENTS.md`](../AGENTS.md)(버전별 기록 표), [`IMPROVEMENTS.md`](IMPROVEMENTS.md), [`IMPROVEMENT_BACKLOG.md`](IMPROVEMENT_BACKLOG.md), 로드맵 [`PLAN_20261024_EXPANSION_ROADMAP.md`](PLAN_20261024_EXPANSION_ROADMAP.md)

## 2. 지금까지 한 일 (로드맵 단위)
| 단위 | 내용 | 버전 | 플랜 |
|---|---|---|---|
| U1·U2 | 이름 바꾸기, 쓰지 않는 기능 숨김 | v1.02~ | `PLAN_20261024_U1_RENAME.md`, `PLAN_20261024_U2_TRIM.md` |
| U3·U4 | 회원 본인 Claude·OpenAI·Gemini 키로 AI 비서, AI 채팅 기록 30일 삭제, Gemini 기본 Flash-Lite | v1.05~v1.14 | `PLAN_20261024_U3_MEMBER_AI_KEYS.md`, `PLAN_20261024_U4_GEMINI_RETENTION.md` |
| U6-A | AI 회의록: 브라우저 실시간 받아쓰기 + AI 요약, 짧은 녹취는 「요약 만들기」 버튼, 마이크 없음 안내 | v1.12~v1.17 | `PLAN_20261024_U6_MEETING_NOTES.md` |
| 한국어화 | 화면 문구 약 2,000종: `tx()` + 사전 `src/litpage/web/features/shell/i18n.literals.ko-KR.json`, 3D 버튼, 매뉴얼 `/guide` | v1.15~v1.17 | — |
| U7 | 공용 받은편지함 `public.work_inbox` + 「📨 받은 업무」 화면(페이지로 만들기·표에 행으로 넣기·삭제), 30일 자동 삭제 | v1.18 | `PLAN_20261024_U7_WORK_INBOX.md` |
| U8-A | 할 일 플래너 → 워크스페이스: 할 일 하나·오늘 성과 보고 보내기 | 플래너 v1.11 | `ai-task-planner/docs/PLAN_20261025_U8_WORK_INBOX.md` |
| U8-B | 워크스페이스 → 할 일 플래너: 페이지 「⋯」 → 「📨 할 일 플래너로 보내기」, 플래너 「📥 받은 할 일」, 표 받는 곳 열 `target_slug` | 워크스페이스 v1.19 · 플래너 v1.12 | `PLAN_20261025_U8B_TO_PLANNER.md` |

## 3. 꼭 알아야 할 구조
- **받은편지함(U7·U8)**
  - 공용 표: `public.work_inbox`
    - 열: `user_id`·`source_slug`·`target_slug`·`kind`·`title`·`body_md`·`data`·`source_url`·`imported_at`·`imported_ref`
    - 보안: RLS로 본인 줄만 읽기·고치기·지우기. 넣기 정책이 없어 서버 키로만 넣습니다.
    - 표 SQL: `supabase/migrations/20261024001700_work_inbox.sql`, `20261025000100_work_inbox_target.sql`
  - 보내기 기준 코드: `src/lib/workInbox.ts`(공용 모듈 id `work-inbox-client`)
    - 사본은 `ai-task-planner/src/lib/workInbox.ts`입니다. 사본은 직접 고치지 않습니다.
    - 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --module work-inbox-client --sync`로 맞춥니다.
  - 워크스페이스 쪽 명령: `src/server/workInbox.ts`
    - `workInboxList`·`workInboxImportPage`·`workInboxImportRow`·`workInboxDelete`·`workInboxSendToPlanner`
    - 30일 정리: `runWorkInboxRetention`(`/api/cron/jobs`에서 부름)
    - 모든 조회에 `user_id` + `target_slug = 'ai-work-workspace'` 조건이 붙어 있습니다. 서버 키는 RLS를 건너뛰므로 빼먹지 않습니다.
  - 순수 함수(시험에서 바로 불러 씀): `src/server/workInboxCsv.ts`, `src/server/workInboxPlannerItems.ts`
  - 화면
    - `src/app/inbox/`(InboxBoard의 `SOURCE`에 보낸 프로그램 한국어 이름)
    - 좌측 메뉴 개수: `AimasterSidebar.tsx`의 `InboxCount`
    - 페이지 메뉴: `src/litpage/web/features/page/PageMenu.tsx`(`sendToPlanner`)
  - 할 일 플래너 쪽
    - 보내기: `src/app/api/work-inbox/route.ts` + `src/lib/planner/inbox.ts`
    - 받기: `src/app/api/work-inbox/received/route.ts` + `src/lib/planner/received.ts` + `src/components/ReceivedTasks.tsx`
    - 두 번 추가 막기: 먼저 「가져감」 표시를 하고 추가하며, 실패하면 표시를 되돌립니다.
  - 사용 안내(다른 프로그램용): [`docs/WORK_INBOX.md`](../../docs/WORK_INBOX.md)
- **서버 명령 등록**: `src/server/runtime.ts`의 OVERRIDES(`...workInboxHandlers` 등)에 합치면 `/api/rpc/<이름>`으로 열립니다. 화면에서는 `api('<이름>', body)`(`src/litpage/web/lib/api.ts`)로 부릅니다.
- **한국어화**
  - 원본의 `t('키','영어')`는 `i18n.ko-KR.json`, 번역 없이 적힌 영어는 `tx('영어 원문')` + 사전 `i18n.literals.ko-KR.json`이 처리합니다.
  - 저장값·비교식·AI 프롬프트 원문·`shared/` 공용 엔진 원본은 감싸지 않습니다. 화면에 표시하는 지점에서만 `tx()`로 감쌉니다.
- **기록 저장소**: `aww.records`(열 `tbl`·`id`·`parent_id`·`parent_table`·`alive`·`data`(text)). JSON으로 볼 때는 `data::jsonb`로 바꿉니다.
  - 표 행은 `parent_table='collection'`이고, 표 구조는 `tbl='collection'` 줄의 `schema`에 있습니다.
- **CSV로 만든 표**는 우선순위·예정일이 글자형 칸입니다. 표 데이터를 읽는 코드는 글자형도 처리해야 합니다(`94719d8da`에서 보완, 미배포).

## 4. 시험·빌드·배포
| 대상 | 명령 | 현재 결과 |
|---|---|---|
| 워크스페이스 연결부 시험 | `npx vitest run --config tests/vitest.config.mjs tests/integration` | 40/40 |
| 워크스페이스 타입·빌드 | `npx tsc --noEmit` · `npm run build` | 통과(빌드 첫 시도가 23505 `pg_type_typname_nsp_index` 충돌로 자주 실패, 다시 하면 통과) |
| 플래너 단위·브라우저 시험 | `npm test` · `npm run test:browser` | 27/27 · 30/30 |
| 플래너 타입·빌드 | `npx tsc --noEmit` · `npm run build` | 통과 |

- **배포**: 빌드 1회도 사전 승인이 필요합니다.
  1. 직전에 Vercel `list_deployments`(teamId `team_orq6xPe9P3c1uMQdKlJsQ6k9`, state `BUILDING,QUEUED,INITIALIZING`)가 0건인지 확인합니다.
  2. `vercel deploy --prod --yes --scope buylife --cwd "D:/Antigravity/AIMaster/<폴더>"`로 한 번에 하나씩 배포합니다.
  3. `vercel inspect <주소> --scope buylife`로 Ready를 확인합니다.
- **버전**(실제 배포 때만 +0.01)
  - 워크스페이스: `src/lib/version.ts`, `src/litpage/web/features/shell/AimasterSidebar.tsx`의 `AIMASTER_APP_VERSION`, `supabase/migrations/2026102x…_bump_version_v1_xx.sql`, 운영 DB `programs.version`
  - 플래너: `src/lib/version.ts`, `package.json`·`package-lock.json`, 버전 SQL, 운영 DB
- **운영 DB SQL**: 크롬 Supabase SQL 편집기(`https://supabase.com/dashboard/project/esgxyikcnnvmlhygjkth/sql/new`)를 씁니다.
  1. `window.monaco.editor.getModels()[0].setValue(sql)`로 SQL을 넣습니다.
  2. Run 버튼을 누릅니다. 「Potential issue detected」 창이 뜨면 「Run query」를 누릅니다.
  3. 결과는 `select concat('표시_', …)`처럼 머리말을 붙여 내고, 결과 칸(`[role=gridcell]`)에서 머리말로 찾습니다. 편집기 글자를 결과로 잘못 읽지 않기 위해서입니다.
  - 공용 DB 스키마 변경은 승인 뒤에만 하고, 적용한 SQL은 `supabase/migrations/`에 파일로 남깁니다.
- **화면 검수**: Claude Code는 메인 크롬 기본 프로필의 보이는 창에서 합니다.
  - 시험 계정은 `buylifemall@naver.com`입니다. 비밀번호는 넣지 않고 주인님이 로그인합니다.
  - 중간에 관리자 계정으로 바뀌어 있던 적이 있으니, 시작할 때 화면의 계정 표시를 확인합니다.
  - 탭이 뒤에 있으면 화면 캡처가 시간 초과로 실패합니다. 그때는 `get_page_text`·JS로 글자를 읽어 대조합니다.
  - 페이지 이동 직후 JS 실행은 로그인 확인 때문에 주소가 바뀌며 실패할 수 있습니다. 탭 상태를 다시 읽고 실행합니다.
  - `window.confirm`을 띄우는 버튼(삭제 등)은 자동 조작 중에 누르지 않습니다. 시험 줄은 SQL로 지웁니다.

## 5. 커밋 규칙 (2026-10-23 저장소 대량 삭제 사고 이후)
- 경로를 지정해 커밋합니다: `AIMASTER_SESSION=<세션> git commit -m "…" -- <경로>`
  - 새 파일은 `git add -- <경로>`로 먼저 등록한 뒤 바로 커밋합니다.
  - 메시지 끝에 `Co-Authored-By` 줄을 붙입니다.
- 공용 문서(`docs/HANDOFF.md`·`ACTIVE_WORK.md`·`PROGRAM_CAPABILITY_MAP.md`·`SHARED_MODULES.md`·`docs/roles/*` 등)는 `node scripts/safe-commit.mjs --begin <파일> --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<msg>" <파일> --as <세션> [--push]` 순서로 커밋합니다.
- 쓰지 않는 것: `git add -A`, `--no-verify`, 전체 reset·checkout·stash
- 커밋 뒤 `git show --stat HEAD | tail -1`로 파일 수를 확인합니다.
- 정규식이 들어간 스크립트는 셸 heredoc이나 `node -e` 안에서 역슬래시가 깨집니다. 스크래치 폴더에 파일로 만들어 실행합니다.
- 새 문서를 만들거나 지우면 `node scripts/build-dev-docs-manifest.mjs`를 실행해 함께 커밋합니다.

## 6. 남은 일 (우선순위 순)
1. **회의록 자동 요약 실제 1회 확인**
   - 주인님이 AI 회의록에서 30초 이상 녹음하고 「정지」를 누르면, 요약이 만들어졌는지 확인합니다(시험 계정 Gemini 1회, 1원 안팎).
   - 요청함에 올라가 있습니다.
2. **미배포 `94719d8da`(워크스페이스)**
   - 「이 페이지를 할 일 하나로」가 표 행의 글자형 우선순위·예정일 칸도 읽게 한 수정입니다.
   - 다음 워크스페이스 배포 때 함께 내보냅니다. 바로 배포하려면 빌드 1회를 승인받습니다.
3. **U9 연계**
   - `ai-audio-analyzer`·`ai-doc-chatbot`·`document-translator`·`ai-slide-builder`에 「업무 워크스페이스로 보내기」를 답니다.
   - 프로그램마다 플랜과 비용을 먼저 보고합니다.
   - `docs/roles/`에서 각 프로그램 전담 역할이 있는지 먼저 확인합니다(역할 ID 목록에 `docbot-prompt`가 있으니 문서 챗봇은 그 역할 담당인지 확인).
   - 붙이는 법은 `docs/WORK_INBOX.md` §3, 할 일 플래너 `src/app/api/work-inbox/route.ts`가 기준 예시입니다.
   - 보낸 프로그램 한국어 이름은 워크스페이스 `src/app/inbox/InboxBoard.tsx` `SOURCE`에 이미 있습니다.
4. **U6-B 음성 파일 받아쓰기**: 주인님 결정 대기입니다. 추천안은 회원 Gemini 우선, OpenAI 보조(4MB 이하)입니다.
5. **남은 영어 문구**
   - 새 표의 보기 이름
   - 페이지 머리의 아이콘·커버·설명 추가 버튼
   - 번역 메뉴의 「English(으)로 번역」
   - 「1h ago」 같은 시간 표기
   - 소문자로 시작하는 문장 조각
   - 옛 워크스페이스 예시 데이터
6. **받은편지함 개선**
   - 원하는 데이터베이스를 골라 넣기(지금은 「📨 받은 업무 표」 고정)
   - 표의 「보낸 프로그램」이 slug로 들어감(한국어 이름으로 바꿀지 검토)
   - 같은 항목 다시 보내기 막기(지금은 안내만)
7. **할 일 플래너**: 받은 할 일 한꺼번에 추가, 추가할 때 분류 고르기, 받은 할 일 개수를 좌측 메뉴에 표시
8. **로드맵 U10~U14**: 콘텐츠 캘린더·업무 현황판 템플릿, 자동화·예약(회원 cron-job.org), 업무 비서 에이전트 등. 로드맵 §5 표를 따릅니다.
9. **시험 데이터 정리**: 시험 계정 워크스페이스에 시험 페이지와 「📨 받은 업무 표」, 플래너에 시험 할 일 2개가 남아 있습니다. 지울지는 주인님께 여쭙니다.

## 7. 주인님께 여쭐 것 (역할 파일과 같음)
- 회의록 자동 요약 확인을 위한 30초 녹음
- U6-B 음성 파일 받아쓰기 제공자를 Gemini 우선·OpenAI 보조로 할지
- 할 일 플래너를 이 역할이 계속 맡을지
- 미배포 `94719d8da`를 바로 배포할지(빌드 1회)

## 8. 비용 기록 (이번 세션 마지막 작업들)
| 작업 | 빌드 | 유료 AI | DB 변경 |
|---|---|---|---|
| U7 | 1회 | 0회 | 표 1개(승인) |
| U8-A | 1회 | 0회 | 없음 |
| U8-B | 2회 | 0회 | 열 1개·색인 1개(승인) |

## 9. 새 Claude에게 붙여 넣을 시작 문장
```text
너는 AIMaster 저장소(D:\Antigravity\AIMaster)에서 [역할: workspace](AI 업무 워크스페이스 자동화 담당)를 이어받는 Claude Code다.
먼저 ai-work-workspace/docs/IMPROVEMENT_HANDOFF_20261025.md를 끝까지 읽고 §0 순서대로 진행해라.
역할 파일 docs/roles/workspace.md의 담당 세션 이름을 네 세션으로 바꾼 뒤, 요청함 대기 항목과 §6 남은 일·§7 여쭐 것을 한국어로 정리해 보고하고 지시를 기다려라.
비용이 드는 작업(빌드 포함)은 반드시 먼저 승인을 받는다.
```
