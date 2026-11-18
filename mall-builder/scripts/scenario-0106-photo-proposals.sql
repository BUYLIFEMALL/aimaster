-- 0106 메이커 M2 사진 제안 데이터 계층 시나리오(로컬 Docker 격리 DB 전용, 운영·Lab·외부망 0).
-- 실행기: node mall-builder/scripts/check-0106-local.mjs (0001~0106 적용한 새 DB에서 이 파일 → 두 세션 경합 시험).
-- 사람은 블록 안에서 회원 역할(authenticated)·비로그인(anon)으로 바꿔 실제 권한 규칙을 거친다(set role / reset role).
-- 저장소 업로드·삭제·읽기·고치기는 storage.objects에 직접 insert/delete/select/update로 흉내(실제 Supabase도 같은 표·같은 정책).
-- 결과는 qa_r 표 → 마지막에 「P번호 <탭> t/f/n」. 입력값·경로 원문은 출력하지 않는다.
\set ON_ERROR_STOP 1
create table public.qa_r (k text, ok boolean);
grant insert, select on public.qa_r to authenticated, anon;
-- 이 시나리오만 쓰는 고정 id
create table public.qa_ids (k text primary key, v uuid);
insert into public.qa_ids values
 ('S', '00000000-0000-0000-0000-00000000005a'), ('S2ST', '00000000-0000-0000-0000-00000000005b'), ('A1', '00000000-0000-0000-0000-0000000000a1'),
 ('S2', '00000000-0000-0000-0000-0000000000b2'), ('S3', '00000000-0000-0000-0000-0000000000b3'), ('U4', '00000000-0000-0000-0000-0000000000b4'),
 ('U5', '00000000-0000-0000-0000-0000000000b5'), ('C6', '00000000-0000-0000-0000-0000000000b6'), ('O7', '00000000-0000-0000-0000-0000000000b7'),
 ('P1', '00000000-0000-0000-0000-0000000000f1'), ('P2', '00000000-0000-0000-0000-0000000000f2'), ('P3', '00000000-0000-0000-0000-0000000000f3'),
 ('P4', '00000000-0000-0000-0000-0000000000f4'), ('SUP1', '00000000-0000-0000-0000-0000000005e1'), ('SUP2', '00000000-0000-0000-0000-0000000005e2');
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
insert into public.mall_builder_products (id, store_id, name, base_price) values (qa_id('P1'), qa_id('S'), '자체 상품', 1000), (qa_id('P4'), qa_id('S2ST'), '다른 몰 상품', 1000);
insert into public.mall_builder_products (id, store_id, name, base_price, supplier_id) values (qa_id('P2'), qa_id('S'), '공급사1 상품', 1000, qa_id('SUP1'));
insert into public.mall_builder_products (id, store_id, name, base_price, source_product_id) values (qa_id('P3'), qa_id('S'), '거울 상품', 1000, qa_id('P1'));
-- 저장소 흉내: 올리기(소유자 = 실제 Supabase처럼 호출자 — 소유자 위조 시험만 따로 지정)
create function public.qa_put(p_name text, p_size bigint, p_mime text default 'image/jpeg', p_owner text default null, p_bucket text default 'mall-builder-proposals') returns void language sql as $$
  insert into storage.objects (bucket_id, name, owner_id, metadata) values (p_bucket, p_name, coalesce(p_owner, auth.uid()::text),
    jsonb_build_object('size', p_size, 'mimetype', p_mime, 'eTag', '"e-' || md5(p_name) || '"')) $$;
create function public.qa_del(p_name text, p_bucket text default 'mall-builder-proposals') returns integer language sql as $$
  with d as (delete from storage.objects where bucket_id = p_bucket and name = p_name returning 1) select count(*)::int from d $$;
create function public.qa_see(p_name text, p_bucket text default 'mall-builder-proposals') returns integer language sql as $$
  select count(*)::int from storage.objects where bucket_id = p_bucket and name = p_name $$;
create function public.qa_touch(p_name text) returns integer language sql as $$
  with u as (update storage.objects set metadata = metadata || '{"size": 1}'::jsonb where bucket_id = 'mall-builder-proposals' and name = p_name returning 1) select count(*)::int from u $$;
grant execute on function public.qa_put(text, bigint, text, text, text), public.qa_del(text, text), public.qa_see(text, text), public.qa_touch(text) to authenticated, anon;

do $$
declare
  S uuid := qa_id('S'); P1 uuid := qa_id('P1'); P2 uuid := qa_id('P2'); P3 uuid := qa_id('P3'); P4 uuid := qa_id('P4');
  JOB uuid := '00000000-0000-4000-8000-000000000999';
  r jsonb; a_id uuid; a_path text; b_id uuid; b_path text; c_id uuid; c_path text; d_id uuid; d_path text;
  f_id uuid; f_path text; g_id uuid; g_path text; g2 jsonb; i_id uuid; i_path text; j_id uuid; j_path text;
  s_id uuid; s_path text; o_id uuid; n int; ok boolean;
  R1 uuid := '00000000-0000-4000-8000-000000000001'; R2 uuid := '00000000-0000-4000-8000-000000000002';
  R3 uuid := '00000000-0000-4000-8000-000000000003'; R4 uuid := '00000000-0000-4000-8000-000000000004';
  R5 uuid := '00000000-0000-4000-8000-000000000005'; R6 uuid := '00000000-0000-4000-8000-000000000006';
  R7 uuid := '00000000-0000-4000-8000-000000000007'; R8 uuid := '00000000-0000-4000-8000-000000000008';
  R9 uuid := '00000000-0000-4000-8000-000000000009'; R10 uuid := '00000000-0000-4000-8000-000000000010';
begin
  -- 사람 바꾸기: 관리자(postgres)에서 claim을 바꾼 뒤 set role authenticated, 끝나면 reset role
  -- P01 버킷
  insert into qa_r select 'P01', exists (select 1 from storage.buckets where id = 'mall-builder-proposals' and public = false and file_size_limit = 5242880 and allowed_mime_types = array['image/jpeg']);
  -- P02 기본 권한
  insert into qa_r select 'P02',
    not has_function_privilege('anon', 'public.mall_builder_photo_proposal_begin(uuid,uuid,uuid,uuid,text,text,text)', 'execute')
    and not has_function_privilege('anon', 'public.mall_builder_photo_proposal_commit(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.mall_builder_photo_proposal_abandon(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.mall_builder_photo_proposal_cleanup_list(uuid)', 'execute')
    and not has_function_privilege('public', 'public.mall_builder_photo_proposal_commit(uuid)', 'execute')
    and not has_function_privilege('anon', 'mall_builder_private.photo_proposal_object_ok(text,text)', 'execute')
    and not has_table_privilege('anon', 'public.mall_builder_photo_proposals', 'select')
    and not has_table_privilege('authenticated', 'public.mall_builder_photo_proposals', 'insert')
    and not has_table_privilege('authenticated', 'public.mall_builder_photo_proposals', 'update')
    and not has_table_privilege('authenticated', 'public.mall_builder_photo_proposals', 'delete')
    and has_table_privilege('authenticated', 'public.mall_builder_photo_proposals', 'select');

  -- P03 권한 없는 사람·대상 → forbidden(행 0)
  ok := true;
  declare u uuid; p uuid; begin
    for u, p in select * from (values (qa_id('S2'), P1), (qa_id('C6'), P1), (qa_id('U5'), P2), (qa_id('O7'), P1), (qa_id('S3'), P3), (qa_id('S3'), P4)) v(u, p) loop
      perform set_config('request.jwt.claim.sub', u::text, false); set role authenticated;
      r := mall_builder_photo_proposal_begin(S, p, JOB, R1, 'c2', '2026-11-19T00:00:00Z', 'h1');
      reset role;
      ok := ok and r = '{"ok": false, "reason": "forbidden"}'::jsonb;
    end loop;
  end;
  insert into qa_r values ('P03', ok and (select count(*) = 0 from mall_builder_photo_proposals));
  -- P04 비로그인
  begin
    set role anon; perform mall_builder_photo_proposal_begin(S, P1, JOB, R1, 'c2', 'x', ''); reset role;
    insert into qa_r values ('P04', false);
  exception when insufficient_privilege then reset role; insert into qa_r values ('P04', true); end;

  -- P05 상품 권한 직원 예약
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R1, 'c2', '2026-11-19T00:00:00Z', 'h1'); reset role;
  a_id := (r ->> 'id')::uuid; a_path := r ->> 'path';
  insert into qa_r select 'P05', r ->> 'state' = 'upload' and a_path = S::text || '/' || a_id::text || '.jpg'
    and exists (select 1 from mall_builder_photo_proposals where id = a_id and status = 'reserved' and origin = 'operator' and created_by = qa_id('S3'));

  -- P06 제안 행 보기
  for r in select jsonb_build_object('u', v.u, 'want', v.w) from (values ('S2', 0), ('C6', 0), ('U4', 0), ('U5', 0), ('O7', 0), ('A1', 1), ('S3', 1)) v(u, w) loop
    perform set_config('request.jwt.claim.sub', qa_id(r ->> 'u')::text, false); set role authenticated;
    select count(*) into n from mall_builder_photo_proposals where id = a_id; reset role;
    insert into qa_r values ('P06-' || (r ->> 'u'), n = (r ->> 'want')::int);
  end loop;

  -- P07 올리기 정책
  for r in select jsonb_build_object('u', v.u) from (values ('S2'), ('U4'), ('C6'), ('A1')) v(u) loop
    begin
      perform set_config('request.jwt.claim.sub', qa_id(r ->> 'u')::text, false); set role authenticated;
      perform qa_put(a_path, 1000); reset role;
      insert into qa_r values ('P07-' || (r ->> 'u'), false);
    exception when insufficient_privilege then reset role; insert into qa_r values ('P07-' || (r ->> 'u'), true); end;
  end loop;
  begin -- 예약자가 남의 경로(아무 경로)에
    perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
    perform qa_put(S::text || '/' || gen_random_uuid()::text || '.jpg', 1000); reset role;
    insert into qa_r values ('P07-other-path', false);
  exception when insufficient_privilege then reset role; insert into qa_r values ('P07-other-path', true); end;
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  perform qa_put(a_path, 123456); reset role;
  insert into qa_r select 'P07-own', (select count(*) = 1 from storage.objects where bucket_id = 'mall-builder-proposals' and name = a_path and owner_id = qa_id('S3')::text);
  begin
    perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
    perform qa_put(a_path, 999); reset role;
    insert into qa_r values ('P07-twice', false);
  exception when unique_violation or insufficient_privilege then reset role; insert into qa_r values ('P07-twice', true); end;
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  n := qa_touch(a_path); reset role;
  insert into qa_r values ('P07-no-update', n = 0 and (select (metadata ->> 'size')::int = 123456 from storage.objects where bucket_id = 'mall-builder-proposals' and name = a_path));

  -- P08 파일 읽기: 상품 권한 직원·대표만
  for r in select jsonb_build_object('u', v.u, 'want', v.w) from (values ('S2', 0), ('C6', 0), ('U4', 0), ('O7', 0), ('A1', 1), ('S3', 1)) v(u, w) loop
    perform set_config('request.jwt.claim.sub', qa_id(r ->> 'u')::text, false); set role authenticated;
    n := qa_see(a_path); reset role;
    insert into qa_r values ('P08-' || (r ->> 'u'), n = (r ->> 'want')::int);
  end loop;
  set role anon; n := qa_see(a_path); reset role;
  insert into qa_r values ('P08-anon', n = 0);

  -- P09 확정: 예약자 아닌 대표 → forbidden, 예약자 → done, 다시 → done
  perform set_config('request.jwt.claim.sub', qa_id('A1')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_commit(a_id); reset role;
  insert into qa_r values ('P09-not-reserver', r = '{"ok": false, "reason": "forbidden"}'::jsonb);
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_commit(a_id); g2 := mall_builder_photo_proposal_commit(a_id); reset role;
  insert into qa_r select 'P09', r = '{"ok": true, "state": "done"}'::jsonb and g2 = r
    and exists (select 1 from mall_builder_photo_proposals where id = a_id and status = 'proposed' and object_size = 123456 and object_etag like '"e-%');

  -- P10 확정 파일: 누구도 못 지움, 포기도 거절
  for r in select jsonb_build_object('u', v.u) from (values ('S3'), ('A1'), ('S2')) v(u) loop
    perform set_config('request.jwt.claim.sub', qa_id(r ->> 'u')::text, false); set role authenticated;
    n := qa_del(a_path); reset role;
    insert into qa_r values ('P10-del-' || (r ->> 'u'), n = 0);
  end loop;
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_abandon(a_id); reset role;
  insert into qa_r select 'P10-abandon', r = '{"ok": false, "reason": "committed"}'::jsonb
    and exists (select 1 from mall_builder_photo_proposals where id = a_id and status = 'proposed') and qa_see(a_path) = 1;

  -- P11 같은 결과 번호: 예약자·다른 권한자 → done(경로 없음), 권한 없는 직원 → forbidden, 다른 원본 지문 → conflict
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R1, 'c2', '2026-11-19T00:00:00Z', 'h1');
  g2 := mall_builder_photo_proposal_begin(S, P1, JOB, R1, 'c2', '2026-11-19T00:00:00Z', 'h-other'); reset role;
  insert into qa_r values ('P11-same', r = '{"ok": true, "state": "done"}'::jsonb);
  insert into qa_r values ('P11-conflict', g2 = '{"ok": false, "reason": "conflict"}'::jsonb);
  perform set_config('request.jwt.claim.sub', qa_id('A1')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R1, 'c2', '2026-11-19T00:00:00Z', 'h1'); reset role;
  insert into qa_r values ('P11-other-operator', r = '{"ok": true, "state": "done"}'::jsonb);
  perform set_config('request.jwt.claim.sub', qa_id('S2')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R1, 'c2', '2026-11-19T00:00:00Z', 'h1'); reset role;
  insert into qa_r values ('P11-no-perm', r = '{"ok": false, "reason": "forbidden"}'::jsonb);
  insert into qa_r select 'P11-one-live-row', (select count(*) = 1 from mall_builder_photo_proposals where result_id = R1);

  -- P12 확정 실패 경로: 파일 없음 / 형식 PNG / 5MB 초과 / 소유자 위조 → no_file, 상태 reserved 유지
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R2, 'c2', '2026-11-19T00:00:00Z', ''); b_id := (r ->> 'id')::uuid; b_path := r ->> 'path';
  g2 := mall_builder_photo_proposal_commit(b_id);
  insert into qa_r values ('P12-no-file', g2 = '{"ok": false, "reason": "no_file"}'::jsonb);
  perform qa_put(b_path, 1000, 'image/png');
  g2 := mall_builder_photo_proposal_commit(b_id);
  insert into qa_r values ('P12-png', g2 = '{"ok": false, "reason": "no_file"}'::jsonb);
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R3, 'c2', '2026-11-19T00:00:00Z', ''); c_id := (r ->> 'id')::uuid; c_path := r ->> 'path';
  perform qa_put(c_path, 5242881);
  g2 := mall_builder_photo_proposal_commit(c_id);
  insert into qa_r values ('P12-over-5mb', g2 = '{"ok": false, "reason": "no_file"}'::jsonb);
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R4, 'c2', '2026-11-19T00:00:00Z', ''); d_id := (r ->> 'id')::uuid; d_path := r ->> 'path';
  perform qa_put(d_path, 1000, 'image/jpeg', qa_id('A1')::text);
  g2 := mall_builder_photo_proposal_commit(d_id);
  insert into qa_r values ('P12-owner-spoof', g2 = '{"ok": false, "reason": "no_file"}'::jsonb);
  -- 예약 중 파일은 못 지움 → 포기 뒤에만 지움
  n := qa_del(b_path);
  insert into qa_r values ('P12-reserved-not-deletable', n = 0);
  r := mall_builder_photo_proposal_abandon(b_id);
  n := qa_del(b_path); reset role;
  insert into qa_r values ('P12-abandon-then-delete', r = '{"ok": true, "state": "abandoned"}'::jsonb and n = 1);
  insert into qa_r select 'P12-states', (select count(*) = 2 from mall_builder_photo_proposals where id in (c_id, d_id) and status = 'reserved');
  perform set_config('request.jwt.claim.sub', qa_id('S2')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_abandon(c_id); reset role;
  insert into qa_r values ('P12-abandon-by-other', r = '{"ok": false, "reason": "forbidden"}'::jsonb);

  -- P13 공급사 흐름: 본인 상품만, 운영자 제안은 못 봄, 남 공급사 0
  perform set_config('request.jwt.claim.sub', qa_id('U4')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P2, JOB, R5, 'c2', '2026-11-19T00:00:00Z', ''); s_id := (r ->> 'id')::uuid; s_path := r ->> 'path';
  perform qa_put(s_path, 2000);
  g2 := mall_builder_photo_proposal_commit(s_id); reset role;
  insert into qa_r select 'P13-supplier-commit', g2 = '{"ok": true, "state": "done"}'::jsonb
    and exists (select 1 from mall_builder_photo_proposals where id = s_id and origin = 'supplier' and supplier_id = qa_id('SUP1') and status = 'proposed');
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  n := (select count(*) from mall_builder_photo_proposals where id = s_id);
  r := mall_builder_photo_proposal_begin(S, P2, JOB, R6, 'c2', '2026-11-19T00:00:00Z', ''); o_id := (r ->> 'id')::uuid; reset role;
  insert into qa_r values ('P13-operator-sees-supplier', n = 1 and r ->> 'state' = 'upload');
  perform set_config('request.jwt.claim.sub', qa_id('U4')::text, false); set role authenticated;
  n := (select count(*) from mall_builder_photo_proposals where id = o_id);
  r := mall_builder_photo_proposal_begin(S, P2, JOB, R6, 'c2', '2026-11-19T00:00:00Z', ''); reset role;
  insert into qa_r values ('P13-supplier-not-operator-row', n = 0 and r = '{"ok": false, "reason": "forbidden"}'::jsonb);
  perform set_config('request.jwt.claim.sub', qa_id('U5')::text, false); set role authenticated;
  n := (select count(*) from mall_builder_photo_proposals where id = s_id) + qa_see(s_path); reset role;
  insert into qa_r values ('P13-other-supplier', n = 0);
  -- 공급사 비활성화 → 권한 즉시 사라짐(매번 재판정)
  update mall_builder_suppliers set status = 'paused' where id = qa_id('SUP1');
  perform set_config('request.jwt.claim.sub', qa_id('U4')::text, false); set role authenticated;
  n := (select count(*) from mall_builder_photo_proposals where id = s_id) + qa_see(s_path); reset role;
  insert into qa_r values ('P13-paused-supplier', n = 0);
  update mall_builder_suppliers set status = 'active' where id = qa_id('SUP1');

  -- P14 만료: 기한 안에 올린 파일은 기한 뒤 확정 가능 / 기한 뒤 올리기 거절 / 재예약은 새 id·새 경로, 옛 예약 확정 거절
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R7, 'c2', '2026-11-19T00:00:00Z', ''); f_id := (r ->> 'id')::uuid; f_path := r ->> 'path';
  perform qa_put(f_path, 3000); reset role;
  update storage.objects set created_at = now() - interval '5 minutes' where bucket_id = 'mall-builder-proposals' and name = f_path;
  update mall_builder_photo_proposals set reserved_until = now() - interval '1 minute' where id = f_id;
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_commit(f_id); reset role;
  insert into qa_r values ('P14-in-time-commit', r = '{"ok": true, "state": "done"}'::jsonb);
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R8, 'c2', '2026-11-19T00:00:00Z', ''); g_id := (r ->> 'id')::uuid; g_path := r ->> 'path'; reset role;
  update mall_builder_photo_proposals set reserved_until = now() - interval '1 minute' where id = g_id;
  begin
    perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
    perform qa_put(g_path, 1000); reset role;
    insert into qa_r values ('P14-late-upload', false);
  exception when insufficient_privilege then reset role; insert into qa_r values ('P14-late-upload', true); end;
  perform set_config('request.jwt.claim.sub', qa_id('A1')::text, false); set role authenticated;
  g2 := mall_builder_photo_proposal_begin(S, P1, JOB, R8, 'c2', '2026-11-19T00:00:00Z', ''); reset role;
  insert into qa_r select 'P14-rebegin', g2 ->> 'state' = 'upload' and (g2 ->> 'id')::uuid <> g_id and g2 ->> 'path' <> g_path
    and exists (select 1 from mall_builder_photo_proposals where id = g_id and status = 'abandoned');
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_commit(g_id); reset role;
  insert into qa_r values ('P14-old-commit', r = '{"ok": false, "reason": "gone"}'::jsonb);
  -- 남의 예약이 살아 있으면 busy, 파일·행 변경 0
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R8, 'c2', '2026-11-19T00:00:00Z', ''); reset role;
  insert into qa_r values ('P14-busy', r = '{"ok": false, "reason": "busy"}'::jsonb);

  -- P15 정리 목록: 지워도 되는 파일만(포기·만료 예약), 확정 파일·다른 버킷 0, 권한 없는 직원 0
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R9, 'c2', '2026-11-19T00:00:00Z', ''); i_id := (r ->> 'id')::uuid; i_path := r ->> 'path';
  perform qa_put(i_path, 1000); perform mall_builder_photo_proposal_abandon(i_id);
  r := mall_builder_photo_proposal_begin(S, P1, JOB, R10, 'c2', '2026-11-19T00:00:00Z', ''); j_id := (r ->> 'id')::uuid; j_path := r ->> 'path';
  perform qa_put(j_path, 1000); reset role;
  update mall_builder_photo_proposals set reserved_until = now() - interval '1 minute' where id = j_id;
  update storage.objects set created_at = now() - interval '20 minutes' where bucket_id = 'mall-builder-proposals' and name = j_path;
  perform set_config('request.jwt.claim.sub', qa_id('S2')::text, false); set role authenticated;
  n := (select count(*) from mall_builder_photo_proposal_cleanup_list(S)); reset role;
  insert into qa_r values ('P15-no-perm-empty', n = 0);
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  ok := (select array_agg(x order by x) from mall_builder_photo_proposal_cleanup_list(S) x) = (select array_agg(y order by y) from unnest(array[i_path, j_path]) y);
  reset role;
  insert into qa_r select 'P15-list', ok and exists (select 1 from mall_builder_photo_proposals where id = j_id and status = 'abandoned');
  perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
  n := qa_del(i_path) + qa_del(j_path) + qa_del(a_path) + qa_del(f_path); reset role;
  insert into qa_r values ('P15-delete-only-listed', n = 2 and qa_see(a_path) = 1 and qa_see(f_path) = 1);

  -- P16 표 직접 쓰기 → 권한 오류
  begin
    perform set_config('request.jwt.claim.sub', qa_id('S3')::text, false); set role authenticated;
    update mall_builder_photo_proposals set status = 'applied' where id = a_id; reset role;
    insert into qa_r values ('P16', false);
  exception when insufficient_privilege then reset role; insert into qa_r values ('P16', true); end;

  -- P17 기존 서류 버킷 회귀: 손님 본인 서류 올리기·읽기, 직원(상품 권한 없음) 읽기, 공급사·다른 손님 0
  perform set_config('request.jwt.claim.sub', qa_id('C6')::text, false); set role authenticated;
  perform qa_put(S::text || '/' || qa_id('C6')::text || '/cert.pdf', 1000, 'application/pdf', null, 'mall-builder-private');
  n := qa_see(S::text || '/' || qa_id('C6')::text || '/cert.pdf', 'mall-builder-private'); reset role;
  insert into qa_r values ('P17-customer-own', n = 1);
  perform set_config('request.jwt.claim.sub', qa_id('S2')::text, false); set role authenticated;
  n := qa_see(S::text || '/' || qa_id('C6')::text || '/cert.pdf', 'mall-builder-private'); reset role;
  insert into qa_r values ('P17-staff-read', n = 1);
  perform set_config('request.jwt.claim.sub', qa_id('U4')::text, false); set role authenticated;
  n := qa_see(S::text || '/' || qa_id('C6')::text || '/cert.pdf', 'mall-builder-private'); reset role;
  insert into qa_r values ('P17-supplier-no', n = 0);
  begin -- 손님이 제안 버킷에 올리기 → 거절
    perform set_config('request.jwt.claim.sub', qa_id('C6')::text, false); set role authenticated;
    perform qa_put(S::text || '/' || qa_id('C6')::text || '/x.jpg', 1000); reset role;
    insert into qa_r values ('P17-customer-no-proposals', false);
  exception when insufficient_privilege then reset role; insert into qa_r values ('P17-customer-no-proposals', true); end;
end $$;

select k || E'\t' || case when ok then 't' when not ok then 'f' else 'n' end from public.qa_r order by k;
