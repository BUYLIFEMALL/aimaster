alter table public.naver_blog_seo_drafts
  add column if not exists extension_handoff_at timestamptz,
  add column if not exists extension_imported_at timestamptz;

create index if not exists naver_blog_seo_drafts_handoff_idx
  on public.naver_blog_seo_drafts (user_id, extension_handoff_at desc)
  where extension_handoff_at is not null;
