-- 0106 메이커 M2 「사진 제안」 데이터 계층 — 2026-11-19 Master msg_ad4382dd5bb2(격리 구현 승인), 설계 docs/PLAN_20261119_MAKER_M2_PROPOSALS.md §9~§11(0889e87f3).
-- 주인님 결정(2026-11-19): 제안 사진은 비공개 저장소, 5MB 이하(브라우저에서 줄임), 운영 반영은 M3와 한 번에.
-- 하는 일: 전용 비공개 버킷 mall-builder-proposals(5MB, JPEG만) + 제안 표 + 상태 전이 함수(예약·확정·포기·정리 목록) + 그 버킷 전용 저장소 정책 3개.
-- 바꾸지 않는 것: 기존 버킷(mall-builder-public·mall-builder-private)과 그 정책, 상품 표·사진·가격·승인, 사용량 집계. 상품 사진 쓰기 0(적용은 M3).
-- 권한: 매 호출마다 다시 판정 — 몰 「상품」 권한 직원(staff_can products) = operator, 그 상품 공급사의 활성 본인 = supplier, 그 밖 0.
--   분양몰 거울(source_product_id) 상품·다른 몰 상품은 거절. 로그인(인증)과 소유(예약자·파일 소유자)를 따로 확인한다.
-- 상태: reserved → proposed(commit) | abandoned(포기·만료 뒤 재예약) / proposed → rejected | applied | expired(M3·별도 결정) / applied → reverted(M3).
--   모든 전이는 그 행 잠금 아래. 파일 지우기는 abandoned·rejected·expired 행의 파일만 — reserved·proposed·applied 파일은 누구도 못 지움.
-- 신뢰하지 않는 값: 브라우저 원본 지문(source_hint)·저장소 eTag는 「같은 결과인가」 힌트일 뿐 권한·무결성 판정에 쓰지 않는다.
--   메타데이터(크기·형식) 확인은 JPEG 바이트 검증을 대신하지 않는다 — 바이트 검증은 M3 적용 때 서버 경로(설계 §11-4·§12).
-- 선행: 0043(mall_builder_staff_can), 0053(mall_builder_suppliers), 0062(source_product_id).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mall-builder-proposals', 'mall-builder-proposals', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create table if not exists public.mall_builder_photo_proposals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  supplier_id uuid references public.mall_builder_suppliers (id) on delete set null,
  origin text not null check (origin in ('operator', 'supplier')),
  job_id uuid not null,
  result_id uuid not null,
  settings_version text not null default '' check (char_length(settings_version) <= 40),
  role text not null default 'main' check (role = 'main'),
  base_revision text not null check (char_length(base_revision) between 1 and 40),
  source_hint text not null default '' check (char_length(source_hint) <= 128),
  file_path text not null unique,
  status text not null default 'reserved' check (status in ('reserved', 'proposed', 'abandoned', 'rejected', 'expired', 'applied', 'reverted')),
  reserved_until timestamptz not null,
  object_size bigint,
  object_etag text,
  prev_images jsonb,
  applied_path text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz
);
-- 같은 결과 번호는 살아 있는(예약·제안·적용) 행 하나만
create unique index if not exists mall_builder_photo_proposals_live
  on public.mall_builder_photo_proposals (store_id, product_id, result_id) where status in ('reserved', 'proposed', 'applied');
create index if not exists mall_builder_photo_proposals_store on public.mall_builder_photo_proposals (store_id, status, created_at desc);

alter table public.mall_builder_photo_proposals enable row level security;
revoke all on table public.mall_builder_photo_proposals from public, anon, authenticated;
grant select on table public.mall_builder_photo_proposals to authenticated;

-- 권한 판정(매 호출마다): operator / supplier / null. 이 몰 상품이고 거울이 아니어야 한다.
create or replace function mall_builder_private.photo_proposal_actor(p_store uuid, p_product uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  p public.mall_builder_products%rowtype;
begin
  if auth.uid() is null then return null; end if;
  select * into p from public.mall_builder_products where id = p_product;
  if p.id is null or p.store_id is distinct from p_store or p.source_product_id is not null then return null; end if;
  if coalesce(public.mall_builder_staff_can(p_store, 'products'), false) then return 'operator'; end if;
  if p.supplier_id is not null and exists (
    select 1 from public.mall_builder_suppliers s
    where s.id = p.supplier_id and s.store_id = p_store and s.user_id = auth.uid() and s.status = 'active') then
    return 'supplier';
  end if;
  return null;
end;
$$;

-- 행 하나를 볼 수 있는가: operator는 그 몰 상품 제안 전부.
-- supplier는 supplier 제안 중 「제안에 기록된 공급사 = 지금 상품의 공급사 = 호출자 본인의 활성 공급사」일 때만
-- (상품 공급사가 바뀌면 예전 공급사도 새 공급사도 예전 제안을 못 봄 — Mac msg_b59905da566c).
create or replace function mall_builder_private.photo_proposal_row_ok(r public.mall_builder_photo_proposals)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  a text := mall_builder_private.photo_proposal_actor(r.store_id, r.product_id);
begin
  if a = 'operator' then return true; end if;
  if a = 'supplier' and r.origin = 'supplier' and r.supplier_id is not null then
    return exists (
      select 1 from public.mall_builder_products p join public.mall_builder_suppliers s on s.id = p.supplier_id
      where p.id = r.product_id and p.supplier_id = r.supplier_id
        and s.user_id = auth.uid() and s.status = 'active' and s.store_id = r.store_id);
  end if;
  -- 권한 없음(a = null)도 반드시 false — null을 돌려주면 「not row_ok」 검사를 빠져나간다
  return false;
end;
$$;

drop policy if exists mall_builder_photo_proposals_read on public.mall_builder_photo_proposals;
create policy mall_builder_photo_proposals_read on public.mall_builder_photo_proposals
  for select to authenticated using (mall_builder_private.photo_proposal_row_ok(mall_builder_photo_proposals));

-- 저장소 정책 판정(경로 = 행의 file_path, 경로 낱말로 판정하지 않음)
create or replace function mall_builder_private.photo_proposal_object_ok(p_name text, p_action text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  r public.mall_builder_photo_proposals%rowtype;
begin
  if auth.uid() is null then return false; end if;
  select * into r from public.mall_builder_photo_proposals where file_path = p_name;
  if r.id is null or not mall_builder_private.photo_proposal_row_ok(r) then return false; end if;
  if p_action = 'read' then return true; end if;
  if p_action = 'upload' then return r.status = 'reserved' and r.created_by = auth.uid() and r.reserved_until > now(); end if;
  if p_action = 'delete' then return r.status in ('abandoned', 'rejected', 'expired'); end if;
  return false;
end;
$$;

drop policy if exists mall_builder_proposals_read on storage.objects;
create policy mall_builder_proposals_read on storage.objects for select to authenticated
  using (bucket_id = 'mall-builder-proposals' and mall_builder_private.photo_proposal_object_ok(name, 'read'));
drop policy if exists mall_builder_proposals_insert on storage.objects;
create policy mall_builder_proposals_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'mall-builder-proposals' and mall_builder_private.photo_proposal_object_ok(name, 'upload'));
drop policy if exists mall_builder_proposals_delete on storage.objects;
create policy mall_builder_proposals_delete on storage.objects for delete to authenticated
  using (bucket_id = 'mall-builder-proposals' and mall_builder_private.photo_proposal_object_ok(name, 'delete'));
-- 고치기(update) 정책 없음 = 덮어쓰기 0

-- 예약: 같은 결과 번호는 행 하나. 반환 {ok, state: upload|done, id?, path?} 또는 {ok:false, reason}
create or replace function public.mall_builder_photo_proposal_begin(p_store uuid, p_product uuid, p_job uuid, p_result uuid,
  p_settings text default '', p_base_revision text default '', p_source_hint text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a text;
  p public.mall_builder_products%rowtype;
  r public.mall_builder_photo_proposals%rowtype;
  v_id uuid;
  v_path text;
  v_hint text := left(coalesce(p_source_hint, ''), 128);
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  -- 원본 지문 힌트는 필수(빈 값이면 같은 결과 번호의 다른 사진 검사를 빠져나가므로 받지 않음)
  if p_store is null or p_product is null or p_job is null or p_result is null or v_hint = ''
     or coalesce(btrim(p_base_revision), '') = '' or char_length(p_base_revision) > 40 or char_length(coalesce(p_settings, '')) > 40 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  -- 같은 (몰, 상품, 결과 번호)는 한 번에 하나씩
  perform pg_advisory_xact_lock(hashtextextended(p_store::text || '/' || p_product::text || '/' || p_result::text, 106));
  a := mall_builder_private.photo_proposal_actor(p_store, p_product);
  if a is null then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  select * into p from public.mall_builder_products where id = p_product;

  select * into r from public.mall_builder_photo_proposals
   where store_id = p_store and product_id = p_product and result_id = p_result and status in ('reserved', 'proposed', 'applied')
   for update;
  if r.id is not null then
    -- 기존 행은 볼 권한이 있을 때만 상태·경로를 알려 준다(공급사가 바뀐 상품 등 — 없으면 아무 정보 없이 거절)
    if not mall_builder_private.photo_proposal_row_ok(r) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
    if r.status in ('proposed', 'applied') then
      if r.source_hint is distinct from v_hint then return jsonb_build_object('ok', false, 'reason', 'conflict'); end if;
      return jsonb_build_object('ok', true, 'state', 'done');
    end if;
    -- 예약 중
    if r.reserved_until > now() then
      if r.created_by = auth.uid() then return jsonb_build_object('ok', true, 'state', 'upload', 'id', r.id, 'path', r.file_path); end if;
      return jsonb_build_object('ok', false, 'reason', 'busy');
    end if;
    -- 기한 지난 예약 → 버리고 새로 예약(옛 업로더의 늦은 확정은 상태가 달라 거절됨)
    update public.mall_builder_photo_proposals set status = 'abandoned', decided_by = auth.uid(), decided_at = now() where id = r.id;
  end if;

  v_id := gen_random_uuid();
  v_path := p_store::text || '/' || v_id::text || '.jpg';
  insert into public.mall_builder_photo_proposals (id, store_id, product_id, supplier_id, origin, job_id, result_id, settings_version,
    base_revision, source_hint, file_path, status, reserved_until, created_by)
  values (v_id, p_store, p_product, p.supplier_id, a, p_job, p_result, coalesce(p_settings, ''), btrim(p_base_revision), v_hint,
    v_path, 'reserved', now() + interval '10 minutes', auth.uid());
  return jsonb_build_object('ok', true, 'state', 'upload', 'id', v_id, 'path', v_path);
end;
$$;

-- 확정: 예약자 본인만, 지금도 권한이 있고, 예약 경로에 본인 소유 JPEG(1B~5MB)가 기한 안에 올라와 있을 때만 proposed
create or replace function public.mall_builder_photo_proposal_commit(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.mall_builder_photo_proposals%rowtype;
  o record;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.mall_builder_photo_proposals where id = p_id for update;
  if r.id is null or r.created_by is distinct from auth.uid() or not mall_builder_private.photo_proposal_row_ok(r) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if r.status in ('proposed', 'applied') then return jsonb_build_object('ok', true, 'state', 'done'); end if;
  if r.status <> 'reserved' then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  select ob.owner_id, ob.created_at, (ob.metadata ->> 'size') as size, ob.metadata ->> 'mimetype' as mime, ob.metadata ->> 'eTag' as etag
    into o from storage.objects ob where ob.bucket_id = 'mall-builder-proposals' and ob.name = r.file_path;
  if not found or o.owner_id is distinct from auth.uid()::text or o.mime is distinct from 'image/jpeg'
     or o.size is null or o.size !~ '^[0-9]{1,8}$' or o.size::bigint < 1 or o.size::bigint > 5242880
     or o.created_at > r.reserved_until then
    return jsonb_build_object('ok', false, 'reason', 'no_file');
  end if;
  update public.mall_builder_photo_proposals set status = 'proposed', object_size = o.size::bigint, object_etag = left(coalesce(o.etag, ''), 200)
   where id = r.id;
  return jsonb_build_object('ok', true, 'state', 'done');
end;
$$;

-- 포기: 예약자 본인의 reserved만 abandoned(그 뒤 파일 지우기 가능). 이미 proposed면 거절(확정 파일 보호)
create or replace function public.mall_builder_photo_proposal_abandon(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.mall_builder_photo_proposals%rowtype;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into r from public.mall_builder_photo_proposals where id = p_id for update;
  if r.id is null or r.created_by is distinct from auth.uid() or not mall_builder_private.photo_proposal_row_ok(r) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if r.status = 'abandoned' then return jsonb_build_object('ok', true, 'state', 'abandoned'); end if;
  if r.status <> 'reserved' then return jsonb_build_object('ok', false, 'reason', 'committed'); end if;
  update public.mall_builder_photo_proposals set status = 'abandoned', decided_by = auth.uid(), decided_at = now() where id = r.id;
  return jsonb_build_object('ok', true, 'state', 'abandoned');
end;
$$;

-- 정리 목록: 기한 지난 예약을 abandoned로 바꾸고, 호출자가 볼 수 있는 행 중 지워도 되는(abandoned·rejected·expired) 파일 경로만 돌려준다.
-- 실제 삭제는 브라우저가 저장소 지우기 정책 아래에서 한다(서버 키 0). 자동 실행 0 — 직원 화면을 열 때만 부른다.
create or replace function public.mall_builder_photo_proposal_cleanup_list(p_store uuid)
returns setof text language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  update public.mall_builder_photo_proposals r set status = 'abandoned', decided_by = auth.uid(), decided_at = now()
   where r.id in (select x.id from public.mall_builder_photo_proposals x
                   where x.store_id = p_store and x.status = 'reserved' and x.reserved_until <= now()
                     and mall_builder_private.photo_proposal_row_ok(x)
                   for update skip locked);
  return query
    select r.file_path from public.mall_builder_photo_proposals r
     where r.store_id = p_store and r.status in ('abandoned', 'rejected', 'expired')
       and mall_builder_private.photo_proposal_row_ok(r)
       and exists (select 1 from storage.objects ob where ob.bucket_id = 'mall-builder-proposals' and ob.name = r.file_path)
     order by r.created_at;
end;
$$;

revoke all on function mall_builder_private.photo_proposal_actor(uuid, uuid) from public, anon;
revoke all on function mall_builder_private.photo_proposal_row_ok(public.mall_builder_photo_proposals) from public, anon;
revoke all on function mall_builder_private.photo_proposal_object_ok(text, text) from public, anon;
grant execute on function mall_builder_private.photo_proposal_actor(uuid, uuid) to authenticated;
grant execute on function mall_builder_private.photo_proposal_row_ok(public.mall_builder_photo_proposals) to authenticated;
grant execute on function mall_builder_private.photo_proposal_object_ok(text, text) to authenticated;
revoke all on function public.mall_builder_photo_proposal_begin(uuid, uuid, uuid, uuid, text, text, text) from public, anon;
revoke all on function public.mall_builder_photo_proposal_commit(uuid) from public, anon;
revoke all on function public.mall_builder_photo_proposal_abandon(uuid) from public, anon;
revoke all on function public.mall_builder_photo_proposal_cleanup_list(uuid) from public, anon;
grant execute on function public.mall_builder_photo_proposal_begin(uuid, uuid, uuid, uuid, text, text, text) to authenticated;
grant execute on function public.mall_builder_photo_proposal_commit(uuid) to authenticated;
grant execute on function public.mall_builder_photo_proposal_abandon(uuid) to authenticated;
grant execute on function public.mall_builder_photo_proposal_cleanup_list(uuid) to authenticated;
