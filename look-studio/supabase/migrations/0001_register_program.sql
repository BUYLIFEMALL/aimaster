-- AI 룩스튜디오 자동화(look-studio) v1.01 프로그램 등록 (2026-10-13)
--  - 서버 테이블 없음(사진·옷장·룩은 회원 브라우저 IndexedDB). AI는 회원 본인 Gemini 키(user_api_keys).
--  - 카테고리 이미지, 최소 등급 일반, 배지 new(FREE 아님), 기본 3요금제(1·2·3개월 10,000/20,000/30,000), VIP 등급 접근 포함
--  - 썸네일은 scripts/generate-program-thumbnail.mjs + PLATFORM_PATTERNS §13 템플릿(한국인 실사 16:9)으로 생성·등록
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES ('look-studio', 'AI 룩스튜디오 자동화',
  '인물 사진에 AI가 추천한 코디를 입혀 보고 메이크업·헤어까지 완성하는 가상 피팅 스튜디오',
  '(설명은 운영 DB 참고)', 'https://look-studio.buylife.xyz', 'v1.01', true, ARRAY['new']::text[],
  'b5cec438-a6cc-43e5-83bc-59368f8a2c4d', '861b7a37-d056-4404-80f5-85edb2e2ebff')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, short_desc = EXCLUDED.short_desc, app_url = EXCLUDED.app_url,
  version = EXCLUDED.version, is_active = EXCLUDED.is_active, badges = EXCLUDED.badges, updated_at = NOW();
