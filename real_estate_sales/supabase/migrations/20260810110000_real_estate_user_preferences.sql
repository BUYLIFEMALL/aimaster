-- 사용자가 설정 화면에서 한 번 고른 AI 분석 모델을 저장해두고, 매물 상세를 볼 때마다
-- 모델을 다시 고르지 않고 자동으로 그 모델로 분석하기 위한 테이블.
create table if not exists real_estate_user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_model text,
  updated_at timestamptz not null default now()
);

alter table real_estate_user_preferences enable row level security;

create policy "user_preferences_select_own" on real_estate_user_preferences
  for select using (auth.uid() = user_id);
create policy "user_preferences_insert_own" on real_estate_user_preferences
  for insert with check (auth.uid() = user_id);
create policy "user_preferences_update_own" on real_estate_user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
