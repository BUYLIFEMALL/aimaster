-- 2026-10-17 v1.12 (주인님 지시 "각각 사용자 별로 분리"): AI 시장조사 캐시 회원별 격리 + 30일 보관.
-- 예전에는 자치구+날짜 단위로 회원 구분 없이 저장되고 인증 회원 누구나 읽기/쓰기가 가능했다
-- (회원 A의 Perplexity 키로 만든 결과를 회원 B가 보고 덮어쓸 수 있음 — 최상위 규칙 위반, IMPROVEMENT_HANDOFF #10).
-- 기존 행(user_id 없음 5건, 모두 30일 경과)은 임의 소유자를 붙이지 않는다 — 새 정책에서 아무도 못 보고, 30일 정리 cron이 지운다.

alter table public.real_estate_district_sentiment
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.real_estate_district_sentiment
  drop constraint if exists real_estate_district_sentiment_sgg_nm_sentiment_date_key;
alter table public.real_estate_district_sentiment
  add constraint real_estate_district_sentiment_user_sgg_date_key unique (user_id, sgg_nm, sentiment_date);

create index if not exists real_estate_district_sentiment_created_at_idx
  on public.real_estate_district_sentiment (created_at);

drop policy if exists "district_sentiment_select_authenticated" on public.real_estate_district_sentiment;
drop policy if exists "district_sentiment_insert_authenticated" on public.real_estate_district_sentiment;
drop policy if exists "district_sentiment_update_authenticated" on public.real_estate_district_sentiment;

create policy "district_sentiment_select_own" on public.real_estate_district_sentiment
  for select using (auth.uid() = user_id);
create policy "district_sentiment_insert_own" on public.real_estate_district_sentiment
  for insert with check (auth.uid() = user_id);
create policy "district_sentiment_update_own" on public.real_estate_district_sentiment
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "district_sentiment_delete_own" on public.real_estate_district_sentiment
  for delete using (auth.uid() = user_id);

update public.programs set version = 'v1.12', updated_at = now() where slug = 'real-estate-sales';
