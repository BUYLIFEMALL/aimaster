-- 0107 메이커 M3 1차 「제안 → 적용」 데이터 계층 시나리오(로컬 Docker 격리 DB 전용, 운영·Lab·외부망 0).
-- 실행기: node mall-builder/scripts/check-0107-local.mjs (0001~0107 적용한 새 DB에서 이 파일 → 두 세션 경합 시험).
-- 서명 열쇠는 합성 시험 값(sha256('qa-0107-synthetic-key'))만 쓴다 — 실제 열쇠·파일·설정 0.
-- 저장소 업로드·고치기·지우기는 storage.objects에 직접 insert/update/delete로 흉내(실제 Supabase도 같은 표·같은 정책).
-- 결과는 qa_r 표 → 마지막에 「A번호 <탭> t/f/n」. 경로·서명 원문은 출력하지 않는다.
\set ON_ERROR_STOP 1
create table public.qa_r (k text, ok boolean);
grant insert, select on public.qa_r to authenticated, anon;
create table public.qa_ids (k text primary key, v uuid);
insert into public.qa_ids values
 ('S', '00000000-0000-0000-0000-00000000005a'), ('S2ST', '00000000-0000-0000-0000-00000000005b'), ('A1', '00000000-0000-0000-0000-0000000000a1'),
 ('S2', '00000000-0000-0000-0000-0000000000b2'), ('S3', '00000000-0000-0000-0000-0000000000b3'), ('U4', '00000000-0000-0000-0000-0000000000b4'),
 ('U5', '00000000-0000-0000-0000-0000000000b5'), ('C6', '00000000-0000-0000-0000-0000000000b6'), ('O7', '00000000-0000-0000-0000-0000000000b7'),
 ('P1', '00000000-0000-0000-0000-0000000000f1'), ('P2', '00000000-0000-0000-0000-0000000000f2'), ('P3', '00000000-0000-0000-0000-0000000000f3'),
 ('P5', '00000000-0000-0000-0000-0000000000f5'), ('SUP1', '00000000-0000-0000-0000-0000000005e1'), ('SUP2', '00000000-0000-0000-0000-0000000005e2');
create function public.qa_id(p text) returns uuid language sql stable as $$ select v from public.qa_ids where k = p $$;
grant select on public.qa_ids to authenticated, anon;
grant execute on function public.qa_id(text) to authenticated, anon;

-- ── 준비(관리자 권한)
insert into auth.users (id, email) select v, lower(k) || '@x.test' from public.qa_ids where k in ('S2', 'S3', 'U4', 'U5', 'C6', 'O7');
insert into public.profiles (id, email) select v, lower(k) || '@x.test' from public.qa_ids where k in ('S2', 'S3', 'U4', 'U5', 'C6', 'O7');
insert into public.mall_builder_stores (id, name, owner_id, slug) values (qa_id('S2ST'), '다른몰', qa_id('O7'), 'qa-other');
insert into public.mall_builder_store_staff (store_id, user_id, role, perms) values
  (qa_id('S'), qa_id('S2'), 'staff', '{}'), (qa_id('S'), qa_id('S3'), 'staff', '{"products": true}'), (qa_id('S2ST'), qa_id('O7'), 'owner', '{}')
  on conflict do nothing;
insert into public.mall_builder_suppliers (id, store_id, user_id, name, email, status) values
  (qa_id('SUP1'), qa_id('S'), qa_id('U4'), '공급사1', 'u4@x.test', 'active'),
  (qa_id('SUP2'), qa_id('S'), qa_id('U5'), '공급사2', 'u5@x.test', 'active');
insert into public.mall_builder_store_customers (store_id, user_id, name, phone) values (qa_id('S'), qa_id('C6'), '손님', '010-0000-0006');
insert into public.mall_builder_products (id, store_id, name, base_price, images) values
  (qa_id('P1'), qa_id('S'), '자체 상품', 1000, '[{"url": "https://x.test/old1.jpg"}, {"url": "https://x.test/old2.jpg"}]'),
  (qa_id('P5'), qa_id('S'), '자체 상품2', 1000, '[{"url": "https://x.test/p5.jpg"}]');
insert into public.mall_builder_products (id, store_id, name, base_price, supplier_id) values (qa_id('P2'), qa_id('S'), '공급사1 상품', 1000, qa_id('SUP1'));
insert into public.mall_builder_products (id, store_id, name, base_price, source_product_id) values (qa_id('P3'), qa_id('S'), '거울 상품', 1000, qa_id('P1'));
-- 합성 열쇠: k1 사용 중, k0 꺼짐(다른 값)
insert into mall_builder_private.apply_signing_keys (kid, key, active) values
  ('k1', extensions.digest('qa-0107-synthetic-key', 'sha256'), true),
  ('k0', extensions.digest('qa-0107-synthetic-key-old', 'sha256'), false);

-- 제안 행(0106 흐름은 0106 시험이 검증 — 여기서는 「proposed」 행을 관리자로 바로 만든다)
create function public.qa_prop(p_product uuid, p_origin text, p_creator uuid) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid(); p public.mall_builder_products%rowtype;
begin
  select * into p from public.mall_builder_products where id = p_product;
  insert into public.mall_builder_photo_proposals (id, store_id, product_id, supplier_id, origin, job_id, result_id, base_revision, file_path, status, reserved_until, created_by)
  values (v, p.store_id, p.id, case when p_origin = 'supplier' then p.supplier_id end, p_origin, gen_random_uuid(), gen_random_uuid(),
          p.updated_at::text, p.store_id::text || '/' || v::text || '.jpg', 'proposed', now() + interval '10 minutes', p_creator);
  return v;
end $$;
-- 서버 흉내(관리자만): 게시 이름·최종 서명 계산
create function public.qa_name(p_apply uuid, p_kid text, p_sha text, p_uid uuid, p_sigkid text default null) returns text language plpgsql as $$
declare s public.mall_builder_photo_apply_slots%rowtype; h text;
begin
  select * into s from public.mall_builder_photo_apply_slots where id = p_apply;
  h := mall_builder_private.apply_hmac(coalesce(p_sigkid, p_kid), mall_builder_private.apply_upload_msg(p_kid, s.store_id, s.product_id, s.proposal_id, s.id, p_uid, s.role, p_sha));
  return s.store_id::text || '/' || s.id::text || '.' || p_kid || '.' || p_sha || '.' || left(coalesce(h, repeat('0', 32)), 32) || '.jpg';
end $$;
create function public.qa_fsig(p_apply uuid, p_kid text, p_sha text, p_size bigint, p_exp bigint, p_uid uuid) returns text language plpgsql as $$
declare s public.mall_builder_photo_apply_slots%rowtype;
begin
  select * into s from public.mall_builder_photo_apply_slots where id = p_apply;
  return coalesce(mall_builder_private.apply_hmac(p_kid, mall_builder_private.apply_final_msg(p_kid, s.store_id, s.product_id, s.proposal_id, s.id, p_uid, s.role, p_sha, p_size, p_exp)), repeat('0', 64));
end $$;
revoke all on function public.qa_name(uuid, text, text, uuid, text), public.qa_fsig(uuid, text, text, bigint, bigint, uuid) from public, anon, authenticated;
-- 저장소 흉내(회원 권한으로 실행 — 정책이 거름)
create function public.qa_put(p_name text, p_size bigint, p_bucket text default 'mall-builder-applied') returns void language sql as $$
  insert into storage.objects (bucket_id, name, owner_id, metadata) values (p_bucket, p_name, auth.uid()::text,
    jsonb_build_object('size', p_size, 'mimetype', 'image/jpeg', 'eTag', '"e-' || md5(p_name) || '"')) $$;
create function public.qa_del(p_name text) returns integer language sql as $$
  with d as (delete from storage.objects where bucket_id = 'mall-builder-applied' and name = p_name returning 1) select count(*)::int from d $$;
create function public.qa_upd(p_name text) returns integer language sql as $$
  with u as (update storage.objects set metadata = metadata || '{"size": 1}'::jsonb where bucket_id = 'mall-builder-applied' and name = p_name returning 1) select count(*)::int from u $$;
grant execute on function public.qa_put(text, bigint, text), public.qa_del(text), public.qa_upd(text) to authenticated, anon;

do $$
declare
  S uuid := qa_id('S'); P1 uuid := qa_id('P1'); P2 uuid := qa_id('P2'); P3 uuid := qa_id('P3'); P5 uuid := qa_id('P5');
  S3 uuid := qa_id('S3'); A1 uuid := qa_id('A1'); U4 uuid := qa_id('U4');
  SHA text := repeat('a1', 32); SHA2 text := repeat('b2', 32);
  BASE text := 'https://qa.supabase.test/storage/v1/object/public/mall-builder-applied/';
  pa uuid; pb uuid; pc uuid; pd uuid; pe uuid; pm uuid;
  r jsonb; x uuid; xb uuid; xd uuid; xe uuid; nm text; nmb text; nmd text; nme text; ex bigint; ok boolean; n int; e text;
begin
  -- A01 버킷
  insert into qa_r select 'A01', exists (select 1 from storage.buckets where id = 'mall-builder-applied' and public = true and file_size_limit = 5242880 and allowed_mime_types = array['image/jpeg']);
  -- A02 기본 권한(열쇠·서명 계산은 회원이 못 씀, 슬롯 표 직접 접근 0)
  insert into qa_r select 'A02',
    not has_function_privilege('anon', 'public.mall_builder_photo_apply_begin(uuid,boolean)', 'execute')
    and not has_function_privilege('anon', 'public.mall_builder_photo_apply_commit(uuid,text,text,bigint,bigint,text,text)', 'execute')
    and not has_function_privilege('anon', 'public.mall_builder_photo_apply_revert(uuid)', 'execute')
    and not has_function_privilege('public', 'public.mall_builder_photo_apply_commit(uuid,text,text,bigint,bigint,text,text)', 'execute')
    and not has_function_privilege('authenticated', 'mall_builder_private.apply_hmac(text,text)', 'execute')
    and not has_function_privilege('authenticated', 'mall_builder_private.apply_upload_msg(text,uuid,uuid,uuid,uuid,uuid,text,text)', 'execute')
    and not has_function_privilege('anon', 'mall_builder_private.applied_object_ok(text)', 'execute')
    and not has_table_privilege('authenticated', 'mall_builder_private.apply_signing_keys', 'select')
    and not has_table_privilege('anon', 'mall_builder_private.apply_signing_keys', 'select')
    and not has_table_privilege('authenticated', 'public.mall_builder_photo_apply_slots', 'select')
    and not has_table_privilege('authenticated', 'public.mall_builder_photo_apply_slots', 'insert')
    and not has_table_privilege('authenticated', 'public.mall_builder_photo_apply_slots', 'update')
    and has_function_privilege('authenticated', 'public.mall_builder_photo_apply_begin(uuid,boolean)', 'execute')
    and has_function_privilege('authenticated', 'public.mall_builder_photo_apply_commit(uuid,text,text,bigint,bigint,text,text)', 'execute');

  pa := qa_prop(P1, 'operator', S3);
  pb := qa_prop(P2, 'supplier', U4);
  pm := qa_prop(P3, 'operator', S3);  -- 거울 상품(권한 판정에서 막혀야 함)

  -- A03 권한 없는 사람·대상 → forbidden, 슬롯 0
  ok := true;
  declare u uuid; p uuid; begin
    for u, p in select * from (values (qa_id('S2'), pa), (qa_id('C6'), pa), (qa_id('O7'), pa), (U4, pa), (qa_id('U5'), pb), (S3, pm)) v(u, p) loop
      perform set_config('request.jwt.claim.sub', u::text, false); set role authenticated;
      r := mall_builder_photo_apply_begin(p); reset role;
      ok := ok and r ->> 'reason' = 'forbidden';
    end loop;
  end;
  insert into qa_r values ('A03', ok and (select count(*) = 0 from mall_builder_photo_apply_slots));
  -- A04 비로그인
  begin
    set role anon; perform mall_builder_photo_apply_begin(pa); reset role;
    insert into qa_r values ('A04', false);
  exception when insufficient_privilege then reset role; insert into qa_r values ('A04', true); end;
  -- A05 상품 권한 직원 슬롯, 같은 사람 재개는 같은 번호, 다른 직원은 busy
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  r := mall_builder_photo_apply_begin(pa); x := (r ->> 'apply_id')::uuid;
  ok := r ->> 'state' = 'applying' and r ->> 'role' = 'operator' and (r ->> 'resumed')::boolean = false
        and not (r ? 'path');  -- 경로는 응답에 없다
  r := mall_builder_photo_apply_begin(pa); reset role;
  ok := ok and (r ->> 'apply_id')::uuid = x and (r ->> 'resumed')::boolean;
  perform set_config('request.jwt.claim.sub', A1::text, false); set role authenticated;
  r := mall_builder_photo_apply_begin(pa); reset role;
  insert into qa_r values ('A05', ok and r ->> 'reason' = 'busy' and (select count(*) = 1 from mall_builder_photo_apply_slots where proposal_id = pa));
  -- A06 슬롯 행·열쇠 표는 회원이 못 읽음(슬롯 내용이 새지 않음)
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  begin perform 1 from mall_builder_photo_apply_slots limit 1; ok := false; exception when insufficient_privilege then ok := true; end;
  begin perform 1 from mall_builder_private.apply_signing_keys limit 1; ok := false; exception when insufficient_privilege then ok := ok and true; end;
  reset role;
  insert into qa_r values ('A06', ok);

  -- ── 올리기 경계(U1~U5)
  nm := qa_name(x, 'k1', SHA, S3);
  -- U1 형식에 맞지만 서명이 임의값 / 형식이 아닌 이름 → 거절
  ok := true;
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  foreach e in array array[
      S::text || '/' || x::text || '.k1.' || SHA || '.' || repeat('c', 32) || '.jpg',
      S::text || '/' || x::text || '.jpg',
      S::text || '/' || x::text || '.k1.' || SHA || '.' || left(md5('guess'), 32) || '.png'] loop
    begin perform qa_put(e, 1000); ok := false; exception when insufficient_privilege then null; end;
  end loop;
  reset role;
  insert into qa_r values ('A07-U1', ok and (select count(*) = 0 from storage.objects where bucket_id = 'mall-builder-applied'));
  -- U2 열쇠 없이 만든 다른 조합: 다른 sha의 서명을 붙인 이름 / 꺼진 열쇠 k0 / 다른 사람 uid로 계산한 서명 / 다른 몰 폴더
  ok := true;
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  reset role;
  declare cand text[] := array[
      replace(qa_name(x, 'k1', SHA2, S3), SHA2, SHA),
      qa_name(x, 'k0', SHA, S3),
      qa_name(x, 'k1', SHA, A1),
      replace(nm, S::text || '/', qa_id('S2ST')::text || '/')];
  begin
    perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
    foreach e in array cand loop
      begin perform qa_put(e, 1000); ok := false; exception when insufficient_privilege then null; end;
    end loop;
    reset role;
  end;
  insert into qa_r values ('A08-U2', ok and (select count(*) = 0 from storage.objects where bucket_id = 'mall-builder-applied'));
  -- U3-other 다른 직원(A1)이 맞는 이름(S3 기준)을 알아내 올리기 / 비로그인 → 거절
  ok := true;
  perform set_config('request.jwt.claim.sub', A1::text, false); set role authenticated;
  begin perform qa_put(nm, 1000); ok := false; exception when insufficient_privilege then null; end;
  reset role;
  set role anon;
  begin perform qa_put(nm, 1000); ok := false; exception when insufficient_privilege then null; end;
  reset role;
  insert into qa_r values ('A09-U3other', ok);
  -- U3 서버(슬롯 연 사람)가 맞는 이름으로 → 허용, 같은 이름 다시 → 이미 있음
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  perform qa_put(nm, 4000);
  begin perform qa_put(nm, 4000); ok := false; exception when unique_violation then ok := true; end;
  reset role;
  insert into qa_r values ('A10-U3', ok and (select count(*) = 1 from storage.objects where bucket_id = 'mall-builder-applied' and name = nm and owner_id = S3::text));
  -- U5 고치기·지우기 0(올린 본인·다른 직원·대표 모두)
  ok := true;
  declare u uuid; begin
    for u in select unnest(array[S3, A1, qa_id('S2')]) loop
      perform set_config('request.jwt.claim.sub', u::text, false); set role authenticated;
      ok := ok and qa_upd(nm) = 0 and qa_del(nm) = 0; reset role;
    end loop;
  end;
  insert into qa_r values ('A11-U5', ok and (select count(*) = 1 from storage.objects where bucket_id = 'mall-builder-applied' and name = nm));

  -- ── 최종 적용(U6·U9)
  ex := extract(epoch from now())::bigint + 300;
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  -- 서명 틀림 / 꺼진 kid / 크기 다름(서명은 그 크기로 맞게) / 만료 / 너무 먼 만료 / 주소 다름 / sha 형식 틀림
  reset role; e := qa_fsig(x, 'k1', SHA, 4000, ex, S3); set role authenticated;
  ok := mall_builder_photo_apply_commit(x, 'k1', SHA, 4000, ex, repeat('0', 64), BASE || nm) ->> 'reason' = 'bad_sig';
  ok := ok and mall_builder_photo_apply_commit(x, 'k0', SHA, 4000, ex, e, BASE || nm) ->> 'reason' = 'bad_sig';
  ok := ok and mall_builder_photo_apply_commit(x, 'k1', SHA, 4000, ex + 1, e, BASE || nm) ->> 'reason' = 'bad_sig';
  ok := ok and mall_builder_photo_apply_commit(x, 'k1', SHA, 4000, ex, e, 'https://evil.test/x.jpg') ->> 'reason' = 'invalid';
  ok := ok and mall_builder_photo_apply_commit(x, 'k1', upper(SHA), 4000, ex, e, BASE || nm) ->> 'reason' = 'invalid';
  ok := ok and mall_builder_photo_apply_commit(x, 'k1', SHA, 4000, extract(epoch from now())::bigint - 1, e, BASE || nm) ->> 'reason' = 'invalid';
  ok := ok and mall_builder_photo_apply_commit(x, 'k1', SHA, 4000, extract(epoch from now())::bigint + 3600, e, BASE || nm) ->> 'reason' = 'invalid';
  reset role; e := qa_fsig(x, 'k1', SHA, 3999, ex, S3); set role authenticated;
  ok := ok and mall_builder_photo_apply_commit(x, 'k1', SHA, 3999, ex, e, BASE || nm) ->> 'reason' = 'no_file';
  -- 서명·주소는 맞지만 그 sha의 파일이 없음 → no_file
  reset role; e := qa_fsig(x, 'k1', SHA2, 4000, ex, S3); nmb := qa_name(x, 'k1', SHA2, S3); set role authenticated;
  ok := ok and mall_builder_photo_apply_commit(x, 'k1', SHA2, 4000, ex, e, BASE || nmb) ->> 'reason' = 'no_file';
  reset role;
  insert into qa_r values ('A12-U6', ok and (select images -> 0 ->> 'url' = 'https://x.test/old1.jpg' from mall_builder_products where id = P1)
    and (select status = 'proposed' from mall_builder_photo_proposals where id = pa));
  -- 다른 사람이 남의 슬롯 확정 → forbidden
  e := qa_fsig(x, 'k1', SHA, 4000, ex, S3);
  perform set_config('request.jwt.claim.sub', A1::text, false); set role authenticated;
  r := mall_builder_photo_apply_commit(x, 'k1', SHA, 4000, ex, e, BASE || nm); reset role;
  insert into qa_r values ('A13-other', r ->> 'reason' = 'forbidden');
  -- 정상 확정: 첫 장만 교체, 나머지 보존, 운영사 적용은 승인 상태 그대로
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  r := mall_builder_photo_apply_commit(x, 'k1', SHA, 4000, ex, e, BASE || nm);
  reset role;
  insert into qa_r select 'A14-done', r = '{"ok": true, "state": "done"}'::jsonb
    and p.images -> 0 ->> 'url' = BASE || nm and p.images -> 0 ->> 'path' = nm and p.images -> 1 ->> 'url' = 'https://x.test/old2.jpg'
    and jsonb_array_length(p.images) = 2 and p.approval = 'approved'
    and pr.status = 'applied' and pr.applied_path = nm and pr.prev_images -> 0 ->> 'url' = 'https://x.test/old1.jpg'
    and sl.status = 'applied' and sl.sha256 = SHA and sl.size = 4000
    from mall_builder_products p, mall_builder_photo_proposals pr, mall_builder_photo_apply_slots sl where p.id = P1 and pr.id = pa and sl.id = x;
  -- 같은 확정 재호출 = done, 다른 sha = conflict, 적용된 제안으로 새 슬롯 = not_proposed
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  ok := mall_builder_photo_apply_commit(x, 'k1', SHA, 4000, ex, e, BASE || nm) = '{"ok": true, "state": "done"}'::jsonb;
  ok := ok and mall_builder_photo_apply_commit(x, 'k1', SHA2, 4000, ex, e, BASE || nm) ->> 'reason' = 'conflict';
  ok := ok and mall_builder_photo_apply_begin(pa) ->> 'reason' = 'not_proposed';
  reset role;
  insert into qa_r values ('A15-idem', ok);

  -- ── 묵은 제안(stale)·강제(직원만)
  pc := qa_prop(P5, 'operator', S3);
  update mall_builder_products set name = '자체 상품2 수정' where id = P5;   -- 기준 시각이 바뀜
  pd := qa_prop(P2, 'supplier', U4);
  update mall_builder_products set name = '공급사1 상품 수정' where id = P2;
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  ok := mall_builder_photo_apply_begin(pc) ->> 'reason' = 'stale';
  r := mall_builder_photo_apply_begin(pc, true); reset role;
  ok := ok and r ->> 'state' = 'applying' and (select forced from mall_builder_photo_apply_slots where id = (r ->> 'apply_id')::uuid);
  perform set_config('request.jwt.claim.sub', U4::text, false); set role authenticated;
  ok := ok and mall_builder_photo_apply_begin(pd) ->> 'reason' = 'stale' and mall_builder_photo_apply_begin(pd, true) ->> 'reason' = 'forbidden';
  reset role;
  insert into qa_r values ('A16-stale', ok);
  -- 슬롯 뒤 상품이 바뀌면 확정 거절(stale), 상품 사진 그대로
  xd := (r ->> 'apply_id')::uuid; nmd := qa_name(xd, 'k1', SHA, S3);
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated; perform qa_put(nmd, 5000); reset role;
  -- 시나리오 전체가 한 거래라 같은 거래 안의 두 번째 수정은 updated_at(= 거래 시작 시각)이 그대로 → 슬롯 기준을 1초 앞당겨 「슬롯 뒤 상품 변경」을 만든다
  update mall_builder_products set name = '자체 상품2 또 수정' where id = P5;
  update mall_builder_photo_apply_slots set product_rev = product_rev - interval '1 second' where id = xd;
  e := qa_fsig(xd, 'k1', SHA, 5000, ex, S3);
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  r := mall_builder_photo_apply_commit(xd, 'k1', SHA, 5000, ex, e, BASE || nmd); reset role;
  insert into qa_r select 'A17-stale-commit', r ->> 'reason' = 'stale' and images -> 0 ->> 'url' = 'https://x.test/p5.jpg' from mall_builder_products where id = P5;

  -- ── 공급사 적용: 자동 승인 꺼짐이면 승인 대기로
  pe := qa_prop(P2, 'supplier', U4);
  perform set_config('request.jwt.claim.sub', U4::text, false); set role authenticated;
  r := mall_builder_photo_apply_begin(pe); reset role;
  xb := (r ->> 'apply_id')::uuid; nmb := qa_name(xb, 'k1', SHA2, U4);
  perform set_config('request.jwt.claim.sub', U4::text, false); set role authenticated; perform qa_put(nmb, 2000); reset role;
  e := qa_fsig(xb, 'k1', SHA2, 2000, ex, U4);
  perform set_config('request.jwt.claim.sub', U4::text, false); set role authenticated;
  r := mall_builder_photo_apply_commit(xb, 'k1', SHA2, 2000, ex, e, BASE || nmb); reset role;
  insert into qa_r select 'A18-supplier', r ->> 'state' = 'done' and r ->> 'role' is null and approval = 'pending' and images -> 0 ->> 'path' = nmb
    and (select role = 'supplier' from mall_builder_photo_apply_slots where id = xb) from mall_builder_products where id = P2;

  -- ── 역할이 바뀌면(슬롯 뒤 상품 권한 회수) 올리기·확정 모두 거절
  pc := qa_prop(P5, 'operator', S3);
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  r := mall_builder_photo_apply_begin(pc); reset role;
  xe := (r ->> 'apply_id')::uuid; nme := qa_name(xe, 'k1', SHA, S3);
  update mall_builder_store_staff set perms = '{}' where store_id = S and user_id = S3;
  ok := true;
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  begin perform qa_put(nme, 1000); ok := false; exception when insufficient_privilege then null; end;
  reset role;
  e := qa_fsig(xe, 'k1', SHA, 1000, ex, S3);
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  ok := ok and mall_builder_photo_apply_commit(xe, 'k1', SHA, 1000, ex, e, BASE || nme) ->> 'reason' = 'forbidden';
  reset role;
  update mall_builder_store_staff set perms = '{"products": true}' where store_id = S and user_id = S3;
  insert into qa_r values ('A19-role', ok);
  -- U4 슬롯 기한 지남 → 올리기 거절, 확정 gone
  update mall_builder_photo_apply_slots set until = now() - interval '1 second' where id = xe;
  ok := true;
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  begin perform qa_put(nme, 1000); ok := false; exception when insufficient_privilege then null; end;
  ok := ok and mall_builder_photo_apply_commit(xe, 'k1', SHA, 1000, ex, e, BASE || nme) ->> 'reason' = 'gone';
  reset role;
  insert into qa_r select 'A20-U4expired', ok and status = 'expired' from mall_builder_photo_apply_slots where id = xe;

  -- ── 되돌리기(직원만, 대표사진이 그대로일 때만)
  perform set_config('request.jwt.claim.sub', U4::text, false); set role authenticated;
  ok := mall_builder_photo_apply_revert(pe) ->> 'reason' = 'forbidden'; reset role;
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  r := mall_builder_photo_apply_revert(pa);
  ok := ok and r ->> 'state' = 'reverted' and mall_builder_photo_apply_revert(pa) ->> 'reason' = 'not_applied';
  reset role;
  insert into qa_r select 'A21-revert', ok and images = '[{"url": "https://x.test/old1.jpg"}, {"url": "https://x.test/old2.jpg"}]'::jsonb
    and (select status = 'reverted' from mall_builder_photo_proposals where id = pa)
    and (select count(*) = 1 from storage.objects where bucket_id = 'mall-builder-applied' and name = nm) from mall_builder_products where id = P1;
  -- 적용 뒤 대표사진을 다른 것으로 바꿨으면 되돌리기 conflict
  update mall_builder_products set images = jsonb_set(images, '{0}', '{"url": "https://x.test/manual.jpg"}') where id = P2;
  perform set_config('request.jwt.claim.sub', S3::text, false); set role authenticated;
  r := mall_builder_photo_apply_revert(pe); reset role;
  insert into qa_r select 'A22-revert-conflict', r ->> 'reason' = 'conflict' and images -> 0 ->> 'url' = 'https://x.test/manual.jpg' from mall_builder_products where id = P2;
end $$;

select k || E'\t' || case when ok then 't' when not ok then 'f' else 'n' end from public.qa_r order by k;
