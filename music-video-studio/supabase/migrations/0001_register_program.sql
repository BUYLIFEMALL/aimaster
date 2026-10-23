-- MUSIC VIDEO STUDIO v1.02(v1.01 등록 후 프로그램명을 뮤직비디오 자동화로 변경) 프로그램 등록 (2026-10-12).
--  - 참고 도구: Google Flow "뮤직비디오 만들기 V3" (가사 → 스토리보드 → 장면 이미지·Veo 영상)
--  - 카테고리: 멀티미디어, 최소 등급: 일반, FREE 배지(프로그램 자체는 무료, 이미지·영상 비용은 회원 본인 Gemini 계정에 청구)
--  - 요금제: 플랫폼 표준 1·2·3개월 (FREE 배지를 뗄 때를 대비해 함께 등록)
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'music-video-studio',
  '뮤직비디오 자동화',
  '주제와 장르로 가사를 쓰고, 스토리보드를 만들어 장면별 이미지와 Veo 영상 클립까지 제작하는 뮤직비디오 자동화',
  '주제·장르(K-Pop, 발라드, 힙합 등 10종)로 AI가 노래 제목·Suno 스타일·가사를 쓰고, 가사를 1~8개 장면으로 나눠 영문 촬영 묘사가 담긴 스토리보드를 만듭니다. 화풍(Cinematic, Anime, Oil Painting 등)과 참고 이미지를 정하면 장면마다 키프레임 이미지를 만들고, 그 이미지로 Veo 3.1(Lite·Fast·Standard) 영상 클립을 4·6·8초로 만들 수 있으며 심리스 루프와 16:9·9:16 비율을 지원합니다. 장면 이미지·영상은 ZIP으로 저장합니다. 모든 AI 호출은 회원 본인의 Gemini API 키로 이루어지며, 영상은 길이만큼 본인 계정에 요금이 청구됩니다(생성 전에 예상 비용을 안내).',
  'https://music-video-studio.buylife.xyz',
  'v1.02',
  true,
  ARRAY['new','free']::text[],
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
WHERE p.slug = 'music-video-studio'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);
