# 개발 플랜 — 리마인드 발송 실행 방식 회원 선택 (v1.21, 2026-10-20)

- 대상: ① AIMaster 운영 — `booking-reminder`(예약(취소)방지 리마인드), 운영 DB `esgxyikcnnvmlhygjkth`. 주인님 지시 「2순위도 적용하고 권한 확인도 넣어줘」.
- 기준: `stepmail` v1.21(정기형 + 권한 확인). 차이: 운영자 예약 호출 15분 → 회원 cron-job.org도 **15분**, 「남은 일」= 켜진 리마인드 규칙 수, **Next 14라 `after` 대신 `@vercel/functions` `waitUntil`**(1.5.2, threads-content-ops와 같은 버전 설치).
- 범위: `lib/schedulerMember/`(cronJobOrg·memberScheduler·dispatch), `lib/programAccess.ts`(사본), `/api/cron/reminder`(제외 목록·`CRON_SECRET` 빈 값 401), 새 `/api/cron/dispatch-member`, `lib/actions/scheduler.ts`, `reminderRules.ts` 생성·켜기/끄기·삭제 때 작업 맞추기, **이 프로그램은 API 키 화면이 없어** cron-job.org 키 전용 저장 함수(`lib/actions/settings.ts`)·키 칸(`components/settings/CronjobKeyRow.tsx`)을 새로 둠, 설정 「⏰ 예약 발행」, 예약 관리 화면 상태 줄, `/guide` FAQ Q6, 표 `booking_member_scheduler`, v1.20 → **v1.21**.
- 안전: **중복 발송 방지 보강** — 예전엔 「보냈는지 확인 → 발송 → 기록」이라 실행이 겹치면 둘 다 보낼 수 있었다 → **발송 전에 기록을 먼저 넣어 선점**((rule_id, reservation_id) 고유 제약, 상태값이 sent/failed뿐이라 「발송 중」은 failed로 넣고 끝나면 고침 — 실패 리마인드는 원래도 재발송 안 함). **이용 권한(사용기간) 확인 추가**. 시험 중 실제 발송 없음.
