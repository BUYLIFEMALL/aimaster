-- AI 썸네일 마스터 자동화 (slug: thumbnail-master) — 프로젝트 테이블 + 비공개 이미지 버킷 (v1.01, 2026-10-14)
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 프로젝트만 읽고 쓸 수 있다(RLS owner-only).
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 거부될 수 있어 문장별로 적용했다.

create table if not exists public.thumbnail_master_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '제목 없는 썸네일',
  inputs jsonb not null default '{}'::jsonb,
  strategy jsonb,
  -- A/B 옵션별 이미지 버전 목록: {"versions":[{path,v,at,model,instruction?}],"cur":index}
  -- 두 옵션을 동시에 생성하므로 컬럼을 나눠 서로 덮어쓰지 않게 한다.
  images_a jsonb not null default '{"versions":[],"cur":-1}'::jsonb,
  images_b jsonb not null default '{"versions":[],"cur":-1}'::jsonb,
  stage text not null default 'input' check (stage in ('input','strategy','image')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists thumbnail_master_projects_user_updated_idx
  on public.thumbnail_master_projects (user_id, updated_at desc);

alter table public.thumbnail_master_projects enable row level security;

create policy "thumbnail_master_projects_owner_select" on public.thumbnail_master_projects
  for select using (auth.uid() = user_id);
create policy "thumbnail_master_projects_owner_insert" on public.thumbnail_master_projects
  for insert with check (auth.uid() = user_id);
create policy "thumbnail_master_projects_owner_update" on public.thumbnail_master_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "thumbnail_master_projects_owner_delete" on public.thumbnail_master_projects
  for delete using (auth.uid() = user_id);

-- 이미지 버킷: 비공개, 파일당 10MB 제한. 정책을 만들지 않는다 — 서버(service role)가 서명 URL 발급·읽기·삭제만 한다.
-- 경로: <uid>/<projectId>/<a|b>-<uuid>.jpg
insert into storage.buckets (id, name, public, file_size_limit)
values ('thumbnail-master-images', 'thumbnail-master-images', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;
