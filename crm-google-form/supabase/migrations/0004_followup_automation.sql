-- SOLAPI "CRM 자동화" 사례(접수 후 N일 뒤 안내, 만족도 조사 등)를 벤치마킹한 팔로우업
-- 자동화. 폼별로 "접수 후 N일 경과 시 자동 메시지" 규칙을 여러 개 등록할 수 있고,
-- 매일 도는 cron(app/api/cron/followup)이 조건에 맞는 접수건을 찾아 발송한다.

create table public.crm_followup_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  form_source_id uuid not null references public.crm_form_sources(id) on delete cascade,
  name text not null,                -- 규칙 이름 (예: "3일 후 안내")
  days_after int not null check (days_after > 0),
  channel_email boolean not null default false,
  channel_sms boolean not null default false,
  channel_alimtalk boolean not null default false,
  channel_friendtalk boolean not null default false,
  message_subject text,              -- 이메일 제목 (선택, 비우면 폼 이름 기반 기본값 사용)
  message_text text not null,        -- 문자/친구톡/이메일 본문 공통. {name} 치환 지원
  kakao_template_id text,            -- 알림톡 채널을 켰을 때만 필요
  kakao_variables jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_followup_rules_form_source_id_idx on public.crm_followup_rules(form_source_id);
create index crm_followup_rules_active_idx on public.crm_followup_rules(is_active) where is_active = true;

create trigger crm_followup_rules_set_updated_at
  before update on public.crm_followup_rules
  for each row execute function public.set_updated_at();

-- 발송 이력 + 중복 발송 방지(rule_id, submission_id 조합 유니크).
create table public.crm_followup_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id uuid not null references public.crm_followup_rules(id) on delete cascade,
  submission_id uuid not null references public.crm_submissions(id) on delete cascade,
  status text not null check (status in ('sent','failed')),
  error_message text,
  sent_at timestamptz not null default now(),
  unique (rule_id, submission_id)
);

create index crm_followup_sends_user_id_idx on public.crm_followup_sends(user_id);

alter table public.crm_followup_rules enable row level security;
alter table public.crm_followup_sends enable row level security;

create policy "crm_followup_rules_owner_select" on public.crm_followup_rules for select using (auth.uid() = user_id);
create policy "crm_followup_rules_owner_insert" on public.crm_followup_rules for insert with check (auth.uid() = user_id);
create policy "crm_followup_rules_owner_update" on public.crm_followup_rules for update using (auth.uid() = user_id);
create policy "crm_followup_rules_owner_delete" on public.crm_followup_rules for delete using (auth.uid() = user_id);

create policy "crm_followup_sends_owner_select" on public.crm_followup_sends for select using (auth.uid() = user_id);
create policy "crm_followup_sends_owner_insert" on public.crm_followup_sends for insert with check (auth.uid() = user_id);
