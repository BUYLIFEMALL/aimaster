# 아키텍처 — Booking Reminder

## 1. crm-google-form과의 관계 (왜 별도 서브프로젝트인가)

SOLAPI 활용 제안 4가지(2026-08-18) 중 "CRM 팔로우업 확장"과 "예약 리마인드" 둘 다 검토했을
때, **트리거 기준이 근본적으로 다르다는 이유**로 분리했다:

- crm-google-form의 팔로우업(Phase 4)은 "접수 시점 기준 N일 후" — 트리거가 과거(접수일).
- 예약 리마인드는 "예약일시 기준 N시간 전/후" — 트리거가 **미래의 특정 시각**이고, 시(時)
  단위로 정밀해야 한다("2시간 전 확인 문자"는 하루 단위 cron으로 못 만든다).

타겟 고객군도 다르다 — crm-google-form은 온라인 신청접수(강의/상담 신청 등), 이 프로그램은
오프라인 예약 업종(병원/미용실/학원)이라 시장 포지셔닝 자체가 다르다.

다만 **발송 인프라는 100% 공유**한다 — `user_smtp_accounts`/`user_solapi_accounts`/
`user_telegram_links`가 전부 프로그램 접두어 없는 공용 테이블로 설계돼 있어서
(`docs/PLATFORM_PATTERNS.md` §9), crm-google-form에서 이미 이메일/SOLAPI/텔레그램을
등록한 회원은 이 프로그램에서 다시 등록할 필요가 없다.

## 2. 예약 입력 방식 — 직접 등록 (구글폼 아님)

crm-google-form은 구글폼 응답이 트리거지만, 이 프로그램의 타겟(병원/미용실/학원)은 대부분
전화·방문으로 예약을 받지 구글폼을 안 쓴다. 그래서 **직원이 대시보드에서 직접 예약을
등록**하는 방식으로 설계했다(고객명/연락처/예약일시/메모 입력) — stepmail의 리드 등록과
비슷한 성격이지만, 리드는 "발송 대상 목록"이고 예약은 "특정 미래 시각에 묶인 이벤트"라는
차이가 있다.

## 3. 리마인드 규칙 설계

`booking_reminder_rules`에 규칙을 여러 개 등록할 수 있다 — 각 규칙은 `offset_minutes`(예약
일시 기준 오프셋, **음수 = 그 전, 양수 = 그 후**)를 가진다:

- `offset_minutes: -1440` (예약 24시간 전) — "내일 예약 있으신 거 잊지 마세요"
- `offset_minutes: -120` (예약 2시간 전) — "곧 방문 예정이세요"
- `offset_minutes: +1440` (방문 다음날) — "방문해주셔서 감사합니다, 후기 남겨주세요"

cron(`app/api/cron/reminder`)이 **15분마다** 돌면서, `reservation_at + offset_minutes`가
"지금부터 15분 이내"인 예약 건을 찾아 발송한다. 하루 1번 도는 crm-google-form의 팔로우업
cron과 달리 시간 단위 정밀도가 필요해서 주기를 훨씬 짧게 잡았다. 중복 발송 방지는
`booking_reminder_sends`의 `(rule_id, reservation_id)` 유니크 제약으로 동일하게 처리한다
(crm-google-form의 `crm_followup_sends`와 같은 패턴).

## 4. Next.js Data Cache 주의사항

crm-google-form 개발 중 실제로 재현한 버그 — `dynamic = "force-dynamic"`만으로는 Next.js
Data Cache가 supabase-js 내부 fetch를 캐싱해서 cron이 오래된 데이터를 계속 반환할 수 있다
(`docs/PLATFORM_PATTERNS.md` §10). 이 프로젝트의 모든 cron/웹훅 라우트와 대시보드 페이지에
**처음부터** `export const fetchCache = "force-no-store";`를 함께 선언한다.

## 5. DB 스키마 개요 (Phase 1)

- `booking_reservations` — user_id, customer_name, customer_phone, customer_email(선택),
  reservation_at(timestamptz), memo, status(booked/completed/no_show/cancelled), created_at
- `booking_reminder_rules` — user_id, name, offset_minutes(음수/양수), channel_email/sms/
  alimtalk/friendtalk(boolean), message_subject/message_text({name}/{time} 치환 지원),
  kakao_template_id/kakao_variables, is_active
- `booking_reminder_sends` — user_id, rule_id, reservation_id(unique 조합으로 중복방지),
  status, sent_at
- `user_smtp_accounts` / `user_solapi_accounts` / `user_telegram_links` — 전부 공용 테이블
  재사용, 신규 마이그레이션 불필요

전부 `user_id` + RLS owner-only. cron만 `createAdminClient()`(service role)로 처리.
