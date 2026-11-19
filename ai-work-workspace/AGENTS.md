# AI 업무 워크스페이스 자동화 (`ai-work-workspace`) — 에이전트 인수인계

- 주소: https://ai-work-workspace.buylife.xyz · 메인 상세: https://www.buylife.xyz/programs/ai-work-workspace
- 카테고리: **업무자동화**(2026-10-24 신설) · 이용 권한: 최소 등급 「일반」, FREE 없음(일반 등급 이상 + 관리자 사용기간 또는 구독)
- 현재 버전: **v1.44** (13번 스마트 프로 인디고 워크스페이스 스타일) · 화면 버전은 **`src/lib/version.ts` 한 곳**만 올린다(왼쪽 메뉴 `AimasterSidebar.tsx`가 불러 씀, 2026-11-14부터 · 시험 명령 `npx vitest run --config tests/vitest.config.mjs` 155개)
- **🔁 최신 인수인계(2026-11-13, v1.30~v1.35 + 미배포 묶음): 아래 §3 「지금 열린 기능」·§4·§5, 플랜 [`docs/PLAN_20261113_U14_AND_DEFERRED.md`](docs/PLAN_20261113_U14_AND_DEFERRED.md)**
- 원본: [litmers-dev/litpage](https://github.com/litmers-dev/litpage) 커밋 `81665d4` (MIT, © 씨그로 주식회사(리트머스)) — `LICENSE`·`THIRD_PARTY_NOTICES.md` 유지. 화면 이름 「Litpage」는 주인님 지시로 「Workspace」, 「Litpage AI」는 「AIMaster」로 모두 바꿈(2026-10-24).
- **🔁 인수인계(2026-11-06, 받아쓰기 엔진 선택·v1.22 배포·모델 교체 7개 배포 준비): [`docs/IMPROVEMENT_HANDOFF_20261106_STT_DEPLOY.md`](docs/IMPROVEMENT_HANDOFF_20261106_STT_DEPLOY.md)** — 남은 것: 배포 기록 정리, OpenAI 실제 받아쓰기 확인, 모델 교체 7개 배포(명령은 주인님 `!` 실행).
- **🔁 역할 인수인계(2026-10-25, 다른 Claude로 담당 교체): [`docs/IMPROVEMENT_HANDOFF_20261025.md`](docs/IMPROVEMENT_HANDOFF_20261025.md) — 새 담당은 이 문서부터 읽는다**
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
- **지금 열린 기능(2026-11-13 기준, 1단계 뒤 U3~U14로 연 것)**: 회원 본인 AI 키(Claude·OpenAI·Gemini)로 AI 비서·회의록 받아쓰기·요약, 「📨 받은 업무」(다른 프로그램에서 보내기 → 표·콘텐츠 캘린더·할 일 플래너), 「📊 업무 현황판」, 자동화·버튼(정시 실행은 회원 cron-job.org), 맞춤 에이전트(+웹 검색 = 회원 키 내장 검색), 협업(초대한 AIMaster 회원끼리 공유·5초 확인·동시 편집 잠금), 구글 캘린더(ICS 구독 + 회원 본인 구글 앱 연결), 영수증·세금계산서(증빙 사진·PDF 읽기, 문서 발행, 홈택스 일괄발급 엑셀, **볼타 바로 발급**), 자동화 웹훅(https만·분당 20·하루 500), 자동화 알림을 내 메일·카카오톡으로도, **MCP 서버**(`/api/mcp`, 개인 토큰 5개·90일·분당 60).
- **아직 닫힌 것**: 공개 링크·사이트 게시, 초대 링크, 바깥 MCP 서버 연결(에이전트가 남의 MCP 호출)·MCP 프리셋, 개발자용 연결·봇 토큰·공개 API 웹훅(dev*), 관리자 고급 기능(admin*). 판정은 `src/server/stagePolicy.ts` 한 곳.
- **토큰으로 들어오는 주소(로그인 쿠키 없음, 각자 토큰 주인의 이용 권한을 확인)**: `/api/calendar/<토큰>.ics`, `/api/mcp`(Bearer `lp_pat_`), `/api/cron/member`(회원 cron-job.org), `/api/bolta/webhook/<토큰>`(볼타 서명 확인).
- **회원 연동값은 전부 공용 `user_api_keys`·`member_platform_accounts`·`user_smtp_accounts`**(새 저장소 만들지 않음). 새 키 이름을 쓰려면 운영 DB 제약 `user_api_keys_provider_check`에 먼저 넣어야 저장된다(`supabase/migrations/20261113000000_bolta_api_key_provider.sql` 방식).
- **구조**: 화면 `/[[...path]]`(서버에서 권한 확인 → 원본 SPA 탑재) · `/api/rpc/[name]`(원본 RPC, `src/server/runtime.ts`가 회원 자동 생성·단계 정책·`createWorkspace` 한국어판 처리) · `/api/upload`·`/files/[id]/[name]` · `/api/cron/jobs`(하루 1회 03:00 KST, `CRON_SECRET`, 원본 `runDueJobs`) · `/guide`(매뉴얼) · `/login`.
- **1단계에서 닫은 것**(`src/server/stagePolicy.ts`가 서버에서 차단, 화면은 원본 「AI 끄기」 정책 `AI_STAGE_OPEN=false`로 숨김): 계정 관리(비밀번호·인증 → AIMaster), 초대·공유·공개 페이지·사이트(3단계), AI·회의록 받아쓰기·에이전트·개발자 API·MCP·자동화(2·4단계), 템플릿 후기(회원 간 노출).
- **최상위 규칙 장치**: 운영에서 환경변수 AI 키를 절대 읽지 않음(`ai/providers/config.ts`, `withMemberAiKeys()`로 회원 본인 키만 — 2단계에서 연결). 회원 데이터는 워크스페이스(space) 단위 권한 판정 + 전용 스키마 격리.
- **장점**: 원본의 완성도 높은 편집기·DB 기능과 보안 시험을 그대로 유지, 별도 서버 비용 없음. **단점**: 동기 다리라 한 함수 인스턴스 안 동시 요청은 줄을 서서 처리(소규모에 적합), 실시간 동시 편집·예약 알림은 아직 없음, 번역 파일에 없는 일부 원본 영어 문구가 남음.

## 4. 버전·변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| v1.63 | 2026-11-19 | **문서가 많은 ZIP 가져오기 성능 묶음**(WS-20261119-03, 주인님 「커밋,푸시,배포해」, Master 수락 `msg_6a32a57772c5`): 다문서 가져오기 응답 축소(바뀐 레코드 1,000개 초과 때 partial) · `putRecord` 한 줄 쓰기의 요청 캐시 전체 비움 생략(201쪽 합성 입력 DB 호출 46,684 → 32,197회) · 버전 기록(스냅숏)을 쪽 단위로 한 번만(`history.ts` `snapshotChanged`) · `tx` 깊이 한 번만 되돌림. 계기: 2026-11-19 운영에서 약 570쪽 노션 ZIP이 300초 제한으로 504. 배포 `dpl_CxEYSzDhnScbAL5zdmiToQy3HB4n`(빌드 1회), 버전 커밋 `addc48085`, DB 구조 변경 없음. **운영 미확인**: 실제 570쪽 ZIP 재시도, 줄어든 응답 뒤 화면 표시, 버전 기록 화면. `programs.version`·push는 Master 몫. **그 뒤 미배포 대기**: 가져오기 응답 3,000,000바이트 예산·`pending` 포인터 `3d446effa`(전체 시험 73/74파일·1,078/1,079개 통과, tsc 0, 실제 브라우저·운영 미확인) |
| v1.62 | 2026-11-19 | **큰 파일 가져오기**(WS-20261119-02, 고정판 `809f52f7e`, 주인님 「배포해」): 4MiB 초과 가져오기 파일을 Storage 보관분에서 읽기 · 50MB 초과 ZIP을 브라우저에서 풀어 작업 단위로 올리기(`import_jobs` 표·`files.import_job_id` 열, 코드 DDL — 배포 뒤 첫 DB 요청에서 생성 확인) · CSV 합치기 동시 실행 정리 · 가져오기 화면 「ZIP 5GB」 문구를 실제 한도로. 배포 `dpl_7jQpBZotPMrMxbYT7XzSCfXBHbqT`(빌드 1회), 버전 커밋 `dfcee1584`. **운영 미확인**: 로그인 뒤 화면, 실제 4MB 초과·50MB 초과 ZIP, 실제 Storage 올리기·삭제 |
| v1.61 | 2026-11-19 | **노션 저장 HTML 가져오기 보완 + 좌측 하단 겹침 + 빌드 평가의 DB 부작용 제거**(주인님 「배포해」): 노션 공개 페이지를 브라우저로 저장한 HTML 인식(WS-20261119-01 `112ada09d`·`8225ca66b`·`2c7f6945d`) · 워크스페이스 이름 칸이 저장공간 위젯에 가리던 것 `7a1e25e7b` · 모듈을 불러오는 것만으로 운영 DB에 나가던 표 확인 DDL·시작 작업을 첫 질의 시점으로 미룸(WS-20261119-REL `5efdefd22`·`7c283738f`, 빌드 「Collecting page data」 멈춤 2회 뒤 해소 — 수집 단계 0.99초). 배포 `dpl_CLGZ7CA84iyodmiSEjoPccxMMyBp`(성공 빌드 1회, 앞선 2회는 멈춰 취소), 버전 커밋 `30bcfdee1`. **운영 미확인**: 실제 노션 ZIP 전체 가져오기, cron 호출 뒤 주기 작업·웹훅 경로·에이전트 일정 재등록 |
| v1.60 | 2026-11-18 | **달력 노션식 정리 + 업무 현황판 전체 너비**(WS-20261118-06 `40896d037`·`236415698`·`172e3f41f`, 주인님 「노션처럼 깔끔하게 달력이 표시되게」·「배포해」): 달 구분의 보라색 바탕·굵은 경계선을 빼고 옅은 중립 회색만. 배포 `dpl_DC9Bifer8U1oZ67QFRJNkaAQ1Pj6`(빌드 1회), 버전 커밋 `36af44608`. **운영 미확인**: 업무 현황판 폭(시험 계정의 현황판 페이지가 없었음) |
| v1.59 | 2026-11-18 | **좌측 메뉴 정리 + 메뉴 화면을 워크스페이스 안으로**(주인님 「좌측에 메인메뉴가 있게 해놔」·「배포해」): 받은 업무·캘린더 연동·API키등록·매뉴얼을 `/<domain>/inbox`·`calendar-sync`·`keys`·`guide`로(WS-20261118-04 `e7f72c5a7`, 새 `web/features/appviews/`) · 기능 없던 「예정된 일정 › 캘린더 연결」 숨김 `814063801`(`SHOW_UPCOMING_EVENTS = false`). 배포 `dpl_3TyMVfb6WGcXbxVgtYZ38699Upfr`(빌드 1회), 버전 커밋 `b24b9595a`. **운영 미확인**: 좁은 화면, 직접 주소 새로고침 |
| v1.58 | 2026-11-18 | **Gmail 가져오기 켬(전원 공개, 주인님 승인 WS27)** + 묶음: E3 결재(템플릿·앱 알림 자동화·결재자 전용 칸·칸 AI 「웹에서 찾기」 `e297153b8`·`4ca85f4b2`·`310846f19`·`788c95778`·`c5b26d81c`·`81e816a26`·`b8860ba8c`·`e668caf32`) · 예약 표 첫 생성 직렬화 `d7895f6d4` · 예약 요일 칩 `a41a1e31e` · Gmail(받은 업무 화면에서 본인 Gmail 최근 메일 제목·보낸 사람·날짜를 보고 골라 넣기, 서버 `3c820f2b6`·화면 `8069f60df`·스위치 `722a3ba99`). 운영 SQL 0074·0075 적용(2026-11-18). 배포 `dpl_8GoargZugPSSqT5atpJ5PZqWbDyd` READY(소스 `9ea979de9`, 운영 alias 일치 Master 확인 — 근거 `.ai/results/QA-20261118-049-CX-QA-01.md`, 2026-11-20 기록 보충) |
| v1.57 | 2026-11-17 | **예약 링크 운영 활성화**(주인님 승인 WS-20261117-22): 스위치 3개(`BOOKING_ENABLED`·`BOOKING_UI`·`BOOKING_FORM_UI`) ON, 회원 「캘린더 연동 › ③ 예약 받기」 + 손님 `/book/<토큰>`. 운영 `aww` 표 2개 첫 사용 생성. 실검증 1건(구글 POST 200·고정 id·구글 일정 정리 1개·앱 QA 1행 released로 칸 점유 해제 완료). 첫 생성 경합 P2 열림. 소스 `3faafa33a`, 배포 `ai-work-workspace-hgzm0d922`(`dpl_HrBf8mQHD7hqTw62Mgs2WuowS7Px`, Master 실행) |
| v1.56 | 2026-11-17 | **146 Professional Studio 묶음 + Next 16.4.6 보안 패치**(주인님 「배포 진행해」): 146 S0~S5 남색 사이드바·관제 대시보드(`/<domain>/studio`)·달력 월 구분·Alt 끌기 복제·오늘 인디고, 영수증 워크스페이스 안(`/<domain>/receipts`, 왼쪽 메뉴)·계정 전환 보호(서버 기대 계정 409·초안 계정 묶음), 키 화면 캘린더 연결 상태, 상단 제목·사이드바 ko/en, 영수증 스크롤 복구, E1 notify_me·템플릿 2종, E2 7-1 포커스 폴링, 포털(스위치 OFF), DB 전체 여백 24px. `next` 16.4.3→16.4.6(GHSA-mfr8-8qww-v76h). tsc 0·시험 370·로컬 build. 소스 `90612778f`~`0b43be22c` + `c38b84403`. 배포 `ai-work-workspace-qnc5ykmtx`(`dpl_GUNMN7RG3XoQVdZmbihJC3qCTJSC`) |
| v1.55 | 2026-11-17 | **캘린더 노션식 표기·높이 + 업무 현황판 전체 너비**(주인님 직접 지시·「배포 진행해」): 한국어 화면 캘린더 월 제목 「2026년 11월」·요일 「일 월 화」·매달 첫날 「11월 1일」, 한 주 칸 124→240px(`370e05836`). 새 「📊 업무 현황판」은 전체 너비, 기존 현황판은 값이 없을 때만 열 때 한 번 켬·회원이 끈 설정 유지(`12a5ff17d`). 버전 `ad87f6681`. 배포 `ai-work-workspace-3z2m9m4xy`(`dpl_BMPNHzYFHceb1WcAMHUhLmjjtqNE`) |
| v1.54 | 2026-11-16 | **MCP 승인 키 보완**: 승인 키가 객체 키 순서와 무관(깊은 정렬, 배열·값·타입 보존, 배포 전 승인은 같은 순서만 1회) `74e179bbe` + 같은 실행의 동치 승인(새·옛 형식)을 한 번의 CAS로 함께 소진해 같은 논리 호출은 1번만 `ed7a5f200`. 시험 215. 배포 `ai-work-workspace-aolp0pevu` (WS-09 독립 QA-08 전 주인님 지시로 배포) |
| v1.53 | 2026-11-16 | **무인 실행 「삭제 가능」 표시 우선 검토 + 매뉴얼 MCP 승인 안내 정확히**: 정시·이벤트 실행에서 서버가 읽기 표시와 「삭제 가능」 표시를 함께 보낸 도구도 「검토 필요」로 멈춤(`agents/tools.ts`) `4e64c8cbd`, 매뉴얼에 대화 중/혼자 실행/AI 채팅 차이·읽기 표시는 서버 정보 기준·삭제 가능 표시 규칙 `9ebc3a54e`·`68743bcf9`. 시험 205. 배포 `ai-work-workspace-kffwahde1` |
| v1.52 | 2026-11-16 | **에이전트(정시 실행) 바깥 MCP 연결 열기 + 「허용」 1번 = 바깥 호출 1번**: 에이전트 연결 명령 4개 엶(공유·프리셋은 닫음), 회원 없는 실행에서 쓰기·삭제 도구는 「검토 필요」로 멈춤, 한도는 회원 기준, 승인은 실행 기록에서 조건부로 한 번만 소진(`agents/runs.ts` `consumeApprovedCall`·`decideRunReview`) `270f87b20`·`d8290ffb6` + 한국어화 남은 곳(연결 추가 창 제목·채팅 모드 「계획」·폼 공유 메뉴) `49c8011cd`. 시험 202. 배포 `ai-work-workspace-tm8aegejd` |
| v1.51 | 2026-11-15 | **업무 비서(AI 채팅) 바깥 MCP 호출**: AI 채팅 연결 명령 엶(에이전트 연결·프리셋은 닫음), 회원당 1분 30번·하루 500번(`litpage/server/aimasterMcpGuard.ts`), 쓰기·삭제 도구는 승인 방식과 상관없이 항상 확인, 오늘 쓴 횟수·매뉴얼. 시험 190 |
| v1.50 | 2026-11-15 | **공개 폼(공개 페이지 2단계)**: 「누구나(공개)」 폼을 로그인 없이 `/form/<id>`에서 응답(공개 입구 폼 명령 3개, `src/server/publicForms.ts`), 개인정보 수집·이용 동의 필수(목적·보관 기간 회원 설정), 응답자 1분 5번·폼 하루 300건, 관리자 내리기·신고, 응답 사본 메일·파일 올리기 닫음, 오늘 쓴 횟수에 공개 폼. 시험 186. 플랜 `docs/PLAN_20261115_PUBLIC_FORM_AND_MCP.md` |
| v1.49 | 2026-11-15 | 토큰 주소 권한 판정 한 곳으로(`src/server/tokenOwnerAccess.ts` `tokenOwnerAllowed` — 캘린더·MCP·공개 REST API·회원 정시 실행·공개 페이지, 동작 같음) + 볼타 인증서 단계에서 중복 「다시 등록」 버튼 숨김 `dd08e49b8`. 시험 181 |
| v1.48 | 2026-11-15 | 볼타 처음 설정 「👉 지금 할 일」 하나만 크게(`boltaNextStep`, 만료 30일 안이면 갱신 안내) + 공동인증서 등록 창 닫으면 상태 자동 새로고침 `a22503ee4`. 시험 181 |
| v1.47 | 2026-11-15 | 자동화 실행 기록 보강(메일·카카오톡 알림 실패 기록, 실행 기록·멈춘 이유 한국어 표시) `b281f81bc` + 키 화면 「오늘 쓴 횟수」 `29eb81b8e` + 볼타 공동인증서 만료 알림(30일·7일 전·만료, 매일 정리 작업) `9e93123b5` + 볼타 발급 결과 30초 뒤 자동 확인. 시험 180 |
| v1.46 | 2026-11-15 | 받은 업무 표 「보낸 프로그램」 한국어 이름(공용 이름표 `src/lib/programLabels.ts`) `94b208d8f` + 공개 페이지 1단계 빈틈 2개(공유 탭 「링크가 있는 누구나」 숨김, 관리자 내리기·게시자 이용 기간 종료를 로그인한 다른 회원 화면에도) `72a727cbf` + 데스크톱 알림 제목·업데이트 패널 줄 한국어 어순 `e8dd04103`. 시험 176 |
| v1.45 | 2026-11-15 | **할 일 플래너 2번**: 표 행·선택 막대 「•••」 → 「📨 할 일 플래너로 보내기 (N개)」(최대 50개, 마감일·우선순위), 플래너에 대기 중인 같은 항목(원본 주소+제목) 건너뛰기(페이지 메뉴에도), 「N개 선택됨」·「N개 페이지」 한국어화 `35e680abb` + Gemini 출처가 다음 요청 답에 올 때도 「검색함」에 붙이기 `c05873844`. 시험 174. 플랜 `docs/PLAN_20261115_PLANNER_ROWS_DEDUP.md` |
| v1.44 | 2026-11-15 | **Gemini 내장 구글 검색**(`google_search` + 함수 도구면 `includeServerSideToolInvocations`, toolCall·toolResponse 원래 조각을 서명과 함께 되돌려 보냄, groundingMetadata → 출처, `81b56f898`) · 키 화면 「🔎 AI 비서 웹 검색」 상자(네이버 ID·Secret·카카오 REST·Tavily·Perplexity·SerpAPI 직접 등록, Tavily `tvly-`·Perplexity `pplx-` 형식 확인, `90c190a96`) |
| v1.43 | 2026-11-15 | AI 비서·에이전트 **「🔎 웹 검색 도구」 고르기** — 자동 · AI 모델 내장 · 네이버 · 카카오(다음) · Tavily · Perplexity · 구글(SerpAPI). 외부 검색은 「web_search」 함수 도구로 모든 모델 공통(Gemini 키 회원도 검색 가능), 회원 본인 키(공용 user_api_keys 그대로), 설정 `user_settings.aww_search_tool`, 화면 키 화면 카드. 코드 `src/litpage/server/ai/providers/webSearch.ts`·`src/server/searchPrefs.ts`. 시험 171개. 플랜 `docs/PLAN_20261115_SEARCH_TOOL_CHOICE.md`. Gemini 내장 구글 검색(`google_search`)은 다음 단계 |
| v1.42 | 2026-11-15 | 받은 업무 「🧾 세금계산서 초안」(회원 AI 키로 주문·견적 글에서 거래처·품목·금액을 읽어 영수증·세금계산서 발행 칸에 채움, `a8a495cbf`) · 「📊 표에 행으로 넣기」 넣을 표 고르기(`9b9f3bb11`) · 매뉴얼 「🔌 MCP·REST API」 단락(`5e591b63c`) |
| v1.41 | 2026-11-15 | v1.40 운영 검수(시험 계정 테스트 키, 엣지)에서 찾은 수정: 수정발행 입력칸에 마이너스(-) 입력 가능(`a48a8e4cb`), 수정발행 카드 가로 넘침 해소, PDF는 같은 화면에서 바로 내려받기(볼타 주소가 attachment라 새 탭이 비던 문제), PDF는 발급한 키 종류로만 한국어 안내(`6e4314eb1`) |
| v1.40 | 2026-11-15 | 볼타 **수정발행 5가지**(계약의 해제·착오에 의한 이중발급·공급가액 변동·환입·기재사항 착오정정 — 「발급 취소」는 계약의 해제·이중발급) + **발급 완료 PDF 내려받기**(원본·수정분·취소분). 서버 `btAmend`·`btAmendCheck`·`btPdf`(src/server/bolta.ts), 본문 순수 함수 `boltaAmendBody`(boltaCore.ts), 웹훅이 수정분·취소분 번호도 반영, 화면 `src/app/receipts/AmendPanel.tsx`(표 아래 카드). 이중 발급 방지 규칙은 정발행과 같음(요청 번호·본문 먼저 저장 → 불확실하면 다시 보내지 않고 번호로 조회). 실제 키는 동의 뒤에만. 시험 164개(+9). 함께 나간 것: 남은 영어 한국어화 `ed54706b1`·`f489ea353`. 플랜 `docs/PLAN_20261115_BOLTA_AMEND.md` |
| v1.39 | 2026-11-14 | 왼쪽 메뉴 버전 표시를 `src/lib/version.ts`에서 불러오게 고친 것(`9adffe5df`)만 내보낸 배포 — 메뉴에 v1.39가 보이는지 운영 확인 |
| v1.38 | 2026-11-14 | 키 화면 그룹 상자·AI 비서 플랫폼별 기본 모델·큰 파일(4~50MB) Supabase Storage 저장·공개 페이지 1단계(`/public/<번호>`, 신고, 관리자 `/settings/public-pages` 내리기). 운영 확인: 10MB 올리기·내려받기(서명 주소, 크기 일치), 게시 → 로그인 없이 보기(noindex·읽기 전용) → 신고 → 내리기 뒤 404 통과. **왼쪽 메뉴 버전 표시(`AimasterSidebar.tsx`)는 빠뜨려 v1.37로 보임 — 코드는 v1.38로 고쳐 두었고 다음 배포 때 반영** |
| v1.37 | 2026-11-13 | 볼타 웹훅 실제 수신 수정(알림이 요청 후 약 3초 만에 와도 처리, 「_」 든 접수 번호, 발급 상태 덮어쓰기 방지, 거절 이유 진단 기록, HEAD 200) — 운영에서 버튼 없이 자동 「발급됨」·승인번호 기록 통과 |
| v1.36 | 2026-11-13 | 볼타 웹훅(회원 전용 주소 + 서명 확인 → 발급됨/실패 사유 자동 기록) · 일정 리마인더를 내 메일/카카오톡으로도(키 화면 「🔔 알림 받기」) · 공개 REST API `/v1`(MCP 개인 토큰 그대로, 분당 60·90일 — 운영 실제 호출 통과) · 볼타 설정 칸 항상 보이기 · AI/에이전트 단계 표시 한국어화 · 볼타 처리 상태 문구. 운영 DB 키 허용 목록에 `bolta_webhook_secret` |
| v1.35 | 2026-11-13 | 세금계산서 **볼타 바로 발급**(회원 본인 API 키 test_/live_, 발급자 등록·공동인증서 등록·실제 발급 동의·문서별 발급/결과 확인, 요청 번호 먼저 저장 후 접수 조회로 이중 발급 방지) — 운영 테스트 발급(과세·면세) 통과. 왼쪽 메뉴 버전 표시. 운영 DB 키 허용 목록에 `bolta_api_key`. 처음엔 팝빌로 만들었다가 주인님 지시로 볼타로 교체(팝빌 코드 삭제) |
| v1.34 | 2026-11-13 | 미룬 기능 4개: 에이전트 웹 검색(회원 키 내장 검색, 운영 실제 검색 통과) · 자동화/버튼 웹훅 · 자동화 알림 내 메일·카카오톡(공용 연동 재사용, 본인에게만, 채널별 하루 100) · MCP 서버 1단계(`/api/mcp`). 로그아웃 이 기기만 |
| v1.33 | 2026-11-13 | 업무 현황판 소제목 겹침 수정, 플레이리스트 이름표 |
| v1.32 | 2026-11-13 | 「📊 업무 현황판」(콘텐츠 캘린더·받은 업무 표 연결 보기 + 할 일 표), 로그인 끊김 때 「다시 로그인」 띠, 원본 서버 영어 오류 문구 227개 한국어, 영수증 PDF 증빙 읽기 |
| v1.31 | 2026-11-13 | 단독 화면(받은 업무·영수증·캘린더 연동) 스크롤 수정, Shots·원스톱 이름표. 홈택스 엑셀 실제 업로드 통과 |
| v1.30 | 2026-11-12 | 🧾 홈택스 전자세금계산서 일괄발급 엑셀(공식 양식 채우기, 100건·품목 4줄), 저장공간 위젯 |
| v1.29 | 2026-11-11 | U13 보강: 「공유됨」에 다른 워크스페이스에서 공유된 페이지, 게스트 멤버 자격 요청·주인 승인. 구글 연결 안내(공용 「내 구글 앱 만들기」 매뉴얼 버튼, 테스트 중 7일 끊김 → 앱 게시, Calendar API 켜기). 시험 110·원본 523, 관리자 쪽 운영 확인 |
| v1.28 | 2026-11-11 | U13 협업: AIMaster 회원(이용 권한 있는)만 초대, 워크스페이스 초대·페이지 공유·접근 요청, 공유 페이지 5초 확인·함께 보는 사람, 동시 편집 잠금, 공유 페이지 첨부 파일, 프로필 공개 범위, 초대 링크·공개 링크 닫음. 캘린더 가져오기 시간 유지, 에이전트 기본 이름 「새 에이전트」. 시험 107·원본 523 |
| v1.27 | 2026-11-11 | 데이터 보관 예외(주인님 지정): 음악·영상 파일 30일, 그 밖 생성 데이터 1년(`mediaRetention.ts` 새로, AI·자동화·받은편지함·영수증 365일). 캘린더 표 이름·구글에서 지운 일정 되살리기·보내기/가져오기 선택 분리·테스트 사용자 안내. 에이전트 화면 한국어 25키·웹 액세스 「준비 중」. 시험 90/90·원본 523/523, 지운 일정 되살리기 운영 확인 |
| v1.26 | 2026-11-11 | 📅 캘린더 연동(`/calendar-sync`) — 회원이 고르기: ① 간편 구독(ICS 비밀 주소, 토큰 해시만 저장, 다시 만들기·끄기, 이용 권한 확인) ② 구글 계정 연결(회원 본인 구글 OAuth 앱, 공용 `member_platform_accounts` `google_calendar`, 표→구글 일정 보내기 중복 방지, 구글 일정 30일→표 가져오기 한 번만). 키 화면 구글 앱 두 칸, 공용 `memberIntegrations` 사본. 시험 89/89, ICS 운영 확인 통과 |
| v1.25 | 2026-11-11 | 🧾 영수증·세금계산서(`/receipts`, 왼쪽 메뉴) — 받은 증빙 사진 자동 정리(회원 본인 AI 키 Claude→OpenAI→Gemini, 사진 저장 안 함)·증빙 장부·월 합계·CSV, 간이영수증·거래명세서·세금계산서(확인용) 작성·사진으로 채우기·인쇄/PDF, 내 사업자·거래처·품목. 저장은 워크스페이스 자체 표(`aww_rcpt_*`, 운영 표 변경 없음), 30일 정리. 홈택스 일괄 발급 엑셀은 공식 양식 파일 받은 뒤. 시험 80/80, 운영 확인 통과 |
| v1.24 | 2026-11-11 | U12 업무 비서(맞춤 에이전트) — 에이전트 열기(공유·주인 넘기기·바깥 연결 제외), 백그라운드 실행은 에이전트 주인 회원 본인 키로(`src/server/agentRuns.ts`, 원본 서버 시작 시 전체 회원 복구 제거), 정시 비서는 회원 cron-job.org(`agent-recurrence`), 요금제 조건 제거, 새 비서 월 상한 700 크레딧·첫 비용 안내 동의, 웹 검색 끔, 한국어 템플릿 6종, 자동화 화면 한국어 84개·「○○의 자동화」, 매뉴얼 카드. 시험 67/67·원본 523/523, 운영 확인 통과 |
| v1.23 | 2026-11-10 | U11 자동화 — 데이터베이스 자동화·버튼 열기(웹훅·에이전트 「준비 중」), 회원 본인 cron-job.org 1분 정시 실행(새 표 `aww_member_scheduler`, 공용 `member-scheduler` 사본), 상태 줄 일시정지·재개, 실행 기록·알림 30일 정리 + 받은 업무 이름표 실제 slug. 운영 확인 통과(`docs/IMPROVEMENTS.md` 「U11 운영 확인」) |
| (미배포, v1.22 예정) | 2026-11-06 | 음성 파일 받아쓰기 엔진 회원 선택 — 회의록 설정 메뉴 「음성 파일 받아쓰기 엔진」(Gemini·OpenAI 키 둘 다일 때만) 자동(Gemini 우선)/OpenAI, 회원 설정 `meeting_stt_engine`, 서버 `memberSttMode(preferred)`·`meetingStatus.sttModes/sttEngine`. 요청함 `c234b28c` 「진행해」 결정, 플랜 `docs/PLAN_20261106_STT_ENGINE_CHOICE.md`. 앞선 미배포 `376c55c7a`·`a80274b4c`와 함께 배포 예정 |
| v1.19 | 2026-10-25 | v1.19 — U8-B 할 일 플래너로 보내기: 페이지 「⋯」 → 「📨 할 일 플래너로 보내기」(체크 안 된 할 일 항목 최대 30개 / 이 페이지를 할 일 하나로 — 표 행이면 마감일·우선순위), 서버 명령 `workInboxSendToPlanner`(회원 본인 공간 페이지만), 공용 표 `work_inbox.target_slug` 열 추가(주인님 승인, 운영 적용 `20261025000100`), 받은 업무는 받는 곳이 워크스페이스인 줄만, 기준 코드 `targetSlug` 선택값, 표 「받은 날」 한국 날짜(`c6d4ca3ba`), 표 행 「OPEN」→「열기」, 매뉴얼 카드 — `b121bdfde`, 배포 `ai-work-workspace-ho0fq9vle`. 미배포: `94719d8da`(표 행 페이지의 글자형 우선순위·날짜 칸 읽기) |
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
- **예약 링크(E2 7-2)**: v1.57 운영 활성화(2026-11-17). 남은 것: 첫 표 생성 경합 수정 `d7895f6d4`(QA028 통과, **미배포 다음 묶음**), 요일 체크칸 모양, 실제 409·숨은 속성·실기기 미검수 — `.ai/results/WS-20261117-22-CC-WORKSPACE-01.md`. (이전 기록: 켜기 조건(표 2개 승인·스위치 3개·실제 구글/HTTP 확인·cron 실제 켜짐일 때만 자동 확인·손님 통지 없음)은 `.ai/results/WS-20261117-21-CC-WORKSPACE-01.md` 최종 통합 검사.)
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) · [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) 「미배포 대기」.
- **보류(2026-11-14 주인님 「나중에 필요시」)**: 볼타 실제(live_) 발급 — 할 때는 볼타 실제 환경에 발급자·인증서·웹훅 주소·서명 키를 테스트와 따로 등록.
- **실제 확인 남음**: 리마인더 실제 발송, 자동화 알림 메일·카톡 실제 발송, MCP 서버에 외부 도구 연결, 원스톱·플레이리스트 「업무 워크스페이스로」 버튼.
- **하지 않기로 한 것**: 바깥 MCP 서버 연결(운영자 서버가 임의 주소를 자주 호출 + 외부 응답이 AI에 그대로 들어감 — 수요 확인 뒤 별도 플랜), 팝빌·바로빌(볼타로 정리).

## 6. 다른 프로그램 연계·아이디어
블로그·SNS 원고/발행 기록 → 콘텐츠 캘린더 데이터베이스, `ai-task-planner` 할 일 ↔ 업무 보드, 회의 메모 → AI 에이전트 요약·담당자 알림(회원 본인 메신저 연동). 상세: `docs/IMPROVEMENTS.md`.
- (2026-11-13 추가) 볼타 발급 코드(`src/server/bolta*.ts`)는 쇼핑몰 빌더(D19, 볼타 사용 예정)·견적/정산이 있는 다른 프로그램에서 그대로 가져다 쓸 수 있음 — 공용 기준 코드 후보. 자동화 웹훅으로 Make·n8n 연결, MCP 서버로 Claude Desktop에서 받은 업무·캘린더 조작, 알림 메일·카톡 발송 코드(`src/server/externalNotify.ts`)는 다른 프로그램의 「나에게 알림」에 재사용 가능.

## 7. UI/UX 개선안
원본 디자인 값(`--lp-*`, 라이트·다크) 유지 + AIMaster 좌측 메뉴 규격(`AimasterSidebar.tsx`). 개선안: 시작 화면에 한국어 템플릿 묶음, 휴대폰 ☰ 메뉴에 매뉴얼 빠른 진입, 데이터베이스 빈 상태 안내 그림. 상세: `docs/DESIGN_HANDOFF.md`.

## 작업할 때 주의
- **배포**: 다른 명령과 같이 실행하지 말고 단독으로 `vercel deploy --prod --yes --scope buylife --cwd "D:/Antigravity/AIMaster/ai-work-workspace"`(2026-10-24 동시 실행으로 메인 사이트가 배포된 사고 — `docs/ERROR_LESSONS.md`). Git Bash의 `vercel api /v9/…`는 `MSYS_NO_PATHCONV=1`.
- 원본 서버 SQL은 SQLite 문법으로 써도 변환기를 거친다. JSON 값을 숫자로 비교·정렬하면 `json_num(data,'$.x')`, 참거짓은 `json_true(...)`.
- 모듈을 불러올 때 표 만들기(DDL)가 실행된다(원본 방식). 새 표도 `CREATE TABLE IF NOT EXISTS`로 쓰면 된다(`aww_app`이 스키마 주인).
- **(2026-11-13 배운 것)** ① 버전은 두 곳을 함께 올린다(v1.21·v1.34 두 번 빠뜨림). ② 공용 `user_api_keys`에 새 provider 이름을 쓰면 운영 DB 제약에 먼저 추가(안 하면 화면에 「저장하지 못했습니다」만 나옴). ③ 로컬 `npm run build`가 `pg_type_typname_nsp_index` 오류로 실패하면 다시 돌린다(빌드 작업자 여러 개가 동시에 표를 만들며 생기는 경합, 코드 문제 아님). ④ 외부 발급·결제류는 「요청 번호를 먼저 저장 → 응답 없으면 조회부터 → 없을 때만 같은 번호로 재전송」(`bolta.ts`). ⑤ 원본 서버가 영어로 보내는 문구는 서버 여러 곳을 고치지 말고 화면 표시 지점에서 사전(`i18n.literals.ko-KR.json`)으로 바꾼다. ⑥ 외부 문서끼리 설명이 다르면 공식 SDK 소스(MIT)를 읽어 확정한다.
- 운영 SQL은 크롬 SQL 편집기에서 **실행 버튼**으로 돌린다(단축키 Ctrl+Enter가 다른 탭 입력칸으로 가는 일이 있었음).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
