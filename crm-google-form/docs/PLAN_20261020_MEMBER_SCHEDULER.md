# 2026-10-20 플랜 — 팔로우업 발송 실행 방식 회원 선택 (v1.10)

- 지시: 주인님 「2순위도 적용하고 권한 확인도 넣어줘」(2026-10-20). 지침: 루트 `docs/SCHEDULER_POLICY.md`. 기준 구현: `booking-reminder` v1.21(같은 규칙 기반 구조).
- 대상: ① 운영 AIMaster(DB `esgxyikcnnvmlhygjkth`) — `crm-google-form` 한 폴더.

## 문제
1. 「접수 후 N일 팔로우업」은 운영자 Vercel 예약 호출(매일 09:00 KST)로만 돌았다 → 회원이 본인 cron-job.org로 돌릴 방법이 없다.
2. 발송이 「보냈는지 확인 → 발송 → 기록」 순서라, 실행이 겹치면 같은 신청자에게 두 번 보낼 수 있다.
3. 실행 때 정지·핸드폰만 확인하고 **이용 권한(사용기간)** 은 확인하지 않았다 → 기간이 끝난 회원의 켜 둔 규칙도 계속 발송.
4. `CRON_SECRET`이 비면 `Bearer undefined`로 통과되는 빈틈.

## 구현 순서
1. `lib/schedulerMember/`(cronJobOrg·memberScheduler·dispatch) — 표 `crm_member_scheduler`, 토큰 `crm_…`(DB엔 해시), 끄기 스위치 `CRM_PLATFORM_SCHEDULER=off`, 회원 cron-job.org 작업은 **매일 09:00 KST**(운영자와 같은 시각), 「남은 일」 = 켜진 팔로우업 규칙 수.
2. `lib/programAccess.ts`(사본) — 실행 직전 회원별 이용 권한 확인.
3. `lib/crm/followupDispatch.ts` — 발송 전에 `crm_followup_sends`에 먼저 넣어 선점((rule_id, submission_id) 고유 제약), 「발송 중」은 failed로 넣고 끝나면 실제 결과로 고침.
4. `/api/cron/followup` — 제외 목록(cronjob·일시정지 회원)·비밀값 빈 값 401. 새 `/api/cron/dispatch-member`(회원 토큰, 즉시 응답 + `waitUntil`, Next 14).
5. `lib/actions/followupRules.ts` — 만들기·켜기/끄기·삭제 때 작업 맞추기(켤 준비가 안 되면 규칙을 다시 끄고 안내). 규칙 줄에 그 안내가 보이게 함.
6. 화면: 설정 「⏰ 예약 발행」(방식 선택 + cron-job.org 키 칸), 구글폼 연결 화면 상태 줄·일시정지/재개, `/guide` FAQ.
7. DB: `supabase/migrations/20261020160000_crm_member_scheduler.sql`(크롬 SQL Editor 적용) + `programs.version` v1.10.

## 검수
tsc·build → 배포 → 무인증·`Bearer undefined`·가짜 토큰 401 → 크롬(관리자, **실제 발송 없음**: 시험 규칙은 채널 모두 끔·차례 안 옴): cronjob 선택 → 규칙 켜기 → 작업 자동 켜짐 → 일시정지·재개 → 규칙 끄기 → 작업 꺼짐 → Vercel 복귀 → 시험 데이터 삭제. 운영자 실행은 다음 날 09시 로그로 확인.

## 비용·버전
- 비용: 없음(cron-job.org 무료, 유료 API 호출 없음, 실제 메일·문자 발송 없음).
- 버전 v1.09 → v1.10(코드 `lib/version.ts` + DB). `vercel.json` 변경 없음.
