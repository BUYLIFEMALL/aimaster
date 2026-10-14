-- AI 인물사진 자동화 (slug: portrait-photo) — v1.03 서버 보관함(선택 기능) (2026-10-14)
-- 회원이 스튜디오에서 [서버 보관함에도 저장]을 직접 켠 경우에만 "생성 결과"(원본 제외)를 저장한다. 기본은 저장 안 함.
-- 비공개 버킷 + 소유자 전용 RLS. 서버는 service role로 접근하며 모든 쿼리에서 user_id로 직접 거른다. 회원당 최대 30장.
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 거부될 수 있어 문장별로 적용했다.

create table if not exists public.portrait_photo_saved (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  purpose_label text not null default '',
  aspect text not null default '',
  model text not null default '',
  bytes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists portrait_photo_saved_user_created_idx
  on public.portrait_photo_saved (user_id, created_at desc);

alter table public.portrait_photo_saved enable row level security;

create policy "portrait_photo_saved_owner_all" on public.portrait_photo_saved
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('portrait-photo-files', 'portrait-photo-files', false)
on conflict (id) do nothing;

-- 카탈로그 설명(v1.03 기능 반영)
update public.programs set
  description = description || ' 여러 장을 한꺼번에 올려 같은 설정으로 일괄 생성·전체 저장할 수 있고, 중국 비자(33×48mm) 규격도 지원합니다. 원하면 결과 사진을 비공개 서버 보관함(최대 30장)에 따로 저장할 수 있으며 기본값은 저장하지 않음입니다.',
  version = 'v1.03',
  updated_at = now()
where slug = 'portrait-photo' and description not like '%일괄 생성%';
