-- 연동(insert)/재연동(update) 시 사용자 본인 세션으로 upsert하는데,
-- select/delete 정책만 만들고 insert/update 정책을 빠뜨려서 저장이 막혀 있었다.
create policy "telegram_links_insert_own" on user_telegram_links
  for insert with check (auth.uid() = user_id);
create policy "telegram_links_update_own" on user_telegram_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
