-- 0004_threads_categories.sql was committed but never applied to production, so the app fell back
-- to storing categories ("CAT_JSON:") and candidate->category maps ("CAND_MAP_JSON:") inside
-- user_api_keys rows, overwriting real API keys (observed 2026-09-28: one member's openai and
-- perplexity rows). Apply after 0004: move that data into the real tables, then drop the rows.

INSERT INTO public.threads_categories (id, user_id, name, color, sort_order, created_at)
SELECT (x->>'id')::uuid,
       k.user_id,
       x->>'name',
       x->>'color',
       COALESCE((x->>'sort_order')::int, 0),
       COALESCE((x->>'created_at')::timestamptz, now())
FROM public.user_api_keys k
CROSS JOIN LATERAL jsonb_array_elements(substring(k.api_key FROM 10)::jsonb) AS x
WHERE k.api_key LIKE 'CAT_JSON:%'
ON CONFLICT (id) DO NOTHING;

UPDATE public.threads_candidates c
SET category_id = e.value::uuid
FROM public.user_api_keys k
CROSS JOIN LATERAL jsonb_each_text(substring(k.api_key FROM 15)::jsonb) AS e
WHERE k.api_key LIKE 'CAND_MAP_JSON:%'
  AND c.id::text = e.key
  AND c.user_id = k.user_id
  AND EXISTS (SELECT 1 FROM public.threads_categories t WHERE t.id = e.value::uuid AND t.user_id = k.user_id);

DELETE FROM public.user_api_keys
WHERE api_key LIKE 'CAT_JSON:%' OR api_key LIKE 'CAND_MAP_JSON:%';
