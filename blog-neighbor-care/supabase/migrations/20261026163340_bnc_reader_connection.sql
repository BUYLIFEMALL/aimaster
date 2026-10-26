-- Own-post reader only. Does not enable bnc_runtime or any external posting.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

insert into public.integration_catalog(key,kind,label,description,connect_program_url,sort_order)
values('naver_blog','account_set','네이버 블로그 · 본인 글 읽기',
  '회원이 지정한 본인 블로그. 브라우저에서 직접 선택한 글 읽기 전용이며 OAuth/게시 권한 확인이 아닙니다.',
  'https://blog-neighbor-care.buylife.xyz/reader',55) on conflict(key) do nothing;

create table public.bnc_reader_pairings (
  code_hash text primary key check(code_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  blog_id text not null check(blog_id ~ '^[a-z0-9_-]{1,50}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default(now()+interval '10 minutes')
);
create index bnc_reader_pairing_owner on public.bnc_reader_pairings(user_id);
create table public.bnc_reader_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.member_platform_accounts(id) on delete set null,
  blog_id text not null check(blog_id ~ '^[a-z0-9_-]{1,50}$'),
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  device_name text not null check(length(device_name) between 1 and 50),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default(now()+interval '720 hours'),
  revoked_at timestamptz
);
create index bnc_reader_device_owner on public.bnc_reader_devices(user_id);
create table public.bnc_reader_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.bnc_reader_devices(id) on delete set null,
  blog_id text not null,
  post_id text not null check(post_id ~ '^[0-9]{1,30}$'),
  state text not null default 'pending' check(state in ('pending','completed','expired')),
  material_id uuid,
  created_at timestamptz not null default now(),
  valid_until timestamptz not null default(now()+interval '5 minutes'),
  expires_at timestamptz not null default(now()+interval '720 hours')
);
create unique index bnc_reader_one_pending on public.bnc_reader_requests(device_id) where state='pending';
create index bnc_reader_request_owner on public.bnc_reader_requests(user_id,created_at desc);
create table public.bnc_reader_materials (
  id uuid primary key references public.bnc_reader_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  blog_id text not null,
  post_id text not null,
  title text not null check(length(btrim(title)) between 1 and 500),
  body text not null check(length(btrim(body)) between 1 and 20000),
  content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  check(expires_at=created_at+interval '720 hours')
);
create unique index bnc_reader_same_content on public.bnc_reader_materials(user_id,blog_id,post_id,content_hash);
alter table public.bnc_reader_requests add constraint bnc_reader_material_ref
  foreign key(material_id) references public.bnc_reader_materials(id) on delete set null;
create index bnc_reader_material_owner on public.bnc_reader_materials(user_id,created_at desc);
alter table public.bnc_reader_pairings enable row level security;
alter table public.bnc_reader_devices enable row level security;
alter table public.bnc_reader_requests enable row level security;
alter table public.bnc_reader_materials enable row level security;
revoke all on public.bnc_reader_pairings,public.bnc_reader_devices,public.bnc_reader_requests,public.bnc_reader_materials
  from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.bnc_reader_pairings,public.bnc_reader_devices,public.bnc_reader_requests,public.bnc_reader_materials to service_role;
grant select on public.bnc_reader_materials to authenticated;
create policy bnc_reader_material_owner on public.bnc_reader_materials for select to authenticated
  using ((select auth.uid())=user_id and expires_at>now());

create function public.bnc_reader_dispatch(p_user_id uuid,p_operation text,p_payload jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_now timestamptz:=clock_timestamp();
  pairing public.bnc_reader_pairings%rowtype;
  device public.bnc_reader_devices%rowtype;
  request public.bnc_reader_requests%rowtype;
  material public.bnc_reader_materials%rowtype;
  original public.bnc_reader_materials%rowtype;
  account public.member_platform_accounts%rowtype;
  v_hash text;
  v_deleted integer;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'BNC_INVALID_INPUT'; end if;
  if p_operation='cleanup' then
    delete from public.bnc_reader_requests where expires_at<=v_now;
    get diagnostics v_deleted=row_count;
    delete from public.bnc_reader_pairings where expires_at<=v_now;
    return jsonb_build_object('expiredRequestsRemoved',v_deleted);
  end if;
  if p_user_id is null then raise exception 'BNC_INVALID_INPUT'; end if;
  if p_operation='pair_issue' then
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,71027));
    v_now:=clock_timestamp();
    if exists(select 1 from public.bnc_reader_pairings where user_id=p_user_id and created_at>v_now-interval '30 seconds')
      then raise exception 'BNC_READER_RATE_LIMIT'; end if;
    delete from public.bnc_reader_pairings where user_id=p_user_id;
    insert into public.bnc_reader_pairings(code_hash,user_id,blog_id,created_at,expires_at)
      values(p_payload->>'code_hash',p_user_id,p_payload->>'blog_id',v_now,v_now+interval '10 minutes') returning * into pairing;
    return jsonb_build_object('expiresAt',pairing.expires_at);
  end if;
  if p_operation='pair_connect' then
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,71027));
    v_now:=clock_timestamp();
    delete from public.bnc_reader_pairings where code_hash=p_payload->>'code_hash' and user_id=p_user_id and expires_at>v_now returning * into pairing;
    if not found then raise exception 'BNC_PAIR_INVALID'; end if;
    if (select count(*) from public.bnc_reader_devices where user_id=p_user_id and revoked_at is null and expires_at>v_now)>=5
      then raise exception 'BNC_READER_DEVICE_LIMIT'; end if;
    insert into public.member_platform_accounts(user_id,platform,external_id,username,access_token,granted_scopes,auth_method,extra,connected_via)
      values(p_user_id,'naver_blog',pairing.blog_id,pairing.blog_id,'','{}','browser_read',
        '{"ownership":"member_declared","read_only":true,"naver_session_verified":false}', 'blog-neighbor-care')
      on conflict(user_id,platform,external_id) do nothing;
    select * into strict account from public.member_platform_accounts
      where user_id=p_user_id and platform='naver_blog' and external_id=pairing.blog_id;
    if account.auth_method is distinct from 'browser_read' or account.needs_reconnect then raise exception 'BNC_ACCOUNT_METHOD'; end if;
    insert into public.bnc_reader_devices(user_id,account_id,blog_id,token_hash,device_name,created_at,expires_at)
      values(p_user_id,account.id,pairing.blog_id,p_payload->>'token_hash',p_payload->>'device_name',v_now,v_now+interval '720 hours') returning * into device;
    return jsonb_build_object('deviceId',device.id,'blogId',device.blog_id,'expiresAt',device.expires_at);
  end if;
  if p_operation='devices' then
    return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from
      (select id,blog_id,device_name,created_at,expires_at,revoked_at from public.bnc_reader_devices where user_id=p_user_id order by created_at desc limit 20) x);
  end if;
  if p_operation='materials' then
    return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from
      (select id,blog_id,post_id,title,content_hash,created_at,expires_at from public.bnc_reader_materials where user_id=p_user_id and expires_at>v_now order by created_at desc limit 20) x);
  end if;
  if p_operation='material' then
    select * into material from public.bnc_reader_materials where id=(p_payload->>'id')::uuid and user_id=p_user_id and expires_at>v_now;
    if not found then raise exception 'BNC_NOT_FOUND'; end if;
    return to_jsonb(material);
  end if;
  if p_operation='revoke' then
    update public.bnc_reader_devices set revoked_at=v_now where id=(p_payload->>'device_id')::uuid and user_id=p_user_id;
    if not found then raise exception 'BNC_NOT_FOUND'; end if;
    return jsonb_build_object('revoked',true);
  end if;
  select * into device from public.bnc_reader_devices where id=(p_payload->>'device_id')::uuid and user_id=p_user_id for update;
  v_now:=clock_timestamp();
  if not found or device.revoked_at is not null or device.expires_at<=v_now then raise exception 'BNC_READER_DISCONNECTED'; end if;
  if not exists(select 1 from public.member_platform_accounts where id=device.account_id and user_id=p_user_id and
    platform='naver_blog' and external_id=device.blog_id and auth_method='browser_read' and not needs_reconnect)
    then raise exception 'BNC_ACCOUNT_REQUIRED'; end if;
  if p_operation='whoami' then
    return jsonb_build_object('deviceId',device.id,'blogId',device.blog_id,'expiresAt',device.expires_at,'capability','read-own-post');
  end if;
  select * into request from public.bnc_reader_requests where id=(p_payload->>'request_id')::uuid for update;
  if found and (request.user_id<>p_user_id or request.device_id is distinct from device.id) then raise exception 'BNC_NOT_FOUND'; end if;
  if p_operation='prepare' and request.id is null then
    if p_payload->>'blog_id' is distinct from device.blog_id then raise exception 'BNC_READER_WRONG_BLOG'; end if;
    update public.bnc_reader_requests set state='expired' where device_id=device.id and state='pending' and valid_until<=v_now;
    if exists(select 1 from public.bnc_reader_requests where device_id=device.id and state='pending') then raise exception 'BNC_READER_PENDING'; end if;
    insert into public.bnc_reader_requests(id,user_id,device_id,blog_id,post_id,created_at,valid_until,expires_at)
      values((p_payload->>'request_id')::uuid,p_user_id,device.id,device.blog_id,p_payload->>'post_id',v_now,v_now+interval '5 minutes',v_now+interval '720 hours') returning * into request;
  end if;
  if request.id is null then raise exception 'BNC_NOT_FOUND'; end if;
  if request.expires_at<=v_now or request.state='expired' or (request.state='pending' and request.valid_until<=v_now) then raise exception 'BNC_READER_EXPIRED'; end if;
  if p_operation='prepare' and (p_payload->>'blog_id' is distinct from request.blog_id or p_payload->>'post_id' is distinct from request.post_id)
    then raise exception 'BNC_READER_WRONG_POST'; end if;
  if p_operation='submit' then
    if p_payload->>'blog_id' is distinct from request.blog_id or p_payload->>'post_id' is distinct from request.post_id
      then raise exception 'BNC_READER_WRONG_POST'; end if;
    v_hash:=encode(sha256(convert_to(jsonb_build_array(p_payload->>'title',p_payload->>'body')::text,'UTF8')),'hex');
    if request.state='completed' then
      select * into material from public.bnc_reader_materials where id=request.material_id and user_id=p_user_id;
      if not found then raise exception 'BNC_READER_EXPIRED'; end if;
      if material.content_hash<>v_hash then raise exception 'BNC_READER_CONTENT_CHANGED'; end if;
    else
      -- Different devices/request IDs for the same source must not create duplicates or extend its lifetime.
      perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||request.blog_id||':'||request.post_id,71028));
      v_now:=clock_timestamp();
      if request.valid_until<=v_now then raise exception 'BNC_READER_EXPIRED'; end if;
      select * into material from public.bnc_reader_materials where user_id=p_user_id and blog_id=request.blog_id
        and post_id=request.post_id and content_hash=v_hash and expires_at>v_now;
      if not found then
        select * into original from public.bnc_reader_materials where user_id=p_user_id and blog_id=request.blog_id
          and post_id=request.post_id and expires_at>v_now order by created_at,id limit 1;
        insert into public.bnc_reader_materials(id,user_id,blog_id,post_id,title,body,content_hash,created_at,expires_at)
          values(request.id,p_user_id,request.blog_id,request.post_id,p_payload->>'title',p_payload->>'body',v_hash,
            coalesce(original.created_at,request.created_at),coalesce(original.expires_at,request.expires_at)) returning * into material;
      end if;
      update public.bnc_reader_requests set state='completed',material_id=material.id,expires_at=material.expires_at where id=request.id;
      request.state:='completed';
      request.material_id:=material.id;
      request.expires_at:=material.expires_at;
    end if;
  elsif p_operation not in ('prepare','status') then raise exception 'BNC_INVALID_OPERATION';
  end if;
  return jsonb_build_object('requestId',request.id,'state',request.state,'blogId',request.blog_id,'postId',request.post_id,
    'validUntil',request.valid_until,'expiresAt',request.expires_at,'materialId',request.material_id);
end $$;
revoke all on function public.bnc_reader_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.bnc_reader_dispatch(uuid,text,jsonb) to service_role;
commit;
