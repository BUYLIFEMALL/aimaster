# 개발 플랜 — 캠페인 예약 발송 실행 방식 회원 선택 (v1.21, 2026-10-20)

- 대상: ① AIMaster 운영 — `stepmail`(대량 메일발송), 운영 DB `esgxyikcnnvmlhygjkth`. 주인님 지시 「2순위도 적용하고 권한 확인도 넣어줘」.
- 지침: 루트 `docs/SCHEDULER_POLICY.md` · 기준 `naver-cafe-poster` v1.21~v1.22(정기형 + 권한 확인)
- 차이: 운영자 예약 호출이 **매시 정각**이고 캠페인마다 발송 시각(KST 시)·반복(한 번/매일/매주)이 있다 → 회원 cron-job.org는 **매시 0·30분**(같은 시간대에 한 번 놓쳐도 다시 확인). 「남은 일」= 켜진 캠페인 중 **이미 보낸 「한 번만」 캠페인을 뺀 수**.
- 범위: `lib/schedulerMember/`(cronJobOrg·memberScheduler·dispatch), `lib/programAccess.ts`(사본), `/api/cron/dispatch`(제외 목록·`CRON_SECRET` 빈 값 401), 새 `/api/cron/dispatch-member`, `lib/actions/scheduler.ts`, `campaigns.ts` 생성·켜기/끄기·삭제 때 작업 맞추기, 키 저장(`cronjob_org_api_key`), 설정 「⏰ 예약 발행」, 예약 발송 화면 상태 줄, `/guide` FAQ Q6, 표 `stepmail_member_scheduler`, v1.20 → **v1.21**(`version.ts`·`package.json`·DB).
- 안전: **선점(조건부 `last_run_at`) 뒤 발송 도중 예외가 나도 되돌리지 않음**(일부 메일이 이미 나갔을 수 있어 재발송 시 중복). **이용 권한(사용기간) 확인 추가** — 예전엔 정지·핸드폰만 확인. `vercel.json` 예약 호출은 바꾸지 않음(AGENTS.md 사전 승인 항목), 시험 중 실제 발송 없음.
