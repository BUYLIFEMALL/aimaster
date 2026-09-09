-- 발송제외 처리: 수신이 안 되는 사람을 향후 모든 발송(리포트 자동 발송 + 수동 메시지
-- 발송) 대상에서 제외할 수 있게 한다 — stepmail 리드의 "발송제외 처리"와 같은 개념.
alter table public.kakao_broadcast_recipients
  add column if not exists excluded boolean not null default false;

-- 발송 내역: 수동으로 보낸 메시지의 결과를 기록해 좌측 메뉴에서 조회할 수 있게 한다.
-- recipient_id는 수신자가 삭제돼도 기록은 남도록 on delete set null로 두고, 이름/
-- 전화번호는 발송 시점 값을 스냅샷(recipient_label/recipient_phone)해서 나중에
-- 수신자 정보가 바뀌거나 삭제돼도 로그의 의미가 변하지 않게 한다.
create table if not exists public.kakao_broadcast_send_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid references public.kakao_broadcast_recipients (id) on delete set null,
  recipient_label text,
  recipient_phone text not null,
  message text not null,
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists kakao_broadcast_send_log_user_idx
  on public.kakao_broadcast_send_log (user_id, created_at desc);

alter table public.kakao_broadcast_send_log enable row level security;

create policy "kakao_broadcast_send_log_select_own"
  on public.kakao_broadcast_send_log for select
  using (auth.uid() = user_id);

create policy "kakao_broadcast_send_log_insert_own"
  on public.kakao_broadcast_send_log for insert
  with check (auth.uid() = user_id);
