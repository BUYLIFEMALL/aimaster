-- 2026-11-17 TAP-20261117-02(Master 배정, Workspace WS-20261117-01 §3-1): 네이버 수집 대기열 중복 등록 방지.
-- 문제: 링크 추가는 「조회 → 넣기」, 등록은 「ready 읽기 → 상품 넣기 → 대기열 갱신」이라 동시 요청·중간 실패 때 같은 링크 줄·같은 상품이 2건 생길 수 있었다.
-- 바꾼 것: (1) 대기열에 회원+링크 고유, 상품 연결 고유 (2) 등록은 아래 함수 한 번 = 한 트랜잭션(선점·상품 넣기·상품 번호 기록이 함께 되거나 함께 취소).
-- 회원 권한: 함수는 security invoker — 호출한 회원의 RLS 그대로(본인 대기열·본인 상품만). 다른 회원 행은 보이지도 않는다.
-- 이미 있는 중복은 지우거나 합치지 않는다 — 있으면 아래 사전 점검이 멈추고, 정리는 회원 확인 뒤 별도로 한다.

-- [사전 점검] 고유 제약을 걸기 전에 기존 중복이 있는지 본다
do $$
declare v_url integer; v_prod integer;
begin
  select count(*) into v_url from (select 1 from public.tap_collect_queue group by user_id, affiliate_url having count(*) > 1) d;
  select count(*) into v_prod from (select 1 from public.tap_collect_queue where product_id is not null group by product_id having count(*) > 1) d;
  if v_url > 0 or v_prod > 0 then
    raise exception '[멈춤] 네이버 수집 대기열에 이미 중복이 있습니다(같은 회원·같은 링크 %묶음, 같은 상품에 연결된 줄 %묶음). 지우거나 합치지 않았습니다 — 회원 확인 뒤 정리하고 다시 실행하세요.', v_url, v_prod;
  end if;
end $$;

-- 같은 회원이 같은 링크를 두 번 넣지 못하게(링크 추가는 on conflict do nothing으로 건너뜀)
create unique index if not exists tap_collect_queue_user_url_uniq on public.tap_collect_queue (user_id, affiliate_url);
-- 한 상품은 대기열 한 줄에만 연결(글 생성 근거 조회가 한 줄을 기대함)
create unique index if not exists tap_collect_queue_product_uniq on public.tap_collect_queue (product_id) where product_id is not null;

-- 「준비됨」 항목을 상품으로 등록. p_items = [{"id": 대기열 id, "final_url": 서버가 다시 검사한 도착 주소}, …] 최대 30개.
-- 항목마다: ready이고 final_url이 서버가 검사한 값과 같을 때만 registered로 선점(행 잠금 — 동시에 온 두 번째 요청은 기다렸다가 조건이 안 맞아 건너뜀)
--         → 상품 넣기 → 대기열에 상품 번호 기록. 중간에 실패하면 그 항목만 통째로 되돌린다(대기열은 ready 그대로, 상품 없음).
create or replace function public.tap_register_collected(p_items jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  it jsonb;
  v_id uuid;
  v_aff text;
  v_final text;
  v_name text;
  v_images jsonb;
  v_pid uuid;
  v_ins integer := 0;
  v_skip integer := 0;
  v_fail integer := 0;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception '등록할 항목 목록이 올바르지 않습니다.'; end if;
  if jsonb_array_length(p_items) > 30 then raise exception '한 번에 30개까지 등록할 수 있습니다.'; end if;
  for it in select value from jsonb_array_elements(p_items) loop
    begin
      update public.tap_collect_queue t
         set status = 'registered', error = null, updated_at = now()
       where t.id = (it ->> 'id')::uuid
         and t.user_id = v_uid
         and t.status = 'ready'
         and t.product_name is not null
         and t.final_url is not null
         and t.final_url = (it ->> 'final_url')
      returning t.id, t.affiliate_url, t.final_url, t.product_name, t.image_urls
        into v_id, v_aff, v_final, v_name, v_images;
      if not found then
        v_skip := v_skip + 1;
        continue;
      end if;
      insert into public.affiliate_products (user_id, platform, product_name, product_url, affiliate_url, image_url, input_mode)
      values (v_uid, 'naver', v_name, v_final, v_aff, nullif(v_images ->> 0, ''), 'manual')
      returning id into v_pid;
      update public.tap_collect_queue set product_id = v_pid where id = v_id and user_id = v_uid;
      v_ins := v_ins + 1;
    exception when others then
      -- 이 항목만 되돌림(선점·상품 넣기 모두 취소). 결과가 불확실한 상태로 남기지 않는다
      v_fail := v_fail + 1;
    end;
  end loop;
  return jsonb_build_object('inserted', v_ins, 'skipped', v_skip, 'failed', v_fail);
end;
$$;
revoke all on function public.tap_register_collected(jsonb) from public, anon;
grant execute on function public.tap_register_collected(jsonb) to authenticated;
