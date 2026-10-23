-- shop-detail-page 신규 서브프로젝트 스키마.
-- n8n에서 Airtable로 운영하던 "상세페이지 자동화" 파이프라인(#0 상품분석, #1 이미지생성,
-- #6 이미지병합)을 AIMaster 멀티테넌시 구조로 이식한다. 사용자 소유 데이터는 전부
-- user_id + RLS owner-only 정책으로 격리한다 (다른 서브프로젝트와 동일 패턴).

-- 상품(=Airtable "상품마스터" 대체)
create table public.shop_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  category text,
  price numeric,
  sale_price numeric,
  key_features text,
  specs text,
  how_to_use text,
  target_customer text,
  main_color text,
  sub_color text,
  background_style text,
  mood_keywords text[] not null default '{}',
  font_style text,
  layout_density text,
  source_image_url text,
  status text not null default 'draft'
    check (status in ('draft','analyzing','analyzed','generating','completed','error')),
  language text not null default '한국어',
  currency text not null default '₩',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shop_products_user_id_idx on public.shop_products(user_id);

alter table public.shop_products enable row level security;

create policy "shop_products_select_own"
  on public.shop_products for select
  using (auth.uid() = user_id);
create policy "shop_products_insert_own"
  on public.shop_products for insert
  with check (auth.uid() = user_id);
create policy "shop_products_update_own"
  on public.shop_products for update
  using (auth.uid() = user_id);
create policy "shop_products_delete_own"
  on public.shop_products for delete
  using (auth.uid() = user_id);

create trigger shop_products_set_updated_at
  before update on public.shop_products
  for each row execute function public.set_updated_at();

-- 프롬프트 템플릿(=Airtable "프롬프트템플릿"+"프롬프트라이브러리" 통합).
-- user_id가 null이면 시스템 기본 템플릿(모든 사용자에게 읽기 공개), 값이 있으면 본인 커스텀 템플릿.
create table public.shop_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  section_key text not null,
  section_order int not null,
  section_name text not null,
  prompt_template text not null,
  korean_guide text not null default '',
  aspect_ratio text not null default '16:9',
  resolution text not null default '2K',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index shop_prompt_templates_user_id_idx on public.shop_prompt_templates(user_id);

alter table public.shop_prompt_templates enable row level security;

create policy "shop_prompt_templates_select_own_or_system"
  on public.shop_prompt_templates for select
  using (auth.uid() = user_id or user_id is null);
create policy "shop_prompt_templates_insert_own"
  on public.shop_prompt_templates for insert
  with check (auth.uid() = user_id);
create policy "shop_prompt_templates_update_own"
  on public.shop_prompt_templates for update
  using (auth.uid() = user_id);
create policy "shop_prompt_templates_delete_own"
  on public.shop_prompt_templates for delete
  using (auth.uid() = user_id);

-- 섹션별 생성 이미지 (shots.shorts_video_segments와 동일한 "활성 이미지 + 이력 배열" 패턴)
create table public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.shop_prompt_templates(id) on delete set null,
  section_key text not null,
  section_order int not null,
  language text not null default '한국어',
  prompt_used text,
  image_url text,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, section_key, language)
);

create index shop_product_images_user_id_idx on public.shop_product_images(user_id);
create index shop_product_images_product_id_idx on public.shop_product_images(product_id);

alter table public.shop_product_images enable row level security;

create policy "shop_product_images_select_own"
  on public.shop_product_images for select
  using (auth.uid() = user_id);
create policy "shop_product_images_insert_own"
  on public.shop_product_images for insert
  with check (auth.uid() = user_id);
create policy "shop_product_images_update_own"
  on public.shop_product_images for update
  using (auth.uid() = user_id);
create policy "shop_product_images_delete_own"
  on public.shop_product_images for delete
  using (auth.uid() = user_id);

create trigger shop_product_images_set_updated_at
  before update on public.shop_product_images
  for each row execute function public.set_updated_at();

-- 병합된 최종 상세페이지 이미지 (=Airtable "생성이미지.병합이미지" 대체, 언어별로 여러 개 가능)
create table public.shop_page_exports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null default '한국어',
  image_url text not null,
  created_at timestamptz not null default now()
);

create index shop_page_exports_user_id_idx on public.shop_page_exports(user_id);
create index shop_page_exports_product_id_idx on public.shop_page_exports(product_id);

alter table public.shop_page_exports enable row level security;

create policy "shop_page_exports_select_own"
  on public.shop_page_exports for select
  using (auth.uid() = user_id);
create policy "shop_page_exports_insert_own"
  on public.shop_page_exports for insert
  with check (auth.uid() = user_id);
create policy "shop_page_exports_delete_own"
  on public.shop_page_exports for delete
  using (auth.uid() = user_id);
