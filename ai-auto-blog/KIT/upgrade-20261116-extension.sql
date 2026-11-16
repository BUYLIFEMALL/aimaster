-- 블로그 포스팅 자동화 — 예전 배포판(v1.03 이하, 확장 없음) 설치자만 한 번 실행합니다. (2026-11-16 확장 포함판)
-- Supabase → SQL Editor → New query → 붙여넣고 Run. 이미 있으면 건너뜁니다. 데이터는 바꾸지 않습니다.
create table if not exists public.personal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_slug text not null,
  label text,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists personal_access_tokens_user_id_idx on public.personal_access_tokens (user_id);
alter table public.personal_access_tokens enable row level security;
drop policy if exists personal_access_tokens_select_own on public.personal_access_tokens;
create policy personal_access_tokens_select_own on public.personal_access_tokens for select to authenticated using (auth.uid() = user_id);
grant select on public.personal_access_tokens to authenticated;
