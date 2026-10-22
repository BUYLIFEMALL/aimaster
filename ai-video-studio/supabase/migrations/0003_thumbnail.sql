-- AI 영상 스튜디오 카탈로그 썸네일 — 2026-10-23 (Claude Code 윈도우, 주인님 승인 1차 비용 범위)
-- scripts/generate-program-thumbnail.mjs 로 생성·업로드·반영 완료(관리자 본인 Gemini 키, 이미지 1회).
-- 내용: 한국인 30대 남성이 홈 영상 스튜디오에서 편집 화면(영상 썸네일 격자·타임라인)을 보며 웃음, 필름·슬레이트·재생 아이콘, 글자·로고 없음(원본 확인).
-- 아래는 기록용(이미 적용됨, 다시 실행해도 같은 값):
update public.programs
   set thumbnail_url = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ai-video-studio-thumbnail.jpg?v=1792696126003'
 where slug = 'ai-video-studio';
