-- AI 워드프레스·구글블로그 자동화(wp-blogger-auto) 첫 DB — 2026-11-10 초안(운영 미적용, 주인님 승인 뒤 적용)
-- 대상: ① AIMaster 운영 DB(ref esgxyikcnnvmlhygjkth). 기존 표·함수는 바꾸지 않고 추가만 한다.
-- 1) 공용 연동 카탈로그에 wordpress·blogger 추가 → 연결 계정은 공용 member_platform_accounts에 저장(다른 프로그램 재사용)
--    · wordpress: external_id = '<사이트 주소>#<WP 사용자 ID>', username = WP 사용자명, access_token = 응용 비밀번호,
--      auth_method = 'app_password', extra = {"site_url": ..., "rest_style": "path"|"query", "site_name": ...}
--    · blogger: 회원 본인 구글 앱(user_api_keys google_client_id/secret — 유튜브와 같은 키) OAuth 토큰, external_id = 구글 계정 sub
-- 2) 원고·발행 기록 wba_posts — 회원은 자기 행 읽기·지우기만, 상태 변경은 서버(service role)만
-- 3) 이미지 공개 버킷 wba-images — 경로 '<user_id>/<post_id>/<n>.<ext>', 올리기는 서버만
-- 4) 30일 정리: 관리자·시험 계정(profiles.retention_exempt) 제외.
--    구글 블로그에 발행된 글(keep_images)은 30일 뒤 본문만 비우고 이미지·기록은 남김(TOP_RULE §8 2026-11-10 지정)

insert into public.integration_catalog (key, kind, label, description, key_names, scope_sets, connect_program_url, sort_order)
values
  ('wordpress', 'oauth_account', '워드프레스 사이트', '본인 워드프레스(설치형) 사이트 — 사용자명과 응용 비밀번호로 연결.',
    '{}', '{}', 'https://wp-blogger-auto.buylife.xyz', 60),
  ('blogger', 'oauth_account', '구글 블로그(블로그스팟)', '본인 Google 앱으로 연결한 구글 블로그.',
    '{google_client_id,google_client_secret}',
    '{"publish":["https://www.googleapis.com/auth/blogger"]}',
    'https://wp-blogger-auto.buylife.xyz', 61)
on conflict (key) do nothing;

create table if not exists public.wba_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('wordpress', 'blogger')),
  account_id uuid references public.member_platform_accounts (id) on delete set null,
  blog_ref text check (char_length(blog_ref) <= 300),       -- WP 사이트 주소 / 블로거 blog id
  blog_name text check (char_length(blog_name) <= 200),
  topic text check (char_length(topic) <= 500),              -- 글감(주제·키워드·URL)
  title text not null default '' check (char_length(title) <= 300),
  html text not null default '' check (char_length(html) <= 300000),
  excerpt text check (char_length(excerpt) <= 320),          -- 메타 설명
  slug text check (char_length(slug) <= 200),
  tags text[] not null default '{}',
  category_ids integer[] not null default '{}',
  images jsonb not null default '[]'::jsonb,                 -- [{path, url, alt}]
  mode text check (mode in ('draft', 'publish', 'schedule')),
  scheduled_at timestamptz,
  status text not null default 'writing'
    check (status in ('writing', 'ready', 'publishing', 'draft', 'published', 'scheduled', 'failed', 'uncertain')),
  remote_id text check (char_length(remote_id) <= 100),
  remote_url text check (char_length(remote_url) <= 1000),
  error_code text check (char_length(error_code) <= 40),
  error_detail text check (char_length(error_detail) <= 400),
  published_at timestamptz,
  keep_images boolean not null default false,                -- 구글 블로그 발행 글: 이미지 보관(본문은 30일 뒤 비움)
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wba_posts_owner on public.wba_posts (user_id, created_at desc);
create index if not exists wba_posts_sweep on public.wba_posts (expires_at) where expires_at is not null;

alter table public.wba_posts enable row level security;
drop policy if exists wba_posts_select_own on public.wba_posts;
create policy wba_posts_select_own on public.wba_posts for select using (auth.uid() = user_id);
drop policy if exists wba_posts_delete_own on public.wba_posts;
create policy wba_posts_delete_own on public.wba_posts for delete using (auth.uid() = user_id);
revoke insert, update on public.wba_posts from anon, authenticated;
revoke all on public.wba_posts from anon;

-- 이미지 버킷(공개 읽기 — 구글 블로그 본문이 주소로 불러감). 올리기·지우기는 서버(service role)만.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wba-images', 'wba-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- 30일 정리 — 지울 이미지 경로를 돌려줘 서버가 버킷에서도 지운다.
create or replace function public.wba_cleanup()
returns table (image_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- (가) 구글 블로그 발행 글: 본문만 비우고 기록·이미지는 남김
  update public.wba_posts p
     set html = '', excerpt = null, topic = null, expires_at = null, updated_at = now()
   where p.keep_images
     and p.expires_at is not null and p.expires_at < now()
     and not exists (select 1 from public.profiles pr where pr.id = p.user_id and pr.retention_exempt);

  -- (나) 그 밖의 만료 행: 이미지 경로를 돌려주고 행 삭제
  return query
  with gone as (
    delete from public.wba_posts p
     where not p.keep_images
       and p.expires_at is not null and p.expires_at < now()
       and not exists (select 1 from public.profiles pr where pr.id = p.user_id and pr.retention_exempt)
    returning p.images
  )
  select (img ->> 'path')::text
    from gone, jsonb_array_elements(gone.images) as img
   where img ? 'path';
end;
$$;

revoke all on function public.wba_cleanup() from public, anon, authenticated;
grant execute on function public.wba_cleanup() to service_role;
