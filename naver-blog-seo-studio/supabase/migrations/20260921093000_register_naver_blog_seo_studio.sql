-- 네이버 블로그 SEO 스튜디오 프로그램과 사용자별 초안 저장 구조를 등록한다.
-- 실제 적용 대상은 AIMaster 공용 Supabase 프로젝트(esgxyikcnnvmlhygjkth)다.

with new_program as (
  insert into public.programs (
    category_id,
    required_grade_id,
    name,
    slug,
    short_desc,
    description,
    is_active,
    badges,
    sort_order,
    app_url
  )
  values (
    (select id from public.categories where slug = 'naver' limit 1),
    (select id from public.member_grades where slug = 'basic' limit 1),
    '네이버 블로그 SEO 스튜디오',
    'naver-blog-seo-studio',
    'AI가 네이버 블로그 글의 기획·초안·SEO 검수를 돕는 웹 스튜디오',
    '주제와 키워드를 바탕으로 네이버 블로그 콘텐츠를 기획하고, SEO 관점의 초안과 검수 리포트를 제공합니다. 네이버 최종 발행은 사용자가 직접 확인하고 진행합니다.',
    false,
    array['new'],
    (select coalesce(max(sort_order), 0) + 1 from public.programs),
    'https://www.buylife.xyz/naver-blog-seo-studio'
  )
  on conflict (slug) do update set
    name = excluded.name,
    short_desc = excluded.short_desc,
    description = excluded.description,
    app_url = excluded.app_url
  returning id
), target_program as (
  select id from new_program
  union all
  select id from public.programs where slug = 'naver-blog-seo-studio'
  limit 1
)
insert into public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select t.id, plan.name, plan.billing_type, plan.price, plan.original_price, true, plan.sort_order
from target_program t
cross join (values
  ('1개월'::text, 'monthly'::text, 10000, 10000, 0),
  ('2개월'::text, 'bimonthly'::text, 20000, 20000, 1),
  ('3개월'::text, 'quarterly'::text, 30000, 30000, 2)
) as plan(name, billing_type, price, original_price, sort_order)
where not exists (
  select 1 from public.pricing_plans existing
  where existing.program_id = t.id
);

create table if not exists public.naver_blog_seo_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  keywords text[] not null default '{}',
  strategy text not null,
  title text not null default '',
  body text not null default '',
  seo_report jsonb not null default '{}'::jsonb,
  image_prompts jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists naver_blog_seo_drafts_user_created_idx
  on public.naver_blog_seo_drafts (user_id, created_at desc);

alter table public.naver_blog_seo_drafts enable row level security;

drop policy if exists "seo drafts owner select" on public.naver_blog_seo_drafts;
create policy "seo drafts owner select"
  on public.naver_blog_seo_drafts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "seo drafts owner insert" on public.naver_blog_seo_drafts;
create policy "seo drafts owner insert"
  on public.naver_blog_seo_drafts for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "seo drafts owner update" on public.naver_blog_seo_drafts;
create policy "seo drafts owner update"
  on public.naver_blog_seo_drafts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "seo drafts owner delete" on public.naver_blog_seo_drafts;
create policy "seo drafts owner delete"
  on public.naver_blog_seo_drafts for delete to authenticated
  using ((select auth.uid()) = user_id);
