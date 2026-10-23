-- 블로그 카테고리 관리 모달에 순서 변경(▲▼) 기능을 추가하기 위해 sort_order 컬럼을 둔다.
-- naver-cafe-poster의 ncafe_categories.sort_order 패턴과 동일 — 인접 항목끼리 sort_order를
-- 맞바꾸는 방식으로 순서를 바꾼다(2026-09-16).
alter table public.blog_categories
  add column if not exists sort_order bigint;

-- 기존 카테고리는 현재 id 순서를 그대로 초기 순서로 채워준다.
update public.blog_categories t
set sort_order = s.rn
from (
  select id, row_number() over (order by id asc) as rn
  from public.blog_categories
) s
where t.id = s.id and t.sort_order is null;

alter table public.blog_categories
  alter column sort_order set not null,
  alter column sort_order set default 0;
