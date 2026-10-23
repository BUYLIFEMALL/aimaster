-- booking-reminder 서브프로젝트: 예약일시 기준으로 리마인드(전날/당일/방문 후 리뷰요청 등)
-- 메시지를 자동 발송해 노쇼를 줄이는 프로그램. SOLAPI 예약 자동화 사례를 벤치마킹했다
-- (설계 배경: docs/ARCHITECTURE.md).
--
-- 발송 계정(이메일/SOLAPI/텔레그램)은 새 테이블을 만들지 않고 crm-google-form이 설계한
-- 공용 테이블(user_smtp_accounts/user_solapi_accounts/user_telegram_links)을 그대로 쓴다.

create table public.booking_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  reservation_at timestamptz not null,
  memo text,
  status text not null default 'booked'
    check (status in ('booked','completed','no_show','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index booking_reservations_user_id_idx on public.booking_reservations(user_id);
create index booking_reservations_reservation_at_idx on public.booking_reservations(reservation_at);

create trigger booking_reservations_set_updated_at
  before update on public.booking_reservations
  for each row execute function public.set_updated_at();

-- offset_minutes: 예약일시 기준 오프셋(분). 음수 = 그 전(리마인드), 양수 = 그 후(리뷰요청 등).
create table public.booking_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  offset_minutes int not null,
  channel_email boolean not null default false,
  channel_sms boolean not null default false,
  channel_alimtalk boolean not null default false,
  channel_friendtalk boolean not null default false,
  message_subject text,
  message_text text not null,           -- {name}/{time} 치환 지원
  kakao_template_id text,
  kakao_variables jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index booking_reminder_rules_user_id_idx on public.booking_reminder_rules(user_id);
create index booking_reminder_rules_active_idx on public.booking_reminder_rules(is_active) where is_active = true;

create trigger booking_reminder_rules_set_updated_at
  before update on public.booking_reminder_rules
  for each row execute function public.set_updated_at();

-- 발송 이력 + 중복 발송 방지.
create table public.booking_reminder_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id uuid not null references public.booking_reminder_rules(id) on delete cascade,
  reservation_id uuid not null references public.booking_reservations(id) on delete cascade,
  status text not null check (status in ('sent','failed')),
  error_message text,
  sent_at timestamptz not null default now(),
  unique (rule_id, reservation_id)
);

create index booking_reminder_sends_user_id_idx on public.booking_reminder_sends(user_id);

alter table public.booking_reservations enable row level security;
alter table public.booking_reminder_rules enable row level security;
alter table public.booking_reminder_sends enable row level security;

create policy "booking_reservations_owner_select" on public.booking_reservations for select using (auth.uid() = user_id);
create policy "booking_reservations_owner_insert" on public.booking_reservations for insert with check (auth.uid() = user_id);
create policy "booking_reservations_owner_update" on public.booking_reservations for update using (auth.uid() = user_id);
create policy "booking_reservations_owner_delete" on public.booking_reservations for delete using (auth.uid() = user_id);

create policy "booking_reminder_rules_owner_select" on public.booking_reminder_rules for select using (auth.uid() = user_id);
create policy "booking_reminder_rules_owner_insert" on public.booking_reminder_rules for insert with check (auth.uid() = user_id);
create policy "booking_reminder_rules_owner_update" on public.booking_reminder_rules for update using (auth.uid() = user_id);
create policy "booking_reminder_rules_owner_delete" on public.booking_reminder_rules for delete using (auth.uid() = user_id);

create policy "booking_reminder_sends_owner_select" on public.booking_reminder_sends for select using (auth.uid() = user_id);
create policy "booking_reminder_sends_owner_insert" on public.booking_reminder_sends for insert with check (auth.uid() = user_id);
