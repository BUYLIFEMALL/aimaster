-- BLC-05 / production esgxyikcnnvmlhygjkth. Existing content/accounts untouched.
create table public.nba_collected_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  updated_at timestamptz not null default clock_timestamp(),
  candidate jsonb not null,
  check (expires_at > created_at and expires_at <= created_at + interval '30 days'),
  check (jsonb_typeof(candidate) = 'object')
);
create index nba_collected_materials_owner_created on public.nba_collected_materials(user_id, created_at desc);
create index nba_collected_materials_expiry on public.nba_collected_materials(expires_at);
alter table public.nba_collected_materials enable row level security;
revoke all on public.nba_collected_materials from anon, authenticated;
grant select on public.nba_collected_materials to authenticated;
grant all on public.nba_collected_materials to service_role;
create policy nba_collected_materials_owner_read on public.nba_collected_materials for select to authenticated
using ((select auth.uid()) = user_id and expires_at > now());

-- One transaction: stale/foreign/expired IDs abort the entire edit/delete batch.
create function public.nba_edit_collected_materials(p_owner uuid, p_changes jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare change jsonb; current_row public.nba_collected_materials;
begin
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 500 then raise exception 'invalid_changes'; end if;
  if (select count(*) <> count(distinct value->>'id') from jsonb_array_elements(p_changes)) then raise exception 'duplicate_changes'; end if;
  for change in select value from jsonb_array_elements(p_changes) order by value->>'id' loop
    select * into current_row from public.nba_collected_materials
      where id = (change->>'id')::uuid and user_id = p_owner and expires_at > now() for update;
    if not found or current_row.updated_at <> (change->>'revision')::timestamptz then raise exception 'source_conflict'; end if;
    if change->>'delete' = 'true' then
      delete from public.nba_collected_materials where id = current_row.id and user_id = p_owner;
    else
      update public.nba_collected_materials set candidate = candidate || (change->'fields'),
        updated_at = greatest(clock_timestamp(), current_row.updated_at + interval '1 microsecond')
        where id = current_row.id and user_id = p_owner;
    end if;
  end loop;
end $$;
revoke all on function public.nba_edit_collected_materials(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.nba_edit_collected_materials(uuid,jsonb) to service_role;
