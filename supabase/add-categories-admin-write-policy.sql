-- categories 테이블에는 SELECT(전체 공개) 정책만 있고 관리자 쓰기 정책이 없었다.
-- 카테고리 순서 이동(sort_order) 관리자 기능을 추가하며 함께 추가함 (2026-09-11).
create policy "admin_all_categories" on categories
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );
