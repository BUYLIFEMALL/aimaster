-- getDistrictSentiment()가 캐시 미스 시 사용자 세션 클라이언트로 upsert하는데,
-- select 정책만 있어서 캐시 저장이 조용히 실패하고 있었다(에러는 안 나지만 매번 재호출됨).
create policy "district_sentiment_insert_authenticated" on real_estate_district_sentiment
  for insert with check (auth.uid() is not null);
create policy "district_sentiment_update_authenticated" on real_estate_district_sentiment
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
