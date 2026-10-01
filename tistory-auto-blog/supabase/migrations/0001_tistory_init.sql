-- 티스토리 자동화(tistory-auto-blog) 전용 테이블 — 2026-10-01 (클라우드 세션에서 파일만 작성, 적용은 로컬에서 주인님 승인 후).
-- ai-auto-blog(BLOG)의 blog_* 구조를 복사하되, 멀티테넌시 원칙 2번(사용자별 완전 격리)에 맞게 바꿨다.
--  - BLOG는 blog_categories가 회원 전체 공용이고 RLS가 using(true)라 다른 회원의 카테고리를 지울 수 있었다 → 여기서는 전부 회원별(user_id) + 본인만 접근.
--  - 글·카테고리·저자·후보는 모두 user_id NOT NULL. 서로 다른 회원의 행을 엮지 못하도록 (id, user_id) 복합 외래키로 DB가 직접 막는다.
--  - 댓글·좋아요(blog_comments/blog_likes)는 이 프로그램에서 쓰지 않아 만들지 않는다. 글은 본인만 볼 수 있다(공개 블로그 아님).
--  - 서비스 롤(API)은 RLS를 우회하므로 코드에서 반드시 user_id를 직접 넣고 걸러야 한다(auth.uid()가 null이다).
-- 입력 상태 칸은 naver_input_*가 아니라 tistory_input_* 이름을 쓴다.
-- 전제: 공용 DB에 public.set_updated_at() 함수가 이미 있다(blog_candidates 때부터 사용 중).

create table if not exists public.tistory_categories (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name),
  unique (user_id, slug),
  unique (id, user_id)
);

create table if not exists public.tistory_authors (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  role text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (id, user_id)
);

create table if not exists public.tistory_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  excerpt text not null default '',
  published_at date not null default current_date,
  author_id bigint not null,
  content text not null default '',
  reading_minutes int not null default 5,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  -- 크롬 확장(티스토리 입력) 연동 상태
  extension_handoff_at timestamptz,
  tistory_input_status text check (tistory_input_status is null or tistory_input_status in ('in_progress', 'completed', 'publish_ready', 'failed')),
  tistory_input_completed_at timestamptz,
  tistory_input_error text,
  unique (id, user_id),
  foreign key (author_id, user_id) references public.tistory_authors (id, user_id) on delete cascade
);

create table if not exists public.tistory_post_categories (
  post_id bigint not null,
  category_id bigint not null,
  user_id uuid not null default auth.uid(),
  primary key (post_id, category_id),
  foreign key (post_id, user_id) references public.tistory_posts (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.tistory_categories (id, user_id) on delete cascade
);

-- 글감 수집(HTTP/RSS/Perplexity). category_id가 있으면 같은 회원의 카테고리여야 한다(복합 외래키).
-- 카테고리가 지워져도 후보는 남기고 category_id만 비운다(PostgreSQL 15 이상 문법).
create table if not exists public.tistory_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('http', 'rss', 'perplexity')),
  source_input text not null,
  title text not null,
  summary text not null default '',
  keywords text[] not null default '{}',
  category_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.tistory_categories (id, user_id) on delete set null (category_id)
);

create trigger tistory_candidates_set_updated_at
  before update on public.tistory_candidates
  for each row execute function public.set_updated_at();

create index if not exists tistory_posts_user_created_idx on public.tistory_posts (user_id, created_at desc);
create index if not exists tistory_posts_published_idx on public.tistory_posts (user_id, published_at desc);
create index if not exists tistory_posts_handoff_idx on public.tistory_posts (user_id, extension_handoff_at desc) where extension_handoff_at is not null;
create index if not exists tistory_categories_user_sort_idx on public.tistory_categories (user_id, sort_order);
create index if not exists tistory_post_categories_category_idx on public.tistory_post_categories (category_id);
create index if not exists tistory_candidates_user_created_idx on public.tistory_candidates (user_id, created_at desc);
create index if not exists tistory_candidates_category_idx on public.tistory_candidates (category_id);

-- RLS: 전부 본인 행만(owner-only). 서비스 롤은 RLS를 우회하므로 API 코드에서 user_id를 직접 걸러야 한다.
alter table public.tistory_categories enable row level security;
alter table public.tistory_authors enable row level security;
alter table public.tistory_posts enable row level security;
alter table public.tistory_post_categories enable row level security;
alter table public.tistory_candidates enable row level security;

create policy "tistory_categories_own" on public.tistory_categories
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tistory_authors_own" on public.tistory_authors
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tistory_posts_own" on public.tistory_posts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tistory_post_categories_own" on public.tistory_post_categories
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tistory_candidates_own" on public.tistory_candidates
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
