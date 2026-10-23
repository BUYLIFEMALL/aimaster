alter table public.naver_blog_seo_drafts
  add column if not exists naver_input_status text not null default 'not_started'
    check (naver_input_status in ('not_started', 'in_progress', 'completed', 'failed')),
  add column if not exists naver_input_completed_at timestamptz,
  add column if not exists naver_input_error text;

create index if not exists naver_blog_seo_drafts_input_status_idx
  on public.naver_blog_seo_drafts (user_id, naver_input_status, created_at desc);
