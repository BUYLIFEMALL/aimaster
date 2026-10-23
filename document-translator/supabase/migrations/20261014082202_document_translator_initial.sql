-- New program data only. Applying this migration requires explicit schema approval.
create table public.dt_projects (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 1048576),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index dt_projects_owner_updated on public.dt_projects (user_id,updated_at desc);
create table public.dt_glossaries (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  entries jsonb not null check (jsonb_typeof(entries) = 'array' and jsonb_array_length(entries) <= 200 and octet_length(entries::text) <= 262144),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create index dt_glossaries_owner on public.dt_glossaries (user_id,updated_at desc);
-- Only execution metadata is stored here, never source, translated text or keys.
create table public.dt_operations (
  user_id uuid not null references auth.users(id) on delete cascade, operation_id uuid not null,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  kind text not null check (kind in ('translate','review','reverse','structure')),
  status text not null default 'processing' check (status in ('processing','done','failed')),
  created_at timestamptz not null default now(), finished_at timestamptz,
  primary key(user_id,operation_id)
);
create index dt_operations_owner_created on public.dt_operations (user_id,created_at desc);
alter table public.dt_projects enable row level security;
alter table public.dt_glossaries enable row level security;
alter table public.dt_operations enable row level security;
create policy dt_projects_owner on public.dt_projects for select to authenticated using (auth.uid()=user_id and expires_at>now());
create policy dt_glossaries_owner on public.dt_glossaries for select to authenticated using (auth.uid()=user_id);
-- Application writes must pass entitlement and owner checks in the server.
revoke all on public.dt_projects,public.dt_glossaries,public.dt_operations from public,anon,authenticated;
grant select on public.dt_projects,public.dt_glossaries to authenticated;
grant all on public.dt_projects,public.dt_glossaries,public.dt_operations to service_role;

create function public.dt_save_project(p_user_id uuid,p_id uuid,p_revision integer,p_title text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.dt_projects; saved public.dt_projects;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,31));
  select * into previous from public.dt_projects where id=p_id for update;
  if found then
    if previous.user_id<>p_user_id then raise exception 'owner mismatch' using errcode='42501'; end if;
    if previous.expires_at<=now() then raise exception 'expired project' using errcode='P0002'; end if;
    if previous.revision<>p_revision then raise exception 'revision conflict' using errcode='40001'; end if;
    update public.dt_projects set title=p_title,payload=p_payload,revision=revision+1,updated_at=now() where id=p_id and user_id=p_user_id returning * into saved;
  else
    if p_revision<>0 then raise exception 'revision conflict' using errcode='40001'; end if;
    if (select count(*) from public.dt_projects where user_id=p_user_id and expires_at>now())>=100 then raise exception 'project limit' using errcode='54000'; end if;
    insert into public.dt_projects(id,user_id,title,payload) values(p_id,p_user_id,p_title,p_payload) returning * into saved;
  end if;
  return jsonb_build_object('id',saved.id,'revision',saved.revision,'updatedAt',saved.updated_at,'expiresAt',saved.expires_at);
end $$;
create function public.dt_save_glossary(p_user_id uuid,p_id uuid,p_revision integer,p_name text,p_entries jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.dt_glossaries; saved public.dt_glossaries;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,32));
  select * into previous from public.dt_glossaries where id=p_id for update;
  if found then
    if previous.user_id<>p_user_id then raise exception 'owner mismatch' using errcode='42501'; end if;
    if previous.revision<>p_revision then raise exception 'revision conflict' using errcode='40001'; end if;
    update public.dt_glossaries set name=p_name,entries=p_entries,revision=revision+1,updated_at=now() where id=p_id and user_id=p_user_id returning * into saved;
  else
    if p_revision<>0 then raise exception 'revision conflict' using errcode='40001'; end if;
    if (select count(*) from public.dt_glossaries where user_id=p_user_id)>=20 then raise exception 'glossary limit' using errcode='54000'; end if;
    insert into public.dt_glossaries(id,user_id,name,entries) values(p_id,p_user_id,p_name,p_entries) returning * into saved;
  end if;
  return jsonb_build_object('id',saved.id,'revision',saved.revision);
end $$;
create function public.dt_claim_operation(p_user_id uuid,p_operation_id uuid,p_input_hash text,p_kind text)
returns text language plpgsql security definer set search_path='' as $$
declare previous public.dt_operations;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,33));
  -- Expired metadata for this member only. No source or saved project is removed.
  delete from public.dt_operations where user_id=p_user_id and created_at<now()-interval '24 hours';
  select * into previous from public.dt_operations where user_id=p_user_id and operation_id=p_operation_id;
  if found then
    if previous.input_hash<>p_input_hash or previous.kind<>p_kind then raise exception 'operation mismatch' using errcode='22023'; end if;
    return previous.status;
  end if;
  if (select count(*) from public.dt_operations where user_id=p_user_id and created_at>now()-interval '1 minute')>=30 then raise exception 'rate limit' using errcode='53300'; end if;
  if (select count(*) from public.dt_operations where user_id=p_user_id and status='processing' and created_at>now()-interval '2 minutes')>=2 then raise exception 'operation busy' using errcode='53300'; end if;
  insert into public.dt_operations(user_id,operation_id,input_hash,kind) values(p_user_id,p_operation_id,p_input_hash,p_kind);
  return 'claimed';
end $$;
create function public.dt_finish_operation(p_user_id uuid,p_operation_id uuid,p_input_hash text,p_success boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.dt_operations set status=case when p_success then 'done' else 'failed' end,finished_at=now()
    where user_id=p_user_id and operation_id=p_operation_id and input_hash=p_input_hash and status='processing';
  return found;
end $$;
revoke all on function public.dt_save_project(uuid,uuid,integer,text,jsonb),public.dt_save_glossary(uuid,uuid,integer,text,jsonb),public.dt_claim_operation(uuid,uuid,text,text),public.dt_finish_operation(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.dt_save_project(uuid,uuid,integer,text,jsonb),public.dt_save_glossary(uuid,uuid,integer,text,jsonb),public.dt_claim_operation(uuid,uuid,text,text),public.dt_finish_operation(uuid,uuid,text,boolean) to service_role;
