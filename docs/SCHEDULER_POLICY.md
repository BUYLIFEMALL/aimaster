# 예약 기능 지침 (SCHEDULER_POLICY) — 회원 본인 cron-job.org로 예약 실행

> 2026-10-19 주인님 지시로 제정, 모든 CLI 공통. **신규 프로그램 개발과 기존 프로그램 수정 때 「예약 게시·예약 발송·정기 자동 실행」 기능을 만들거나 고치기 전에 반드시 읽는다.**
> 기준 구현(첫 적용): `threads-content-ops/` v2.07 (https://threads-content-ops.buylife.xyz). 전체 프로그램 검토: [`MEMBER_CRONJOB_SCHEDULER_REVIEW_20261019.md`](MEMBER_CRONJOB_SCHEDULER_REVIEW_20261019.md).

## 1. 원칙 (왜) — 2026-10-19 주인님 최종 결정
1. **회원이 실행 방식을 직접 고른다**(최상단 규칙 「각자 본인의 API 키·플랫폼을 연동해서 사용」에 따라 본인 계정 선택지를 항상 제공).
   - **Vercel 예약 호출**: 사이트의 Vercel `crons`(1분)가 처리. 회원은 키 없이 예약만 하면 된다.
   - **내 cron-job.org**: 회원 본인 무료 cron-job.org API 키 → 예약 때 회원 계정에 1분 작업을 자동 생성·켜기, 예약이 없으면 자동 끄기.
2. **기본값이 다르다**: **AIMaster 운영 = Vercel**(일반 회원은 Vercel을 직접 쓰지 않으므로 키 없이 바로 예약), **배포판(설치 키트) = cron-job.org**(수강생은 대부분 Vercel 무료로 시작 — 무료는 `crons`가 하루 1번·최대 59분 지연이라 1분 확인 불가. Vercel Pro로 바꾼 뒤 `KIT/enable-vercel-cron`을 실행하면 「Vercel 예약 호출」을 고를 수 있음). 코드: `DEFAULT_SCHEDULER_MODE = IS_STANDALONE ? "cronjob" : "vercel"`.
3. **Vercel 방식 사용 가능 여부**: 운영은 기본 켜짐(관리자가 `TCO_PLATFORM_SCHEDULER=off`로 끌 수 있음), 키트는 `TCO_PLATFORM_SCHEDULER=on`일 때만(스크립트가 등록). 꺼져 있으면 선택지는 보이되 회색 안내.
4. 비용 메모(§9): cron-job.org를 써도 실제 처리는 사이트 Vercel 함수에서 돈다 → 회원 수가 많을수록 Vercel 방식(프로그램당 1분 1회)이 확인 호출 비용이 적다.

## 2. 화면 기준 (어디서 무엇을 하는가)
| 위치 | 하는 일 | 하지 않는 일 |
|---|---|---|
| **설정(API키등록·플랫폼연동) 「⏰ 예약 발행」** | **실행 방식 선택**(라디오 2개, 기본값 배지) + **cron-job.org API 키 한 줄**(등록·수정·삭제, 공용 연동) + 가입 3단계 안내 | 주기 선택·켜기/끄기·연결 버튼을 두지 않는다(포스팅 쪽 예약과 중복·충돌 — agy 1차안 폐기) |
| **포스팅 쪽(글 작성·보관함)** | 글마다 날짜·시각 예약, 예약 취소. 고른 방식이 준비 안 됐으면(키 없음·Vercel 꺼짐) 예약 거부 + 안내 | — |
| **보관함 위 상태 줄** | 「⏰ 예약 발행: (Vercel/내 cron-job.org) 실행 중·대기·일시정지됨·키 미등록·방식 선택 필요 · 예약 대기 N건」 + **전체 일시정지 / 재개**(두 방식 모두) | — |
- **확인 주기는 1분 고정(회원이 고르지 않음).** 글마다 정한 시각에 맞춰 올리기 위해서다. 주기를 1시간 등으로 늘리면 14:20 예약이 15:00에 올라가고, 24시간 주기는 「24시간 넘게 늦음」 실패를 부른다(agy 1차 구현에서 확인 → 폐기).
- 버튼 글자색은 `text-[#ffffff]`(밝은 테마가 `.text-white`를 검정으로 바꾸는 프로그램이 있음 — 2026-10-19 키트에서 발생).

## 3. 동작 기준 (자동 켜기·끄기)
0. (방식) 회원별 `mode`(`vercel`|`cronjob`, 행이 없으면 기본값). 운영자 Vercel 호출은 **`mode=vercel`이고 일시정지 아닌 회원 글만** 발행(`membersExcludedFromPlatform`). Vercel 방식이 꺼진 사이트에서 vercel 회원 글이 시각이 되면 안내와 함께 실패 처리. 방식 변경: cronjob으로 바꾸면 키 필수·남은 예약 있으면 작업 켬, vercel로 바꾸면 회원 작업 끔. 키 삭제 시 운영은 vercel로 되돌림(키 변경 시는 방식 유지).
1. **cronjob 회원이 예약 저장** → 서버가 회원 cron-job.org에 「1분마다 회원 전용 실행 주소 호출」 작업을 **자동 생성·켜기**(이미 켜져 있으면 cron-job.org를 부르지 않음).
2. 회원 전용 실행 주소는 **그 회원의 예약 글만** 처리하고, 끝날 때 **남은 예약이 0건이면 작업을 자동으로 끈다**(다음 예약 때 다시 켜짐). → 예약이 있을 때만 호출이 생겨 운영자 Vercel 실행도 거의 늘지 않는다.
3. 끄는 순간 새 예약이 들어오는 경쟁을 막기 위해, 끈 뒤 남은 예약을 다시 세어 있으면 다시 켠다.
4. **일시정지**: 작업을 끄고 `paused`를 기록(예약 저장은 되지만 켜지지 않음). **재개**: 남은 예약이 있으면 다시 켠다. 24시간 넘게 지난 예약은 올리지 않는 기존 규칙 유지.
5. **키 변경**: 예전 계정 작업을 지우고, 남은 예약이 있으면 새 계정에 다시 만든다(일시정지 상태는 유지). **키 삭제**: 작업·연결 정보도 함께 삭제.
6. 실행 작업을 켜지 못하면(키 오류 등) **예약을 되돌리고** 오류를 보여 준다 — 「예약됐는데 안 올라가는」 상태를 만들지 않는다.
7. **cron-job.org 무료 규칙 대비(공식 FAQ 2026-10-19 확인)**: 응답이 **30초**를 넘으면 실패, 실패가 **25번 넘으면 작업 자동 정지**. → 회원 실행 주소는 **곧바로 응답하고 발행은 응답 뒤 이어서 처리**(`@vercel/functions`의 `waitUntil`, Next 14엔 `after` 없음). 예약할 때마다 cron-job.org의 실제 켜짐 상태를 확인해 다시 켠다(DB 기록만 믿지 않음).
8. **예약 시각은 브라우저에서 ISO(시간대 포함)로 바꿔 서버에 보낸다.** `datetime-local` 값(시간대 없음)을 그대로 보내면 서버(UTC)가 UTC로 읽어 한국 시각보다 **9시간 늦게** 예약된다(보관함에서 실제 발생 → v2.07에서 수정).
9. 중복 발행 방지: 글을 `scheduled → publishing`으로 **먼저 가져간 실행만** 발행(조건부 update). 운영자 호출과 회원 호출이 겹쳐도 한 번만 올라간다.

## 4. 보안 기준 (반드시)
- **다회원 사이트에서 사이트 비밀값 `CRON_SECRET`을 회원 cron-job.org에 넣지 않는다**(회원이 그 값을 볼 수 있다). 회원마다 **전용 실행 토큰**(무작위 32바이트, 접두어 포함)을 만들어 그 회원 작업 머리글(`Authorization: Bearer …`)에만 넣고, DB에는 **SHA-256 해시만** 저장한다.
- 회원 전용 실행 주소는 토큰 해시로 회원을 찾아 **그 회원 글만** 처리. 토큰이 없거나 틀리면 401.
- 설치 키트(독립 운영, 사이트 = 설치자 1명)는 예외적으로 `CRON_SECRET` 사용 가능하되 **설치자(처음 가입 회원)만** 설정.
- cron-job.org API 키는 IP 제한을 켜지 않게 안내(Vercel 서버 주소가 계속 바뀜 → 403).

## 5. 저장 구조 (재사용)
- **cron-job.org 키 = 공용 연동 정보**: `user_api_keys` provider **`cronjob_org_api_key`**(운영 DB 허용 목록에 2026-10-19 추가). 한 번 등록하면 예약 기능이 있는 모든 프로그램이 재사용한다(회원 연동 정보 공용 저장 규칙). 프로그램마다 새로 입력받지 않는다.
- **프로그램별 연결 표**: `<접두어>_member_scheduler`(예: `tco_member_scheduler`): `user_id`(PK) · `mode`(`vercel`|`cronjob`, 컬럼 기본값 운영 `vercel`/키트 `cronjob`) · `token_hash`(unique, 연결 전엔 `unset-<id>` 자리표시) · `cronjob_job_id` · `active`(작업 켜짐) · `paused`(회원 일시정지) · 시각. RLS 본인 조회만, 쓰기는 서버(서비스 롤)가 권한 확인 뒤.
- 회원 cron-job.org 계정에는 **프로그램마다 작업 1개**(같은 키). 작업은 실행 주소 URL로 찾는다(중복 생성 방지).
- cron-job.org 무료 API는 하루 100회(작업 생성은 분당 5회) → 화면을 열 때 cron-job.org를 부르지 않는다(상태는 DB의 `active`/`paused`로 표시).

## 6. 코드 기준 (threads-content-ops 기준 파일)
| 파일 | 역할 |
|---|---|
| `lib/cronJobOrg.ts` | cron-job.org REST(`PUT /jobs` 생성, `PATCH` 켜기/끄기·갱신, `DELETE`, `GET /jobs`), 오류 한국어 안내 |
| `lib/memberScheduler.ts` | 토큰 발급·해시, `ensureMemberSchedulerRunning`(예약 직후), `stopMemberSchedulerIfIdle`(실행 후), 일시정지·재개·삭제, 화면 상태 |
| `app/api/<prog>/dispatch-member/route.ts` | 회원 전용 실행 주소(토큰 → 그 회원 글만) |
| `app/api/<prog>/dispatch-scheduled/route.ts` | 운영자 호출: 키 등록 회원 제외, 관리자 지정 없으면 키 없는 회원 글은 「키 필요」 실패 처리 |
| `lib/scheduledDispatch.ts` | 실행기 옵션 `onlyUserId`·`excludeUserIds`·`failWithMessage` |
| 예약 저장 서버 함수(`scheduleDraft`) | 키 확인 → 예약 → 작업 켜기(실패 시 예약 되돌림) |
| `SchedulePublishingControl.tsx` | 보관함 위 상태 줄·일시정지/재개 |
- 다음 프로그램에 적용할 때 이 파일들을 복사해 실행기·표 이름만 바꾼다. 두 번째 프로그램 적용 때 공용 기준 코드(`docs/SHARED_FEATURE_MAP.md`)로 등록한다.

## 7. 새 프로그램·기존 프로그램 체크리스트
- [ ] 예약/정기 실행이 **회원 기능**인가? (30일 자동 삭제 같은 **운영 정리 작업은 대상 아님** — 운영자 `crons` 유지)
- [ ] 설정 화면: **실행 방식 선택(운영 기본 Vercel / 배포판 기본 cron-job.org)** + cron-job.org **키 한 줄**(공용 provider `cronjob_org_api_key` 재사용, 이미 있으면 「등록됨」)
- [ ] 예약은 포스팅 쪽에서만, 키 없으면 예약 거부 + 등록 안내, 「지금 발행」은 키 없이 가능
- [ ] 회원 전용 토큰·전용 실행 주소(그 회원 것만), 사이트 비밀값 미전달
- [ ] 예약 시 자동 켜기, 남은 예약 0건이면 자동 끄기, 일시정지·재개, 키 변경·삭제 처리
- [ ] 운영자 `crons`는 `mode=vercel`·일시정지 아님 회원 글만 처리, cron-job.org 회원·일시정지 회원 제외
- [ ] 중복 발행 방지(조건부 상태 변경), 24시간 초과 예약 미발행
- [ ] 실행 주소 `dynamic="force-dynamic"`·`fetchCache="force-no-store"`, 서버 액션은 이용 권한 확인
- [ ] 테스트: 키 없음 거부, 예약 시 켜기 1회, 토큰 없음/틀림 401
- [ ] 사용 매뉴얼(FAQ)·설정 안내 문구 갱신, 이 문서 §8 현황표 갱신

## 8. 적용 현황
> **이어받기**: 남은 프로그램(카드뉴스·네이버 카페·카카오) 적용 순서·조사 결과·운영 DB 적용 방법·마지막 크롬 검수 계획은 [`SCHEDULER_ROLLOUT_HANDOFF_20261019.md`](SCHEDULER_ROLLOUT_HANDOFF_20261019.md).
| 프로그램 | 상태 | 버전·날짜 | 메모 |
|---|---|---|---|
| `threads-content-ops` (Threads 운영 자동화) | ✅ 적용·배포·**실검수 완료** | v2.08 · 2026-10-19 (방식 선택, 기본 Vercel) / v2.07 (cron-job.org) | 기준 구현. 주인님 키로 실검수: 예약 → 작업 자동 생성(8676408)·켜기 → 예약 취소 후 ~50초에 자동 꺼짐 → 재예약 시 자동 재가동 → 19:34 예약이 19:34:18 자동 발행 → 2초 뒤 자동 꺼짐 → 일시정지·재개 정상 |
| `labs/kit-threads` (강의 키트) | ✅ 적용·배포·실검수 | 2026-10-19 | **방식 선택, 기본 cron-job.org**(Vercel은 Pro+스크립트 시 선택 가능). 운영 v2.08과 같은 코드(회원 전용 토큰, 가입자마다 각자 키). A(Vercel Pro)는 `KIT/enable-vercel-cron`이 `crons` + `TCO_PLATFORM_SCHEDULER=on`. 설치 SQL `KIT/schema.sql`, 기존 설치자 `KIT/upgrade-20261019-cronjob.sql`. 실검수: 예약 → 작업 자동 생성·켜짐 → 취소 후 자동 꺼짐 |
| `threads-affiliate-poster` (쓰레드 쇼핑제휴) | ✅ 적용·배포·실검수 | v1.63 · 2026-10-19 | 표 `tap_member_scheduler`, 환경변수 `TAP_PLATFORM_SCHEDULER`, 회원 주소 `/api/posts/dispatch-member`. **중복 발행 방지 새로 추가**(예전엔 없었음). 복제 키트(clone-kit) 기본 cron-job.org. 실검수: 예약 → 작업 자동 생성 → 초안 복귀 후 자동 꺼짐 |
| `threads` (Threads 포스팅 자동화, slug `auto-threads-posting`) | ✅ 적용·배포·**실검수 완료**(2026-10-20: 예약 → 작업 8678578 자동 켜짐 → 일시정지·재개 → 취소 ~60초 뒤 자동 꺼짐) | v1.19 · 2026-10-19 (배포 `threads-80uxhi9g1`) → v1.20 | 표 `atp_member_scheduler`, 환경변수 `ATP_PLATFORM_SCHEDULER`, 회원 주소 `/api/posts/dispatch-member`. 운영 전용(배포판 없음) → 기본 Vercel(5분 간격). **중복 발행 방지·24시간 규칙 새로 추가.** 크롬 실검수는 1순위 묶음 끝난 뒤 |
| ✅ `threads-affiliate-poster` 보완 | ✅ v1.64 · 2026-10-19 (배포 `threads-affiliate-poster-5ql36sudm`) | — | 화면엔 「24시간 넘게 지난 예약은 올리지 않음」이라 안내하지만 `dispatch.ts`에 그 규칙이 없음(2026-10-19 threads 작업 중 발견) — threads v1.19와 같은 코드로 보완 |
| `insta_auto_poster` (INSTA 포스팅 자동화) | ✅ 적용·배포·**실검수 완료** | v1.25 · 2026-10-19 (배포 `insta-auto-poster-46r0me9fo`) → v1.26 시각 표시 수정(`insta-auto-poster-1fcuzxisf`) | 크롬 실검수(관리자 본인 키, 실제 게시 없음): cron-job.org 선택 → 예약 → 작업 8678118 자동 생성·켜짐 → 일시정지·재개 → 예약 취소 ~65초 뒤 자동 꺼짐 → Vercel 복귀. 상세 `insta_auto_poster/AGENTS.md` v1.26. 표 `insta_member_scheduler`, 환경변수 `INSTA_PLATFORM_SCHEDULER`, 회원 주소 `/api/posts/dispatch-member`. **운영 기본 Vercel / 배포판 기본 cron-job.org**(SNS 키트 `KIT/` 함께 갱신 — 예전 `CRON_SECRET` 직접 넣기 안내 교체). 중복 발행 방지·24시간 규칙 새로 추가 |
| `cardnews-studio` (INSTA 카드뉴스) | ✅ 적용·배포·실검수 | v1.24 · 2026-10-20 (배포 `cardnews-studio-ictkczgcr`) | 표 `cns_member_scheduler`, 환경변수 `CNS_PLATFORM_SCHEDULER`, 회원 주소 `/api/cardnews/instagram/dispatch-member`, 화면용 `/api/cardnews/scheduler`(API 구조). 기존 중복 방지·재시도 유지 + 24시간 규칙. 실검수: 예약 → 작업 8678676 자동 켜짐 → 일시정지·재개 → 취소 ~61초 뒤 자동 꺼짐 |
| `ai-influencer-studio` (AI 인플루언서, 인스타 예약) | ✅ 적용·배포·실검수(예약 등록·취소) | v1.15 · 2026-10-20 (배포 `ai-influencer-studio-ibmwdx619`) | 카드뉴스 v1.24 사본(실패 시 되돌리기 포함). 표 `aif_insta_posts`·`aif_member_scheduler`, 환경변수 `CRON_SECRET`(신규)·`AIF_PLATFORM_SCHEDULER`(없음=켜짐), 회원 주소 `/api/instagram/dispatch-member`, 화면용 `/api/instagram/scheduler`(키 저장·삭제 포함). 설정 화면이 없어 「🔑 API키등록·플랫폼연동」 창 아래에 「⏰ 예약 발행」을 둠. 실검수: 예약 등록 → DB·4:5 사진 확인 → 취소·사진 삭제. 「내 cron-job.org」 전환·실제 게시는 미시험 |
| `ai-webtoon-studio` (AI 웹툰, 인스타 예약) | ✅ 적용·배포·실검수(예약 등록·취소) | v1.16 · 2026-10-20 (배포 `ai-webtoon-studio-gwivarlv1`) | 인플루언서 v1.15 사본. 표 `wts_insta_posts`·`wts_member_scheduler`, 환경변수 `CRON_SECRET`(신규)·`WTS_PLATFORM_SCHEDULER`(없음=켜짐), 회원 주소 `/api/instagram/dispatch-member`, 화면용 `/api/instagram/scheduler`(키 저장·삭제 포함). 「⏰ 예약 발행」은 설정 창(SettingsModal) 아래. 실검수: 예약 등록 → DB·4:5 3장 확인 → 취소·사진 삭제, Vercel 예약 호출 200. 「내 cron-job.org」 전환·실제 게시는 미시험 |
| `four-cut-comics` (AI 4컷 만화, 인스타 예약) | ✅ 적용·배포·실검수(예약 등록·취소) | v1.18 · 2026-10-20 (배포 `four-cut-comics-4f6slfxuo`) | 웹툰 v1.16 사본. 표 `fcc_insta_posts`·`fcc_member_scheduler`, 환경변수 `CRON_SECRET`(신규)·`FCC_PLATFORM_SCHEDULER`(없음=켜짐), 회원 주소 `/api/instagram/dispatch-member`, 화면용 `/api/instagram/scheduler`(키 저장·삭제 포함). 「⏰ 예약 발행」은 /settings 아래. 실검수: 예약 등록 → DB·저장소 4장 확인 → 취소·사진 삭제. 「내 cron-job.org」 전환·실제 게시는 미시험 |
| `naver-cafe-poster` (네이버 카페, 정기형) | ✅ 적용·배포·실검수 | v1.21 · 2026-10-20 (배포 `naver-cafe-poster-oun9zc23z`) | 정기 자동 실행형: 스위치 켤 때 작업 켜기, 켜진 소스 0개면 끄기, 주기 5분. 표 `ncafe_member_scheduler`, 환경변수 `NCAFE_PLATFORM_SCHEDULER`, 회원 주소 `/api/cron/dispatch-member`. **같은 소스 중복 실행 방지(조건부 `last_run_at`)·`CRON_SECRET` 빈 값 401 새로 추가**. 실검수: 작업 8678746 자동 켜짐 → 일시정지·재개 → 끄기 즉시 꺼짐 |
| `kakao_auto_poster` (카카오 뉴스레터, 정기형) | ✅ 적용·배포·실검수 | v1.21 · 2026-10-20 (배포 `kakaoautoposter-at4fi42eb`) | 네이버 카페와 같은 정기형(예약 켤 때 켜기·0개면 끄기·5분). 표 `kakao_member_scheduler`, 환경변수 `KAKAO_PLATFORM_SCHEDULER`, 회원 주소 `/api/cron/dispatch-member`. 카카오 발송은 사람이 결정(그대로). 중복 생성 방지·비밀값 검사 추가. 실검수: 작업 8678825 자동 켜짐 → 일시정지·재개 → 끄기 즉시 꺼짐 |
| `stepmail` (대량 메일발송, 정기형) | ✅ 적용·배포·실검수 | v1.21 · 2026-10-20 (`stepmail-oriyijlug`) | 캠페인 켤 때 켜기·보낼 캠페인 0개면 끄기(이미 보낸 「한 번만」 제외), 매시 0·30분. 표 `stepmail_member_scheduler`. 중복 발송 방지·**이용 권한 확인**·비밀값 검사 추가 |
| `booking-reminder` (예약 리마인드, 정기형) | ✅ 적용·배포·실검수 | v1.21 · 2026-10-20 (`booking-reminder-mnqqz3cyx`) | 규칙 켤 때 켜기·0개면 끄기, 15분, Next 14라 `waitUntil`. 표 `booking_member_scheduler`. **발송 전 선점(중복 방지)**·이용 권한 확인·비밀값 검사 추가, cron-job.org 키 칸 새로 둠 |
| `crm-google-form` (구글폼 CRM 팔로우업, 정기형) | ✅ 적용·배포·실검수(재개만 한도 초과로 미확인) | v1.10 · 2026-10-20 (`crm-google-form-2jvoxalyt`) | 규칙 켤 때 켜기·0개면 끄기, **매일 09:00 KST**, Next 14라 `waitUntil`. 표 `crm_member_scheduler`. 발송 전 선점·이용 권한 확인·비밀값 검사 추가 |
| `youtube-auto-reply` (유튜브 댓글 예약 모니터링, 정기형) | ✅ 적용·배포(Vercel 방식 실검수, cron-job.org 실검수는 한도 소진으로 대기) | v1.12 · 2026-10-20 (`youtube-auto-reply-1ehpbw5to`) | 모니터링 시작=켜기·중지=끄기, 5분마다 깨우고 주기는 회원 설정, `after`. 표 `ytreply_member_scheduler`. 중복 실행 방지·이용 권한 확인·예약 주소 4곳 비밀값 검사 |
| `trending-product-finder` (상품소싱 — 매일 리포트·소싱 알림·가격 알림, 정기형) | ✅ 적용·배포(Vercel 방식 실검수, cron-job.org 실검수는 한도 소진으로 대기) | v1.15 · 2026-10-20 (`trending-product-finder-3put0pd4n`) | 작업 3개를 회원 5분 호출 한 주소에서 차례대로, 「남은 일」 = 켜진 관심 목록 + 알림 켠 관심 상품. 표 `trend_member_scheduler` + 매일 리포트 하루 1번 칸 `report_last_run_at`. 중복 발송 방지·이용 권한 확인·예약 주소 5곳 비밀값 검사 |
| `real_estate_sales` | ⏸ 운영자 유지(주인님 결정 2026-10-20) | — | 공공데이터 키(서울열린데이터·공공데이터포털·브이월드)는 회원이 직접 발급·등록하기 어려워 **당분간 운영자 공용 키 + 운영자 Vercel 정기 수집 그대로**. 회원 cron-job.org 방식은 적용하지 않음. **사용자가 많아지면** 회원 본인 공공 키 등록 + 본인 예약 방식으로 전환(그때 다시 플랜). AI 키는 지금처럼 회원 본인 키 |

## 9. 비용·cron-job.org 무료 제한 메모
- cron-job.org 무료(공식 FAQ): 작업 개수 제한 없음(공정 사용), 작업당 1분 1회까지, 응답 30초 초과 시 실패, 응답 64KB까지, 실패 25회 넘으면 작업 자동 정지, API 하루 100회(후원 회원 5,000회), 유료 요금제 없음.
- cron-job.org: 회원 무료. 회원 호출도 운영자 Vercel 함수에서 실행되므로 **예약이 있을 때만 켜는 자동 끄기**가 비용의 핵심이다(예약 없는 회원은 호출 0).

## 10. 변경 이력
| 날짜 | 내용 |
|---|---|
| 2026-10-19 | 제정(Claude Code 윈도우). 주인님 지시: 「예약 기능은 회원 본인 cron-job.org API 키 등록 후 사용」, 「설정 화면은 키만, 예약 설정은 포스팅 쪽」. agy의 주기 선택·토글(설정 화면) 1차안은 포스팅 쪽 예약과 충돌해 「1분 고정 + 자동 켜기/끄기 + 보관함 일시정지」로 정리. |
| 2026-10-19 | 주인님 결정: **회원이 Vercel / cron-job.org 중 선택**(최상단 규칙에 따라 본인 계정 선택지 제공), **기본값 운영 Vercel·배포판 cron-job.org**. 비용 비교(공식 요금표): cron-job.org를 써도 처리는 사이트 Vercel에서 돌아 회원이 많을수록 Vercel 방식이 확인 비용이 적음. threads-content-ops v2.08·키트 반영. |

### 2026-10-20 공용 개선 — 실패 시 상태 되돌리기 (Claude Code 윈도우, crm-google-form·youtube-auto-reply 작업 중 발견) → ✅ 같은 날 11개 적용·배포(커밋 `ccf80d68`), `threads/`도 같은 날 v1.23으로 적용·배포(커밋 `497f7e7c`) → 운영 12개 전부 적용
threads 기준 `memberScheduler.ts` 사본 전체(threads·threads-content-ops·INSTA·카드뉴스·네이버 카페·카카오·stepmail·booking-reminder·crm-google-form·youtube-auto-reply) 공통:
1. `setMemberSchedulerMode(cronjob)`가 방식을 먼저 저장하고 작업을 켠다 → cron-job.org 실패(하루 한도 100회 초과·키 오류) 시 방식만 cronjob으로 남아 운영자 실행에서도 빠져 **예약이 멈춘다**(화면엔 오류 안내). 실패하면 이전 방식으로 되돌려야 한다.
2. `resumeMemberScheduler`가 일시정지를 먼저 풀고 작업을 켠다 → 실패하면 화면은 「일시정지됨」, DB는 「대기」로 어긋난다(잘못 발행되지는 않음).
처리: 다음에 기준(threads)을 고칠 때 두 함수에 try/catch로 되돌리기를 넣고 사본에 함께 반영(회원 영향 = 예약 멈춤 → 급한 수정 등급으로 판단해 사본 전체 배포 검토). cron-job.org 하루 호출 한도는 계정당 100회라, 같은 날 여러 프로그램을 실검수하면 소진된다 — 실검수는 프로그램당 호출 수를 줄이거나 날을 나눈다.

처리 결과(2026-10-20, Claude Code 윈도우): `setMemberSchedulerMode`(cronjob 전환) — 이전 방식을 기억했다가 작업 켜기가 실패하면 그 방식으로 되돌리고 오류를 다시 던짐 / `resumeMemberScheduler` — 작업 켜기가 실패하면 `paused: true`로 되돌리고 오류를 다시 던짐. 적용: booking-reminder v1.22·stepmail v1.22·crm-google-form v1.11·youtube-auto-reply v1.13·trending-product-finder v1.16·kakao_auto_poster v1.23·naver-cafe-poster v1.23·cardnews-studio v1.25·insta_auto_poster v1.29·threads-affiliate-poster v1.65·threads-content-ops v2.10. 실검수(booking-reminder, cron-job.org 한도 소진 상태 이용): 규칙 켜기·재개·방식 전환 세 실패 경로 모두 화면·DB 일치 확인. **새 예약 프로그램은 수정된 사본을 기준으로 복사한다.** 추가 적용: threads v1.23(커밋 `497f7e7c`). 미적용: Lab `labs/kit-threads`(Lab은 별도 지침).

처리 결과 2(2026-10-20, Claude Code 윈도우): **일시정지 안전 처리** — `pauseMemberScheduler`는 일시정지를 먼저 저장하고 cron-job.org 끄기는 시도만(실패 시 `{ jobStopped: false }` → 화면 안내), 회원 실행 주소는 `skipPausedMember`로 일시정지 회원을 건너뛰고 작업 끄기를 다시 시도. **상태 줄** `SchedulePublishingControl`은 서버 값 변화를 따라감(`useEffect`). 적용(커밋 `c380e793`): crm-google-form v1.12·trending-product-finder v1.17·booking-reminder v1.23·stepmail v1.23·insta_auto_poster v1.31·threads v1.24. 같은 날 추가 적용: youtube-auto-reply v1.15·kakao_auto_poster v1.25·naver-cafe-poster v1.25(커밋 `630027f0`), cardnews-studio v1.27·threads-content-ops v2.12(커밋 `0dc07e3c`). threads-affiliate-poster v1.72(커밋 `2428e00c`)까지 → **운영 12개 전부 적용**. **새 예약 프로그램은 위 6개 중 하나를 기준으로 복사한다.**

점검 결과(2026-10-20, 주인님 요청 「멈춘 회원은 실행 주소에서도 한 번 더 막기」·「종류별 개수」): ① 운영자 실행 주소는 12개 모두 `membersExcludedFromPlatform`으로 일시정지·cronjob 회원을 이미 뺀다. 빼지 않는 운영자 주소는 30일 정리(`cleanup-*`, 지침상 대상 아님)·옛 주소 텔레그램 이전(`migrate-webhooks`, 1회성)·유튜브 연결 확인(`check-connection`, 댓글을 읽거나 쓰지 않고 연결 끊김만 알려 일시정지 중에도 받는 편이 유리)뿐 — 그대로 둠. 회원 실행 주소는 위 `skipPausedMember`로 보강. ② 실행 대상이 여러 종류인 프로그램은 상품소싱 하나(관심 목록·상품 알림, v1.17에서 나눠 표시). 나머지는 한 종류만 세며 상태 줄 이름표도 그 종류(켜진 규칙·보낼 캠페인·모니터링 켜짐·켜진 주제 예약·켜진 정기 실행·예약 대기)라 추가 수정 없음. **새 예약 프로그램에서 실행 대상이 2종류 이상이면 상태 줄에 종류별 개수를 나눠 보인다.**

실검수(2026-10-20): 관리자 크롬 실검수(2026-10-20 09:45~10:06, 주인님 관리자 로그인 후, 실제 발송 없음): ① 상품소싱 상태 줄 「관심 목록 0개 · 상품 알림 5개」 = DB 일치 ② 구글폼 CRM 「내 cron-job.org」에서 채널 끈 시험 규칙 추가 → 새로고침 없이 상태 줄 「대기」→「실행 중 · 켜진 규칙 1개」, 재개·규칙 끄기 때도 즉시 바뀜 ③ 일시정지 정상 경로(DB paused·작업 꺼짐) ④ **작업 끄기 실패 재현**(상품소싱): 작업은 켠 채 DB만 `paused: true` → 09:55 회원 실행 200(실행 없이 건너뜀 + 작업 끄기) → 10:00·10:05 호출 없음(작업 꺼짐 확인). 두 프로그램 모두 시험 전 상태(Vercel·일시정지 아님·CRM 규칙 0)로 복귀.
처리 결과 3(2026-10-20, Claude Code 윈도우): 「운영 12개」 이후 새로 만든 **인스타 예약 3개(인플루언서 v1.15·웹툰 v1.16·4컷 v1.18)가 수정 전 사본을 복사해 일시정지 안전 처리가 빠져 있던 것**을 발견 → 카드뉴스를 기준으로 `memberScheduler.ts`·`cronJobOrg.ts`·`schedule.ts`를 공용 기준 코드(`insta-member-scheduler`·`insta-cronjob-org`·`insta-schedule-time`, `docs/SHARED_MODULES.md`)로 등록해 사본을 같게 맞추고(프로그램 값은 각 `schedulerConfig.ts`), 회원 실행 주소 `skipPausedMember`·일시정지 응답 `notice`까지 반영. 적용·배포: cardnews-studio v1.29·ai-influencer-studio v1.17·ai-webtoon-studio v1.19·four-cut-comics v1.20 → **운영 15개 전부 적용**. 같은 작업에서 게시 기록 「예약 취소」 중복 누름 방지(4개). **새 인스타 예약 프로그램은 사본을 직접 복사하지 말고 `check-shared-modules.mjs`에 사본으로 등록한 뒤 `--sync`로 받는다.**

**발견(미수정, 다음 개선 후보)**: 「재개」와 「Vercel로 바꾸기」가 거의 동시에 처리되면(10:02:22·10:02:23 실제 발생) 재개가 방식을 「내 cron-job.org」로 읽은 뒤 작업을 다시 켜 `mode: vercel`·`active: true`·cron-job.org 작업 켜짐으로 남을 수 있다. 중복 발송은 「먼저 차지하기」로 막히지만 회원 실행과 운영자 실행이 둘 다 돈다. 보강안: `skipPausedMember`가 `mode !== "cronjob"`인 회원도 건너뛰고 작업을 끄게(12개 사본 같은 한 줄).

처리 결과 4(2026-10-20 10:45~11:34, Claude Code 윈도우) — **바로잡음**: 위 「재개와 방식 변경이 동시에 처리되면 회원 실행과 운영자 실행이 둘 다 돈다」는 판단은 틀렸다. `memberIdForToken`이 처음부터 방식이 `cronjob`이 아닌 회원의 토큰을 401로 거르므로 **실제 실행은 일어나지 않는다**(재현 검수로 확인). 실제 문제는 401만 돌려주고 cron-job.org 작업을 끄지 않아 **5분마다 헛호출이 이어지는 것**(cron-job.org는 실패 25번 넘게 이어지면 작업을 스스로 끔)이었다. 수정: `memberIdForToken`이 방식이 다르면 401과 함께 작업을 끄고 `active: false`로 정리. 직전에 넣은 `skipPausedMember`의 방식 조건(c69b0407)은 닿지 않는 코드라 되돌림. 적용(커밋 `be5c5107`): 운영 12개 + 인스타 공용 기준 사본 3개(ai-influencer-studio v1.18·ai-webtoon-studio v1.20·four-cut-comics v1.21). 재현 검수 통과(상품소싱: 401 한 번 뒤 호출 없음).


처리 결과 5(2026-10-20, Claude Code 윈도우): 회원 실행 방식 코드 `memberScheduler.ts`를 **예약 프로그램 15개 공용 기준 코드 `member-scheduler`**(기준 `cardnews-studio/src/lib/instagram/memberScheduler.ts`)로 통일. 프로그램 값은 같은 폴더 `schedulerConfig.ts`(사이트 주소·표·토큰 앞글자·환경변수·설치 키트 여부·「남은 일」 세기·실행 주소). **새 예약 프로그램은 `memberScheduler.ts`를 복사하지 말고 공용 사본으로 등록해 `--sync`로 받고 `schedulerConfig.ts`만 만든다.** 미배포(각 프로그램 다음 배포 때).

**새 예약 프로그램 체크리스트 추가 항목(2026-10-20 — 메인 사이트 「📅 내 예약 현황」)**: 회원 예약을 만드는 프로그램을 새로 만들면 루트 `lib/schedules/memberSchedules.ts`에도 한 줄 등록한다 — 한 건씩 예약(`status='scheduled'` + `scheduled_at`, 또는 `is_reserved` 방식)은 `SOURCES`, 규칙을 켜 두면 주기마다 도는 정기형은 `RECURRING`(「남은 일」 세기는 그 프로그램 `schedulerConfig.ts` `countRemainingWork`와 같은 조건). 등록하면 회원의 「내 예약 현황」과 홈 요약 한 줄에 바로 모여 보인다. 현재 등록: 예약 게시 9개(인스타 5·쓰레드 3·네이버 블로그 에이전트), 정기형 7개.