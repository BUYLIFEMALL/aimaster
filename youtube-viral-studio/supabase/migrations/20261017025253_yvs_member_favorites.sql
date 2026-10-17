-- Approval scope: new yvs_favorites only; no existing table/data changes.
begin;
create table public.yvs_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('video','channel')),
  item_id text not null check (length(item_id) between 1 and 128),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536),
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);
create index yvs_favorites_created_at_idx on public.yvs_favorites(created_at);
alter table public.yvs_favorites enable row level security;
revoke all on public.yvs_favorites from public, anon, authenticated;
grant select, delete on public.yvs_favorites to authenticated;
grant insert(user_id,item_type,item_id,payload) on public.yvs_favorites to authenticated;
grant select, insert, delete on public.yvs_favorites to service_role;
create policy yvs_favorites_owner_read on public.yvs_favorites for select to authenticated
  using (user_id = (select auth.uid()) and created_at > now() - interval '30 days');
create policy yvs_favorites_owner_insert on public.yvs_favorites for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy yvs_favorites_owner_delete on public.yvs_favorites for delete to authenticated
  using (user_id = (select auth.uid()));
-- No UPDATE grants/policy: duplicate saves cannot extend original retention.
create function public.cleanup_yvs_expired_favorites() returns bigint
  language plpgsql security invoker set search_path = '' as $$
declare removed bigint;
begin
  delete from public.yvs_favorites where created_at <= now() - interval '30 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.cleanup_yvs_expired_favorites() from public, anon, authenticated, service_role;
-- Reads reject at the 30-day boundary; physical removal within one minute.
select cron.schedule('yvs-favorites-retention-30d', '* * * * *',
  'select public.cleanup_yvs_expired_favorites();');
commit;
