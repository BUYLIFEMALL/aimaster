-- 네이버 검색어트렌드 공용 캐시.
-- 이 API는 회원 개인 데이터가 아니라 공개 시장 데이터(누가 조회하든 결과 동일)이므로,
-- 회원 각자 네이버 앱을 등록하게 하는 대신 AIMaster(사장님) 계정 하나로 조회하고
-- 그 결과를 여기 캐시해서 전체 회원이 공유한다. TTL은 애플리케이션 코드에서 fetched_at
-- 기준으로 판단한다(예: 24시간). 개인 데이터가 아니므로 user_id 컬럼이 없다.
create table if not exists naver_trend_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  period_months smallint not null,
  time_unit text not null,
  groups jsonb not null, -- 조회에 사용한 keywordGroups 원본(감사/재현용)
  results jsonb not null, -- fetchSearchTrend()의 TrendResultGroup[] 결과
  fetched_at timestamptz not null default now()
);

create index if not exists naver_trend_cache_fetched_at_idx on naver_trend_cache (fetched_at);

alter table naver_trend_cache enable row level security;

-- 개인 데이터가 아니라 회원 전체가 읽는 공용 캐시이므로 로그인한 회원 전체에게 조회를 허용한다.
-- 쓰기는 서버 액션에서 서비스 롤(admin client)로만 수행하므로 별도 insert/update 정책은 만들지 않는다.
drop policy if exists naver_trend_cache_select_authenticated on naver_trend_cache;
create policy naver_trend_cache_select_authenticated
  on naver_trend_cache for select
  to authenticated
  using (true);
