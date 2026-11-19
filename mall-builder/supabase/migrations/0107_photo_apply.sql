-- 0107 메이커 M3 1차 「제안 → 적용」 데이터 계층 — 2026-11-19 Master msg_617ae29305b4(로컬 격리 구현), 설계 docs/PLAN_20261119_MAKER_M2_PROPOSALS.md §14~§17.
-- 주인님 결정(2026-11-19): A 변경 불가 공개 버킷, 서버 디코드·재인코딩 게시, 「그래도 적용」은 직원만, 실패 파일 관리자 주 1회 점검.
-- 하는 일: 변경 불가 공개 버킷 mall-builder-applied(5MB, JPEG) + 서명 열쇠 표(DB 전용) + 적용 슬롯 표 + 올리기 정책(서명 경로만) +
--   함수 begin(슬롯)·commit(최종 서명 확인 뒤 상품 대표사진 교체)·revert(되돌리기, 직원만).
-- 바꾸지 않는 것: 기존 공개 버킷 mall-builder-public·비공개 버킷·제안 버킷과 그 정책, 가격·공급가·옵션·배송·카테고리.
-- 서명(형식은 src/lib/applySignature.ts와 같음, 목적 글자로 분리):
--   upload-path  = v1|upload-path|kid|store|product|proposal|apply_id|uid|role|sha256          → HMAC 앞 32자가 게시 경로 이름에 들어감
--   apply-final  = v1|apply-final|kid|store|product|proposal|apply_id|uid|role|sha256|size|exp|public_url  → commit 인자
--     (public_url = 서버 설정의 고정 출처 + 게시 경로를 정규화한 전체 주소 — 서명에 묶여 호출자가 출처를 바꿀 수 없음, Master msg_371737216f81)
--   열쇠는 서버 환경변수와 이 DB 전용 표 두 곳(등록은 주인님 — 이 파일은 표만 만들고 값은 넣지 않음).
-- 회원(브라우저)은 열쇠가 없어 맞는 경로·서명을 만들 수 없다. 서버는 경로를 업로드가 끝나기 전에 브라우저에 내보내지 않는다.
-- 게시 버킷에는 회원 고치기·지우기 정책이 없다(변경 불가). 실패 객체는 관리자 점검(주 1회)으로 정리.
-- 선행: 0106(mall_builder_photo_proposals·photo_proposal_actor·photo_proposal_row_ok), 0057(suppliers.auto_approve).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mall-builder-applied', 'mall-builder-applied', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- 서명 열쇠(DB 전용 — 회원·anon·authenticated 권한 0, 아래 definer 함수만 읽음)
create table if not exists mall_builder_private.apply_signing_keys (
  kid text primary key check (kid ~ '^[a-z0-9]{1,16}$'),
  key bytea not null check (octet_length(key) = 32),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
revoke all on table mall_builder_private.apply_signing_keys from public, anon, authenticated;

-- 적용 슬롯(제안 하나에 살아 있는 슬롯 하나)
create table if not exists public.mall_builder_photo_apply_slots (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.mall_builder_photo_proposals (id) on delete cascade,
  store_id uuid not null references public.mall_builder_stores (id) on delete cascade,
  product_id uuid not null references public.mall_builder_products (id) on delete cascade,
  created_by uuid not null,
  role text not null check (role in ('operator', 'supplier')),
  product_rev timestamptz not null,
  forced boolean not null default false,
  status text not null default 'applying' check (status in ('applying', 'applied', 'expired')),
  until timestamptz not null,
  path text,
  sha256 text,
  size bigint,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index if not exists mall_builder_photo_apply_slots_live on public.mall_builder_photo_apply_slots (proposal_id) where status = 'applying';
alter table public.mall_builder_photo_apply_slots enable row level security;
revoke all on table public.mall_builder_photo_apply_slots from public, anon, authenticated;

-- 원문 만들기(검사된 값만 이어 붙임)
create or replace function mall_builder_private.apply_upload_msg(p_kid text, p_store uuid, p_product uuid, p_proposal uuid, p_apply uuid, p_uid uuid, p_role text, p_sha text)
returns text language sql immutable set search_path = '' as $$
  select 'v1|upload-path|' || p_kid || '|' || p_store || '|' || p_product || '|' || p_proposal || '|' || p_apply || '|' || p_uid || '|' || p_role || '|' || p_sha
$$;
create or replace function mall_builder_private.apply_final_msg(p_kid text, p_store uuid, p_product uuid, p_proposal uuid, p_apply uuid, p_uid uuid, p_role text, p_sha text, p_size bigint, p_exp bigint, p_url text)
returns text language sql immutable set search_path = '' as $$
  select 'v1|apply-final|' || p_kid || '|' || p_store || '|' || p_product || '|' || p_proposal || '|' || p_apply || '|' || p_uid || '|' || p_role || '|' || p_sha || '|' || p_size || '|' || p_exp || '|' || p_url
$$;
-- HMAC-SHA256 hex(활성 열쇠만, 없으면 null). 회원 실행 권한 0
create or replace function mall_builder_private.apply_hmac(p_kid text, p_msg text)
returns text language sql stable security definer set search_path = '' as $$
  select encode(extensions.hmac(convert_to(p_msg, 'UTF8'), k.key, 'sha256'), 'hex')
    from mall_builder_private.apply_signing_keys k where k.kid = p_kid and k.active
$$;

-- 게시 경로 판정: <몰>/<apply_id>.<kid>.<sha>.<hmac32>.jpg, 슬롯 applying·기한 안·슬롯 연 사람 = 호출자·지금도 같은 역할, HMAC 일치
create or replace function mall_builder_private.applied_object_ok(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  m text[];
  s public.mall_builder_photo_apply_slots%rowtype;
  pr public.mall_builder_photo_proposals%rowtype;
  h text;
begin
  if auth.uid() is null then return false; end if;
  m := regexp_match(coalesce(p_name, ''), '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([a-z0-9]{1,16})\.([0-9a-f]{64})\.([0-9a-f]{32})\.jpg$');
  if m is null then return false; end if;
  select * into s from public.mall_builder_photo_apply_slots where id = m[2]::uuid;
  if s.id is null or s.status <> 'applying' or s.until <= now() or s.created_by <> auth.uid() or s.store_id::text <> m[1] then return false; end if;
  select * into pr from public.mall_builder_photo_proposals where id = s.proposal_id;
  if pr.id is null or not mall_builder_private.photo_proposal_row_ok(pr)
     or mall_builder_private.photo_proposal_actor(s.store_id, s.product_id) is distinct from s.role then return false; end if;
  h := mall_builder_private.apply_hmac(m[3], mall_builder_private.apply_upload_msg(m[3], s.store_id, s.product_id, s.proposal_id, s.id, auth.uid(), s.role, m[4]));
  return coalesce(left(h, 32) = m[5], false);
end;
$$;

drop policy if exists mall_builder_applied_insert on storage.objects;
create policy mall_builder_applied_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'mall-builder-applied' and mall_builder_private.applied_object_ok(name));
-- 읽기는 공개 버킷 공개 주소로. 고치기·지우기 정책 없음 = 변경 불가

-- 1단계: 적용 슬롯(제안 → 상품 순서로 잠금). 그사이 상품이 바뀌었으면 기본 거절, 직원만 강제(forced)
create or replace function public.mall_builder_photo_apply_begin(p_proposal uuid, p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pr public.mall_builder_photo_proposals%rowtype;
  p public.mall_builder_products%rowtype;
  s public.mall_builder_photo_apply_slots%rowtype;
  a text;
  v_stale boolean;
  v_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into pr from public.mall_builder_photo_proposals where id = p_proposal for update;
  if pr.id is null or not mall_builder_private.photo_proposal_row_ok(pr) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  if pr.status <> 'proposed' then return jsonb_build_object('ok', false, 'reason', 'not_proposed'); end if;
  select * into p from public.mall_builder_products where id = pr.product_id for update;
  a := mall_builder_private.photo_proposal_actor(pr.store_id, pr.product_id);
  if a is null then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  if coalesce(p_force, false) and a <> 'operator' then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  begin v_stale := pr.base_revision::timestamptz is distinct from p.updated_at; exception when others then v_stale := true; end;
  if v_stale and not coalesce(p_force, false) then return jsonb_build_object('ok', false, 'reason', 'stale'); end if;
  update public.mall_builder_photo_apply_slots set status = 'expired', decided_at = now()
   where proposal_id = pr.id and status = 'applying' and until <= now();
  select * into s from public.mall_builder_photo_apply_slots where proposal_id = pr.id and status = 'applying' for update;
  if s.id is not null then
    if s.created_by = auth.uid() and s.role = a then
      return jsonb_build_object('ok', true, 'state', 'applying', 'apply_id', s.id, 'role', s.role, 'resumed', true);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'busy');
  end if;
  v_id := gen_random_uuid();
  insert into public.mall_builder_photo_apply_slots (id, proposal_id, store_id, product_id, created_by, role, product_rev, forced, until)
  values (v_id, pr.id, pr.store_id, pr.product_id, auth.uid(), a, p.updated_at, coalesce(p_force, false), now() + interval '5 minutes');
  return jsonb_build_object('ok', true, 'state', 'applying', 'apply_id', v_id, 'role', a, 'resumed', false);
end;
$$;

-- 2단계: 최종 서명·게시 객체 확인 뒤 상품 대표사진 교체(나머지 사진 보존). 같은 슬롯 재호출은 멱등.
create or replace function public.mall_builder_photo_apply_commit(p_apply uuid, p_kid text, p_sha text, p_size bigint, p_exp bigint, p_sig text, p_public_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.mall_builder_photo_apply_slots%rowtype;
  pr public.mall_builder_photo_proposals%rowtype;
  p public.mall_builder_products%rowtype;
  v_path text;
  v_up text;
  v_fin text;
  o record;
  v_prev jsonb;
  v_new jsonb;
  v_auto boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into s from public.mall_builder_photo_apply_slots where id = p_apply for update;
  if s.id is null or s.created_by <> auth.uid() then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  if s.status = 'applied' then
    return case when s.sha256 = p_sha then jsonb_build_object('ok', true, 'state', 'done') else jsonb_build_object('ok', false, 'reason', 'conflict') end;
  end if;
  if s.status <> 'applying' then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if s.until <= now() then
    update public.mall_builder_photo_apply_slots set status = 'expired', decided_at = now() where id = s.id;
    return jsonb_build_object('ok', false, 'reason', 'gone');
  end if;
  -- 형식(모호함 차단)
  if p_kid !~ '^[a-z0-9]{1,16}$' or p_sha !~ '^[0-9a-f]{64}$' or p_sig !~ '^[0-9a-f]{64}$'
     or p_size is null or p_size < 1 or p_size > 5242880
     or p_exp is null or p_exp < extract(epoch from now())::bigint or p_exp > extract(epoch from now())::bigint + 600
     or p_public_url is null or char_length(p_public_url) > 400 or p_public_url !~ '^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?/storage/v1/object/public/mall-builder-applied/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,16}\.[0-9a-f]{64}\.[0-9a-f]{32}\.jpg$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select * into pr from public.mall_builder_photo_proposals where id = s.proposal_id for update;
  select * into p from public.mall_builder_products where id = s.product_id for update;
  if pr.id is null or p.id is null or not mall_builder_private.photo_proposal_row_ok(pr)
     or mall_builder_private.photo_proposal_actor(s.store_id, s.product_id) is distinct from s.role then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if pr.status <> 'proposed' then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if p.updated_at is distinct from s.product_rev then return jsonb_build_object('ok', false, 'reason', 'stale'); end if;
  -- 최종 서명(목적 apply-final)
  v_fin := mall_builder_private.apply_hmac(p_kid, mall_builder_private.apply_final_msg(p_kid, s.store_id, s.product_id, s.proposal_id, s.id, auth.uid(), s.role, p_sha, p_size, p_exp, p_public_url));
  if v_fin is null or v_fin <> p_sig then return jsonb_build_object('ok', false, 'reason', 'bad_sig'); end if;
  -- 게시 경로(목적 upload-path)와 객체
  v_up := mall_builder_private.apply_hmac(p_kid, mall_builder_private.apply_upload_msg(p_kid, s.store_id, s.product_id, s.proposal_id, s.id, auth.uid(), s.role, p_sha));
  v_path := s.store_id::text || '/' || s.id::text || '.' || p_kid || '.' || p_sha || '.' || left(v_up, 32) || '.jpg';
  if right(p_public_url, char_length('/storage/v1/object/public/mall-builder-applied/' || v_path)) <> '/storage/v1/object/public/mall-builder-applied/' || v_path then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select ob.owner_id, ob.metadata ->> 'size' as size, ob.metadata ->> 'mimetype' as mime into o
    from storage.objects ob where ob.bucket_id = 'mall-builder-applied' and ob.name = v_path;
  if not found or o.owner_id is distinct from auth.uid()::text or o.mime is distinct from 'image/jpeg'
     or o.size is null or o.size !~ '^[0-9]{1,8}$' or o.size::bigint <> p_size then
    return jsonb_build_object('ok', false, 'reason', 'no_file');
  end if;
  -- 적용: 첫 장만 교체, 나머지 보존(최대 5장)
  v_prev := coalesce(p.images, '[]'::jsonb);
  select jsonb_build_array(jsonb_build_object('url', p_public_url, 'path', v_path)) || coalesce(jsonb_agg(e.value order by e.ord), '[]'::jsonb)
    into v_new from jsonb_array_elements(v_prev) with ordinality e(value, ord) where e.ord between 2 and 5;
  if s.role = 'supplier' then
    select x.auto_approve into v_auto from public.mall_builder_suppliers x where x.id = p.supplier_id;
    update public.mall_builder_products set images = v_new,
      approval = case when coalesce(v_auto, false) then 'approved' else 'pending' end,
      approval_at = case when coalesce(v_auto, false) then now() else approval_at end
     where id = p.id;
  else
    update public.mall_builder_products set images = v_new where id = p.id;  -- 운영사 적용 = 승인 상태 유지
  end if;
  update public.mall_builder_photo_proposals set status = 'applied', prev_images = v_prev, applied_path = v_path, decided_by = auth.uid(), decided_at = now() where id = pr.id;
  update public.mall_builder_photo_apply_slots set status = 'applied', path = v_path, sha256 = p_sha, size = p_size, decided_at = now() where id = s.id;
  return jsonb_build_object('ok', true, 'state', 'done');
end;
$$;

-- 되돌리기(직원만, 1차): 적용 뒤 대표사진이 그대로일 때만 이전 사진 목록으로. 게시 파일은 상품 사진 1년 정책으로 보존.
create or replace function public.mall_builder_photo_apply_revert(p_proposal uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pr public.mall_builder_photo_proposals%rowtype;
  p public.mall_builder_products%rowtype;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into pr from public.mall_builder_photo_proposals where id = p_proposal for update;
  if pr.id is null or mall_builder_private.photo_proposal_actor(pr.store_id, pr.product_id) is distinct from 'operator' then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if pr.status <> 'applied' then return jsonb_build_object('ok', false, 'reason', 'not_applied'); end if;
  select * into p from public.mall_builder_products where id = pr.product_id for update;
  if (p.images -> 0 ->> 'path') is distinct from pr.applied_path then return jsonb_build_object('ok', false, 'reason', 'conflict'); end if;
  update public.mall_builder_products set images = coalesce(pr.prev_images, '[]'::jsonb) where id = p.id;
  update public.mall_builder_photo_proposals set status = 'reverted', decided_by = auth.uid(), decided_at = now() where id = pr.id;
  return jsonb_build_object('ok', true, 'state', 'reverted');
end;
$$;

revoke all on function mall_builder_private.apply_upload_msg(text, uuid, uuid, uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function mall_builder_private.apply_final_msg(text, uuid, uuid, uuid, uuid, uuid, text, text, bigint, bigint, text) from public, anon, authenticated;
revoke all on function mall_builder_private.apply_hmac(text, text) from public, anon, authenticated;
revoke all on function mall_builder_private.applied_object_ok(text) from public, anon;
grant execute on function mall_builder_private.applied_object_ok(text) to authenticated;
revoke all on function public.mall_builder_photo_apply_begin(uuid, boolean) from public, anon;
revoke all on function public.mall_builder_photo_apply_commit(uuid, text, text, bigint, bigint, text, text) from public, anon;
revoke all on function public.mall_builder_photo_apply_revert(uuid) from public, anon;
grant execute on function public.mall_builder_photo_apply_begin(uuid, boolean) to authenticated;
grant execute on function public.mall_builder_photo_apply_commit(uuid, text, text, bigint, bigint, text, text) to authenticated;
grant execute on function public.mall_builder_photo_apply_revert(uuid) to authenticated;
