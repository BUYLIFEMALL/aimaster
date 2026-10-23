-- 수신자가 많아지면 그룹으로 묶어서 관리하고 싶다는 요청 — 회원이 그룹(예: "가족",
-- "고객A")을 만들고, 각 수신자를 그룹에 배정/이동할 수 있게 한다.
create table if not exists public.kakao_broadcast_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists kakao_broadcast_groups_user_idx
  on public.kakao_broadcast_groups (user_id, created_at desc);

alter table public.kakao_broadcast_groups enable row level security;

create policy "kakao_broadcast_groups_select_own"
  on public.kakao_broadcast_groups for select
  using (auth.uid() = user_id);

create policy "kakao_broadcast_groups_insert_own"
  on public.kakao_broadcast_groups for insert
  with check (auth.uid() = user_id);

create policy "kakao_broadcast_groups_delete_own"
  on public.kakao_broadcast_groups for delete
  using (auth.uid() = user_id);

-- 그룹을 삭제해도 수신자 자체는 남고 "미분류"(null)로 돌아간다 — 실수로 그룹을
-- 지웠다고 수신자까지 사라지면 안 되기 때문에 on delete set null로 둔다.
alter table public.kakao_broadcast_recipients
  add column if not exists group_id uuid references public.kakao_broadcast_groups (id) on delete set null;

create index if not exists kakao_broadcast_recipients_group_idx
  on public.kakao_broadcast_recipients (group_id);
