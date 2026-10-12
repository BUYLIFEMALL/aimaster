-- Approval required: extend only the provider CHECK; no keys, rows, RLS or other tables change.
-- Keep all providers currently allowed, including any added by another CLI after planning.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '20s';
do $$
declare current_name text; current_check text;
begin
  select conname, pg_get_constraintdef(oid) into current_name, current_check
  from pg_constraint
  where conrelid = 'public.user_api_keys'::regclass
    and contype = 'c' and conname = 'user_api_keys_provider_check';
  if current_name is null then
    raise exception 'Expected provider CHECK missing; inspect schema before proceeding';
  end if;
  if current_check like '%''pixabay''%' and current_check like '%''pexels''%' then return; end if;
  execute format('alter table public.user_api_keys drop constraint %I', current_name);
  execute format('alter table public.user_api_keys add constraint %I check (%s or provider in (%L, %L))',
    current_name, regexp_replace(current_check, '^CHECK ', ''), 'pixabay', 'pexels');
end $$;
commit;
