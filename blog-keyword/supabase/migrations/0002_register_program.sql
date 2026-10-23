-- AI 블로그 키워드 자동화 (slug: blog-keyword) — 프로그램 등록 + 요금제 3종 + VIP 등급 접근 (v1.01, 2026-10-14)
-- 카테고리 블로그, 최소 등급 일반, 배지 new(FREE 아님). AI는 회원 본인 Gemini 키, 네이버는 회원 본인 검색 API 키(선택 검색광고 키).
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 거부될 수 있어 문장별로 적용했다.

INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'blog-keyword',
  'AI 블로그 키워드 자동화',
  '키워드 하나로 자동완성·연관검색어·상위 블로그·경쟁력·오늘의 이슈·뉴스·트렌드를 분석하고 글 제목과 공략법을 제안하는 도구',
  '키워드를 입력하면 네이버·구글 자동완성 롱테일 키워드, AI 연관검색어와 사람들이 묻는 질문·콘텐츠 갭, 네이버 상위 블로그 10개의 구조 분석과 1위 공략법, 키워드 경쟁력(기회 점수·경쟁 난이도, 실측 블로그 문서 수·월간 검색수·12개월 검색 추이), 오늘 기준 정책·이슈 전략 키워드 10개, 4가지 관점 40개 글감 발굴, 네이버 최신 뉴스 기반 글 기회, 분야별 블로그 빈출어와 검색 추이로 뜨는 키워드까지 한 화면에서 이어서 분석합니다. 결과마다 바로 쓸 제목·썸네일 문구·공략 전략을 제안하고, 키워드 전략 프롬프트 50개 라이브러리, 분석 기록 100건 저장·즐겨찾기, Markdown·CSV 내보내기를 지원합니다. AI는 회원 본인의 Google Gemini API 키, 네이버 조회는 본인의 네이버 검색 API 키(검색광고 키는 선택)로 동작합니다. 롱테일 키워드 확장(longtail-keyword-expander)·경쟁사 키워드분석(competitor-analysis)과 달리 뉴스·오늘의 이슈·트렌드·콘텐츠 갭까지 이어서 보는 올인원 도구입니다.',
  'https://blog-keyword.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new']::text[],
  '8e8be410-3ed4-46f7-80d9-4b408af61cc1',
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
WHERE p.slug = 'blog-keyword'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'blog-keyword'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);

-- 썸네일은 scripts/generate-program-thumbnail.mjs(§13 실사 16:9)로 생성해 program-images 버킷에 올리고 programs.thumbnail_url을 직접 갱신한다.
