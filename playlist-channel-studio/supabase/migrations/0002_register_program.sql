-- 플레이리스트 채널 제작 자동화(playlist-channel-studio) v1.01 프로그램 등록 (2026-10-13)
--  - 참고 원본: ai-playlist-creator-bice.vercel.app (HTML·번들 전체 분석, 흐름·옵션을 참고해 직접 새로 구현, 프롬프트·문구는 새로 작성)
--  - 카테고리: 유튜브, 최소 등급: 일반, FREE+new 배지(회원 본인 Gemini/OpenAI/Claude 키로 동작, 운영자 AI 비용 없음. 저장소 사용은 사용자당 프로젝트 30개로 제한)
--  - 요금제: 플랫폼 표준 1·2·3개월 (FREE 배지를 뗄 때를 대비해 함께 등록)
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'playlist-channel-studio',
  '플레이리스트 채널 제작 자동화',
  '장르 선택부터 제목·Suno 프롬프트·가사·유튜브 설명·썸네일까지 플레이리스트 채널 소재를 한 번에 만드는 도구',
  '장르를 고르면 "playlist 이모지 한국어 문장 | 영어키워드 & 영어키워드" 형식의 제목 10개를 제안하고, 선택한 제목에 맞춰 Suno 5.0 스타일 프롬프트 3종(각 900자 미만), 곡별 가사(한국어·영어·일본어·스페인어·프랑스어, 이중 언어 비율, 1~20곡, 비유 강도 4단계, 곡 구조 15종, 인트로/아웃트로 가사, 연주곡 모드), 유튜브 설명글·해시태그 5개·검색 키워드 15개, 스타일 7종 썸네일 배경과 글꼴 14종 제목 글자 합성(PNG/JPG 저장, 수정 요청 재생성)을 만들어 줍니다. 만든 프로젝트는 내 계정에 저장됩니다(최대 30개). 회원 본인의 Google Gemini · OpenAI · Anthropic Claude API 키로 동작하며 운영자나 다른 회원의 키는 쓰이지 않습니다.',
  'https://playlist-channel-studio.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new','free']::text[],
  'cb3c7c75-da5e-4474-a185-f069a6dcbda9',
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
WHERE p.slug = 'playlist-channel-studio'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

-- v1.02 (2026-10-13): 모델 안내 문구 수정 + 카탈로그 썸네일 등록(thumbnail_url은 scripts 임시 스크립트로 program-images 버킷에 업로드)
UPDATE public.programs SET version = 'v1.02', updated_at = NOW() WHERE slug = 'playlist-channel-studio';
