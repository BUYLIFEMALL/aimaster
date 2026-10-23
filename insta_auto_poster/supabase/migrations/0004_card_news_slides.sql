-- 인스타그램 자동 포스팅 관리 웹 - 카드뉴스(캐러셀) 지원
-- 피드(단일 이미지)와 카드뉴스(여러 장 캐러셀)를 하나의 모델로 통합한다.
-- 설계 배경: insta_auto_poster/README.md의 "카드뉴스(캐러셀) 아키텍처 결정" 섹션 참고.
-- Supabase 대시보드 SQL Editor 또는 `supabase db push`로 실행하세요.

alter table public.insta_posts
  add column if not exists post_type text not null default 'feed'
    check (post_type in ('feed', 'card_news')),
  add column if not exists cover_image_url text;

-- 이미지는 이제 insta_post_slides에서 관리하므로 insta_posts.image_url은 더 이상 필수가 아니다.
alter table public.insta_posts alter column image_url drop not null;

-- insta_post_slides: shots.shorts_video_segments와 동일한 "활성 이미지 + 생성 이력" 패턴.
-- 피드는 슬라이드 1개, 카드뉴스는 슬라이드 최대 4개인 게시물로 통일해서 다룬다.
create table if not exists public.insta_post_slides (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.insta_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slide_order int not null,
  source_paragraph text,
  image_prompt text,
  image_url text,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insta_post_slides_order_unique unique (post_id, slide_order)
);

create trigger insta_post_slides_set_updated_at
  before update on public.insta_post_slides
  for each row execute function public.set_updated_at();

create index if not exists insta_post_slides_post_order_idx
  on public.insta_post_slides (post_id, slide_order);

alter table public.insta_post_slides enable row level security;

create policy "insta_post_slides_select_own"
  on public.insta_post_slides for select
  using (auth.uid() = user_id);

create policy "insta_post_slides_insert_own"
  on public.insta_post_slides for insert
  with check (auth.uid() = user_id);

create policy "insta_post_slides_update_own"
  on public.insta_post_slides for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "insta_post_slides_delete_own"
  on public.insta_post_slides for delete
  using (auth.uid() = user_id);
