-- 0095 「내 섹션」 시나리오 D1~D6 (2026-11-15 Lab 통과). 마지막에 결과를 담아 일부러 오류로 끝내 전부 되돌린다(데이터 남지 않음)
-- 쓰는 법: 아래 세 값을 Lab의 실제 값으로 바꿔 실행 — owner = 그 몰 운영사, other = 그 몰 직원이 아닌 계정, store = 몰 id
do $$
declare
  owner uuid := '052cb2dd-5323-40cd-a61a-fc83830e97b8';
  other uuid := '7c0be9c6-94ba-492d-b928-f86a038afdd4';
  retail uuid := '212122dc-2beb-49de-b8db-91c03fe922a9';
  sid uuid; r text := ''; n int; blk jsonb := '[{"id":"notice-a","type":"notice","visible":true,"settings":{"title":"공지","count":5}}]';
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
  sid := public.mall_builder_section_save(retail, '  명절 묶음 ', blk);
  select count(*) into n from public.mall_builder_sections where id = sid and name = '명절 묶음';
  r := r || 'D1 저장·이름다듬기=' || n || ' / ';
  begin perform public.mall_builder_section_save(retail, '많음', (select jsonb_agg(blk->0) from generate_series(1,11))); r := r || 'D2 실패(통과됨) / ';
  exception when others then r := r || 'D2 11개 거절 / '; end;
  perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
  select count(*) into n from public.mall_builder_sections; r := r || 'D3 남의것보임=' || n || ' / ';
  begin perform public.mall_builder_section_delete(sid); r := r || 'D4 실패(지워짐) / ';
  exception when others then r := r || 'D4 남의것 지우기 거절 / '; end;
  begin perform public.mall_builder_section_save(retail, '침입', blk); r := r || 'D5 실패(저장됨) / ';
  exception when others then r := r || 'D5 직원아님 저장 거절 / '; end;
  perform set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
  perform public.mall_builder_section_delete(sid);
  select count(*) into n from public.mall_builder_sections where id = sid; r := r || 'D6 본인 지우기 후 남음=' || n;
  raise exception '시나리오결과: %', r;
end $$;
-- 2026-11-15 Lab 결과: D1 저장·이름다듬기=1 / D2 11개 거절 / D3 남의것보임=0 / D4 남의것 지우기 거절 / D5 직원아님 저장 거절 / D6 본인 지우기 후 남음=0
