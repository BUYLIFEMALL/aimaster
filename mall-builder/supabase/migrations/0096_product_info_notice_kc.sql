-- AI 쇼핑몰 빌더 M2-4 — 상품정보제공고시·KC 인증 표시 (2026-11-15 docs/PLAN_20261114_B2B_MASTER.md M2-4)
-- 백엔드 DB 번호 0090~0099(0095는 프론트 「내 섹션」, 상호 인수인계 S60·S61).
-- 1) mall_builder_products.info_notice jsonb {type, items:[{label,value}]} — 공정위 고시 품목군과 항목(운영사가 채움, 앱이 서식·검사)
-- 2) mall_builder_products.kc_certs jsonb [{kind,no}] — KC 인증 구분·번호(최대 10, 「해당 없음」 한 줄 가능)
-- 3) 분양몰 거울 상품은 본사 상품의 두 값을 그대로 따른다(담을 때·본사가 바꿀 때). 기존 동기화 함수는 고치지 않고 트리거를 따로 둔다.
-- 지우기 없음(칸 추가·트리거 추가만).

alter table public.mall_builder_products add column if not exists info_notice jsonb not null default '{}'::jsonb;
alter table public.mall_builder_products add column if not exists kc_certs jsonb not null default '[]'::jsonb;

alter table public.mall_builder_products drop constraint if exists mall_builder_products_info_notice_check;
alter table public.mall_builder_products add constraint mall_builder_products_info_notice_check check (
  jsonb_typeof(info_notice) = 'object' and pg_column_size(info_notice) <= 20000
  and (info_notice = '{}'::jsonb or (jsonb_typeof(info_notice -> 'items') = 'array' and jsonb_array_length(info_notice -> 'items') <= 30))
);
alter table public.mall_builder_products drop constraint if exists mall_builder_products_kc_certs_check;
alter table public.mall_builder_products add constraint mall_builder_products_kc_certs_check check (
  jsonb_typeof(kc_certs) = 'array' and jsonb_array_length(kc_certs) <= 10 and pg_column_size(kc_certs) <= 4000
);

-- 본사 상품이 바뀌면 거울 상품도(값이 실제로 바뀐 때만)
create or replace function public.mall_builder_products_notice_resale_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.info_notice is not distinct from old.info_notice and new.kc_certs is not distinct from old.kc_certs then return new; end if;
  update public.mall_builder_products m
     set info_notice = new.info_notice, kc_certs = new.kc_certs, updated_at = now()
   where m.source_product_id = new.id
     and (m.info_notice is distinct from new.info_notice or m.kc_certs is distinct from new.kc_certs);
  return new;
end;
$$;
drop trigger if exists mall_builder_products_notice_resale_sync on public.mall_builder_products;
create trigger mall_builder_products_notice_resale_sync after update of info_notice, kc_certs on public.mall_builder_products
  for each row when (old.source_product_id is null) execute function public.mall_builder_products_notice_resale_sync();

-- 거울 상품이 생길 때(분양자가 본사 상품을 담을 때) 본사 값으로
create or replace function public.mall_builder_products_notice_mirror_init()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select p.info_notice, p.kc_certs into new.info_notice, new.kc_certs from public.mall_builder_products p where p.id = new.source_product_id;
  new.info_notice := coalesce(new.info_notice, '{}'::jsonb);
  new.kc_certs := coalesce(new.kc_certs, '[]'::jsonb);
  return new;
end;
$$;
drop trigger if exists mall_builder_products_notice_mirror_init on public.mall_builder_products;
create trigger mall_builder_products_notice_mirror_init before insert on public.mall_builder_products
  for each row when (new.source_product_id is not null) execute function public.mall_builder_products_notice_mirror_init();
