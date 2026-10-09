-- Approved by the owner on 2026-10-10; see the generated migration for application history.
-- Preserve all rows, including seven blog_posts with unknown ownership.
-- Shared categories remain a common catalog; only administrators can change it.
begin;

-- Remove permissive policies first: PostgreSQL combines permissive policies with OR.
do $review$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in
      ('blog_posts','blog_authors','blog_candidates','blog_categories',
       'blog_post_categories','blog_comments','blog_likes')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$review$;

alter table public.blog_posts enable row level security;
alter table public.blog_authors enable row level security;
alter table public.blog_candidates enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_post_categories enable row level security;
alter table public.blog_comments enable row level security;
alter table public.blog_likes enable row level security;

revoke all on public.blog_posts, public.blog_authors, public.blog_candidates,
  public.blog_categories, public.blog_post_categories, public.blog_comments,
  public.blog_likes from public, anon, authenticated;
-- RLS does not constrain TRUNCATE/REFERENCES/TRIGGER: do not retain default ALL grants.
grant select on public.blog_comments, public.blog_likes to authenticated;
grant select, insert, update, delete on public.blog_posts, public.blog_authors,
  public.blog_candidates, public.blog_categories, public.blog_post_categories to authenticated;

create policy blog_posts_owner on public.blog_posts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy blog_authors_owner on public.blog_authors for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy blog_candidates_owner on public.blog_candidates for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy blog_categories_member_read on public.blog_categories for select to authenticated
  using (true);
create policy blog_categories_admin_write on public.blog_categories for all to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid())
    and is_admin = true and coalesce(is_suspended, false) = false))
  with check (exists (select 1 from public.profiles where id = (select auth.uid())
    and is_admin = true and coalesce(is_suspended, false) = false));

create policy blog_post_categories_owner on public.blog_post_categories for all to authenticated
  using (exists (select 1 from public.blog_posts p where p.id = post_id
    and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.blog_posts p where p.id = post_id
    and p.user_id = (select auth.uid())));
create policy blog_comments_owner_read on public.blog_comments for select to authenticated
  using (exists (select 1 from public.blog_posts p where p.id = post_id
    and p.user_id = (select auth.uid())));
create policy blog_likes_owner_read on public.blog_likes for select to authenticated
  using (exists (select 1 from public.blog_posts p where p.id = post_id
    and p.user_id = (select auth.uid())));

commit;

-- After application:
-- 1. Verify all 20 posts and 10 categories still exist; seven unowned posts stay unassigned.
-- 2. Real member login: own read/edit works; a second member and anon see no private rows.
-- 3. Transactional negative tests: anon write denied, member cannot mutate shared categories,
--    member cannot transfer user_id or attach categories to another member's post.
-- 4. Run Supabase security advisors again. Obtain SQL snapshot before applying.
