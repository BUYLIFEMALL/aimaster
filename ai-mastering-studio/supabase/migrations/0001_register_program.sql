-- AI 마스터링 스튜디오(ai-mastering-studio) v1.01 프로그램 등록 (2026-10-13)
--  - 참고 원본: gpt-park-mastering-studio-99gg.vercel.app (HTML·번들 전체 분석, 처리 순서·프리셋 12종·AI 생성기 구조를 참고해 직접 새로 구현, 문구는 새로 작성, 제작자 크레딧 미복제)
--  - 오디오는 서버로 보내지 않고 브라우저에서만 처리하므로 DB 테이블·저장소가 필요 없다. AI 로직 생성기는 회원 본인 Gemini/OpenAI/Claude 키로 호출한다.
--  - 카테고리: 음악, 최소 등급: 일반, FREE+new 배지
--  - 요금제: 플랫폼 표준 1·2·3개월 (FREE 배지를 뗄 때를 대비해 함께 등록)
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'ai-mastering-studio',
  'AI 마스터링 스튜디오',
  'WAV 음원을 브라우저에서 EQ·새추레이션·컴프레서·리미터로 마스터링하고 AI가 원하는 사운드의 설정값을 제안하는 도구',
  'WAV 음원을 올리면 브라우저 안에서 EQ(저·중·고), 아날로그 새추레이션, 컴프레서, 스테레오 이미저, 룩어헤드 리미터로 이어지는 마스터링 체인을 처리합니다. 범용·스트리밍·클럽용·펀치·팟캐스트·시네마틱 등 12가지 사운드 프로필을 한 번에 적용하거나, 원하는 소리를 글로 적으면 AI 엔지니어가 설정값과 짧은 설명을 제안합니다. 입력·결과 파형과 피크·평균 레벨을 비교하고, 여러 곡을 일괄 처리해 WAV 또는 ZIP으로 저장할 수 있습니다. 오디오 파일은 서버로 전송되지 않으며, AI 제안은 회원 본인의 Gemini·OpenAI·Claude API 키로 동작합니다(프리셋과 수동 조정은 키가 필요 없습니다).',
  'https://ai-mastering-studio.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new','free']::text[],
  '2205a911-b7cf-4865-bbbe-d65d53f3f42d',
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
WHERE p.slug = 'ai-mastering-studio'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

-- VIP(드림AI팀)는 모든 프로그램 사용 등급이므로 등급 표에도 추가한다(등급 자동 부여 트리거가 회원에게 반영)
INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'ai-mastering-studio'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);

-- v1.02 (2026-10-13): ZIP 파일 이름 날짜 보정
UPDATE public.programs SET version = 'v1.02', updated_at = NOW() WHERE slug = 'ai-mastering-studio';
