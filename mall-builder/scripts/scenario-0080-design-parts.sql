-- 0080 디자인 조각(테마·헤더·바닥글…) 초안/게시 시나리오 — Lab(AIMaster_dev)에서 한 번에 실행, 마지막 예외로 전부 되돌림
-- 2026-11-14 결과(예외 메시지): 1 게시 전={} | 2 막힘:로그인 | 3 막힘:권한 | 4a·4b·4c 막힘(종류·배열·크기) | 5 막힘:초안 없음 |
--   6 초안만={} | 7 게시수=1 theme만 보임 | 8 초안 고쳐도 게시본 그대로, 다른 사람 게시 막힘 | 9 전부 게시수=2. 실행 뒤 표 0줄.
do $$
declare
  v_store uuid; v_owner uuid; v_other uuid; r text := ''; n int;
begin
  select ss.store_id, ss.user_id into v_store, v_owner from public.mall_builder_store_staff ss limit 1;
  select u.id into v_other from auth.users u where not exists (select 1 from public.mall_builder_store_staff s where s.user_id = u.id and s.store_id = v_store) limit 1;
  perform set_config('request.jwt.claim.sub', '', true);
  r := r || '1 게시 전=' || public.mall_builder_design_published(v_store)::text || ' | ';
  begin perform public.mall_builder_design_save_draft(v_store, 'theme', '{"primary":"#dc2626"}'); r := r || '2 통과(문제) | ';
  exception when others then r := r || '2 막힘:' || sqlerrm || ' | '; end;
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  begin perform public.mall_builder_design_save_draft(v_store, 'theme', '{"primary":"#dc2626"}'); r := r || '3 통과(문제) | ';
  exception when others then r := r || '3 막힘:' || sqlerrm || ' | '; end;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  begin perform public.mall_builder_design_save_draft(v_store, 'home', '{}'); r := r || '4a 통과(문제) | '; exception when others then r := r || '4a 막힘 | '; end;
  begin perform public.mall_builder_design_save_draft(v_store, 'theme', '[]'); r := r || '4b 통과(문제) | '; exception when others then r := r || '4b 막힘 | '; end;
  begin perform public.mall_builder_design_save_draft(v_store, 'theme', jsonb_build_object('x', repeat('a', 21000))); r := r || '4c 통과(문제) | '; exception when others then r := r || '4c 막힘 | '; end;
  begin perform public.mall_builder_design_publish(v_store, null); r := r || '5 통과(문제) | '; exception when others then r := r || '5 막힘:' || sqlerrm || ' | '; end;
  perform public.mall_builder_design_save_draft(v_store, 'theme', '{"primary":"#dc2626","button":"flat"}');
  perform public.mall_builder_design_save_draft(v_store, 'footer', '{"note":"x"}');
  r := r || '6 초안만=' || public.mall_builder_design_published(v_store)::text || ' | ';
  n := public.mall_builder_design_publish(v_store, array['theme']);
  r := r || '7 게시수=' || n || ' 보임=' || public.mall_builder_design_published(v_store)::text || ' | ';
  perform public.mall_builder_design_save_draft(v_store, 'theme', '{"primary":"#059669"}');
  r := r || '8 게시본=' || (public.mall_builder_design_published(v_store) -> 'theme')::text || ' | ';
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  begin perform public.mall_builder_design_publish(v_store, null); r := r || '8b 통과(문제) | '; exception when others then r := r || '8b 막힘 | '; end;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  n := public.mall_builder_design_publish(v_store, null);
  r := r || '9 전부 게시수=' || n || ' 보임=' || public.mall_builder_design_published(v_store)::text;
  raise exception 'SCENARIO_RESULT(되돌림) %', r;
end $$;
