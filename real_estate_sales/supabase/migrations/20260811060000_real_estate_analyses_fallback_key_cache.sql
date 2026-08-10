-- 앱 공용(폴백) API 키로 만든 분석 결과는 같은 매물+같은 모델이면 사용자 간에
-- 재사용(복사)할 수 있도록 표시해둔다. 본인 키로 만든 분석은 항상 새로 호출한다.
alter table real_estate_analyses
  add column if not exists used_fallback_key boolean not null default false;

create index if not exists idx_real_estate_analyses_fallback_lookup
  on real_estate_analyses (listing_id, model, used_fallback_key);
