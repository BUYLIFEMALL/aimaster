-- 수집된 게시글 주제(blog_candidates)를 blog_categories로 분류할 수 있도록 category_id 추가.
-- naver-cafe-poster의 "카테고리 관리" 패턴을 blog에 이식(2026-09-16) — blog는 이미 게시글용
-- blog_categories 테이블이 있으므로 새 카테고리 체계를 따로 만들지 않고 그대로 재사용한다.
-- 카테고리가 삭제돼도 후보 자체는 지워지지 않고 "카테고리 없음"으로 돌아가도록 ON DELETE SET NULL.
alter table public.blog_candidates
  add column if not exists category_id bigint references public.blog_categories(id) on delete set null;

create index if not exists blog_candidates_category_id_idx on public.blog_candidates(category_id);
