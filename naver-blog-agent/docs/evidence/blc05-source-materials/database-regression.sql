-- Synthetic DB regression. Every insert/update/delete is rolled back.
begin;
insert into public.nba_collected_materials(id,user_id,created_at,expires_at,updated_at,candidate) values
('00000000-0000-4000-8000-000000000051','4a82ff77-97f7-474d-866e-8e9431858ed3',now(),now()+interval '30 days',now(),'{"title":"synthetic original","source":{"text":"immutable fixture"}}'),
('00000000-0000-4000-8000-000000000052','4a82ff77-97f7-474d-866e-8e9431858ed3',now()-interval '31 days',now()-interval '1 day',now(),'{"title":"expired synthetic"}'),
('00000000-0000-4000-8000-000000000053','4a82ff77-97f7-474d-866e-8e9431858ed3',now(),now()+interval '30 days',now(),'{"title":"second synthetic"}');
do $$ declare original public.nba_collected_materials; changes jsonb; rejected boolean:=false; begin
  select * into original from public.nba_collected_materials where id='00000000-0000-4000-8000-000000000051';
  changes=jsonb_build_array(jsonb_build_object('id',original.id,'revision',original.updated_at,'fields',jsonb_build_object('title','edited synthetic')),
    jsonb_build_object('id','00000000-0000-4000-8000-000000000053','revision',now()-interval '1 second','delete',true));
  begin perform public.nba_edit_collected_materials(original.user_id,changes); exception when others then rejected=true; end;
  assert rejected, 'stale edit should reject';
  assert (select candidate->>'title'='synthetic original' from public.nba_collected_materials where id=original.id), 'partial batch edit escaped rollback';
  rejected=false;
  begin perform public.nba_edit_collected_materials('00000000-0000-4000-8000-000000000099',jsonb_build_array(jsonb_build_object('id',original.id,'revision',original.updated_at,'delete',true))); exception when others then rejected=true; end;
  assert rejected, 'foreign owner should reject';
  perform public.nba_edit_collected_materials(original.user_id,jsonb_build_array(jsonb_build_object('id',original.id,'revision',original.updated_at,'fields',jsonb_build_object('title','edited synthetic','is_archived',true))));
  assert (select created_at=original.created_at and expires_at=original.expires_at and candidate->'source'=original.candidate->'source' and candidate->>'title'='edited synthetic' from public.nba_collected_materials where id=original.id), 'edit changed provenance or lifetime';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','4a82ff77-97f7-474d-866e-8e9431858ed3',true);
do $$ declare rejected boolean:=false; begin
  assert (select count(*)=2 from public.nba_collected_materials where id in ('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000052','00000000-0000-4000-8000-000000000053')), 'own read or expiry RLS failed';
  begin update public.nba_collected_materials set expires_at=now()+interval '40 days'; exception when insufficient_privilege then rejected=true; end;
  assert rejected, 'direct client write unexpectedly allowed';
  assert not has_function_privilege(current_user,'public.nba_edit_collected_materials(uuid,jsonb)','execute'), 'client RPC permission unexpectedly granted';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ begin assert (select count(*)=0 from public.nba_collected_materials), 'foreign member can see source'; end $$;
reset role;
delete from public.nba_collected_materials where expires_at <= now();
do $$ begin assert (select count(*)=2 from public.nba_collected_materials where id in ('00000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000052','00000000-0000-4000-8000-000000000053')), 'expiry cleanup removed unexpired archived source'; end $$;
rollback;
