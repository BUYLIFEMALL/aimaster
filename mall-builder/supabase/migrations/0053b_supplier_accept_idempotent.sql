-- AI 쇼핑몰 빌더 D34 보완 — 공급사 초대 수락을 「다시 열어도 같은 결과」로
-- 증상(2026-11-11 Lab 실제 확인): 수락은 성공했는데 수락 화면이 한 번 더 불리면서(로그인 뒤 이동·새로고침) 지워진 링크로 다시 수락 → 「쓸 수 없는 초대 링크」가 보임.
-- 해결: 수락 뒤에도 링크 해시를 남기고, 같은 사람이 다시 열면 그 몰 주소를 돌려준다. 다른 사람이면 「이미 사용한 초대 링크」.
-- AIMaster_dev(ref rjjtjakljjxsgjelqgek)에만. 함수 교체만(drop 없음).

create or replace function public.mall_builder_supplier_accept(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.mall_builder_suppliers%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_slug text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into s from public.mall_builder_suppliers x
   where x.invite_token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if s.id is null or s.status = 'revoked' then raise exception '쓸 수 없는 초대 링크입니다.'; end if;
  select st.slug into v_slug from public.mall_builder_stores st where st.id = s.store_id;
  -- 이미 수락한 본인이 다시 열면 그대로 그 몰로
  if s.status in ('active', 'paused') then
    if s.user_id = auth.uid() then return jsonb_build_object('slug', v_slug, 'again', true); end if;
    raise exception '이미 사용한 초대 링크입니다.';
  end if;
  if s.invite_expires_at <= now() then raise exception '초대 링크 기간(7일)이 지났습니다. 몰 운영자에게 다시 요청해 주세요.'; end if;
  if v_email <> lower(s.email) then
    raise exception '초대받은 이메일(%)로 로그인해 주세요.', left(s.email, 2) || '***@' || split_part(s.email, '@', 2);
  end if;
  if public.mall_builder_is_store_staff(s.store_id) then raise exception '이 몰의 운영자 계정은 공급사로 입점할 수 없습니다. 다른 계정으로 로그인해 주세요.'; end if;
  if exists (select 1 from public.mall_builder_suppliers x where x.store_id = s.store_id and x.user_id = auth.uid() and x.id <> s.id) then
    raise exception '이 계정은 이미 이 몰의 공급사입니다.';
  end if;
  -- 링크 해시는 남긴다(다시 열어도 같은 결과). 기간만 지움
  update public.mall_builder_suppliers
     set user_id = auth.uid(), status = 'active', accepted_at = now(), invite_expires_at = null, updated_at = now()
   where id = s.id;
  perform mall_builder_private.staff_log(s.store_id, 'supplier_accept', 'email', s.email, s.name);
  return jsonb_build_object('slug', v_slug);
end;
$$;
