-- Before tap_saved_posts existed in production, bookmarks from /trends were stored as draft
-- tap_posts rows whose content starts with "[TAP_TREND_SAVED]\n{json}". That fallback code was
-- removed; move the remaining rows into tap_saved_posts and delete the draft rows.
-- Example posts ("v-*" ids) take the current example labels instead of the old fabricated authors.

INSERT INTO public.tap_saved_posts (user_id, post_id, author_handle, author_name, content, category)
SELECT t.user_id,
       j->>'postId',
       CASE WHEN j->>'postId' LIKE 'v-%' THEN 'example_' || split_part(j->>'postId', '-', 2) ELSE j->>'authorHandle' END,
       CASE WHEN j->>'postId' LIKE 'v-%' THEN COALESCE(j->>'category', '') || ' 꿀템 예시' ELSE j->>'authorName' END,
       j->>'content',
       COALESCE(j->>'category', '일반')
FROM public.tap_posts t
CROSS JOIN LATERAL (SELECT replace(t.content, E'[TAP_TREND_SAVED]\n', '')::jsonb AS j) parsed
WHERE t.content LIKE '[TAP_TREND_SAVED]%'
ON CONFLICT (user_id, post_id) DO NOTHING;

DELETE FROM public.tap_posts WHERE content LIKE '[TAP_TREND_SAVED]%';
