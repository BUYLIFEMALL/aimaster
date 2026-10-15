-- AI 블로그 작업실 자동화 (slug: blog-workroom) v1.01 — 회원 작업 저장 테이블 + 이미지 버킷 + 프로그램 등록
-- 공용 Supabase(AIMaster) 한 곳을 쓴다. 회원 본인 행만 읽고 쓸 수 있다(RLS owner-only). 서버는 service role + user_id 조건으로 접근.
-- 2026-10-15 주인님 승인(운영 변경 3가지 "모두 진행"). DDL은 문장별로 적용한다(ERROR_LESSONS: 여러 문장을 한 번에 보내면 거부될 수 있음).

-- 1) 작업 저장 테이블(종류별 JSON)
create table if not exists public.blog_workroom_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('settings','blog','keyword','brief','bench','research','draft','final','image_job')),
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  ref_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_workroom_items_user_kind_idx on public.blog_workroom_items (user_id, kind, updated_at desc);

alter table public.blog_workroom_items enable row level security;

create policy "blog_workroom_items_owner_select" on public.blog_workroom_items for select using (auth.uid() = user_id);

create policy "blog_workroom_items_owner_insert" on public.blog_workroom_items for insert with check (auth.uid() = user_id);

create policy "blog_workroom_items_owner_update" on public.blog_workroom_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "blog_workroom_items_owner_delete" on public.blog_workroom_items for delete using (auth.uid() = user_id);

-- 2) 이미지 버킷(공개 읽기, 쓰기는 서버 service role만) — 플랫폼 패턴 §12. 실제 적용은 service role의 storage.createBucket으로 했다.
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('blog-workroom','blog-workroom',true,10485760,array['image/png','image/jpeg','image/webp']) on conflict (id) do nothing;

-- 3) 프로그램 등록(비공개로 시작 → 운영 검수 후 공개). 실제 적용은 service role DML 스크립트로 했다.
-- insert into public.programs (slug,name,category_id,short_desc,description,app_url,version,badges,required_grade_id,is_active,sort_order)
--   select 'blog-workroom','AI 블로그 작업실 자동화', '8e8be410-3ed4-46f7-80d9-4b408af61cc1', ..., 'https://blog-workroom.buylife.xyz','v1.01',array['new'], required_grade_id, false, ... from public.programs where slug='blog-keyword';
-- pricing_plans 기본 3종(1·2·3개월 1만/2만/3만원) + VIP grade_program_access.
