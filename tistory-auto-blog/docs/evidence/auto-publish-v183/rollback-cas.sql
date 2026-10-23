-- Production ref esgxyikcnnvmlhygjkth. Own synthetic post13 only; transaction is rolled back.
-- Tests SQL JSONB owner/run/state predicates, not member RLS or live publishing.
begin;
do $$
declare n integer;
begin
  update public.tistory_posts set tistory_run_id='11111111-1111-4111-8111-111111111183',tistory_input_status='completed',
    tistory_publish='{"automation":{"mode":"auto","state":"queued"}}'::jsonb
  where id=13 and user_id='4a82ff77-97f7-474d-866e-8e9431858ed3' and extension_handoff_at is null and tistory_run_id is null;
  get diagnostics n=row_count; if n<>1 then raise exception 'fixture changed; abort';end if;
  update public.tistory_posts set tistory_publish=jsonb_set(tistory_publish,'{automation,state}','"publishing"')
  where id=13 and user_id='4a82ff77-97f7-474d-866e-8e9431858ed3' and tistory_run_id='11111111-1111-4111-8111-111111111183'
    and tistory_publish->'automation'->>'state'='queued' and created_at>=now()-interval '30 days';
  get diagnostics n=row_count; if n<>1 then raise exception 'first arm failed';end if;
  update public.tistory_posts set tistory_publish=jsonb_set(tistory_publish,'{automation,state}','"publishing"')
  where id=13 and user_id='4a82ff77-97f7-474d-866e-8e9431858ed3' and tistory_run_id='11111111-1111-4111-8111-111111111183'
    and tistory_publish->'automation'->>'state'='queued';
  get diagnostics n=row_count; if n<>0 then raise exception 'duplicate arm allowed';end if;
  update public.tistory_posts set tistory_publish=jsonb_set(tistory_publish,'{automation,state}','"published"')
  where id=13 and user_id='00000000-0000-4000-8000-000000000000' and tistory_run_id='11111111-1111-4111-8111-111111111183';
  get diagnostics n=row_count; if n<>0 then raise exception 'wrong owner matched';end if;
  update public.tistory_posts set tistory_publish=jsonb_set(tistory_publish,'{automation,state}','"published"')
  where id=13 and user_id='4a82ff77-97f7-474d-866e-8e9431858ed3' and tistory_run_id='22222222-2222-4222-8222-222222222183';
  get diagnostics n=row_count; if n<>0 then raise exception 'wrong run matched';end if;
  update public.tistory_posts set tistory_publish=jsonb_set(tistory_publish,'{automation,state}','"published"')
  where id=13 and user_id='4a82ff77-97f7-474d-866e-8e9431858ed3' and tistory_run_id='11111111-1111-4111-8111-111111111183'
    and tistory_publish->'automation'->>'state'='publishing' and created_at>=now()-interval '30 days';
  get diagnostics n=row_count; if n<>1 then raise exception 'result receipt failed';end if;
end $$;
select id,tistory_publish->'automation'->>'state' as rollback_only_state from public.tistory_posts where id=13 and user_id='4a82ff77-97f7-474d-866e-8e9431858ed3';
rollback;
select id,extension_handoff_at is null and tistory_run_id is null and tistory_publish is null as original_restored from public.tistory_posts where id=13 and user_id='4a82ff77-97f7-474d-866e-8e9431858ed3';
