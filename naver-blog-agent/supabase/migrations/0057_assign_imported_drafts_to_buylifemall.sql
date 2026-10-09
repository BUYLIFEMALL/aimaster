-- 0053으로 복사한 SEO 스튜디오 원고 53건의 임시 블로그 ID(myblog_sample)를 실제 계정(buylifemall)으로 교체한다. (2026-10-09 주인님 지시)
-- 대상: 가져온 원고(research_summary.imported_from)이면서 아직 myblog_sample인 행만. 상태(draft)와 공개 범위(private)는 그대로.
update public.nba_posts p
set blog_id = 'buylifemall',
    account_id = a.id,
    updated_at = now()
from public.nba_accounts a
where a.user_id = p.user_id
  and a.blog_id = 'buylifemall'
  and p.blog_id = 'myblog_sample'
  and p.research_summary->>'imported_from' = 'naver_blog_seo_drafts';

-- 되돌리기:
-- update public.nba_posts set blog_id = 'myblog_sample', account_id = null, updated_at = now()
--  where blog_id = 'buylifemall' and research_summary->>'imported_from' = 'naver_blog_seo_drafts';
