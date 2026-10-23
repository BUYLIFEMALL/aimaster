# 개발 플랜 — 인스타 댓글 자동 수집을 회원이 켜고 끄기 (2026-10-23 Claude Code 윈도우)

> 주인님 선택: 「인스타 댓글 자동 수집 (추천)」(2026-10-23). 같은 작업을 먼저 끝낸 사례: `threads-comment-reply` v1.26~v1.27, 그 기준 구현 `youtube-auto-reply` v1.12.
> 대상: ① 운영 AIMaster, DB ref `esgxyikcnnvmlhygjkth`. 지침: 루트 `docs/SCHEDULER_POLICY.md`, 공용 기준 코드 `member-scheduler`(`docs/SHARED_MODULES.md`).

## 1. 지금 상태 (코드 확인)
- 설정 화면 「⏱ 예약 모니터링」(켜기·확인 주기·시작 시점)은 있고 `ig_settings.monitoring_enabled`에 저장된다(`lib/actions/monitoring.ts`).
- 실행 주소 `/api/cron/sync-comments`를 부르는 예약이 없다(`vercel.json` `crons: []`). → **회원이 켜도 아무 일도 일어나지 않는다.**
- 쓰레드 앱에서 고친 버그 3개가 그대로 있다:
  1. 시작 시각을 서버(UTC)가 그대로 읽어 **9시간 늦게 저장**(`monitoring.ts:22`) → 켠 뒤 9시간 동안 달린 댓글을 건너뜀.
  2. AI 답글 지시문이 **「유튜브 채널 운영자·시청자」**로 되어 있음(`lib/ai/reply.ts:24`).
  3. 「⏸ 모니터링 중지」 직후 화면이 새로고침 전까지 켜짐으로 남음(`MonitoringSettingsForm.tsx`).

## 2. 바꿀 것 (쓰레드 v1.26과 같은 방식)
1. **실행 방식 회원 선택**: 설정에 「⏰ 예약 실행 방식」 — AIMaster 기본(Vercel, 5분마다 깨움) / 내 cron-job.org(공용 키 `cronjob_org_api_key`, 다른 프로그램에서 등록했으면 그대로 사용). 공용 `member-scheduler` 사본 + 이 앱 값 `lib/schedulerMember/schedulerConfig.ts`(표 `ig_member_scheduler`, 토큰 `igreply_…`, 끄기 스위치 `IGREPLY_PLATFORM_SCHEDULER=off`, 「남은 일」 = 모니터링 켠 설정 수).
2. **켜기/끄기 연동**: 모니터링을 켜면 회원 cron-job.org 작업을 켜고(준비가 안 됐으면 다시 끄고 안내), 끄면 작업도 끈다. 실행 상태 줄·일시정지/재개.
3. **실행 안전장치**: 회원 실행 주소 `/api/cron/dispatch-member`(회원 전용 토큰, DB엔 해시만). 운영자 주소는 Vercel 방식·일시정지 안 한 회원만 처리. 처리 전 **이용 권한(사용기간) 다시 확인**, `last_run_at` **조건부 선점**(두 호출이 겹쳐도 한 번만), 정지·핸드폰 정책 유지.
4. `vercel.json`에 `/api/cron/sync-comments` 5분마다 등록(실제 확인은 회원이 고른 주기로 판단 — 지금 코드 그대로).
5. 위 버그 3개 수정(쓰레드·유튜브와 같은 코드). 지시문은 「인스타그램 계정 운영자·게시물」로.
6. 매뉴얼(`/guide`) FAQ에 실행 방식 안내.

## 3. 바꾸지 않는 것
- 자동 게시는 기존처럼 회원이 「자동 승인」을 켤 때만(기본 꺼짐). 수집·초안 생성만 자동.
- DM 자동화(`app/api/dm`)·텔레그램 알림은 건드리지 않는다.

## 4. DB (운영, 크롬 SQL Editor로 적용)
- 새 표 `ig_member_scheduler`(회원별 실행 방식·토큰 해시·cron-job.org 작업 번호, RLS 본인 조회만, 쓰기는 서버만) — `th_member_scheduler`와 같은 구조.
- `programs.version` = v1.36. SQL은 `supabase/migrations/`에 파일로 남긴다.

## 5. 검수
- `tsc`·`npm run build`(로컬), 실행 주소 무인증·`Bearer undefined`·가짜 토큰 401.
- 크롬(시험 회원 `buylifemall@naver.com`, 실제 게시 없음): 방식 선택 → 모니터링 켜기(시작 시각이 한국 시간 그대로 저장되는지 DB 대조) → 상태 줄 → 중지 즉시 반영 → 원래 상태로 되돌림.

## 6. 버전·비용
- v1.35 → **v1.36**(코드·DB). 함께 나가는 미배포 대기분: 공용 그래프 사본(`week-reply-*`) 등 `pending-check` 결과 전부.
- 비용: **Vercel 빌드 1회**. 배포 뒤 Vercel 예약 호출이 5분마다 돈다(켠 회원이 없으면 바로 끝남, 소량). 자동 수집 때 AI 초안은 **회원 본인 키** 비용(새 댓글이 있을 때만). 시험 중 AI 호출 0회 목표(켜고 바로 끔).
