-- STYLE DNA ANALYZER v1.01 (2026-10-11): 분석 보관함 테이블 + 원본 이미지 공개 버킷.
-- 분석 기록은 회원별로 완전히 격리한다(RLS owner-only). 이미지는 서버(서비스 키)만 올리고 읽기는 추측 불가능한 공개 URL이다.

create table if not exists public.sda_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 분석',
  mode text not null default 'replicate' check (mode in ('replicate', 'mutate')),
  guidance text not null default '',
  engine jsonb not null,
  image_path text not null,
  aspect_ratio text not null default '1:1',
  palette jsonb not null default '[]'::jsonb,
  result jsonb not null,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sda_analyses_user_created_idx on public.sda_analyses (user_id, created_at desc);

alter table public.sda_analyses enable row level security;

create policy "sda_analyses_select_own" on public.sda_analyses for select to authenticated using (auth.uid() = user_id);
create policy "sda_analyses_insert_own" on public.sda_analyses for insert to authenticated with check (auth.uid() = user_id);
create policy "sda_analyses_update_own" on public.sda_analyses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sda_analyses_delete_own" on public.sda_analyses for delete to authenticated using (auth.uid() = user_id);

-- 원본 이미지: 공개 읽기 버킷(이미지 1장 최대 5MB, 이미지 형식만). 업로드·삭제는 서비스 키를 쓰는 서버 API만 한다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('style-dna-images', 'style-dna-images', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
