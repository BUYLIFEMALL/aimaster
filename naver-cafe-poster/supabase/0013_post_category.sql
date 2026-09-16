-- 예약 자동화 소스에 등록해둔 카테고리(복수)를 실제로 활용하는 기능 추가(사용자 지시,
-- 2026-09-16). 기존엔 ncafe_scheduled_sources.category_ids가 목록 화면의 표시용 태그로만
-- 쓰였는데, 새로 생성되는 글(ncafe_posts)에도 카테고리를 붙여서 "등록된 카테고리로 분류"가
-- 실제로 일어나게 한다. 소스에 카테고리가 1개면 그대로 사용하고, 여러 개면 AI가 생성된
-- 콘텐츠를 보고 그중 가장 알맞은 것 하나를 골라 분류한다(src/lib/scheduledSource/engine.ts).
alter table public.ncafe_posts
  add column if not exists category_id uuid references public.ncafe_categories (id) on delete set null;

create index if not exists ncafe_posts_category_idx on public.ncafe_posts (category_id);
