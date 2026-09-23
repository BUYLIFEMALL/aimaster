-- 이미지 자동화(image-automation) 프로그램 카탈로그 및 요금제 등록
-- 마케팅(홍보) 카테고리 / 일반(basic) 등급 기본 등록
with new_program as (
  insert into programs (category_id, required_grade_id, name, slug, short_desc, description, is_active, badges, sort_order, app_url)
  values (
    '923c8712-bf8b-47e5-bb64-fea6d7606a27', -- 마케팅(홍보) 카테고리
    '861b7a37-d056-4404-80f5-85edb2e2ebff', -- 일반(basic) 등급
    '이미지 자동화',
    'image-automation',
    'OpenAI, FLUX, Imagen 3 등 다양한 AI 모델로 고품질 이미지를 자동 생성합니다.',
    '한글 입력만으로 AI가 최적의 영문 프롬프트와 옵션을 구성하여 OpenAI DALL-E 3, Google Imagen 3, FLUX, Stability AI 등 다양한 이미지 생성 플랫폼으로 고품질 이미지를 손쉽게 생성합니다.',
    true,
    ARRAY['new'],
    (select coalesce(max(sort_order), 0) + 1 from programs),
    'https://image-automation.vercel.app/dashboard'
  )
  on conflict (slug) do update set
    name = excluded.name,
    short_desc = excluded.short_desc,
    description = excluded.description,
    is_active = excluded.is_active
  returning id
)
insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select id, '1개월', 'monthly', 10000, 10000, true, 0 from new_program
union all
select id, '2개월', 'bimonthly', 20000, 20000, true, 1 from new_program
union all
select id, '3개월', 'quarterly', 30000, 30000, true, 2 from new_program
on conflict do nothing;

-- 전용 생성 이력 테이블 생성
create table if not exists user_image_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt text not null,
  enhanced_prompt text,
  options jsonb not null default '{}'::jsonb,
  image_url text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

-- RLS 정책 설정
alter table user_image_generations enable row level security;

create policy "Users can view their own image generations"
  on user_image_generations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own image generations"
  on user_image_generations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own image generations"
  on user_image_generations for delete
  using (auth.uid() = user_id);

create index if not exists idx_user_image_generations_user_id on user_image_generations(user_id);
create index if not exists idx_user_image_generations_created_at on user_image_generations(created_at desc);
