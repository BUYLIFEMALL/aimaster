-- AI 리버스 프롬프트 자동화 (slug: reverse-prompt) — 프로그램 등록 + 요금제 3종 + VIP 등급 접근 + 썸네일 (v1.01, 2026-10-14)
-- 카테고리 멀티미디어, 최소 등급 일반, 배지 new(FREE 아님). AI는 회원 본인 Gemini 키.
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 "Invalid or expired requestState"로 거부될 수 있어 문장별로 적용했다.

INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'reverse-prompt',
  'AI 리버스 프롬프트 자동화',
  '이미지·동영상·오디오 파일을 올리면 Midjourney·Sora·Suno 등에 바로 쓸 프롬프트(JSON)로 역설계해 주는 도구',
  '마음에 드는 이미지·동영상·음악 파일 하나를 올리면 AI가 조명·구도·카메라 움직임·악기 구성 등을 전문가 관점으로 분해하고, Midjourney·DALL·E·Flux·Sora·Veo·Runway·Kling·Suno·Udio 등 대상 도구에 맞춘 영어 프롬프트와 구조화된 JSON을 만들어 줍니다. 프롬프트 길이·언어·추가 지시 옵션, 결과 문구 편집과 명령어 재조합, 같은 파일 재분석, 분석 기록(최대 100건)과 JSON·Markdown 내보내기를 지원합니다. 올린 파일은 비공개 임시 저장소에서 1시간 안에 삭제되며, AI는 회원 본인의 Google Gemini API 키로 동작합니다. 이미지 한 장을 스타일 DNA로 정리하는 style-dna-analyzer, 음성·회의록 분석 ai-audio-analyzer와 달리 "다른 생성 AI에 넣을 프롬프트 만들기"에 초점을 둡니다.',
  'https://reverse-prompt.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new']::text[],
  'd9fdfd64-8354-4a45-8b03-d5251831c0d8',
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
WHERE p.slug = 'reverse-prompt'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'reverse-prompt'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);

-- 썸네일은 scripts/generate-program-thumbnail.mjs(§13 실사 16:9)로 생성해 program-images 버킷에 올리고 programs.thumbnail_url을 직접 갱신했다.
--   https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/reverse-prompt-thumbnail.jpg?v=1791908287072
