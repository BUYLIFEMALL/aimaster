-- naver-cafe-poster 초기 스키마.
-- 테이블명은 이 프로젝트 접두어 "ncafe_"를 붙여 다른 서브프로젝트(naver_search_cache 등)와
-- 겹치지 않게 한다 (information_schema.tables로 실제 라이브 스키마 대조 후 결정, 2026-09-11).

-- 사용자별 네이버 로그인 연동 계정(OAuth). 네이버 카페 API는 "회원이 본인 명의로 로그인해
-- 부여한 access token"으로만 호출 가능하다 — Threads/Instagram과 같은 공유 앱(Client ID/
-- Secret은 이 프로젝트가 하나만 등록) + 사용자별 연동 구조.
create table ncafe_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  naver_id text not null,
  nickname text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- 회원이 게시글을 올릴 본인 카페(게시판)를 등록해둔다. 네이버 카페 오픈API는 "내 카페 목록
-- 조회"나 "게시판 목록 조회" API 자체를 제공하지 않으므로(2026-09-11 확인,
-- naver-openapi-guide 전체 API 목록에 조회성 카페 API가 없음), club_id/menu_id는 회원이
-- 본인 카페 관리 화면 URL에서 직접 확인해 수동으로 입력한다.
create table ncafe_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  club_id text not null,
  menu_id text not null,
  created_at timestamptz not null default now()
);

-- 게시글 이력. 즉시 게시만 지원한다(예약 게시는 Phase 2 이후 필요성 확인 후 추가).
create table ncafe_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid references ncafe_targets(id) on delete set null,
  title text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'publishing', 'published', 'failed')),
  cafe_article_url text,
  raw_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ncafe_accounts enable row level security;
alter table ncafe_targets enable row level security;
alter table ncafe_posts enable row level security;

create policy "ncafe_accounts_owner" on ncafe_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ncafe_targets_owner" on ncafe_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ncafe_posts_owner" on ncafe_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
