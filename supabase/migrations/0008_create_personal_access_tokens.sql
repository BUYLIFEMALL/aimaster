-- 데스크톱 앱(예: naver-blog-auto-poster)이 "웹 로그인 -> 토큰 발급 -> 앱에 붙여넣기"
-- 방식으로 AIMaster 계정과 연동할 때 쓰는 공용 테이블. 향후 다른 데스크톱 앱에서도
-- program_slug만 다르게 해서 재사용한다 (새 테이블을 매번 만들지 않는다).
create table public.personal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_slug text not null,
  label text,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index personal_access_tokens_user_id_idx on public.personal_access_tokens(user_id);
create index personal_access_tokens_token_hash_idx on public.personal_access_tokens(token_hash);

alter table public.personal_access_tokens enable row level security;

-- 본인 토큰 목록 조회만 허용. 발급/폐기는 서비스 롤(서버 액션)로만 수행하므로
-- insert/delete 정책은 두지 않는다(기본적으로 막힘).
create policy "owner can view own personal access tokens"
  on public.personal_access_tokens for select
  using (auth.uid() = user_id);
