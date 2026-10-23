# 2026-10-20 플랜 — 매일 리포트·소싱 알림·가격 알림 실행 방식 회원 선택 (v1.15)

- 지시: 주인님 「2순위도 적용하고 권한 확인도 넣어줘」(2026-10-20). 지침: 루트 `docs/SCHEDULER_POLICY.md`. 기준 구현: `youtube-auto-reply` v1.12(Next 15 `after`)·`booking-reminder` v1.21.
- 대상: ① 운영 AIMaster(DB `esgxyikcnnvmlhygjkth`) — `trending-product-finder` 한 폴더.

## 문제
1. 회원 정기 작업 3개(매일 리포트 09시, 예약 소싱 알림 5분, 관심 상품 가격 알림 5분)가 운영자 Vercel 예약 호출로만 돌았다 → 회원 본인 cron-job.org 선택 불가.
2. 매일 리포트에 「마지막 자동 생성 시각」이 없어, 5분마다 깨우는 회원 호출로 옮기면 하루에 여러 번 만들어진다. 두 알림은 보낸 **뒤에** 시각을 적어 실행이 겹치면 두 번 보낼 수 있다.
3. 실행 때 핸드폰만 확인 → **이용 권한(사용기간)** 이 끝난 회원도 계속 실행(회원 키 요금).
4. 예약 주소 4곳 모두 `CRON_SECRET`이 비면 `Bearer undefined`로 통과.

## 구현
1. `lib/schedulerMember/`(cronJobOrg·memberScheduler·dispatch·sync) — 표 `trend_member_scheduler`, 토큰 `trend_…`(DB엔 해시), 끄기 스위치 `TREND_PLATFORM_SCHEDULER=off`, 회원 cron-job.org **5분마다**, 「남은 일」 = 켜진 관심 목록 수 + 알림 켠 관심 상품 수.
2. `dispatch.ts` — 세 작업을 운영자 주소에서 옮기고: 이용 권한 확인 + **먼저 차지하기**(매일 리포트는 새 칸 `trend_watchlist.report_last_run_at`, 「오늘 09:00 KST 이후 1번」; 소싱 알림 `sourcing_alert_last_run_at`; 가격 알림 `last_checked_at`).
3. 운영자 주소 3곳은 제외 목록·비밀값 검사만 하는 얇은 주소로, 30일 정리 주소도 비밀값 검사 보완. 새 `/api/cron/dispatch-member`(회원 토큰, 즉시 응답 + `after`, 세 작업 차례대로).
4. 켜고 끄는 7곳 연결(`sync.ts`): 관심 목록 만들기·후보에서 추가·켜기/끄기·삭제, 관심 상품 저장·알림 켜기/끄기·삭제. 켜기 스위치는 준비가 안 되면 되돌리고 안내, 새로 만든 것은 그대로 두고 상태 줄로 안내.
5. 화면: 설정 「⏰ 예약 발행」(방식 선택 + 키 칸), 관심 키워드 화면 위 상태 줄·일시정지/재개, `/guide` FAQ. 키 종류·이름표에 `cronjob_org_api_key`.
6. DB: `supabase/migrations/20261020180000_trend_member_scheduler.sql`(표 + `report_last_run_at` 칸 + `programs.version` v1.15).

## 검수·비용·버전
- tsc 0·`test:trend` 11/11·`test:permissions` PASS·build → 배포 → 예약 주소 401 → 크롬(관리자): 설정·상태 줄 화면, Vercel 방식 일시정지·재개. cron-job.org 하루 호출 한도가 2026-10-20 소진돼 「내 cron-job.org」 실검수는 한도가 풀린 뒤.
- 주의: 배포 직후 첫 09시 리포트는 새 칸이 비어 있어 예전처럼 1번 생성(동작 변화 없음).
- 비용: 없음(유료 API 추가 호출 없음, 실제 발송 없음). 버전 v1.14 → v1.15. `vercel.json` 변경 없음.
