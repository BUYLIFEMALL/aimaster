-- 네이버 블로그 올인원 v1.16 (2026-10-12): 생성 콘텐츠 보관함 테이블 + 이미지 공개 버킷.
-- 보관함은 회원별로 완전히 격리한다(RLS owner-only). 이미지는 서버(서비스 키)만 올리고 읽기는 추측 불가능한 공개 URL이다.

create table if not exists public.aio_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null default '',
  article text not null,
  tags jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  review_status text not null default 'UNKNOWN' check (review_status in ('PASS', 'WARN', 'FAIL', 'UNKNOWN')),
  review_note text not null default '',
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aio_posts_user_updated_idx on public.aio_posts (user_id, updated_at desc);

alter table public.aio_posts enable row level security;

create policy "aio_posts_select_own" on public.aio_posts for select to authenticated using (auth.uid() = user_id);
create policy "aio_posts_insert_own" on public.aio_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "aio_posts_update_own" on public.aio_posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "aio_posts_delete_own" on public.aio_posts for delete to authenticated using (auth.uid() = user_id);

-- 이미지: 공개 읽기 버킷(1장 최대 5MB, 이미지 형식만). 업로드·삭제는 서비스 키를 쓰는 서버 API만 한다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('allinone-images', 'allinone-images', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
