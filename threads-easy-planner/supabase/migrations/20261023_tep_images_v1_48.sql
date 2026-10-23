-- Threads AI 기획 자동화 v1.48 (2026-10-23): 글과 함께 이미지 생성 — 보관함 이미지 칸 + 이미지 저장 버킷
-- 운영 DB(AIMaster ref esgxyikcnnvmlhygjkth) 적용. 배포판은 KIT/schema.sql·KIT/upgrade-20261023-images.sql 에 같은 내용.
-- 2026-10-23 발견: 0001_tep_saved_plans.sql 이 운영 DB에 적용된 적이 없어 표가 없었다(보관함 DB 저장이 늘 실패하고 브라우저에만 저장됨).
-- 주인님 승인으로 같은 날 표·보안 정책을 함께 만들었다(실제 적용한 SQL).
create table if not exists public.tep_saved_plans (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, topic text not null, hook text not null, hook_reason text default '', hook_variants jsonb default '[]'::jsonb, body_text text not null, reply_cta text default '', follow_up_topics jsonb default '[]'::jsonb, persona_id text, persona_name text, model_label text, image_urls jsonb not null default '[]'::jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.tep_saved_plans enable row level security;
drop policy if exists tep_saved_plans_select_own on public.tep_saved_plans;
create policy tep_saved_plans_select_own on public.tep_saved_plans for select to authenticated using (auth.uid() = user_id);
drop policy if exists tep_saved_plans_insert_own on public.tep_saved_plans;
create policy tep_saved_plans_insert_own on public.tep_saved_plans for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists tep_saved_plans_update_own on public.tep_saved_plans;
create policy tep_saved_plans_update_own on public.tep_saved_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists tep_saved_plans_delete_own on public.tep_saved_plans;
create policy tep_saved_plans_delete_own on public.tep_saved_plans for delete to authenticated using (auth.uid() = user_id);
create index if not exists idx_tep_saved_plans_user_created on public.tep_saved_plans (user_id, created_at desc);
alter table public.tep_saved_plans add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- 공개 읽기 버킷(올리기는 서버 서비스 키만, 경로 「<회원 id>/<파일>」, 30일 지나면 보관함 목록을 열 때 회원별 삭제)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tep-images', 'tep-images', true, 12582912, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- 버전은 배포 Ready 뒤 적용
UPDATE public.programs
SET version = 'v1.48', updated_at = NOW()
WHERE slug = 'threads-easy-planner';
