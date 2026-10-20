-- AI 인플루언서 자동화 v1.20 (2026-10-20, 주인님 승인 「진행해줘」 — Claude Code 윈도우): 작업 히스토리를 회원 계정에 저장.
-- 회원별 완전 격리(RLS 본인 읽기만), 쓰기는 서버(서비스 키)만. 이미지는 비공개 버킷 aif-history(서명 주소로만 보기).
-- 생성 30일 뒤 자동 삭제·회원당 30개 제한은 /api/history가 처리(최상위 규칙: 생성 데이터 30일 삭제).

create table if not exists public.aif_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  captions jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists aif_history_user_created_idx on public.aif_history (user_id, created_at desc);
alter table public.aif_history enable row level security;
drop policy if exists aif_history_select_own on public.aif_history;
create policy aif_history_select_own on public.aif_history for select to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('aif-history', 'aif-history', false) on conflict (id) do nothing;

update public.programs set version = 'v1.20', updated_at = now() where slug = 'ai-influencer-studio';

select to_regclass('public.aif_history') as history_table,
  (select public from storage.buckets where id = 'aif-history') as bucket_public,
  (select version from public.programs where slug = 'ai-influencer-studio') as program_version;
