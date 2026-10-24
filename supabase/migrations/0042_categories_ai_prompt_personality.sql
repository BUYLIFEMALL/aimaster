-- 2026-10-24 카테고리 신설 2개 + 프로그램 12개 카테고리 이동 (운영 DB esgxyikcnnvmlhygjkth)
-- 주인님 지시: 「너가 프로그램 성격에 맞게 카테고리를 만들고 해당 프로그램을 이동시켜줘」
-- 근거: docs/CATEGORY_GUIDE_MAP.md §1-2(신설)·§1-3(옮기기). 작성: Claude Code(윈도우) claude-win-dotori
-- 다시 실행해도 같은 결과(카테고리는 없을 때만 만들고, 이동은 slug 기준으로 덮어씀).
--
-- [실행 전 백업 — 결과를 docs/CATEGORY_GUIDE_MAP.md 변경 기록에 남김]
-- select p.slug, c.slug as category_slug, c.name as category_name
--   from programs p left join categories c on c.id = p.category_id
--  where p.slug in ('music-player','ai-video-studio','reverse-prompt','ai-prompt-studio','ai-writing-editor',
--                   'markdown-studio','ai-slide-builder','ui-canvas','personality-suite','personality-code',
--                   'mbti-character','tarot-reading')
--  order by p.slug;
--
-- [되돌리기] 위 백업의 category_slug로 아래 update를 다시 실행하고, 새 카테고리 2개는 비어 있으면 삭제.

begin;

insert into categories (name, slug, sort_order)
select 'AI 프롬프트', 'ai-prompt', coalesce(max(sort_order), 0) + 1 from categories
where not exists (select 1 from categories where slug = 'ai-prompt');

insert into categories (name, slug, sort_order)
select '성격·운세', 'personality-fortune', coalesce(max(sort_order), 0) + 1 from categories
where not exists (select 1 from categories where slug = 'personality-fortune');

update programs p set category_id = c.id, updated_at = now()
from (values
  ('music-player',       'music'),
  ('ai-video-studio',    'video'),
  ('reverse-prompt',     'ai-prompt'),
  ('ai-prompt-studio',   'ai-prompt'),
  ('ai-writing-editor',  'work-automation'),
  ('markdown-studio',    'work-automation'),
  ('ai-slide-builder',   'work-automation'),
  ('ui-canvas',          'design'),
  ('personality-suite',  'personality-fortune'),
  ('personality-code',   'personality-fortune'),
  ('mbti-character',     'personality-fortune'),
  ('tarot-reading',      'personality-fortune')
) as m(program_slug, category_slug)
join categories c on c.slug = m.category_slug
where p.slug = m.program_slug;

commit;

-- [실행 후 확인] 12줄이 모두 새 카테고리로 나와야 함
-- select p.slug, c.slug from programs p join categories c on c.id = p.category_id where p.slug in (...위 12개...) order by 1;
