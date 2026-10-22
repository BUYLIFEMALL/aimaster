-- v1.07 (BC-05, 2026-10-22): 분석 기록은 만든 지 30일이 지나면 삭제한다(회원 생성 데이터 30일 규칙).
-- 즐겨찾기한 기록은 지우지 않는다(2026-10-22 주인님 결정: 「즐겨찾기는 용량 많이 잡아 먹는게 아니잖아 놔두는 걸로 하자」).
-- 앱은 같은 기준(src/lib/kw/retention.ts)으로 목록·열기에서 바로 숨긴다. 매시간 23분(UTC)에 실행.
create or replace function public.cleanup_blog_keyword_reports()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.blog_keyword_reports
  where favorite = false and created_at <= now() - interval '30 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.cleanup_blog_keyword_reports() from public, anon, authenticated;
select cron.schedule('blog-keyword-reports-retention-30d', '23 * * * *', 'select public.cleanup_blog_keyword_reports();');
