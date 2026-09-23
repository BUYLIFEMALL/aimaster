-- 멀티미디어 카테고리 생성 및 AI 이미지 스튜디오 프로그램 & 요금제 등록
with new_category as (
  insert into categories (name, slug, sort_order)
  values ('멀티미디어', 'multimedia', (select coalesce(max(sort_order), 0) + 1 from categories))
  on conflict (name) do update set name = excluded.name
  returning id
),
new_program as (
  insert into programs (category_id, required_grade_id, name, slug, short_desc, description, is_active, badges, sort_order, app_url, thumbnail_url)
  select 
    c.id,
    (select id from member_grades where name = 'basic' limit 1),
    'AI 이미지 스튜디오',
    'ai-image-studio',
    'OpenAI GPT Image, Google Gemini, FLUX.1 및 Stability AI 다중 엔진 지원 고품질 AI 이미지 스튜디오',
    'OpenAI GPT Image(2.5 Sunburst, 2.5 Flare, 2, 1.5), Google Gemini (Nanobanana), FLUX.1 및 Stability AI 등 최신 다중 AI 이미지 생성 플랫폼을 지원하며, 1장~10장 연속 생성 및 세부 비율·화질 맞춤 설정이 가능한 고품질 이미지 스튜디오입니다.',
    true,
    ARRAY['new'],
    (select coalesce(max(sort_order), 0) + 1 from programs),
    'https://ai-image-studio.vercel.app',
    'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ai-image-studio-thumbnail.jpg'
  from new_category c
  on conflict (slug) do update set
    name = excluded.name,
    short_desc = excluded.short_desc,
    description = excluded.description,
    app_url = excluded.app_url,
    thumbnail_url = excluded.thumbnail_url,
    is_active = excluded.is_active
  returning id
)
insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select id, '1개월', 'monthly', 10000, 10000, true, 0 from new_program
union all
select id, '2개월', 'bimonthly', 20000, 20000, true, 1 from new_program
union all
select id, '3개월', 'quarterly', 30000, 30000, true, 2 from new_program;
