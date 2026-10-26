-- 스마트스토어 상품등록 자동화 v1.02 (EC-W8 2단계) — 크롬 확장 연결 토큰. 대상: ① 운영 DB (ref esgxyikcnnvmlhygjkth)
-- 토큰 원문은 저장하지 않고 sha256 해시만 저장한다(블로그 확장보다 안전하게). 서버(service role)만 읽고 쓴다 — 회원용 정책 없음.
create table if not exists public.smartstore_register_ext_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text unique,
  pair_code text unique,
  pair_code_expires_at timestamptz,
  device_name text not null default 'Chrome',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists smartstore_register_ext_tokens_user_idx on public.smartstore_register_ext_tokens (user_id);
alter table public.smartstore_register_ext_tokens enable row level security;

update public.programs set version = 'v1.02',
  extension_version = 'v1.02',
  extension_download_url = 'https://smartstore-register.buylife.xyz/downloads/smartstore-register-extension-latest.zip',
  updated_at = now()
where slug = 'smartstore-register';

select to_regclass('public.smartstore_register_ext_tokens') as tokens_table, version, extension_version, extension_download_url
from public.programs where slug = 'smartstore-register';
