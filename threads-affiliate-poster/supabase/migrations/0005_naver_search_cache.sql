-- 네이버 검색(뉴스/블로그/카페글) 공용 캐시. naver_trend_cache와 동일한 이유(개인 데이터가
-- 아니라 공개 데이터)로 회원 개인 키 없이 AIMaster 공용 키로 조회하고 캐시를 공유한다.
-- 뉴스는 트렌드보다 갱신이 빠르므로 TTL을 짧게(12시간) 잡는다(애플리케이션 코드에서 판단).
create table if not exists naver_search_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique, -- sha256(search_type + ':' + query)
  search_type text not null,
  query text not null,
  items jsonb not null,
  fetched_at timestamptz not null default now()
);

create index if not exists naver_search_cache_fetched_at_idx on naver_search_cache (fetched_at);

alter table naver_search_cache enable row level security;

drop policy if exists naver_search_cache_select_authenticated on naver_search_cache;
create policy naver_search_cache_select_authenticated
  on naver_search_cache for select
  to authenticated
  using (true);
