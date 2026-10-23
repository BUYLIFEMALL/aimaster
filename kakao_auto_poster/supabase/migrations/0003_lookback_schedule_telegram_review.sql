-- Phase 3: 조회 범위 설정 + 예약 발송 on/off + 카카오 발송 전 텔레그램 검토

-- 1. kakao_topics: 데이터 조회 범위(회원이 직접 선택) + 예약(정기 자동 생성) 설정
alter table public.kakao_topics
  add column if not exists lookback_days integer not null default 14,
  add column if not exists schedule_enabled boolean not null default false,
  add column if not exists interval_minutes integer,
  add column if not exists last_run_at timestamptz;

-- 2. kakao_reports: 카카오 발송 전 텔레그램 검토 상태 추적 + 생성 경로(수동/예약) 구분
alter table public.kakao_reports
  add column if not exists telegram_review_status text not null default 'not_requested'
    check (telegram_review_status in ('not_requested', 'pending', 'approved', 'rejected')),
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_message_id bigint,
  add column if not exists generated_via text not null default 'manual'
    check (generated_via in ('manual', 'scheduled'));

-- 참고: 텔레그램 연동 자체는 real_estate_sales가 만든 공용 user_telegram_links
-- 테이블(프로그램 접두어 없음, (user_id, program_slug) 단위 스코프)을 그대로 재사용한다 —
-- 이 프로젝트에서 새로 만들지 않는다 (docs/PLATFORM_PATTERNS.md §9).
