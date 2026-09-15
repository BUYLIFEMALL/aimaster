-- 카테고리 순서 변경 기능을 위해 sort_order 컬럼을 추가한다(사용자 지시, 2026-09-15).
-- 기존 행은 created_at 순서 그대로 1부터 채워서 지금 화면에 보이는 순서가 안 바뀌게 한다.
alter table public.ncafe_categories
  add column if not exists sort_order integer not null default 0;

with ordered as (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.ncafe_categories
)
update public.ncafe_categories c
set sort_order = ordered.rn
from ordered
where c.id = ordered.id;

create index if not exists ncafe_categories_sort_idx on public.ncafe_categories (user_id, sort_order);
