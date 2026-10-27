-- 카테고리 회원별 전환 (2026-10-27, v1.84)
-- 주인님 지시: 카테고리는 회원 본인 소유, 같은 회원의 여러 블로그 프로그램이 공유, 타인과 공유 없음, 관리자 공용 없음.
-- 기존 blog_categories는 회원 구분(user_id)이 없는 공용이었다 → user_id 추가 + 사용 중인 공용 카테고리를
-- 그 글 소유자의 개인 카테고리로 이관 + RLS owner-only.
-- 운영 DB(esgxyikcnnvmlhygjkth) SQL Editor에서 실행. 되돌리기 어려우니 BEGIN/COMMIT로 묶는다.

begin;

-- 1) 회원 구분 컬럼(먼저 nullable)
alter table public.blog_categories
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2) slug 유일성을 회원별로 — 기존 전역 unique 제약이 있으면 제거하고 (user_id, slug) 복합 유일 인덱스로
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.blog_categories'::regclass and contype = 'u'
  loop
    execute format('alter table public.blog_categories drop constraint %I', c.conname);
  end loop;
end $$;
create unique index if not exists blog_categories_user_slug_uidx
  on public.blog_categories(user_id, slug);

-- 3) 이관: 사용 중인 (글 소유자, 공용 카테고리)마다 그 회원 소유 카테고리를 만든다
insert into public.blog_categories (name, slug, sort_order, user_id)
select distinct oldc.name,
       oldc.slug || '-' || substr(bp.user_id::text, 1, 8),
       oldc.sort_order,
       bp.user_id
from public.blog_post_categories pc
join public.blog_categories oldc on oldc.id = pc.category_id and oldc.user_id is null
join public.blog_posts bp on bp.id = pc.post_id and bp.user_id is not null
on conflict (user_id, slug) do nothing;

-- 4) 글-카테고리 연결을 그 글 소유자의 개인 카테고리로 재지정
update public.blog_post_categories pc
set category_id = newc.id
from public.blog_categories oldc, public.blog_posts bp, public.blog_categories newc
where pc.category_id = oldc.id and oldc.user_id is null
  and bp.id = pc.post_id and bp.user_id is not null
  and newc.user_id = bp.user_id and newc.name = oldc.name;

-- 5) 남은 공용(user_id is null) 카테고리와 그 연결 제거
--    (재지정된 연결은 이미 개인 카테고리를 가리킨다. 소유자 없는 글의 연결만 남아 함께 정리.)
delete from public.blog_post_categories pc
 using public.blog_categories oldc
 where pc.category_id = oldc.id and oldc.user_id is null;
delete from public.blog_categories where user_id is null;

-- 6) 앞으로 user_id 필수
alter table public.blog_categories alter column user_id set not null;

-- 7) RLS: 본인 것만 (owner-only). 기존 정책은 모두 교체한다.
alter table public.blog_categories enable row level security;
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'blog_categories'
  loop
    execute format('drop policy %I on public.blog_categories', p.policyname);
  end loop;
end $$;
create policy blog_categories_select on public.blog_categories
  for select to authenticated using (auth.uid() = user_id);
create policy blog_categories_insert on public.blog_categories
  for insert to authenticated with check (auth.uid() = user_id);
create policy blog_categories_update on public.blog_categories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy blog_categories_delete on public.blog_categories
  for delete to authenticated using (auth.uid() = user_id);

-- 8) 버전 기록
update public.programs set version = 'v1.84', updated_at = now() where slug = 'ai-auto-blog';

commit;

-- 확인용(실행 후 수동 조회):
--   select count(*) filter (where user_id is null) as 공용남음, count(*) as 전체 from public.blog_categories;
--   → 공용남음 = 0 이어야 한다.
