# AI 업무 워크스페이스 자동화 — 첫 개발 플랜 (2026-10-24)

- 프로그램: **AI 업무 워크스페이스 자동화** / slug `ai-work-workspace` / 카테고리 **업무자동화** (이름 2026-10-24 주인님 확정)
- 대상 프로젝트: **① AIMaster 운영** (공용 DB ref `esgxyikcnnvmlhygjkth`, 주소 `ai-work-workspace.buylife.xyz`)
- 원본: [litmers-dev/litpage](https://github.com/litmers-dev/litpage) (MIT, 저작권 씨그로 주식회사(리트머스)) — 원본 저작권 표시와 `THIRD_PARTY_NOTICES.md`를 폴더에 그대로 유지한다
- 상태: **플랜 — 주인님 승인 대기** (코드 작성 전)

## 1. 문제와 목표

원본 litpage는 노션과 같은 종류의 업무 워크스페이스입니다(블록 편집기 41종, 데이터베이스 보기 12종, 동시 편집, AI 채팅·에이전트, REST API·MCP). 다만 「설치한 회사 하나」를 기준으로 만들어져 있어 AIMaster 규칙과 아래 네 가지가 맞지 않습니다.

| 원본 | AIMaster 규칙 | 바꾸는 방법 |
|---|---|---|
| SQLite 파일 DB(`node:sqlite`, 서버 코드 104개 파일·455곳에서 직접 실행) | 공용 Supabase DB 하나 + 회원별 RLS | 「모든 데이터는 레코드」 구조를 그대로 살려 Supabase 표로 옮김 |
| 자체 로그인(이메일 코드·비밀번호·패스키) | AIMaster 통합 회원·권한 | `.buylife.xyz` 로그인 쿠키 + `requireProgramAccess()`/`checkProgramAccessApi()`(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+기간) |
| AI 키를 서버 환경변수 하나로 모두가 공유 | 회원 본인 키만 사용, 폴백 금지(최상위 규칙) | `user_api_keys`의 회원 본인 OpenAI·Anthropic 키로 바꾸고, 키가 없으면 등록 안내 팝업 표시 |
| 상시 실행 서버(WebSocket·예약 작업·디스크 파일) | 프로그램별 Vercel 프로젝트 | Vercel 함수 + Supabase Realtime(실시간) + Supabase Storage(파일) + 회원 본인 cron-job.org(예약) |

**목표:** 회원이 본인 워크스페이스에서 문서·업무 데이터베이스를 만들고, 본인 AI 키로 내용을 묻고·쓰고·채우며, 나중에는 팀원과 함께 편집하고 에이전트로 반복 업무를 자동 처리하게 합니다.

## 2. 기존 프로그램과 비교 (프로그램 비교표 대조)

프로그램 비교표에는 노션형 문서·데이터베이스 워크스페이스가 **없습니다**. 업무 분야에는 `ai-task-planner`(개인 하루 계획·타이머·주간 회고)만 있어 겹치지 않습니다.

| 가져올 곳 | 가져오는 것 |
|---|---|
| `ai-task-planner` | Next.js 16 + Supabase 뼈대, `lib/access.ts`·`programAccess.ts`·`apiKeys.ts`·`supabase/`, PGlite로 하는 로컬 DB 시험 방식 |
| 공용 기준 코드(`SHARED_FEATURE_MAP.md`) | 좌측 메뉴 규격(`← 다른 프로그램 보기`, 계정은 마지막 메뉴 바로 아래, 767px 이하 ☰ 메뉴), `cookieDomain.ts`, API 키 등록 안내 팝업, 「API키등록·플랫폼연동」 설정 화면과 연동 매뉴얼 상자 |
| 예약 기능 기준(`threads-content-ops`, `SCHEDULER_POLICY.md`) | 에이전트 예약 실행을 회원 본인 cron-job.org로 돌리는 방식 |
| 원본 litpage | 화면 전체(편집기·데이터베이스·AI 패널), `packages/shared`(레코드·작업·서식 있는 글·권한·쿼리·수식·자동화 엔진)는 **거의 그대로** 사용 |

**원본의 부족한 점과 보강 방법**

| 원본의 부족한 점 | 보강 |
|---|---|
| AI 키를 운영자 한 명이 부담 | 회원 본인 키, 모델 선택은 회원이 등록한 공급자 기준 |
| 서버 한 대·SQLite 하나라 사람이 많아지면 늘리기 어려움 | Postgres + Vercel 함수로 사용자가 늘어도 버팀 |
| 예약 작업이 서버 안에서만 돎(서버가 꺼지면 멈춤) | 회원 본인 cron-job.org 1분 확인 방식 |
| 한국어 검색 품질(FTS5 trigram) | Postgres `pg_trgm` + 전문 검색 조합으로 한국어 부분 검색 지원 |
| 업무 데이터를 다른 AIMaster 프로그램과 주고받을 수 없음 | 4단계 이후 연계 후보(아래 8번) |

## 3. 구조 설계

```
ai-work-workspace/
  app/                      Next.js App Router 뼈대
    (dashboard)/layout.tsx  requireProgramAccess() + force-dynamic/force-no-store
    (dashboard)/[[...path]]/page.tsx   원본 React 앱을 클라이언트 컴포넌트로 탑재
    api/rpc/[name]/route.ts            원본 RPC(`/api/rpc/<이름>`) 주소 그대로 처리 — 화면 코드 수정 최소화
    api/upload/route.ts, api/files/... 파일 → Supabase Storage(비공개 버킷)
    settings/               API키등록·플랫폼연동(+연동 매뉴얼 상자), cron-job.org 키
    guide/                  연동 & 사용 매뉴얼(8대 템플릿·Step 1~4 카드)
  src/web/                  원본 apps/web/src (Vite 전용 문법 3곳만 교체)
  src/shared/               원본 packages/shared/src (그대로)
  src/server/               원본 apps/server/src 중 사용하는 부분 — DB 계층을 Supabase 비동기 방식으로 다시 작성
  supabase/migrations/      aww_* 표 생성 SQL
  LICENSE, THIRD_PARTY_NOTICES.md   원본 그대로 유지
```

- **화면**: 원본 React 19 화면을 그대로 씁니다. 블록·보기를 자동으로 불러오는 `import.meta.glob` 2곳은 스크립트로 만든 명시적 import 목록으로 바꾸고, `import.meta.env.DEV`는 `process.env.NODE_ENV`로 바꿉니다. 원본 로그인·워크스페이스 만들기 화면은 빼고 AIMaster 로그인으로 넘깁니다.
- **DB(공용 Supabase, 접두어 `aww_`)**: 원본의 「모든 데이터는 레코드」 구조를 유지해서 옮기는 양을 줄입니다.
  - `aww_records`(table_name, id, workspace_id, version, value jsonb, alive, updated_at), `aww_changes`(실시간용 변경 기록), `aww_applied_tx`(같은 요청 두 번 처리 방지), `aww_snapshots`(버전 기록), `aww_activity`, `aww_files`, `aww_search`(검색 색인), `aww_workspace_members`(워크스페이스·회원·역할)
  - RLS: 본인이 속한 워크스페이스만 볼 수 있습니다. 서버는 `createAdminClient()`를 쓰되, 원본 `records.ts`의 권한 판정을 그대로 거친 뒤 `workspace_id`로 직접 걸러서 다른 회원 데이터가 섞이지 않게 합니다.
  - 한 번에 여러 레코드를 바꾸는 저장(`applyChanges`)은 Postgres 함수(RPC) 하나로 묶어 한꺼번에 처리하고 버전 충돌을 검사합니다.
- **AI**: 원본 `ai/providers/config.ts`의 환경변수 읽기 부분만 「요청한 회원의 `user_api_keys`」로 바꿉니다. 키가 없으면 "본인 키를 등록해주세요" 팝업을 띄웁니다. Vercel 300초 제한 안에서 응답을 흘려보내며(스트리밍) 처리하고, 에이전트의 긴 작업은 단계 단위로 나눠 이어서 실행합니다.
- **실시간(3단계)**: 원본 WebSocket 대신 Supabase Realtime 방송(워크스페이스별 채널)을 씁니다. 글자 단위 병합(`textmerge.ts`)은 그대로 씁니다.
- **예약(4단계)**: 원본 `scheduler.ts`의 작업 표를 DB에 두고, 회원 본인 cron-job.org가 1분마다 회원 전용 토큰으로 호출합니다(사이트 비밀값은 넘기지 않습니다).

## 4. 단계별 범위와 순서

| 단계 | 범위 | 제외/보류 |
|---|---|---|
| **1단계 (첫 배포, v1.01)** | 개인 워크스페이스 1개 자동 생성, 페이지·하위 페이지, 블록 편집기 전체, 데이터베이스(보기 12종·수식·관계·집계·템플릿), 사이드바(즐겨찾기·최근), 검색, 휴지통, 버전 기록, 불러오기·내보내기(Markdown·CSV·HTML), 파일 첨부, 라이트/다크·한국어 | 팀 공유, AI, 실시간, 에이전트 |
| **2단계** | AI(회원 본인 키): 워크스페이스 검색 채팅, 글쓰기 도우미, AI 블록, 데이터베이스 칸 자동 채우기, 수식 도우미 | 이미지 생성(→ 이미지 모델 연동은 `ai-image-studio` 기준으로 맞춤) |
| **3단계** | 팀 협업: 회원 초대(AIMaster 회원끼리), 페이지 권한, 댓글·수정 제안·멘션·알림, Supabase Realtime 동시 편집 | 외부 공개 사이트·공개 폼(보안 검토 후 결정) |
| **4단계** | 맞춤 에이전트(예약·페이지 변경·멘션 때 자동 실행), 데이터베이스 자동화·버튼, REST API·웹훅·MCP(회원 개인 토큰) | — |
| **빼는 것** | 원본 체험 모드, 자체 로그인·패스키·2단계 인증(AIMaster 로그인 사용), 워크스페이스 관리자 화면 중 AIMaster와 겹치는 부분, 회의 녹음·요약(필요하면 나중에 별도 검토) | — |

각 단계는 하나의 작업 단위로 「구현 → 로컬 검사 → 배포 → 크롬 화면 검수 → 인수인계 → 커밋」까지 마친 뒤 다음 단계로 넘어갑니다.

### 1단계 세부 순서
1. 폴더 뼈대: `ai-task-planner` 방식 Next.js + 원본 화면·공용 엔진 복사 + 라이선스 파일 → 확인: `npx tsc --noEmit`
2. Supabase 표·RLS·저장 함수 마이그레이션 SQL 작성 → 확인: PGlite 로컬 시험(운영 DB 적용은 주인님 승인 후)
3. 서버 DB 계층을 비동기로 다시 작성(1단계에 필요한 RPC만: `loadPage`·`fetchRecords`·`applyChanges`·`searchWorkspace`·`listRecentPages`·`getTrash`·`duplicateBlock`·버전 기록·사이드바·불러오기/내보내기) → 확인: 원본 단위 시험 중 해당 시험을 PGlite로 통과
4. 권한 연결(로그인 쿠키·`requireProgramAccess`·모든 RPC에 `checkProgramAccessApi`) → 확인: 비로그인·권한 없는 계정 차단 시험
5. 화면 연결: 사이드바 규격(다른 프로그램 보기·계정 위치·모바일 ☰), 매뉴얼(`/guide`), 버전 `v1.01` 표시 → 확인: `npm run build`
6. Vercel 프로젝트 `ai-work-workspace` 생성(동시 빌드 추가 구매 끔) + 도메인 + `programs` 등록(기본 요금제 3단계·`app_url`·설명·`detail_sections`) → 배포
7. 크롬 실제 창에서 `buylifemall@naver.com`으로 검수(페이지 만들기·블록 입력·데이터베이스 보기 전환·검색·휴지통·375px 모바일) → DB 값과 대조
8. 인수인계 문서 6종 + 프로그램 비교표 카드·목록 + 루트 HANDOFF·아이디어 표 갱신 → 커밋·푸시

## 5. 검수 방법

- 자동 검사: 원본 시험 코드(`packages/shared` 시험은 그대로, 서버 시험은 PGlite로 바꿔서) + 권한 차단 시험 + `tsc` + `npm run build`
- 화면 검수: 메인 크롬 실제 창, 일반 회원 테스트 계정으로 실제 로그인(우회 금지), 데스크톱과 375px
- 보안 확인: 다른 회원 워크스페이스 id를 넣어 요청했을 때 거부되는지, RLS로 막히는지 직접 시험합니다(원본 `secfix-*`·`dbsec-*` 시험 내용을 기준으로 삼음)

## 6. 비용 표 (2026-10-24 기준)

| 구분 | 항목 | 예상 | 비고 |
|---|---|---|---|
| 개발·시험 | 로컬 검사(tsc·시험·PGlite·build) | 없음 | 로컬 무료 |
| 개발·시험 | Vercel 배포 빌드 | 단계마다 1~2회, **전체 약 6~9회** | ⚠ 단계별 배포 전 사전 승인, 한 번에 하나씩 순차 배포 |
| 개발·시험 | AI 시험 호출(2·4단계) | 각 단계 10~20회, 시험 계정 본인 키, 가장 저렴한 모델(Haiku 5.5 또는 저가 OpenAI 모델) | 대략 몇백 원 수준, 실행 직전에 다시 보고 |
| 운영자 인프라 | 별도 상시 서버 | **없음**(Railway 등 쓰지 않음) | Vercel·공용 Supabase 안에서 처리 |
| 운영자 인프라 | Supabase 저장 용량·Realtime·Storage | 회원 문서·첨부 파일만큼 증가 | 사용량이 커지면 프리미엄 후보로 재검토(`GRADE_AND_BILLING_POLICY.md`) |
| 운영자 인프라 | 라이선스 | 없음(MIT) | 저작권 표시 유지 |
| 회원 부담 | AI 사용 | 회원 본인 OpenAI·Anthropic 키 요금 | AI를 안 쓰면 0원(1단계 기능은 키 없이 동작) |
| 회원 부담 | 에이전트 예약 | cron-job.org 무료 | 4단계 |

## 7. 주인님 결정이 필요한 것

1. **30일 자동 삭제 규칙 — ✅ 확정(2026-10-24 주인님 지시: 「이렇게 해」)**: 이 프로그램에서 **회원이 직접 쓴 문서·페이지·데이터베이스(행·보기·첨부 파일 포함)와 버전 기록은 30일 자동 삭제 대상에서 제외**한다(회원 업무 자료). **AI 채팅 기록·AI 에이전트 실행 기록·임시 캐시(검색·불러오기 중간 파일)·휴지통 항목은 생성일(휴지통은 버린 날) 기준 30일 후 자동 삭제**한다. 회원별 소유·RLS 격리·다른 회원과 공유 금지 원칙은 그대로다. DB 설계: 삭제 대상 표·레코드에 `created_at`/`trashed_at` 기준 정리 작업을 둔다(1단계 휴지통, 2단계 AI 기록).
2. **운영 DB 적용 — ✅ 승인(2026-10-24 주인님 지시: 「진행해」)**: 1단계 마이그레이션 SQL(표 8개 + RLS + 저장 함수)은 로컬 PGlite 시험 통과 후 운영 공용 DB(ref `esgxyikcnnvmlhygjkth`)에 적용한다. 적용한 SQL은 `supabase/migrations/`에 파일로 남긴다. 이 승인은 1단계 표 생성 범위만이며, 기존 공용 표 변경이 필요해지면 다시 여쭌다.
3. **이용 권한·뱃지 — ✅ 확정(2026-10-24 주인님 지시: 「우선 일반 등급 이상 사용자로 해줘」)**: `programs.required_grade_id` = **일반**, FREE 뱃지 없음, 기본 요금제 3단계 등록. 공통 판정 규칙(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간)상 **일반 등급 이상이면서 관리자가 사용기간을 넣어 준 회원 또는 구독 회원**이 사용한다(등급만으로는 열리지 않음). VIP 자동 부여는 「우선」 범위 밖이라 보류(나중에 주인님 지정).

4. **DB 연결 방식 — ✅ A안 확정(2026-10-24 주인님 선택: 「A. 전용 DB 계정 직접 연결 (추천)」)**: 원본 서버가 SQL을 직접 실행하는 구조(104개 파일·455곳)라 `supabase-js`(REST)만으로는 트랜잭션·임의 SQL을 쓸 수 없다. 그래서 ① `aww_*` 표에만 권한이 있는 전용 DB 계정 `aww_app`(+ 권한 판정용 `profiles`·`programs`·`subscriptions`·`user_program_access`·`member_grades`·`user_api_keys` 읽기 전용)을 만들고 ② Vercel 환경변수 `AWW_DATABASE_URL`(Supabase 연결 풀 주소, transaction 모드)로 `postgres`(postgres.js, `prepare:false`) 드라이버를 써서 직접 연결한다. 비밀번호는 SQL 편집기에서 무작위로 만들어 화면·문서·채팅에 남기지 않고 Vercel 환경변수에만 넣는다. 원본 SQL은 Postgres 문법으로 옮기고(`?`→`$n`, `json_extract`→`data->>`, `INSERT OR IGNORE`→`ON CONFLICT DO NOTHING`, FTS5→`pg_trgm`), 서버 코드는 비동기(async)로 바꾼다. 공용 권한 판정(`profiles` 등)은 기존 프로그램과 같은 `createAdminClient()` 방식을 유지한다.

## 8. 다른 프로그램과의 연계 후보 (4단계 이후, 아이디어 표에 등록 예정)

- 블로그·SNS 프로그램의 원고·발행 기록을 워크스페이스 데이터베이스(콘텐츠 캘린더)로 보내기
- `ai-task-planner`의 할 일을 워크스페이스 업무 보드와 주고받기
- 회의 메모·조사 결과를 AI 에이전트가 정리해 담당자에게 알림(회원 본인 메일·메신저 연동)

## 9. 버전·배포·인수인계

- 버전: 첫 배포 `v1.01`(코드 `lib/version.ts` + DB `programs.version`). 미배포 커밋은 버전을 올리지 않습니다.
- 배포: 단계마다 예외 ②(다음 단계가 실제 화면 검수를 전제로 함)를 적용해 단계 끝에 배포합니다. 다른 세션의 빌드가 진행 중인지 확인한 뒤 배포합니다.
- 인수인계: `AGENTS.md`(7대 항목)·`README.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`·`docs/DESIGN_HANDOFF.md`·이 플랜, 루트 `docs/HANDOFF.md`·`PROGRAM_CAPABILITY_MAP.md`·`PROGRAM_IDEA_BACKLOG.md`
- 원본 분석 사본(저장소 밖 임시 폴더)은 1단계 복사 때 원본 커밋 `81665d4` 기준으로 다시 내려받아 씁니다.
