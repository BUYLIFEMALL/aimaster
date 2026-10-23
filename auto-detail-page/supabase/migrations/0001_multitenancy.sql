-- auto-detail-page를 AIMaster 플랫폼 표준(멀티테넌시)에 맞추기 위한 마이그레이션.
-- 1) user_api_keys가 이미 openai/anthropic/gemini를 지원하지만, 이 프로그램의
--    이미지 생성 플랫폼 중 하나(Replicate/FLUX)는 새 provider가 필요하다.
-- 2) 지금까지 생성된 상세페이지 HTML을 서버 메모리(1시간 TTL, 인스턴스별 분리)에만
--    보관했는데, 로그인 사용자별로 영구 보관하고 RLS로 격리하기 위해 테이블을 만든다.

alter table public.user_api_keys
  drop constraint user_api_keys_provider_check;

alter table public.user_api_keys
  add constraint user_api_keys_provider_check
  check (provider = any (array[
    'openai', 'anthropic', 'gemini', 'perplexity',
    'suno', 'json2video', 'google_client_id', 'google_client_secret',
    'replicate'
  ]));

create table public.detail_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null check (template in ('coupang', 'smartstore', 'premium')),
  product_name text not null,
  html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index detail_pages_user_id_idx on public.detail_pages(user_id);

alter table public.detail_pages enable row level security;

create policy "detail_pages_select_own"
  on public.detail_pages for select
  using (auth.uid() = user_id);

create policy "detail_pages_insert_own"
  on public.detail_pages for insert
  with check (auth.uid() = user_id);

create policy "detail_pages_update_own"
  on public.detail_pages for update
  using (auth.uid() = user_id);

create policy "detail_pages_delete_own"
  on public.detail_pages for delete
  using (auth.uid() = user_id);

-- set_updated_at()는 이미 공용 DB에 존재하는 함수를 재사용한다 (다른 서브프로젝트와 동일).
create trigger detail_pages_set_updated_at
  before update on public.detail_pages
  for each row execute function public.set_updated_at();
