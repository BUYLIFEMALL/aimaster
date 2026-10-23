-- 뮤직 플레이어 자동화(music-player) v1.01 프로그램 등록 (2026-10-13)
--  - 서버 테이블 없음(음악 파일·설정은 회원 브라우저 IndexedDB). AI 키 불필요.
--  - 카테고리 멀티미디어, 최소 등급 일반, 배지 new+free(운영자 실비 없는 브라우저 기능), 기본 3요금제 등록
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'music-player',
  '뮤직 플레이어 자동화',
  '내 음악 파일을 끌어다 놓고 시각화·이퀄라이저로 즐기는 브라우저 뮤직 플레이어',
  '내 컴퓨터의 음악 파일(mp3·m4a·wav·flac·ogg 등)을 끌어다 놓거나 폴더째 추가해 바로 재생하는 브라우저 뮤직 플레이어입니다. 검색·정렬·셔플·반복·재생 속도 조절, 5가지 음악 시각화, 8밴드 이퀄라이저와 프리셋(내 프리셋 저장 가능), 곡 태그(ID3)와 앨범 커버 표시를 지원합니다. 재생목록과 설정은 이 브라우저에 자동 저장되어 다시 접속해도 그대로 복원되며, 음악 파일은 서버로 올라가지 않습니다. AI 키가 필요하지 않습니다.',
  'https://music-player.buylife.xyz',
  'v1.01', true, ARRAY['new','free']::text[],
  'd9fdfd64-8354-4a45-8b03-d5251831c0d8', '861b7a37-d056-4404-80f5-85edb2e2ebff'
)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, short_desc = EXCLUDED.short_desc, description = EXCLUDED.description,
  app_url = EXCLUDED.app_url, version = EXCLUDED.version, is_active = EXCLUDED.is_active, badges = EXCLUDED.badges,
  category_id = EXCLUDED.category_id, required_grade_id = EXCLUDED.required_grade_id, updated_at = NOW();
-- pricing_plans 1·2·3개월(10,000/20,000/30,000) 및 VIP 등급 접근은 같은 SQL로 함께 등록함.
-- 썸네일: scripts/generate-program-thumbnail.mjs + PLATFORM_PATTERNS §13 템플릿(한국인 실사 16:9)으로 생성·등록.
