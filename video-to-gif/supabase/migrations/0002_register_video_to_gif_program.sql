-- VideoToGIF catalog registration. Safe to re-run: all inserts are keyed by stable slugs.
do $$
declare
  v_program_id uuid;
  v_category_id uuid;
  v_basic_grade_id uuid;
begin
  select id into v_category_id from public.categories where slug = 'ecommerce' limit 1;
  select id into v_basic_grade_id from public.member_grades where slug = 'basic' limit 1;

  insert into public.programs (
    category_id, name, slug, short_desc, description, is_active, sort_order, required_grade_id, badges
  ) values (
    v_category_id,
    '상세페이지 GIF 자동화',
    'video-to-gif',
    '상세페이지용 고품질 GIF를 자동으로 최적화합니다.',
    '동영상 파일을 업로드하면 8MiB 제한을 고려해 프레임·너비·색상 수를 자동 조절하고, 상세페이지에 바로 사용할 수 있는 GIF를 생성합니다.',
    true,
    0,
    v_basic_grade_id,
    array['new']::text[]
  )
  on conflict (slug) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    short_desc = excluded.short_desc,
    description = excluded.description,
    is_active = excluded.is_active,
    required_grade_id = excluded.required_grade_id,
    badges = excluded.badges,
    updated_at = now()
  returning id into v_program_id;

  insert into public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
  select v_program_id, x.name, x.billing_type, x.price, null, true, x.sort_order
  from (values
    ('1개월'::text, 'monthly'::text, 10000, 1),
    ('2개월'::text, 'bimonthly'::text, 20000, 2),
    ('3개월'::text, 'quarterly'::text, 30000, 3)
  ) as x(name, billing_type, price, sort_order)
  where not exists (
    select 1 from public.pricing_plans p
    where p.program_id = v_program_id and p.billing_type = x.billing_type
  );

  insert into public.affiliate_rates (program_id, rate)
  values (v_program_id, 10.00)
  on conflict (program_id) do nothing;
end $$;
