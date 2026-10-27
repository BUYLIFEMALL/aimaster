-- New, separate directory: member-confirmed imports are never worker relationship evidence.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.bnc_neighbor_import_policy (
 singleton boolean primary key default true check(singleton), read_allowed boolean not null default false,
 reference text, revision integer not null default 1 check(revision>0),
 check(not read_allowed or nullif(btrim(reference),'') is not null)
);
insert into public.bnc_neighbor_import_policy(singleton) values(true);
create table public.bnc_neighbor_imports (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.member_platform_accounts(id) on delete cascade,
 device_id uuid not null references public.bnc_reader_devices(id) on delete cascade,
 blog_id text not null, state text not null default 'capturing' check(state in ('capturing','ready','confirmed','cancelled','expired')),
 policy_revision integer not null, total_pages integer check(total_pages between 1 and 100),
 total_count integer check(total_count between 0 and 5000), captured_count integer not null default 0,
 last_page integer not null default 0, next_url text,
 created_at timestamptz not null default now(), valid_until timestamptz not null default(now()+interval '15 minutes'),
 expires_at timestamptz not null default(now()+interval '720 hours'), confirmed_at timestamptz
);
create index bnc_import_owner_account on public.bnc_neighbor_imports(user_id,account_id,created_at desc);
create table public.bnc_neighbor_import_pages (
 import_id uuid not null references public.bnc_neighbor_imports(id) on delete cascade,
 page integer not null check(page between 1 and 100), nonce_hash text not null,
 valid_until timestamptz not null, snapshot_hash text, rows jsonb, received_at timestamptz,
 expires_at timestamptz not null, primary key(import_id,page),
 check(rows is null or (jsonb_typeof(rows)='array' and jsonb_array_length(rows)<=100))
);
create table public.bnc_neighbor_import_daily (
 user_id uuid not null references auth.users(id) on delete cascade, day date not null,
 used integer not null default 0 check(used between 0 and 100), primary key(user_id,day)
);
create table public.bnc_neighbor_directory (
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.member_platform_accounts(id) on delete cascade,
 neighbor_id text not null check(neighbor_id ~ '^[a-z0-9_-]{1,50}$'),
 relation_type text not null check(relation_type in ('mutual','one_way')),
 new_posts_enabled boolean not null, return_visits_enabled boolean not null,
 last_import_id uuid references public.bnc_neighbor_imports(id) on delete set null,
 observed_at timestamptz not null, created_at timestamptz not null default now(),
 primary key(user_id,account_id,neighbor_id)
);
alter table public.bnc_neighbor_import_policy enable row level security;
alter table public.bnc_neighbor_imports enable row level security;
alter table public.bnc_neighbor_import_pages enable row level security;
alter table public.bnc_neighbor_import_daily enable row level security;
alter table public.bnc_neighbor_directory enable row level security;
revoke all on public.bnc_neighbor_import_policy,public.bnc_neighbor_imports,public.bnc_neighbor_import_pages,
 public.bnc_neighbor_import_daily,public.bnc_neighbor_directory from public,anon,authenticated,service_role;
grant select on public.bnc_neighbor_import_policy to service_role;
grant select,insert,update,delete on public.bnc_neighbor_imports,public.bnc_neighbor_import_pages,
 public.bnc_neighbor_import_daily,public.bnc_neighbor_directory to service_role;
grant select on public.bnc_neighbor_directory to authenticated;
create policy bnc_directory_owner on public.bnc_neighbor_directory for select to authenticated using((select auth.uid())=user_id);

create function public.bnc_neighbor_import_dispatch(p_user_id uuid,p_operation text,p_payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_now timestamptz:=clock_timestamp(); v_day date; d public.bnc_reader_devices%rowtype;
 a public.member_platform_accounts%rowtype; r public.bnc_neighbor_imports%rowtype;
 pg public.bnc_neighbor_import_pages%rowtype; pol public.bnc_neighbor_import_policy%rowtype;
 snapshot jsonb; entry jsonb; v_rows jsonb; v_page integer; v_count integer; v_total integer;
 v_pages integer; v_used integer; v_account uuid; v_updated integer; v_result jsonb;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_IMPORT_INPUT'; end if;
 if p_operation='cleanup' then
  delete from public.bnc_neighbor_import_pages where expires_at<=v_now;
  delete from public.bnc_neighbor_imports where expires_at<=v_now; get diagnostics v_count=row_count;
  delete from public.bnc_neighbor_import_daily where day<(v_now at time zone 'Asia/Seoul')::date-31;
  return jsonb_build_object('expiredImportsRemoved',v_count);
 end if;
 if p_user_id is null then raise exception 'BNC_IMPORT_INPUT'; end if;
 if p_operation in ('get','cancel','confirm') then
  select * into r from public.bnc_neighbor_imports where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>v_now;
  if not found then raise exception 'BNC_IMPORT_NOT_FOUND'; end if;
  v_account:=r.account_id;
 elsif p_operation in ('start','reserve','page','status') then
  select * into d from public.bnc_reader_devices where id=(p_payload->>'device_id')::uuid and user_id=p_user_id;
  if not found or d.revoked_at is not null or d.expires_at<=v_now then raise exception 'BNC_IMPORT_DISCONNECTED'; end if;
  v_account:=d.account_id;
 else v_account:=(p_payload->>'account_id')::uuid;
 end if;
 if v_account is null then raise exception 'BNC_IMPORT_ACCOUNT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||v_account::text,71028));
 v_now:=clock_timestamp();
 if p_operation='cancel' then
  select * into r from public.bnc_neighbor_imports where id=r.id and user_id=p_user_id for update;
  if r.state='confirmed' then raise exception 'BNC_IMPORT_STATE'; end if;
  update public.bnc_neighbor_imports set state='cancelled' where id=r.id; delete from public.bnc_neighbor_import_pages where import_id=r.id;
  return jsonb_build_object('id',r.id,'state','cancelled');
 end if;
 select * into a from public.member_platform_accounts where id=v_account and user_id=p_user_id and platform='naver_blog' and not needs_reconnect for key share;
 if not found then raise exception 'BNC_IMPORT_ACCOUNT'; end if;
 if p_operation in ('start','reserve','page','status') then
  select * into d from public.bnc_reader_devices where id=d.id and user_id=p_user_id for update;
  if not found or d.account_id is distinct from a.id or d.blog_id is distinct from a.external_id or d.revoked_at is not null or d.expires_at<=v_now
   then raise exception 'BNC_IMPORT_DISCONNECTED'; end if;
 end if;
 if p_operation='directory' then
  return jsonb_build_object('total',(select count(*) from public.bnc_neighbor_directory where user_id=p_user_id and account_id=a.id),
   'records',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select neighbor_id,relation_type,new_posts_enabled,return_visits_enabled,observed_at
    from public.bnc_neighbor_directory where user_id=p_user_id and account_id=a.id and (nullif(p_payload->>'cursor','') is null or neighbor_id>p_payload->>'cursor')
    order by neighbor_id limit 51) t),'relationshipIndependentlyVerified',false,'canAutoEngage',false);
 end if;
 if p_operation='runs' then
  return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,state,total_pages,total_count,captured_count,last_page,created_at,valid_until,confirmed_at
   from public.bnc_neighbor_imports where user_id=p_user_id and account_id=a.id and expires_at>v_now order by created_at desc limit 10) t);
 end if;
 if p_operation='configure' then
  if jsonb_typeof(p_payload->'new_posts') is distinct from 'boolean' or jsonb_typeof(p_payload->'return_visits') is distinct from 'boolean' then raise exception 'BNC_IMPORT_INPUT'; end if;
  if p_payload->>'all'='true' then
   select count(*) into v_count from public.bnc_neighbor_directory where user_id=p_user_id and account_id=a.id;
   if v_count<>(p_payload->>'expected_total')::integer then raise exception 'BNC_IMPORT_CHANGED'; end if;
  else
   if jsonb_typeof(p_payload->'ids') is distinct from 'array' or jsonb_array_length(p_payload->'ids') not between 1 and 100 then raise exception 'BNC_IMPORT_INPUT'; end if;
   select count(distinct x.value) into v_count from jsonb_array_elements_text(p_payload->'ids') x;
   if v_count<>jsonb_array_length(p_payload->'ids') or v_count<>(select count(*) from public.bnc_neighbor_directory where user_id=p_user_id and account_id=a.id and neighbor_id in(select jsonb_array_elements_text(p_payload->'ids'))) then raise exception 'BNC_IMPORT_NOT_FOUND'; end if;
  end if;
  update public.bnc_neighbor_directory set new_posts_enabled=(p_payload->>'new_posts')::boolean,return_visits_enabled=(p_payload->>'return_visits')::boolean
   where user_id=p_user_id and account_id=a.id and (p_payload->>'all'='true' or neighbor_id in(select jsonb_array_elements_text(p_payload->'ids')));
  get diagnostics v_updated=row_count; return jsonb_build_object('updated',v_updated,'externalActions',0,'canAutoEngage',false);
 end if;
 if p_operation='start' then
  select * into r from public.bnc_neighbor_imports where id=(p_payload->>'id')::uuid;
  if found then
   if r.user_id<>p_user_id or r.device_id<>d.id or r.account_id<>a.id then raise exception 'BNC_IMPORT_NOT_FOUND'; end if;
   return jsonb_build_object('id',r.id,'state',r.state,'validUntil',r.valid_until);
  end if;
  select * into pol from public.bnc_neighbor_import_policy where singleton;
  if not pol.read_allowed or nullif(btrim(pol.reference),'') is null then raise exception 'BNC_IMPORT_READ_DISABLED'; end if;
  if exists(select 1 from public.bnc_neighbor_imports where user_id=p_user_id and account_id=a.id and state in ('capturing','ready') and valid_until>v_now) then raise exception 'BNC_IMPORT_BUSY'; end if;
  insert into public.bnc_neighbor_imports(id,user_id,account_id,device_id,blog_id,policy_revision,created_at,valid_until,expires_at)
   values((p_payload->>'id')::uuid,p_user_id,a.id,d.id,d.blog_id,pol.revision,v_now,v_now+interval '15 minutes',v_now+interval '720 hours') returning * into r;
  return jsonb_build_object('id',r.id,'state',r.state,'validUntil',r.valid_until,'blogId',r.blog_id);
 end if;
 if p_operation in ('reserve','page','status') then
  select * into r from public.bnc_neighbor_imports where id=(p_payload->>'id')::uuid and user_id=p_user_id and account_id=a.id and device_id=d.id and expires_at>v_now for update;
 else select * into r from public.bnc_neighbor_imports where id=r.id and user_id=p_user_id for update;
 end if;
 if not found then raise exception 'BNC_IMPORT_NOT_FOUND'; end if;
 if r.state in ('capturing','ready') and r.valid_until<=v_now then update public.bnc_neighbor_imports set state='expired' where id=r.id returning * into r; end if;
 if p_operation in ('get','status') then
  return jsonb_build_object('id',r.id,'accountId',r.account_id,'blogId',r.blog_id,'state',r.state,'lastPage',r.last_page,'totalPages',r.total_pages,
   'totalCount',r.total_count,'capturedCount',r.captured_count,'nextUrl',r.next_url,'validUntil',r.valid_until,'expiresAt',r.expires_at,
   'rows',(select coalesce(jsonb_agg(x.value),'[]'::jsonb) from (select e.value from public.bnc_neighbor_import_pages pp cross join lateral jsonb_array_elements(pp.rows) e
    where pp.import_id=r.id and (nullif(p_payload->>'cursor','') is null or e.value->>'blogId'>p_payload->>'cursor') order by e.value->>'blogId' limit 51) x),
   'coverage','declared-visible-pages','relationshipIndependentlyVerified',false,'canAutoEngage',false);
 end if;
 if p_operation='cancel' then
  if r.state='confirmed' then raise exception 'BNC_IMPORT_STATE'; end if;
  update public.bnc_neighbor_imports set state='cancelled' where id=r.id; delete from public.bnc_neighbor_import_pages where import_id=r.id;
  return jsonb_build_object('id',r.id,'state','cancelled');
 end if;
 select * into pol from public.bnc_neighbor_import_policy where singleton;
 if not pol.read_allowed or nullif(btrim(pol.reference),'') is null or pol.revision<>r.policy_revision then raise exception 'BNC_IMPORT_READ_DISABLED'; end if;
 if p_operation='confirm' then
  if r.state='confirmed' then return jsonb_build_object('id',r.id,'state','confirmed','count',r.captured_count,'reused',true); end if;
  if r.state<>'ready' then raise exception 'BNC_IMPORT_STATE'; end if;
  if not exists(select 1 from public.bnc_reader_devices where id=r.device_id and user_id=p_user_id and revoked_at is null and expires_at>v_now and account_id=a.id) then raise exception 'BNC_IMPORT_DISCONNECTED'; end if;
  insert into public.bnc_neighbor_directory(user_id,account_id,neighbor_id,relation_type,new_posts_enabled,return_visits_enabled,last_import_id,observed_at,created_at)
   select p_user_id,a.id,e.value->>'blogId',e.value->>'relation',(e.value->>'relation')='mutual',(e.value->>'relation')='mutual',r.id,pp.received_at,v_now
   from public.bnc_neighbor_import_pages pp cross join lateral jsonb_array_elements(pp.rows) e where pp.import_id=r.id
   on conflict(user_id,account_id,neighbor_id) do update set relation_type=excluded.relation_type,last_import_id=excluded.last_import_id,observed_at=excluded.observed_at;
  update public.bnc_neighbor_imports set state='confirmed',confirmed_at=v_now where id=r.id;
  return jsonb_build_object('id',r.id,'state','confirmed','count',r.captured_count,'absentRowsRemoved',0,'externalActions',0,'canAutoEngage',false);
 end if;
 v_page:=(p_payload->>'page')::integer;
 if p_operation='page' and r.state in ('capturing','ready','confirmed') then
  select * into pg from public.bnc_neighbor_import_pages where import_id=r.id and page=v_page;
  if found and pg.snapshot_hash is not null then
   if pg.nonce_hash is distinct from p_payload->>'nonce_hash' or pg.snapshot_hash is distinct from p_payload->>'snapshot_hash' then raise exception 'BNC_IMPORT_CHANGED'; end if;
   return jsonb_build_object('id',r.id,'state',r.state,'lastPage',r.last_page,'capturedCount',r.captured_count,'totalCount',r.total_count,'reused',true);
  end if;
 end if;
 if r.state<>'capturing' then raise exception 'BNC_IMPORT_STATE'; end if;
 if p_operation='reserve' then
  if v_page<>r.last_page+1 or v_page>100 or (r.total_pages is not null and v_page>r.total_pages) then raise exception 'BNC_IMPORT_PAGE'; end if;
  if exists(select 1 from public.bnc_neighbor_import_pages where import_id=r.id and page=v_page) then raise exception 'BNC_IMPORT_RESERVED'; end if;
  if coalesce(p_payload->>'nonce_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'BNC_IMPORT_INPUT'; end if;
  v_day:=(v_now at time zone 'Asia/Seoul')::date;
  insert into public.bnc_neighbor_import_daily(user_id,day) values(p_user_id,v_day) on conflict do nothing;
  update public.bnc_neighbor_import_daily set used=used+1 where user_id=p_user_id and day=v_day and used<100 returning used into v_used;
  if not found then raise exception 'BNC_IMPORT_READ_LIMIT'; end if;
  insert into public.bnc_neighbor_import_pages(import_id,page,nonce_hash,valid_until,expires_at)
   values(r.id,v_page,p_payload->>'nonce_hash',least(v_now+interval '60 seconds',r.valid_until),r.created_at+interval '24 hours') returning * into pg;
  return jsonb_build_object('page',v_page,'validUntil',pg.valid_until,'usedToday',v_used);
 end if;
 if p_operation<>'page' then raise exception 'BNC_IMPORT_INPUT'; end if;
 select * into pg from public.bnc_neighbor_import_pages where import_id=r.id and page=v_page for update;
 if not found or pg.nonce_hash is distinct from p_payload->>'nonce_hash' then raise exception 'BNC_IMPORT_PAGE'; end if;
 if pg.snapshot_hash is not null then
  if pg.snapshot_hash is distinct from p_payload->>'snapshot_hash' then raise exception 'BNC_IMPORT_CHANGED'; end if;
  return jsonb_build_object('id',r.id,'state',r.state,'lastPage',r.last_page,'reused',true);
 end if;
 if pg.valid_until<=v_now then raise exception 'BNC_IMPORT_EXPIRED'; end if;
 snapshot:=p_payload->'snapshot'; v_rows:=snapshot->'rows'; v_pages:=(snapshot->>'totalPages')::integer; v_total:=(snapshot->>'totalCount')::integer;
 if snapshot->>'blogId' is distinct from r.blog_id then raise exception 'BNC_IMPORT_ACCOUNT'; end if;
 if v_pages not between 1 and 100 or v_total not between 0 and 5000 or v_page<>r.last_page+1 or v_page>v_pages or jsonb_typeof(v_rows) is distinct from 'array' or jsonb_array_length(v_rows)>100 then raise exception 'BNC_IMPORT_PAGE'; end if;
 if r.total_pages is not null and (r.total_pages<>v_pages or r.total_count<>v_total) then raise exception 'BNC_IMPORT_CHANGED'; end if;
 if v_total=0 and (v_pages<>1 or jsonb_array_length(v_rows)<>0) then raise exception 'BNC_IMPORT_PAGE'; end if;
 if v_total>0 and jsonb_array_length(v_rows)=0 then raise exception 'BNC_IMPORT_PAGE'; end if;
 if (v_page=v_pages) is distinct from (snapshot->>'nextUrl' is null) then raise exception 'BNC_IMPORT_PAGE'; end if;
 for entry in select value from jsonb_array_elements(v_rows) loop
  if coalesce(entry->>'blogId','') !~ '^[a-z0-9_-]{1,50}$' or entry->>'blogId'=r.blog_id or coalesce(entry->>'relation','') not in ('mutual','one_way') then raise exception 'BNC_IMPORT_INPUT'; end if;
  if exists(select 1 from public.bnc_neighbor_import_pages pp cross join lateral jsonb_array_elements(pp.rows) e where pp.import_id=r.id and e.value->>'blogId'=entry->>'blogId') then raise exception 'BNC_IMPORT_CHANGED'; end if;
 end loop;
 if (select count(distinct e.value->>'blogId') from jsonb_array_elements(v_rows) e)<>jsonb_array_length(v_rows) then raise exception 'BNC_IMPORT_CHANGED'; end if;
 v_count:=r.captured_count+jsonb_array_length(v_rows);
 if v_count>v_total or (v_page=v_pages and v_count<>v_total) then raise exception 'BNC_IMPORT_INCOMPLETE'; end if;
 update public.bnc_neighbor_import_pages set rows=v_rows,snapshot_hash=p_payload->>'snapshot_hash',received_at=v_now where import_id=r.id and page=v_page;
 update public.bnc_neighbor_imports set total_pages=v_pages,total_count=v_total,last_page=v_page,captured_count=v_count,next_url=snapshot->>'nextUrl',state=case when v_page=v_pages then 'ready' else 'capturing' end where id=r.id returning * into r;
 return jsonb_build_object('id',r.id,'state',r.state,'lastPage',r.last_page,'capturedCount',r.captured_count,'totalCount',r.total_count);
end; $$;
revoke all on function public.bnc_neighbor_import_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_neighbor_import_dispatch(uuid,text,jsonb) to service_role;
commit;
