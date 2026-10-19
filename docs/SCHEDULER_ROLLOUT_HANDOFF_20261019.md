# 예약 방식(Vercel / 회원 본인 cron-job.org) 적용 — 인수인계서 (2026-10-19)

> 작성: Claude Code(윈도우), 2026-10-19. 주인님 지시: 「남은 작업은 다른 Claude 세션에 맡긴다 — 이 과정과 결과물을 인수인계 문서로」.
> **이어받는 CLI는 이 문서 → 루트 [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md)(지침·체크리스트 §7·현황 §8) → 아래 기준 구현 순서로 읽고 시작한다.**
> 대상: ① AIMaster 운영(DB `esgxyikcnnvmlhygjkth`). Lab 작업 아님.

---

## 0. 한 줄 요약
회원이 **예약 발행 실행 방식을 고른다**: 「AIMaster 기본(Vercel)」(운영 기본, 키 없음) 또는 「내 cron-job.org」(회원 본인 무료 계정, API 키 한 줄). 회원 cron-job.org에는 사이트 비밀값이 아닌 **회원 전용 토큰**(DB엔 해시)만 넣고, 예약하면 작업을 **자동으로 켜고** 남은 예약이 없으면 **자동으로 끈다**. 같은 작업에서 **중복 발행 방지**와 **24시간 넘게 밀린 예약은 올리지 않는 규칙**을 넣는다.

## 1. 진행 현황

| # | 프로그램 | 상태 | 버전·배포 | 비고 |
|---|---|---|---|---|
| 기준 | `threads-content-ops` (Threads 콘텐츠 운영) | ✅ 실검수 완료 | v2.08 | 최초 기준 구현 |
| — | `threads-affiliate-poster` (쓰레드 쇼핑제휴) | ✅ 실검수 | v1.63 → **v1.64** | ✅ 24시간 규칙 코드·Claude·Replicate 키 저장 오류 — 2026-10-19 다른 Claude 세션이 v1.64로 처리·배포(커밋 `2bdeb523`, `threads-affiliate-poster-5ql36sudm`) |
| ① | `threads` (쓰레드 자동포스팅, slug `auto-threads-posting`) | ✅ 배포·자동 확인·**크롬 실검수(2026-10-20)** | v1.19 · `threads-80uxhi9g1` | 커밋 `d2758f2c`. 표 `atp_member_scheduler`. 운영 전용 → 기본 Vercel |
| ② | `insta_auto_poster` (INSTA 포스팅, slug `auto-instagram-posting`) | ✅ 배포·자동 확인·**크롬 실검수(2026-10-19, v1.26)** | v1.25 · `insta-auto-poster-46r0me9fo` | 커밋 `60c13f7e`·`14245086`. 표 `insta_member_scheduler`. **배포판(SNS 키트) 있음** → 운영 Vercel / 배포판 cron-job.org, `KIT/` 함께 갱신 |
| ③ | `cardnews-studio` (카드뉴스, v1.23) | ⚪ **다음** | — | 아래 §4-1 |
| ④ | `naver-cafe-poster` (네이버 카페, v1.20) | ⚪ | — | 아래 §4-2 (정기 자동 실행형) |
| ⑤ | `kakao_auto_poster` (카카오, slug `kakao-auto-posting`, v1.20) | ⚪ | — | 아래 §4-3 (정기 자동 실행형) |
| 끝 | 5개 전체 **크롬 실화면 검수** | ⚪ | — | 주인님 지시: 5개를 다 적용한 뒤 한꺼번에(§6) |

「자동 확인」 = 실행 주소 무인증·가짜 토큰 401, `/login` 200, **새 배포의 첫 운영자 예약 실행(vercel-cron) 200**을 `vercel logs requests`로 확인.

## 2. 한 프로그램을 적용하는 순서 (①·②에서 실제로 한 그대로)

1. **시작 확인**: `docs/ACTIVE_WORK.md`(그 폴더 작업 중인 CLI 없는지), `git status --porcelain -- <폴더>`(남의 미커밋 변경), 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`. 작업 중 표에 내 줄 추가.
2. **구조 조사**: 예약 글 표·상태값(`scheduled`/`publishing`), 기존 실행 주소(`vercel.json` crons), 저장 서버 액션(create/update), 설정 화면 테마(밝음/어두움), 독립 모드(`src/lib/deployment.ts` `IS_STANDALONE`)·`KIT/` 유무, slug(`src/lib/access.ts`).
3. **플랜 문서**: `<폴더>/docs/PLAN_20261019_MEMBER_SCHEDULER.md`(문제·범위·순서·검수·비용·버전) → 주인님께 요약 보고.
4. **코드(기준 사본 + 이름만 바꾸기)** — 기준: `threads/`(배포판 없음) 또는 `insta_auto_poster/`(배포판 있음)
   - `src/lib/posts/cronJobOrg.ts`: 주소 `MEMBER_DISPATCH_PATH`, 작업 이름 `CRON_JOB_TITLE`(배포판은 「AIMaster」 빼기)
   - `src/lib/posts/memberScheduler.ts`: 표 `<접두사>_member_scheduler`, 글 표 이름, 토큰 접두사(`<접두사>_` + 64 hex, 정규식도), 환경변수 `<접두사>_PLATFORM_SCHEDULER`, `DEFAULT_SCHEDULER_MODE`(배포판 없으면 `"vercel"` 고정)
   - `dispatch.ts`: ① **조건부 `scheduled → publishing`**(먼저 가져간 실행만 발행) ② **24시간 넘게 밀린 예약은 실패 처리**(`MAX_LATE_MS`) ③ `excludeUserIds`(운영자 실행에서 cron-job.org·일시정지 회원 제외) ④ `failWithMessage`(Vercel 방식 꺼진 사이트) ⑤ 회원 실행 함수 `dispatchMemberScheduledPosts`(운영은 핸드폰 정책 적용)
   - 실행 주소: 새 `/api/.../dispatch-member/route.ts`(회원 토큰 → 즉시 응답 + `after`로 발행 → 남은 예약 0건이면 작업 끔), 기존 운영자 주소는 제외 목록 적용. **두 주소 모두 `dynamic = "force-dynamic"`·`fetchCache = "force-no-store"`**(INSTA는 빠져 있었음)
   - 서버 액션: `src/lib/actions/scheduler.ts`(방식 선택·일시정지·재개, `requireProgramAccess`), 저장 액션에 `checkScheduleReady`(예약 전 방식·키 확인, 없으면 거부+안내) / `startMemberScheduler`(예약 뒤 작업 켜기, 실패하면 초안으로 되돌림 — **첨부(슬라이드 등) 저장이 끝난 뒤**), 키 저장 액션: 허용 목록에 `cronjob_org_api_key`, 키 변경 시 `removeMemberScheduler(keepMode)` 후 남은 예약 있으면 다시 켜기, 키 삭제 시 `removeMemberScheduler`
   - 타입 `ApiKeyProvider`·키 이름표(`PROVIDER_LABELS` 또는 `apiKeyLabels.ts`)에 `cronjob_org_api_key`
   - 화면: 설정 「⏰ 예약 발행」(방식 선택 `SchedulerModePicker` + 키 칸 `ApiKeyRow` + 키 발급 3줄 안내, **화면 테마에 맞춰 색 변경** — INSTA는 다크), 글 목록 위 `SchedulePublishingControl`(상태·일시정지/재개), 사용 매뉴얼 FAQ·예약 시각 안내 문구(배포판에 「AIMaster」 단어가 보이지 않게)
5. **로컬 검사**: `npx tsc --noEmit`, 프로그램 기존 시험(`package.json` scripts), `npm run build`(새 실행 주소가 목록에 있는지). 파일 줄바꿈(CRLF) 섞임 주의 — 문자열 치환 실패 시 `\r\n` 정규화 후 원래 형식으로 저장.
6. **버전 +0.01**(`src/lib/version.ts`) + 마이그레이션 SQL(`supabase/migrations/<날짜>_<접두사>_member_scheduler.sql` — 표·RLS 본인 조회·`programs.version` 갱신·마지막에 확인용 `select`) → **커밋·푸시(배포 전)**. 공용 문서(`ACTIVE_WORK`·`HANDOFF` 등)에 남의 변경이 있으면 `git show HEAD:파일` + 내 줄만 → `git hash-object -w` → `git update-index --cacheinfo`로 내 변경만 올린다.
7. **운영 DB 적용(사전 승인 필수)**: 무엇을 왜 바꾸는지 설명 → 주인님 승인 → **크롬으로 직접 실행**(§3). 표가 없는 채 배포하면 운영자 예약 실행이 오류로 멈춘다 → **반드시 DB 먼저.**
8. **배포**: 프로그램 폴더에서 `npx --yes vercel@latest deploy --prod --yes` → `npx vercel ls --prod`로 Ready 확인(여러 프로그램은 한 번에 하나씩).
9. **자동 확인**: 운영 주소로 `curl` — 회원 주소·운영자 주소 무인증 401, 가짜 토큰(`<접두사>_` + 0×64) 401, `/login` 200. 새 배포 ID(`vercel inspect <배포주소>`의 `dpl_…`)로 **첫 vercel-cron 실행 200**을 백그라운드로 기다려 확인:
   `until npx vercel logs requests --since 10m --json | grep '"requestPath":"<운영자주소>"' | grep vercel-cron | grep -q '<dpl_ID>'; do sleep 30; done`
10. **기록**: 프로그램 `AGENTS.md` 버전 항목(화면·코드·DB·배포·확인), 루트 `docs/SCHEDULER_POLICY.md` §8 현황표, `docs/HANDOFF.md` 맨 위 항목, (배포판 있으면) `docs/DISTRIBUTION_KIT_GUIDE.md` §8. 작업 중 표에서 내 줄 삭제.

## 3. 운영 DB 적용 방법 (이 세션에서 확정된 방식)
- 세션의 Supabase MCP는 **`Supabase_DEV` = Lab DB(`rjjtjak…`)** 였다. 운영 DB 도구가 없고 Supabase CLI도 로그인돼 있지 않았다. **주인님께 SQL을 넘기지 말 것**(주인님: 「이걸 왜 니가 안하고 나한테 해달라는거지?」).
- 방법: claude-in-chrome(메인 크롬) → `https://supabase.com/dashboard/project/esgxyikcnnvmlhygjkth/sql/new` → 상단 **AIMaster · main · PRODUCTION** 확인 → `window.monaco.editor.getModels()[0].setValue(sql)`(모델이 여럿이면 마지막) → **Run** → 「Potential issue detected」(`drop policy` 때문) 확인 후 **Run query** → 결과 표에서 `created_table`·`program_version` 확인.
- 이미 쓰던 탭에서 다시 이동하면 「Leave site?」로 막힐 수 있다 → 같은 편집기에 `setValue`로 새 SQL을 넣고 실행하면 된다.
- DB 구조 변경은 **매번 승인**(프로그램마다 따로 여쭤봄). 교훈 기록: `docs/ERROR_LESSONS.md` 2026-10-19.

## 4. 남은 3개 프로그램 — 조사 결과와 주의점 (2026-10-19 조사)

### 4-1. ③ `cardnews-studio` (카드뉴스, v1.23, slug `cardnews-studio`) — 글마다 예약형
- 예약 글 표 `cns_insta_posts`(status `scheduled`/`publishing`), 처리 함수 `src/lib/instagram/posts.ts` `dispatchDuePosts(limit)`, 운영자 주소 `/api/cardnews/instagram/dispatch`(vercel 5분, `CRON_SECRET`).
- **이미 조건부 잠금(중복 방지)과 1차 실패 시 10분 뒤 재시도가 있다** → 그대로 살리고, 회원 필터(`userId`·`excludeUserIds`)·24시간 규칙·`failWithMessage`만 추가.
- 인스타 연결값은 `insta_accounts`를 INSTA 포스팅 자동화와 공유(회원 연동 정보 공용 규칙) — 바꾸지 않는다.
- 독립 모드·`KIT/` 없음 → 기본 Vercel 고정(`threads/` 사본 기준). 회원 실행 주소 예: `/api/cardnews/instagram/dispatch-member`. 접두사 예: 표 `cns_member_scheduler`, 토큰 `cns_`, 환경변수 `CNS_PLATFORM_SCHEDULER`.
- 예약 저장 지점: `src/app/api/cardnews/instagram/posts/route.ts`(API 라우트 — 서버 액션이 아님) → `checkProgramAccessApi` 사용, 오류는 JSON으로.

### 4-2. ④ `naver-cafe-poster` (네이버 카페, v1.20) — **정기 자동 실행형(글마다 예약 아님)**
- 운영자 주소 `/api/cron/generate-and-post`(5분 깨우기) → 표 `ncafe_scheduled_sources`(`is_active`·`schedule_enabled`·`last_run_at`)에서 `isScheduleDue`로 차례인 소스만 `runScheduledSource`(생성+포스팅).
- 적용 방식(제안 — 시작 전 플랜으로 주인님께 보고): 「남은 예약 0건이면 끔」 대신 **「켜진 정기 소스가 0개면 끔」**, 「예약 시 켜기」 대신 **「정기 실행을 켤 때(schedule_enabled=true 저장 시) 켜기」**. 회원 cron-job.org 주기는 1분 고정이 아니라 **5분**도 가능(정기형이라 1분 필요 없음 — cron-job.org `minutes` 배열로 지정). 24시간 규칙 대신 「한 번 깨울 때 소스당 최대 1회 실행」 유지.
- 같은 소스 중복 실행 방지: `last_run_at` 조건부 갱신(먼저 갱신한 실행만 진행)이 있는지 확인하고 없으면 추가.

### 4-3. ⑤ `kakao_auto_poster` (카카오, v1.20, slug `kakao-auto-posting`) — **정기 자동 실행형**
- 운영자 주소 `/api/cron/generate-reports` → 표 `kakao_topics`(`is_active`·`schedule_enabled`·`last_run_at`), `isScheduleDue`·`isWithinActiveHours`(KST 활동 시간)로 생성. **카카오 발송은 자동으로 하지 않고 텔레그램/웹에서 사람이 결정** — 이 구조는 바꾸지 않는다.
- 적용 방식은 4-2와 같음(정기형). 주인님께 「정기형에도 cron-job.org 선택지가 필요한가」를 플랜에서 먼저 확인하는 것을 권장(지침 §7 「회원 기능인가」).

## 5. 바뀐 파일 목록 (①·② — 다음 프로그램에서 그대로 참고)
- **threads**: `src/lib/posts/cronJobOrg.ts`·`memberScheduler.ts`(신규), `dispatch.ts`, `src/app/api/posts/dispatch-member/route.ts`(신규)·`dispatch-scheduled/route.ts`, `src/lib/actions/scheduler.ts`(신규)·`posts.ts`·`settings.ts`, `src/lib/apiKeys.ts`, `src/types/database.types.ts`, `src/components/settings/SchedulerModePicker.tsx`·`src/components/posts/SchedulePublishingControl.tsx`(신규), `settings/page.tsx`·`posts/page.tsx`·`guide/page.tsx`, `PostForm.tsx`, `supabase/migrations/20261019230000_atp_member_scheduler.sql`, `docs/PLAN_20261019_MEMBER_SCHEDULER.md`
- **insta_auto_poster**: 위와 같은 구성(키 이름표는 `src/lib/apiKeyLabels.ts`) + **배포판** `KIT/schema.sql`(표·키 허용, 마지막 표가 되어 `kit.json` `checkTable` = `insta_member_scheduler`), `KIT/upgrade-20261019-cronjob.sql`(신규), `KIT/enable-vercel-cron.ps1`(UTF-8 BOM)/`.sh`(실행 권한, `vercel.json` 없으면 생성), `KIT/README.md` 6장·자주 막히는 곳, `KIT/PLATFORMS.md`, `KIT/env.example`, `supabase/migrations/20261019240000_insta_member_scheduler.sql`

## 6. 마지막 크롬 실화면 검수 계획 (5개 다 적용한 뒤 한꺼번에)
프로그램마다 관리자(`buylifemall@gmail.com`) 크롬으로, 필요하면 시험 회원(`buylifemall@naver.com`):
1. 설정 「⏰ 예약 발행」: 버전 표시, 기본 「AIMaster 기본(Vercel) · 기본값」 선택, cron-job.org 키 「등록됨」(공용 키 재사용)
2. 「내 cron-job.org」로 전환 → 글 목록 상태 줄 「내 cron-job.org 대기」
3. 시험 글을 **먼 미래(이틀 뒤)로 예약** → cron-job.org 작업 자동 생성·켜짐(콘솔 확인), DB 예약 시각 KST 정상
4. 그 글을 초안으로 되돌림 → 약 1분 안에 작업 자동 꺼짐
5. 일시정지 → 「일시정지됨」 → 재개
6. **방식을 Vercel로 원복**(운영 회원 기본값 유지), 시험 글은 초안으로 남김(30일 뒤 자동 삭제)
- 실제 자동 발행까지 보려면 1~2분 뒤로 예약(실제 SNS에 올라감 → **발행 전 주인님 확인 필수**).

## 7. 함께 남은 일 (이 작업 밖)
- ~~쇼핑제휴 다음 배포 때: 24시간 규칙 코드 + `VALID_PROVIDERS`에 `anthropic`·`replicate`~~ → ✅ v1.64(커밋 `2bdeb523`)에서 처리됨.
- SNS 배포판: INSTA `KIT/` 변경(예약 방식)은 **`SNS_Auto_Posting_Kit_v1.01`(2026-10-20)에 반영됨**. 이후 다시 포장하면 `python scripts/make_lecture_kit.py --version v1.02`(배포판 번호 규칙: 메인과 같은 vX.YY, +0.01, 같은 번호 덮어쓰기 금지 — 지침 §4-3).
- 2순위(스텝메일·예약 알림·CRM·유튜브 자동 답글·트렌딩 상품)·`real_estate_sales`는 적용 여부를 주인님께 확인.
- 패키지 설치마법사(배포판 설치 표준) 실제 끝까지 설치 시험은 주인님이 v2 배포판으로 진행 중 — 막힌 곳 오면 `scripts/kit-template/` 수정 후 재포장.

## 8. 비용
- 개발·시험: 유료 AI 호출 없음. 프로그램당 Vercel 빌드 1회.
- 운영자 인프라: 추가 없음(기존 Vercel 예약 호출 유지). cron-job.org를 고른 회원도 처리 함수는 운영자 Vercel에서 돈다 → **예약이 있을 때만 켜는 자동 끄기**가 비용 핵심.
- 회원: cron-job.org 무료(작업당 1분 1회, API 하루 100회 — 예약 1건당 1~2회 사용).
