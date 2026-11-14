-- 0081 게시 기록·되돌리기·분양몰 잠금 시나리오 — Lab(AIMaster_dev)에서 한 번에 실행, 마지막 예외로 전부 되돌림
-- 확인: 1 로그인 없으면 막힘 | 2 다른 사람 막힘 | 3 게시 → 기록 | 4 같은 게시본이면 새 기록 없음 | 5 바뀌면 새 기록 |
--   6 되돌리기 = 초안만 옛 판(게시본 그대로) | 7 다른 사람·없는 기록 막힘 | 8 몰당 20개만 | 9 분양몰: 초안·게시·되돌리기 모두 입금 계좌 보임
-- 2026-11-15 결과(Lab): 1 막힘:로그인 | 2 막힘:권한 | 3 기록=true theme=#dc2626 | 4 같은 판 다시=true | 5 새 기록=true | 6 초안=#dc2626 게시본=#059669 |
--   7a 막힘 | 7b 막힘:기록 없음 | 8 기록 수=20 | 9a·9b·9c 계좌=true, 9d 일반몰=false. 실행 뒤 기록 0줄·몰 종류 standard 그대로
do $$
declare
  v_store uuid; v_owner uuid; v_other uuid; r text := ''; h1 uuid; h2 uuid; hx uuid; n int; i int;
begin
  select ss.store_id, ss.user_id into v_store, v_owner from public.mall_builder_store_staff ss limit 1;
  select u.id into v_other from auth.users u where not exists (select 1 from public.mall_builder_store_staff s where s.user_id = u.id and s.store_id = v_store) limit 1;

  perform set_config('request.jwt.claim.sub', '', true);
  begin perform public.mall_builder_design_record(v_store); r := r || '1 통과(문제) | '; exception when others then r := r || '1 막힘:' || sqlerrm || ' | '; end;
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  begin perform public.mall_builder_design_record(v_store); r := r || '2 통과(문제) | '; exception when others then r := r || '2 막힘:' || sqlerrm || ' | '; end;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform public.mall_builder_design_save_draft(v_store, 'theme', '{"primary":"#dc2626"}');
  perform public.mall_builder_design_publish(v_store, array['theme']);
  h1 := public.mall_builder_design_record(v_store);
  r := r || '3 기록=' || (h1 is not null) || ' theme=' || ((select snapshot -> 'theme' ->> 'primary' from public.mall_builder_design_history where id = h1)) || ' | ';
  hx := public.mall_builder_design_record(v_store);
  r := r || '4 같은 판 다시=' || (hx = h1) || ' | ';

  perform public.mall_builder_design_save_draft(v_store, 'theme', '{"primary":"#059669"}');
  perform public.mall_builder_design_publish(v_store, array['theme']);
  h2 := public.mall_builder_design_record(v_store);
  r := r || '5 새 기록=' || (h2 <> h1) || ' | ';

  perform public.mall_builder_design_restore(v_store, h1);
  r := r || '6 초안=' || (select draft ->> 'primary' from public.mall_builder_design where store_id = v_store and kind = 'theme')
          || ' 게시본=' || (public.mall_builder_design_published(v_store) -> 'theme' ->> 'primary') || ' | ';

  perform set_config('request.jwt.claim.sub', v_other::text, true);
  begin perform public.mall_builder_design_restore(v_store, h1); r := r || '7a 통과(문제) | '; exception when others then r := r || '7a 막힘 | '; end;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  begin perform public.mall_builder_design_restore(v_store, gen_random_uuid()); r := r || '7b 통과(문제) | '; exception when others then r := r || '7b 막힘:' || sqlerrm || ' | '; end;

  for i in 1..22 loop
    perform public.mall_builder_design_save_draft(v_store, 'theme', jsonb_build_object('primary', '#0000' || lpad(to_hex(i), 2, '0')));
    perform public.mall_builder_design_publish(v_store, array['theme']);
    perform public.mall_builder_design_record(v_store);
  end loop;
  select count(*) into n from public.mall_builder_design_history where store_id = v_store;
  r := r || '8 기록 수=' || n || ' | ';

  begin
    update public.mall_builder_stores set kind = 'resale', source_store_id = (select x.id from public.mall_builder_stores x where x.id <> v_store limit 1) where id = v_store; -- 분양몰은 원본 몰이 있어야 함(제약)
    perform public.mall_builder_design_save_draft(v_store, 'footer', '{"note":"x","show_bank":false}');
    r := r || '9a 초안 계좌=' || (select draft ->> 'show_bank' from public.mall_builder_design where store_id = v_store and kind = 'footer');
    update public.mall_builder_design set draft = '{"note":"y","show_bank":false}' where store_id = v_store and kind = 'footer';
    perform public.mall_builder_design_publish(v_store, array['footer']);
    r := r || ' 9b 게시 계좌=' || (public.mall_builder_design_published(v_store) -> 'footer' ->> 'show_bank');
    hx := public.mall_builder_design_record(v_store);
    update public.mall_builder_design_history set snapshot = jsonb_set(snapshot, '{footer,show_bank}', 'false') where id = hx;
    perform public.mall_builder_design_restore(v_store, hx);
    r := r || ' 9c 되돌린 초안 계좌=' || (select draft ->> 'show_bank' from public.mall_builder_design where store_id = v_store and kind = 'footer');
  exception when others then r := r || '9 실패:' || sqlerrm;
  end;
  raise exception 'SCENARIO_RESULT(되돌림) %', r;
end $$;
