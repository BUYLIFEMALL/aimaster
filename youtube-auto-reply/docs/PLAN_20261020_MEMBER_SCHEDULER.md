# 2026-10-20 플랜 — 예약 댓글 모니터링 실행 방식 회원 선택 (v1.12)

- 지시: 주인님 「2순위도 적용하고 권한 확인도 넣어줘」(2026-10-20). 지침: 루트 `docs/SCHEDULER_POLICY.md`. 기준 구현: `booking-reminder` v1.21·`stepmail` v1.21(Next 15 `after`).
- 대상: ① 운영 AIMaster(DB `esgxyikcnnvmlhygjkth`) — `youtube-auto-reply` 한 폴더.

## 문제
1. 예약 모니터링(새 댓글 수집 + AI 초안)은 운영자 Vercel 예약 호출(5분마다 깨움)로만 돌았다 → 회원 본인 cron-job.org 선택 불가.
2. `last_run_at`을 조건 없이 덮어써서 실행이 겹치면 같은 회원을 두 번 확인할 수 있다(AI 초안 = 회원 키 요금).
3. 실행 때 정지·핸드폰만 확인 → **이용 권한(사용기간)** 이 끝난 회원도 계속 확인.
4. 예약 주소 3곳 모두 `CRON_SECRET`이 비면 `Bearer undefined`로 통과되는 빈틈.

## 구현
1. `lib/schedulerMember/`(cronJobOrg·memberScheduler·dispatch) — 표 `ytreply_member_scheduler`, 토큰 `ytreply_…`(DB엔 해시), 끄기 스위치 `YTREPLY_PLATFORM_SCHEDULER=off`, 회원 cron-job.org는 **5분마다**(운영자와 같음, 실제 확인은 회원이 고른 주기로 판단), 「남은 일」 = 모니터링 켜짐(1/0).
2. `dispatch.ts` — 실행 로직을 `/api/cron/sync-comments`에서 옮김 + 이용 권한 확인 + 조건부 `last_run_at` 선점.
3. `/api/cron/sync-comments` 제외 목록·비밀값 검사, 새 `/api/cron/dispatch-member`(회원 토큰, 즉시 응답 + `after`). `check-connection`·`cleanup-comments`는 운영 관리 작업이라 운영자 실행 그대로(비밀값 빈 값 차단만 보완).
4. `lib/actions/monitoring.ts` 시작/중지 때 작업 맞추기(준비가 안 되면 모니터링을 다시 끄고 안내), `settings.ts` 키 허용·변경·삭제, 타입·키 이름표.
5. 화면: 설정 「⏱ 예약 모니터링」 위 상태 줄·일시정지/재개, 새 「⏰ 예약 발행」 구역(방식 선택 + 키 칸, 유튜브 다크 색), `/guide` FAQ.
6. DB: `supabase/migrations/20261020170000_ytreply_member_scheduler.sql` + `programs.version` v1.12.

## 검수·비용·버전
- tsc·build·권한 테스트 → 배포 → 401 확인 → 크롬(관리자). 관리자는 실제 모니터링(24시간 주기, 본인 키)이 켜져 있어 **방식만 잠깐 바꿨다 되돌리고 모니터링 설정은 건드리지 않는다**. cron-job.org 하루 호출 한도가 2026-10-20 소진돼 cron-job.org 쪽 실검수는 한도가 풀린 뒤.
- 비용: 없음(유료 API 추가 호출 없음, 실제 게시 없음). 버전 v1.11 → v1.12. `vercel.json` 변경 없음.
