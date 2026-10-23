-- Real PostgreSQL policies/retention, synthetic rows only. All writes rolled back.
begin;
select set_config('yvs.test_member',(select id::text from auth.users where email='buylifemall@naver.com'),true);
select set_config('yvs.test_other',(select id::text from auth.users where email='buylifemall@gmail.com'),true);
insert into public.yvs_favorites(user_id,item_type,item_id,payload,created_at) values
  (current_setting('yvs.test_member')::uuid,'video','yvs_rls_fresh','{}',now()),
  (current_setting('yvs.test_other')::uuid,'video','yvs_rls_other','{}',now()),
  (current_setting('yvs.test_member')::uuid,'video','yvs_rls_boundary','{}',now()-interval '30 days');
select set_config('request.jwt.claim.sub',current_setting('yvs.test_member'),true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.yvs_favorites where item_id like 'yvs_rls_%') <> 1 then raise exception 'RLS owner or expiry filter failed'; end if;
  begin
    insert into public.yvs_favorites(user_id,item_type,item_id,payload) values(current_setting('yvs.test_other')::uuid,'video','yvs_rls_intruder','{}');
    raise exception 'Cross-owner insert unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.yvs_favorites set created_at=now() where item_id='yvs_rls_fresh';
    raise exception 'Retention extension unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  delete from public.yvs_favorites where item_id='yvs_rls_other';
end $$;
reset role;
do $$ begin
  if not exists(select 1 from public.yvs_favorites where item_id='yvs_rls_other') then raise exception 'Other member row was deleted'; end if;
  perform public.cleanup_yvs_expired_favorites();
  if exists(select 1 from public.yvs_favorites where item_id='yvs_rls_boundary') then raise exception 'Expired row not physically deleted'; end if;
  if (select count(*) from public.yvs_favorites where item_id in ('yvs_rls_fresh','yvs_rls_other')) <> 2 then raise exception 'Fresh rows not preserved'; end if;
  if has_function_privilege('authenticated','public.cleanup_yvs_expired_favorites()','execute') then raise exception 'Member can execute global cleanup'; end if;
end $$;
select jsonb_build_object('owner_select',true,'cross_owner_insert_blocked',true,'cross_owner_delete_blocked',true,'retention_extension_blocked',true,'expiry_read_boundary',true,'physical_cleanup',true,'fresh_rows_preserved',true,'cleanup_not_member_callable',true,'rolled_back',true) as checks;
rollback;
