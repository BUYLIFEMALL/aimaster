-- AI 글쓰기 에디터 자동화 (slug: ai-writing-editor) — 프로그램 등록 + 요금제 3종 + VIP 등급 접근 (v1.01, 2026-10-14)
-- 카테고리 Tools, 최소 등급 일반, 배지 new(FREE 아님). AI는 회원 본인 Gemini 키.
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 거부될 수 있어 문장별로 적용했다.

INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'ai-writing-editor',
  'AI 글쓰기 에디터 자동화',
  '주제만 적으면 AI가 초안을 쓰고, 문장을 드래그해 바로 고치고, 글 전체의 문법·표현 제안을 한 번에 적용하는 AI 글쓰기 에디터',
  '주제와 글쓰기 형식(블로그·에세이·이메일·보고서·보도자료·자기소개서·제품 소개글·SNS 게시글·자유 형식), 톤, 분량을 고르면 AI가 초안을 쓰고, 필요하면 인터넷 검색 결과와 출처를 반영합니다. 에디터에서 문장을 드래그하면 플로팅 툴바에서 다시쓰기·짧게·자세하게·전문적으로·친근하게는 물론 원하는 방향을 직접 지시해 고칠 수 있고, [글 분석]으로 문법·표현·구조·명확성 제안을 분류별로 받아 하나씩 또는 한 번에 적용합니다(본문에서 문장을 다시 찾아 정확히 바꾸고, 글이 바뀌면 안내). 되돌리기 50단계, 자동 저장(문서 30개), .md·.txt 내보내기를 지원합니다. 이미 쓴 글을 붙여 넣거나 파일로 불러와 바로 분석할 수도 있습니다. AI는 회원 본인의 Google Gemini API 키로 동작합니다. 페르소나 문체 자동화(슬라이더·캐릭터 문체 변환), 네이버 블로그 올인원(블로그 전용 파이프라인)과 달리 형식에 구애받지 않는 범용 글쓰기·교정 에디터입니다.',
  'https://ai-writing-editor.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new']::text[],
  '729e7dd9-571e-4f2b-adb8-0ff941edbea1',
  '861b7a37-d056-4404-80f5-85edb2e2ebff'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, short_desc = EXCLUDED.short_desc, description = EXCLUDED.description,
  app_url = EXCLUDED.app_url, version = EXCLUDED.version, is_active = EXCLUDED.is_active,
  badges = EXCLUDED.badges, category_id = EXCLUDED.category_id, required_grade_id = EXCLUDED.required_grade_id,
  updated_at = NOW();

INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
SELECT p.id, v.name, v.bt, v.price, v.price, true, v.so
FROM public.programs p
CROSS JOIN (VALUES ('1개월','monthly',10000,1), ('2개월','bimonthly',20000,2), ('3개월','quarterly',30000,3)) AS v(name, bt, price, so)
WHERE p.slug = 'ai-writing-editor'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'ai-writing-editor'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);

-- 썸네일은 scripts/generate-program-thumbnail.mjs(§13 실사 16:9)로 생성해 program-images 버킷에 올리고 programs.thumbnail_url을 직접 갱신한다.
