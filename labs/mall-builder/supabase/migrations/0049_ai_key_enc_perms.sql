-- D29 AI 도우미 — 몰 대표 키 암호문 꺼내기를 쓰는 메뉴 권한으로 넓힘
-- 견적 보조(주문) + 상품 등록 도우미·마진 점검(상품) + 문의 답변 초안(게시판) + 첫 화면 자동 구성(첫 화면)
-- 여전히 원래 키가 아니라 서버만 풀 수 있는 암호문만 돌려준다(풀 열쇠는 서버 환경변수 MALL_SECRET_KEY)
create or replace function public.mall_builder_ai_key_enc(p_store_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when public.mall_builder_staff_can(p_store_id, 'orders')
                or public.mall_builder_staff_can(p_store_id, 'products')
                or public.mall_builder_staff_can(p_store_id, 'boards')
                or public.mall_builder_staff_can(p_store_id, 'home') then
    (select nullif(s.ai_key_enc, '') from public.mall_builder_store_scheduler_secrets s where s.store_id = p_store_id)
  end
$$;
