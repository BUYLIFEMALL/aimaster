# 개발 플랜 — 인스타 예약 게시 실행 방식 회원 선택 (v1.24, 2026-10-20)

- 대상: ① AIMaster 운영 — `cardnews-studio`(INSTA 카드뉴스 자동화), 운영 DB `esgxyikcnnvmlhygjkth`
- 지침: 루트 `docs/SCHEDULER_POLICY.md` · 인수인계 `docs/SCHEDULER_ROLLOUT_HANDOFF_20261019.md` §4-1 · 기준 구현 `threads/`(v1.19, 운영 전용·배포판 없음)
- 작성: Claude Code(윈도우), 주인님 지시 「순서대로 진행」(예약 방식 1순위 ③)

## 1. 문제
- 예약 게시는 운영자 Vercel 예약 호출(5분)만 있어 회원이 본인 cron-job.org를 고를 수 없다(지침 §1).
- 장애 뒤 24시간 넘게 밀린 예약이 한꺼번에 올라갈 수 있다(24시간 규칙 없음).
- 이미 있는 장치(조건부 잠금 중복 방지, 1차 일시 오류 10분 뒤 1회 재시도, 재시도 전 이미 게시됐는지 확인)는 그대로 살린다.

## 2. 범위
| 파일 | 내용 |
|---|---|
| `src/lib/instagram/cronJobOrg.ts`·`memberScheduler.ts` (신규) | 기준 사본. 표 `cns_member_scheduler`, 예약 글 표 `cns_insta_posts`, 토큰 `cns_…`, 환경변수 `CNS_PLATFORM_SCHEDULER`(off면 Vercel 방식 끔), 기본 방식 Vercel 고정, 회원 실행 주소 `/api/cardnews/instagram/dispatch-member` |
| `src/lib/instagram/posts.ts` `dispatchDuePosts` | 옵션 `userId`·`excludeUserIds`·`failWithMessage` + **24시간 규칙**(재시도로 미뤄진 글은 원래 예약 기준이 아니라 다시 잡힌 시각 기준). 기존 잠금·재시도·중복 확인 유지 |
| `api/cardnews/instagram/dispatch/route.ts` | 운영자 실행: vercel·비일시정지 회원만(제외 목록), Vercel 꺼진 사이트면 안내 실패. 30일 정리는 그대로 |
| `api/cardnews/instagram/dispatch-member/route.ts` (신규) | 회원 토큰 → 즉시 응답 + `after`로 그 회원 글만 → 남은 예약 0건이면 작업 끔 |
| `api/cardnews/scheduler/route.ts` (신규) | 화면용: GET 상태, POST 방식 바꾸기·일시정지·재개(로그인·이용 권한 확인). 이 프로그램은 서버 액션 대신 API 라우트 구조 |
| `api/cardnews/instagram/posts/route.ts` | 예약 전 방식·키 확인(없으면 거부+안내, 이미지 정리), 예약 뒤 작업 켜기 — 실패하면 그 예약을 취소하고 이미지 정리 후 안내 |
| `api/settings/api-keys/route.ts`·`src/lib/apiKeys.ts` | 허용 목록에 `cronjob_org_api_key`(공용 provider), 키 바꾸면 예전 작업 정리 후 남은 예약 있으면 다시 켜기, 키 지우면 작업 정리·Vercel로 |
| 설정 화면 + `SchedulerModePicker`(다크) | 「⏰ 예약 발행」: 방식 선택 + cron-job.org 키 칸(기존 `KeyCard`) + 가입 3단계 안내 |
| `InstagramPublishPanel` + `SchedulePublishingControl`(다크) | 예약 게시 화면에 상태 줄(실행 방식·대기 N건)·전체 일시정지/재개, 예약 안내 문구에 1분/5분 |
| `/guide` FAQ | 두 방식 설명 |
| `supabase/migrations/20261020100000_cns_member_scheduler.sql` | 표 + RLS 본인 조회 + `programs.version` v1.24 |
| `tests/schedule.test.mjs` | 24시간 규칙 판정 함수 시험 추가 |

## 3. 순서·검수
1. 코드 → `npx tsc --noEmit`, `npm test`, `npm run build`(새 주소 2개 확인)
2. 버전 v1.24 → 커밋·푸시(배포 전)
3. **운영 DB 표 생성 — 주인님 승인 후 크롬 SQL Editor로**(표가 없으면 운영자 예약 실행이 멈추므로 반드시 DB 먼저)
4. 배포 1회 → 실행 주소 무인증·가짜 토큰 401, `/login` 200, 새 배포 첫 운영자 실행 200
5. 크롬 실검수(관리자 본인 키, **실제 게시 없음**): cron-job.org 선택 → 카드뉴스 하나를 이틀 뒤로 예약 → 작업 자동 켜짐 → 일시정지·재개 → 예약 취소 → 1분 안 자동 꺼짐 → Vercel 복귀

## 4. 비용·버전
- 유료 AI 호출 없음(예약은 기존 카드 이미지를 올리기만 함), Vercel 빌드 1회. 회원 cron-job.org 무료.
- v1.23 → **v1.24**(코드·DB).
