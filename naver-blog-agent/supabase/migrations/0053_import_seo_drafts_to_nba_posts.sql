-- [적용 완료 2026-10-09, 주인님 승인] buylifemall@naver.com 의 SEO 스튜디오 원고 53건(2026-09-22~09-30)을 에이전트 보관함(nba_posts)으로 "복사"했다.
-- 배경: v1.49 이전에는 nba_posts 가 없어 /api/posts 가 naver_blog_seo_drafts 를 대신 읽었고, 에이전트 보관함(/queue)이 그 회원의 SEO 스튜디오 원고를 보여주고 있었다.
-- 복사만 한다(원본 삭제·수정 없음). id 를 그대로 써서 여러 번 실행해도 중복되지 않는다. 되돌리기: delete from public.nba_posts where research_summary->>'imported_from' = 'naver_blog_seo_drafts';
-- 결과: 53건 복사, 원본 53건 그대로.
insert into public.nba_posts (id, user_id, blog_id, category_name, title, content, tags, images, status, research_summary, created_at, updated_at)
select d.id, d.user_id, 'myblog_sample', coalesce(nullif(d.strategy,''), '일반'), coalesce(nullif(d.title,''), '제목 없음'), coalesce(d.body,''),
       coalesce(d.keywords, array[]::text[]),
       case when jsonb_typeof(d.image_prompts) = 'array' then d.image_prompts else '[]'::jsonb end,
       'draft',
       jsonb_build_object('imported_from','naver_blog_seo_drafts','source_id', d.id, 'imported_at', now(), 'original_status', d.status),
       d.created_at, coalesce(d.updated_at, d.created_at)
from public.naver_blog_seo_drafts d
on conflict (id) do nothing;
