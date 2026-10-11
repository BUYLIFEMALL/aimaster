-- CARDNEWS STUDIO v1.01 (2026-10-11): 프로젝트 저장 테이블 + 배경 이미지 공개 버킷.
-- 프로젝트는 회원별로 완전히 격리한다(RLS owner-only). 이미지는 서버(서비스 키)만 올리고 읽기는 공개 URL이다.

create table if not exists public.cns_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 카드뉴스',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cns_projects_user_updated_idx on public.cns_projects (user_id, updated_at desc);

alter table public.cns_projects enable row level security;

create policy "cns_projects_select_own" on public.cns_projects for select to authenticated using (auth.uid() = user_id);
create policy "cns_projects_insert_own" on public.cns_projects for insert to authenticated with check (auth.uid() = user_id);
create policy "cns_projects_update_own" on public.cns_projects for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cns_projects_delete_own" on public.cns_projects for delete to authenticated using (auth.uid() = user_id);

-- 배경 이미지: 공개 읽기 버킷(이미지 1장 최대 15MB, 이미지 형식만). 업로드·삭제는 서비스 키를 쓰는 서버 API만 한다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cardnews-images', 'cardnews-images', true, 15728640, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
