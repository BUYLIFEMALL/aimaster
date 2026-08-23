-- 구글 외 검색엔진(네이버) 지원 추가. 키워드마다 어느 검색엔진 기준으로 분석할지 고르고,
-- 실행된 회차(job)에도 당시 사용한 엔진을 스냅샷으로 남긴다(location/google_domain/lang과
-- 동일한 패턴).
alter table public.competitor_keywords
  add column engine text not null default 'google' check (engine in ('google', 'naver'));

alter table public.competitor_serp_jobs
  add column engine text not null default 'google' check (engine in ('google', 'naver'));
