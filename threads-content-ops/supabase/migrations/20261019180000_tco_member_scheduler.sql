-- 2026-10-19 v2.07 — 예약 발행을 회원 본인 cron-job.org로 실행 (주인님 승인, Claude Code 윈도우)
-- 지침: docs/SCHEDULER_POLICY.md
-- 1) 공용 연동 저장소에 cron-job.org API 키 이름 추가 — 현재 허용 목록을 읽어 값 하나만 덧붙인다(다른 CLI가 추가한 값 보존).
do $$
declare def text;
begin
  select pg_get_constraintdef(oid) into def from pg_constraint
   where conname = 'user_api_keys_provider_check' and conrelid = 'public.user_api_keys'::regclass;
  if def is null then raise exception 'user_api_keys_provider_check not found'; end if;
  if position('cronjob_org_api_key' in def) > 0 then return; end if;
  -- 저장 모양이 두 가지라 둘 다 처리한다: ARRAY['a'::text, ...] 또는 '{a,b,...}'::text[] (운영 DB는 뒤쪽, 2026-10-19 확인)
  if def ~ '\}''::text\[\]\)\)\)$' then
    def := regexp_replace(def, '\}''::text\[\]\)\)\)$', ',cronjob_org_api_key}''::text[])))');
  elsif def ~ '\]\)\)$' then
    def := regexp_replace(def, '\]\)\)$', ', ''cronjob_org_api_key''::text]))');
  else
    raise exception 'unexpected constraint format: %', def;
  end if;
  execute 'alter table public.user_api_keys drop constraint user_api_keys_provider_check';
  execute 'alter table public.user_api_keys add constraint user_api_keys_provider_check ' || def;
end $$;

-- 2) 회원별 예약 실행 연결: 회원 전용 실행 토큰(해시만 저장)과 cron-job.org 작업 번호.
create table if not exists public.tco_member_scheduler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  cronjob_job_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tco_member_scheduler enable row level security;
drop policy if exists tco_member_scheduler_select_own on public.tco_member_scheduler;
create policy tco_member_scheduler_select_own on public.tco_member_scheduler for select to authenticated using (auth.uid() = user_id);
-- 쓰기는 서버(서비스 롤)만: 서버 액션이 로그인·이용 권한을 확인한 뒤 기록한다.

-- 3) (같은 날 방향 변경) 예약은 포스팅 쪽에서만 하고 실행 작업은 자동 켜기/끄기 → 상태 칸 추가.
--    active: 회원 cron-job.org 작업이 켜져 있는가(남은 예약이 없으면 자동으로 false) / paused: 회원이 「예약 발행 일시정지」를 눌렀는가
alter table public.tco_member_scheduler add column if not exists active boolean not null default false;
alter table public.tco_member_scheduler add column if not exists paused boolean not null default false;
