-- updated_at 컬럼이 INSERT 시점의 기본값(now())만 받고 UPDATE 때는 전혀 갱신되지 않고 있었다
-- (트리거가 없었음) — 게시 실패 원인을 디버깅하며 ncafe_posts.updated_at이 여러 번의 재시도에도
-- 계속 최초 생성 시각 그대로인 것을 보고 발견(2026-09-12). 실제 상태 변경 시각을 신뢰할 수 있게
-- 표준 트리거를 추가한다.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on ncafe_posts;
create trigger set_updated_at
  before update on ncafe_posts
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at on ncafe_accounts;
create trigger set_updated_at
  before update on ncafe_accounts
  for each row execute function set_updated_at();
